// Package config provides configuration loading and validation for CleanComms.
package config

// Config represents the top-level configuration structure for CleanComms.
// Config represents the top-level configuration structure for CleanComms.
type Config struct {
	Server       ServerConfig  `yaml:"server"`
	Rigctld      RigctldConfig `yaml:"rigctld"`
	Fldigi       FldigiConfig  `yaml:"fldigi"`
	Safety       SafetyConfig  `yaml:"safety"`
	Lookup       LookupConfig  `yaml:"lookup"`
	FeatureFlags FeatureFlags  `yaml:"feature_flags"`
}

// ServerConfig holds HTTP server settings.
type ServerConfig struct {
	HTTPAddr string `yaml:"http_addr"`
}

// RigctldConfig holds rigctld connection settings.
type RigctldConfig struct {
	Host       string `yaml:"host"`
	Port       int    `yaml:"port"`
	ModelID    int    `yaml:"model_id"`
	SerialPort string `yaml:"serial_port"`
	BaudRate   int    `yaml:"baud_rate"`
}

// FldigiConfig holds fldigi XML-RPC connection settings.
type FldigiConfig struct {
	XMLRPCAddr  string `yaml:"xmlrpc_addr"`
	DefaultMode string `yaml:"default_mode"`
}

// SafetyConfig holds safety-related settings.
type SafetyConfig struct {
	PTTTimeoutSeconds int `yaml:"ptt_timeout_seconds"`
}

// LookupConfig holds callsign lookup settings.
type LookupConfig struct {
	HamQTHUsername string `yaml:"hamqth_username"`
	HamQTHPassword string `yaml:"hamqth_password"`
	CacheTTLHours  int    `yaml:"cache_ttl_hours"` // Default: 24
}

// FeatureFlags holds feature flag settings for V1 modules and V2 gates.
type FeatureFlags struct {
	LoggingEnabled    bool `yaml:"logging_enabled"`
	LookupEnabled     bool `yaml:"lookup_enabled"`
	MapEnabled        bool `yaml:"map_enabled"`
	SolarEnabled      bool `yaml:"solar_enabled"`
	SignalIdV2Enabled bool `yaml:"signal_id_v2_enabled"`
}
