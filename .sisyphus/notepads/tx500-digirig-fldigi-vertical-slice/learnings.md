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

## 2026-03-02 Task 4: HTTP API

### HTTP Server Architecture
- Package location: `internal/http/` - follows Go stdlib patterns with `net/http`
- Server struct holds dependencies via interfaces (RigClient, ModemClient) for testability
- Route registration via `http.ServeMux` with method-path patterns: `GET /health`, `POST /api/v1/rig/ptt`
- Server timeouts configured: ReadTimeout=10s, WriteTimeout=10s, IdleTimeout=60s

### API Design Patterns
- Health endpoint aggregates dependency health: `{"status":"ok|degraded","rigctld":"...","fldigi":"..."}`
- API versioning: `/api/v1/` prefix for all data endpoints
- Error responses include both error code and human-readable message
- PTT validation: only `"tx"` or `"rx"` accepted, returns 400 with allowed values

### Testing Approach
- httptest.NewRecorder for response capture
- Stub implementations (StubRigClient, StubModemClient) with function fields for flexible test scenarios
- Table-driven tests for multiple scenarios per endpoint
- JSON encoding/decoding tests verify response structure

### Interface Design for Parallel Development
- RigClient interface: Status(), SetPTT(bool), Health()
- ModemClient interface: Status(), Health()
- Interfaces allow Tasks 5/6 (rigctld/fldigi clients) to proceed independently
- Nil client handling returns 503 Service Unavailable

## 2026-03-02 Task 2: rigctld Client

### rigctld Protocol
- Commands are backslash-prefixed: `\set_freq`, `\get_freq`, `\set_mode`, `\get_mode`, `\set_ptt`, `\get_ptt`, `\chk_vfo`
- Commands are newline-terminated
- Success responses: `RPRT 0` for set commands, value for get commands
- Error responses: `RPRT -N` where N is error code (e.g., -1 invalid, -2 not implemented)
- get_mode returns TWO lines: mode name and passband width

### TCP Client Design
- Package: `internal/rigctld/`
- Uses stdlib only: `net`, `bufio`, `sync`, `time`
- Thread-safe via mutex on all public methods
- Connection timeout: 5s default, configurable via `SetTimeout()`
- Buffered I/O via `bufio.Reader` for line-by-line reading
- Deadline set per-operation (not just on connect)

### Error Handling Strategy
- Sentinel errors: `ErrNotConnected`, `ErrConnectionRefused`, `ErrTimeout`, `ErrMalformedResponse`, `ErrCommandFailed`
- ErrorCode type maps rigctld numeric codes to descriptions
- CommandError wraps errors with command name and context
- Helper functions: `IsConnectionError()`, `IsProtocolError()` for classification

### Mock Server Pattern for Testing
- `mockServer` struct listens on random port (`127.0.0.1:0`)
- Response map: command pattern → response string
- Records all requests for verification
- Goroutine handles each connection with `bufio.Reader`

### Response Parsing Gotchas
- Frequency may be plain number or `Frequency: NNNN` format
- Mode response is multiline, need to read until 2 newlines
- PTT state is 0 (RX) or 1 (TX) as string

## 2026-03-02 Task 3: fldigi XML-RPC Client

### XML-RPC Protocol
- Endpoint: `http://127.0.0.1:7362/RPC2` (note the /RPC2 path)
- Content-Type: `text/xml`
- Request format: `<methodCall><methodName>...</methodName><params>...</params></methodCall>`
- Response format: `<methodResponse><params><param><value>...</value></param></params></methodResponse>`
- Fault format: `<methodResponse><fault><value><struct><member>...</member></struct></value></fault></methodResponse>`

### fldigi XML-RPC Methods
- `fldigi.version()` → string (version info)
- `modem.get_name()` → string (current mode like "PSK31")
- `modem.set_by_name(name)` → int (0 on success)
- `main.get_tx()` → int (0=RX, 1=TX)
- `main.set_tx(state)` → int (0 on success)
- `frequency.get()` → int (Hz)
- `frequency.set(hz)` → int (0 on success)

### XML-RPC Client Design (Stdlib Only)
- Package: `internal/fldigi/`
- Uses stdlib only: `encoding/xml`, `net/http`, `sync`, `time`, `context`
- No external dependencies (removed github.com/kolo/xmlrpc)
- Thread-safe via mutex on all public methods
- Default timeout: 5s, configurable via `SetTimeout()`
- HTTP client timeout handles overall request timeout

### XML Encoding/Decoding with encoding/xml
- Define structs with XML tags matching XML-RPC schema
- Use `xml.Marshal` to encode requests
- Use `xml.Unmarshal` to decode responses
- Prepend `<?xml version="1.0"?>` header to marshaled output
- Handle both `<int>` and `<i4>` tags for integer values

### Error Handling
- `FaultError` struct for XML-RPC faults with Code and String
- `ConnectionError` struct wraps connection errors with address context
- `errors.Is()` compatibility via `Is()` method on FaultError
- Connection refused detection via string matching on error message

### Idempotent Mode Setting
- `SetMode()` first checks current mode via `modem.get_name()`
- Only calls `modem.set_by_name()` if mode differs (case-insensitive compare)
- Prevents unnecessary mode changes that could disrupt operation

### Mock Server Testing Pattern
- `httptest.Server` with custom handler for XML-RPC responses
- Handler parses method name from XML request
- Returns appropriate XML-RPC response based on method
- Simulates connection refused by using closed port
- Simulates timeout with delayed response
