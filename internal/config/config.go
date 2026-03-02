package config

import (
	"fmt"
	"os"

	"gopkg.in/yaml.v3"
)

// Load reads and validates configuration from the specified file path.
func Load(path string) (*Config, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("failed to read config file %q: %w", path, err)
	}

	var cfg Config
	if err := yaml.Unmarshal(data, &cfg); err != nil {
		return nil, fmt.Errorf("failed to parse config file %q: %w", path, err)
	}

	if err := cfg.Validate(); err != nil {
		return nil, fmt.Errorf("config validation failed: %w", err)
	}

	return &cfg, nil
}

// Validate checks that all required configuration fields are present and valid.
func (c *Config) Validate() error {
	// Server validation
	if c.Server.HTTPAddr == "" {
		return fmt.Errorf("server.http_addr is required")
	}

	// Rigctld validation
	if c.Rigctld.Host == "" {
		return fmt.Errorf("rigctld.host is required")
	}
	if c.Rigctld.Port <= 0 {
		return fmt.Errorf("rigctld.port must be a positive integer")
	}
	if c.Rigctld.ModelID <= 0 {
		return fmt.Errorf("rigctld.model_id must be a positive integer")
	}
	if c.Rigctld.SerialPort == "" {
		return fmt.Errorf("rigctld.serial_port is required")
	}
	if c.Rigctld.BaudRate <= 0 {
		return fmt.Errorf("rigctld.baud_rate must be a positive integer")
	}

	// Fldigi validation
	if c.Fldigi.XMLRPCAddr == "" {
		return fmt.Errorf("fldigi.xmlrpc_addr is required")
	}
	if c.Fldigi.DefaultMode == "" {
		return fmt.Errorf("fldigi.default_mode is required")
	}

	// Safety validation
	if c.Safety.PTTTimeoutSeconds <= 0 {
		return fmt.Errorf("safety.ptt_timeout_seconds must be a positive integer")
	}

	return nil
}
