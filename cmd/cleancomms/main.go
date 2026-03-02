// Command cleancomms is the main entrypoint for the CleanComms daemon.
package main

import (
	"context"
	"flag"
	"fmt"
	"log/slog"
	"os"
	"os/signal"
	"syscall"

	"github.com/Zerostate-IO/CleanComms/internal/app"
	"github.com/Zerostate-IO/CleanComms/internal/config"
)

// Build-time variables set via ldflags.
var (
	version   = "0.0.0-dev"
	gitCommit = "unknown"
	buildDate = "unknown"
)

func main() {
	// Set version info
	app.Version = version
	app.GitCommit = gitCommit
	app.BuildDate = buildDate

	// Parse command-line flags
	configPath := flag.String("config", "configs/tx500-digirig-macos.yaml", "path to configuration file")
	showVersion := flag.Bool("version", false, "print version information and exit")
	flag.Parse()

	// Handle --version flag
	if *showVersion {
		fmt.Println(app.VersionInfo())
		os.Exit(0)
	}

	// Load configuration
	cfg, err := config.Load(*configPath)
	if err != nil {
		slog.Error("failed to load configuration", "error", err)
		os.Exit(1)
	}

	// Create application
	application := app.New(cfg)

	// Setup signal handling for graceful shutdown
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		sig := <-sigChan
		slog.Info("received signal, initiating shutdown", "signal", sig)
		cancel()
	}()

	// Run the application
	if err := application.Run(ctx); err != nil {
		slog.Error("application error", "error", err)
		os.Exit(1)
	}
}
