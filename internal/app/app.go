// Package app provides the core application scaffold for CleanComms daemon.
package app

import (
	"context"
	"log/slog"
	"os"

	"github.com/Zerostate-IO/CleanComms/internal/config"
	"github.com/Zerostate-IO/CleanComms/internal/http"
)

// App represents the CleanComms daemon application.
type App struct {
	config       *config.Config
	logger       *slog.Logger
	rigService   *RigService
	modemService *ModemService
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

	return &App{
		config:       cfg,
		logger:       logger,
		rigService:   rigService,
		modemService: modemService,
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

	// Create HTTP server with service adapters
	rigAdapter := &rigClientAdapter{service: a.rigService}
	modemAdapter := &modemClientAdapter{service: a.modemService}
	a.httpServer = http.NewServer(a.config.Server.HTTPAddr, a.logger, rigAdapter, modemAdapter)

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
