## 2026-03-02 Task 1: Go Scaffold

### Project Structure
- Standard Go layout: `cmd/cleancomms/` for entrypoint, `internal/app/` for core logic, `internal/config/` for configuration
- Config file location: `configs/tx500-digirig-macos.yaml`

### Configuration Schema Design
- Top-level Config struct with nested ServerConfig, RigctldConfig, FldigiConfig, SafetyConfig
- YAML tags use snake_case (e.g., `http_addr`, `ptt_timeout_seconds`)
- Validation is fail-fast: all required fields must be present and non-empty/positive

### TX-500 Specific Values
- Hamlib model_id: 2054
- Baud rate: 9600 (fixed per Hamlib tx500.c backend)
- Serial port pattern on macOS: `/dev/cu.usbserial-xxx`

### Build-Time Variables
- Version info injected via ldflags: Version, GitCommit, BuildDate
- Default values: "0.0.0-dev", "unknown", "unknown"

### CLI Flags
- `--config`: Path to config file (default: `configs/tx500-digirig-macos.yaml`)
- `--version`: Print version and exit

### Error Handling
- Invalid/missing config exits with code 1 and structured error message
- slog used for structured logging (stdlib)

