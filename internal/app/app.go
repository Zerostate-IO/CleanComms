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
)

// App represents the CleanComms daemon application.
type App struct {
	config       *config.Config
	logger       *slog.Logger
	rigService   *RigService
	modemService *ModemService
	coordinator  *control.Coordinator
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

	return &App{
		config:       cfg,
		logger:       logger,
		rigService:   rigService,
		modemService: modemService,
		coordinator:  coordinator,
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

	// Start rig service (background connection with health checks)
	a.rigService.Start(ctx)

	// Start modem service (background connection with health checks and mode ensure)
	a.modemService.Start(ctx)

	// Start coordinator (watchdog for PTT safety)
	a.coordinator.Start(ctx)

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
	a.httpServer = http.NewServer(
		a.config.Server.HTTPAddr,
		a.logger,
		rigAdapter,
		modemAdapter,
		coordinatorAdapter,
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
