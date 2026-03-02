// Package app provides the core application scaffold for CleanComms daemon.
package app

import (
	"context"
	"log/slog"
	"os"
	"time"

	"github.com/Zerostate-IO/CleanComms/internal/config"
	"github.com/Zerostate-IO/CleanComms/internal/control"
	"github.com/Zerostate-IO/CleanComms/internal/http"
	"github.com/Zerostate-IO/CleanComms/internal/lookup"
	"github.com/Zerostate-IO/CleanComms/internal/storage"
)

// resolveBindAddr determines the bind address based on config.
// Fail-closed: defaults to localhost-only; remote requires explicit IP.
func resolveBindAddr(cfg *config.Config) string {
	// If remote mode is enabled with explicit bind, use it
	if cfg.Remote.Enabled && cfg.Remote.Bind != "" {
		return cfg.Remote.Bind
	}
	// Default to localhost-only (fail-closed)
	return cfg.Server.HTTPAddr
}
// App represents the CleanComms daemon application.
type App struct {
	config       *config.Config
	logger       *slog.Logger
	rigService   *RigService
	modemService *ModemService
	coordinator  *control.Coordinator
	loggingStore *storage.SQLiteStore
	loggingSvc   *storage.LoggingService
	lookupSvc    *lookup.Service
	httpServer   *http.Server
}

