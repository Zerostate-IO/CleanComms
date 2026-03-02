// Package config provides configuration loading and validation for CleanComms.
package config

// Config represents the top-level configuration structure for CleanComms.
type Config struct {
	Server  ServerConfig  `yaml:"server"`
	Rigctld RigctldConfig `yaml:"rigctld"`
	Fldigi  FldigiConfig  `yaml:"fldigi"`
	Safety  SafetyConfig  `yaml:"safety"`
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
