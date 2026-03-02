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
	AI           AIConfig      `yaml:"ai"`
	FeatureFlags FeatureFlags  `yaml:"feature_flags"`
	Remote       RemoteConfig  `yaml:"remote"`
	Policy       PolicyConfig  `yaml:"policy"`
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

// AIConfig holds AI/ML service settings for signal classification.
// This is a V2 feature and is disabled by default.
type AIConfig struct {
	// Enabled controls whether the AI service is active.
	Enabled bool `yaml:"enabled"`

	// ModelPath is the path to the ML model file.
	ModelPath string `yaml:"model_path"`

	// MaxQueueSize is the maximum number of pending classification jobs.
	MaxQueueSize int `yaml:"max_queue_size"`

	// MaxConcurrent is the maximum number of concurrent classification jobs.
	MaxConcurrent int `yaml:"max_concurrent"`

	// TimeoutSeconds is the timeout for classification operations.
	TimeoutSeconds int `yaml:"timeout_seconds"`
}


// FeatureFlags holds feature flag settings for V1 modules and V2 gates.
type FeatureFlags struct {
	LoggingEnabled    bool `yaml:"logging_enabled"`
	LookupEnabled     bool `yaml:"lookup_enabled"`
	MapEnabled        bool `yaml:"map_enabled"`
	SolarEnabled      bool `yaml:"solar_enabled"`
	SignalIdV2Enabled bool `yaml:"signal_id_v2_enabled"`
}

// RemoteConfig holds VPN-only remote access settings.
// Security is provided by VPN; no TLS/auth at app layer.
// Fail-closed: bind must be explicit IP, never 0.0.0.0.
 type RemoteConfig struct {
	Enabled bool   `yaml:"enabled"` // Default: false
	Bind    string `yaml:"bind"`    // Empty = disabled; must be explicit IP if enabled
}

// PolicyConfig holds policy and kill switch settings for V2 AI and remote features.
// All features default to disabled (fail-closed) for security.
type PolicyConfig struct {
	// AIEnabled controls whether V2 AI/ML features are enabled.
	// Default: false (disabled). Must be explicitly enabled.
	AIEnabled bool `yaml:"ai_enabled"`

	// RemoteAccessEnabled controls whether remote access features are enabled.
	// Default: false (disabled). Must be explicitly enabled.
	RemoteAccessEnabled bool `yaml:"remote_access_enabled"`

	// AutoApplySuggestions controls whether AI suggestions are automatically applied.
	// Default: false (disabled). ALWAYS disabled for safety - suggestions must be
	// manually reviewed before application.
	AutoApplySuggestions bool `yaml:"auto_apply_suggestions"`
}