// New creates a new App instance with the given configuration.
func New(cfg *config.Config) *App {
	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	}))

	// Create rig service
	rigService := NewRigService(cfg.Rigctld.Host, cfg.Rigctld.Port, logger)

	// Create modem service (fldigi XML-RPC client)
	modemService := NewModemService(cfg.Fldigi.XMLRPCAddr, logger)
	modemService.SetDefaultMode(cfg.Fldigi.DefaultMode)

	// Create adapters for coordinator (implement control.RigController and control.ModemController)
	rigControllerAdapter := &rigControllerAdapter{service: rigService}
	modemControllerAdapter := &modemControllerAdapter{service: modemService}

	// Create coordinator with PTT timeout from config
	pttTimeout := time.Duration(cfg.Safety.PTTTimeoutSeconds) * time.Second
	if pttTimeout <= 0 {
		pttTimeout = 60 * time.Second // default
	}
	coordinator := control.NewCoordinator(
		rigControllerAdapter,
		modemControllerAdapter,
		logger,
		control.CoordinatorConfig{
			PTTTimeout: pttTimeout,
		},
	)

	// Create logging service if enabled
	var loggingStore *storage.SQLiteStore
	var loggingSvc *storage.LoggingService
	if cfg.FeatureFlags.LoggingEnabled {
		storeCfg := storage.DefaultSQLiteConfig()
		storeCfg.Path = "data/cleancomms.db"
		var err error
		loggingStore, err = storage.NewSQLiteStore(storeCfg)
		if err != nil {
			logger.Error("failed to create logging store", "error", err)
		} else {
			loggingCfg := storage.DefaultLoggingConfig()
			loggingSvc = storage.NewLoggingService(loggingStore, logger, loggingCfg)
		}
	}

	// Create lookup service if enabled
	var lookupSvc *lookup.Service
	if cfg.FeatureFlags.LookupEnabled {
		lookupCfg := lookup.ServiceConfig{
			HamQTHUsername: cfg.Lookup.HamQTHUsername,
			HamQTHPassword: cfg.Lookup.HamQTHPassword,
		}
		if cfg.Lookup.CacheTTLHours > 0 {
			lookupCfg.CacheTTL = time.Duration(cfg.Lookup.CacheTTLHours) * time.Hour
		}
		lookupSvc = lookup.NewService(lookupCfg, logger)
	}

	return &App{
		config:       cfg,
		logger:       logger,
		rigService:   rigService,
		modemService: modemService,
		coordinator:  coordinator,
		loggingStore: loggingStore,
		loggingSvc:   loggingSvc,
		lookupSvc:    lookupSvc,
	}
}
// Run starts the CleanComms daemon.
func (a *App) Run(ctx context.Context) error {
	a.logger.Info("CleanComms daemon starting",
		"http_addr", a.config.Server.HTTPAddr,
		"rigctld_host", a.config.Rigctld.Host,
		"rigctld_port", a.config.Rigctld.Port,
		"rigctld_model", a.config.Rigctld.ModelID,
		"serial_port", a.config.Rigctld.SerialPort,
		"fldigi_addr", a.config.Fldigi.XMLRPCAddr,
		"default_mode", a.config.Fldigi.DefaultMode,
	)
	// Log policy configuration (kill switches)
	a.logger.Info("policy configuration",
		"ai_enabled", a.config.Policy.AIEnabled,
		"remote_access_enabled", a.config.Policy.RemoteAccessEnabled,
		"auto_apply_suggestions", a.config.Policy.AutoApplySuggestions,
	)

	// Enforce policy: block V2 AI features if not explicitly enabled
	if a.config.FeatureFlags.SignalIdV2Enabled && !a.config.Policy.AIEnabled {
		a.logger.Warn("signal_id_v2_enabled is true but ai_enabled policy is false; disabling signal_id_v2")
		a.config.FeatureFlags.SignalIdV2Enabled = false
	}

	// Enforce policy: block remote access if not explicitly enabled
	if a.config.Remote.Enabled && !a.config.Policy.RemoteAccessEnabled {
		a.logger.Warn("remote.enabled is true but remote_access_enabled policy is false; disabling remote")
		a.config.Remote.Enabled = false
	}

	// Enforce policy: auto_apply_suggestions must ALWAYS be false (hardcoded safety)
	if a.config.Policy.AutoApplySuggestions {
		a.logger.Error("auto_apply_suggestions must be false; forcing to false for safety")
		a.config.Policy.AutoApplySuggestions = false
	}

	// Start rig service (background connection with health checks)
	a.rigService.Start(ctx)

	// Start modem service (background connection with health checks and mode ensure)
	a.modemService.Start(ctx)

	// Start coordinator (watchdog for PTT safety)
	a.coordinator.Start(ctx)

	// Start logging service if enabled
	if a.loggingSvc != nil {
		a.loggingSvc.Start(ctx)
	}

	// Build feature flags map from config
	features := map[string]bool{
		"logging_enabled":      a.config.FeatureFlags.LoggingEnabled,
		"lookup_enabled":       a.config.FeatureFlags.LookupEnabled,
		"map_enabled":          a.config.FeatureFlags.MapEnabled,
		"solar_enabled":        a.config.FeatureFlags.SolarEnabled,
		"signal_id_v2_enabled": a.config.FeatureFlags.SignalIdV2Enabled,
	}

	// Create HTTP server with service adapters
	rigAdapter := &rigClientAdapter{service: a.rigService}
	modemAdapter := &modemClientAdapter{service: a.modemService}
	coordinatorAdapter := &coordinatorClientAdapter{coordinator: a.coordinator}
	
	// Create logging client adapter if service is available
	var loggingAdapter http.LoggingClient
	if a.loggingSvc != nil {
		loggingAdapter = http.NewLoggingClientAdapter(a.loggingSvc)
	}

	// Create lookup client adapter if service is available
	var lookupAdapter http.LookupClient
	if a.lookupSvc != nil {
		lookupAdapter = &lookupClientAdapter{service: a.lookupSvc}
	}

	// Resolve bind address (fail-closed: localhost-only by default)
	bindAddr := resolveBindAddr(a.config)
	a.logger.Info("binding HTTP server", "addr", bindAddr, "remote_enabled", a.config.Remote.Enabled)

a.httpServer = http.NewServer(
		bindAddr,
		a.logger,
		rigAdapter,
		modemAdapter,
		coordinatorAdapter,
		loggingAdapter,
		lookupAdapter,
		nil, // aiClient - V2 feature disabled by default
		features,
	)
	a.logger.Info("CleanComms daemon initialized",
		"rigctld_status", "connecting",
		"fldigi_status", "connecting",
	)

	// Start HTTP server in goroutine
	errCh := make(chan error, 1)
	go func() {
		if err := a.httpServer.Start(); err != nil {
			errCh <- err
		}
	}()

	// Wait for shutdown or error
	select {
	case <-ctx.Done():
		a.logger.Info("CleanComms daemon shutting down")
	case err := <-errCh:
		a.logger.Error("HTTP server error", "error", err)
		return err
	}

	// Graceful shutdown
	if err := a.httpServer.Shutdown(ctx); err != nil {
		a.logger.Error("HTTP server shutdown error", "error", err)
	}

	// Stop coordinator first (ensures PTT is released)
	a.coordinator.Stop()

	if err := a.rigService.Stop(); err != nil {
		a.logger.Error("Rig service shutdown error", "error", err)
	}

	if err := a.modemService.Stop(); err != nil {
		a.logger.Error("Modem service shutdown error", "error", err)
	}

	// Stop logging service
	if a.loggingSvc != nil {
		if err := a.loggingSvc.Stop(); err != nil {
			a.logger.Error("Logging service shutdown error", "error", err)
		}
	}

	return nil
}

