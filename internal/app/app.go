// Package app provides the core application scaffold for CleanComms daemon.
package app

import (
	"context"
	"log/slog"
	"os"

	"github.com/Zerostate-IO/CleanComms/internal/config"
)

// App represents the CleanComms daemon application.
type App struct {
	config *config.Config
	logger *slog.Logger
}

// New creates a new App instance with the given configuration.
func New(cfg *config.Config) *App {
	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	}))

	return &App{
		config: cfg,
		logger: logger,
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
	)

	// TODO: Initialize rigctld connection
	// TODO: Initialize fldigi XML-RPC client
	// TODO: Start HTTP server
	// TODO: Start PTT watchdog

	a.logger.Info("CleanComms daemon initialized (placeholder - no connections yet)")

	// Block until context is cancelled
	<-ctx.Done()
	a.logger.Info("CleanComms daemon shutting down")

	return nil
}