// rigClientAdapter adapts RigService to http.RigClient interface.
type rigClientAdapter struct {
	service *RigService
}

func (a *rigClientAdapter) Status() http.RigStatus {
	s := a.service.Status()
	return http.RigStatus{
		Frequency: s.Frequency,
		Mode:      s.Mode,
		PTT:       s.PTT,
		Connected: s.Connected,
	}
}

func (a *rigClientAdapter) SetPTT(state bool) (bool, error) {
	return a.service.SetPTT(state)
}

func (a *rigClientAdapter) Health() http.HealthStatus {
	h := a.service.Health()
	return http.HealthStatus{
		OK:      h.OK,
		Message: h.Error,
	}
}

// rigControllerAdapter adapts RigService to control.RigController interface.
// rigControllerAdapter adapts RigService to control.RigController interface.
type rigControllerAdapter struct {
	service *RigService
}

func (a *rigControllerAdapter) SetPTT(state bool) (bool, error) {
	return a.service.SetPTT(state)
}

func (a *rigControllerAdapter) Health() control.RigHealthStatus {
	h := a.service.Health()
	return control.RigHealthStatus{
		OK:    h.OK,
		Error: h.Error,
	}
}

// modemControllerAdapter adapts ModemService to control.ModemController interface.
type modemControllerAdapter struct {
	service *ModemService
}

func (a *modemControllerAdapter) SetTX(tx bool) error {
	return a.service.SetTX(tx)
}

func (a *modemControllerAdapter) Health() control.ModemHealthStatus {
	h := a.service.Health()
	return control.ModemHealthStatus{
		OK:    h.OK,
		Error: h.Error,
	}
}

// coordinatorClientAdapter adapts control.Coordinator to http.CoordinatorClient interface.
type coordinatorClientAdapter struct {
	coordinator *control.Coordinator
}

func (a *coordinatorClientAdapter) SetPTT(tx bool) error {
	return a.coordinator.SetPTT(tx)
}

func (a *coordinatorClientAdapter) GetPTT() bool {
	return a.coordinator.GetPTT()
}

func (a *coordinatorClientAdapter) IsHealthy() bool {
	return a.coordinator.IsHealthy()
}

// lookupClientAdapter adapts lookup.Service to http.LookupClient interface.
type lookupClientAdapter struct {
	service *lookup.Service
}

func (a *lookupClientAdapter) Lookup(ctx context.Context, callsign string) (*lookup.CallsignInfo, error) {
	return a.service.Lookup(ctx, callsign)
}

func (a *lookupClientAdapter) IsEnabled() bool {
	return a.service.IsEnabled()
}
