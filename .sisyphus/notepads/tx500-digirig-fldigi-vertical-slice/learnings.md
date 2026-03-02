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

## 2026-03-02 Task 7: macOS Setup Runbook

### Documentation Structure
- docs/setup/ directory created for setup guides
- Runbook includes: prerequisites, port map, step-by-step setup, verification, troubleshooting matrix

### Port Assignments (Fixed)
- rigctld: 4532 (TCP)
- fldigi XML-RPC: 7362 (HTTP)
- CleanComms: 8080 (HTTP)

### TX-500 + DigiRig Setup Notes
- Serial port pattern: `/dev/cu.usbserial-xxx`
- Hamlib model ID: 2054
- Baud rate: 9600 (fixed per TX-500 spec)
- Audio routing is MANUAL on macOS - no automation
- fldigi XML-RPC endpoint: `http://127.0.0.1:7362/RPC2` (note the /RPC2 path)

### Common Issues Documented
- Serial port in use by other apps
- Audio device selection in macOS
- XML-RPC not enabled in fldigi
- PTT wiring/configuration
- USB power management causing port drops

## 2026-03-02 Task 8: API Contract Tests

### Contract Testing Approach
- Use `map[string]any` to decode JSON responses for type-agnostic field verification
- Check field presence with `if _, exists := resp[field]; !exists`
- Check field types with type assertions: `val.(string)`, `val.(bool)`, `val.(float64)`
- JSON numbers always decode as `float64` in Go's encoding/json

### Contract Test Structure
- Separate test file: `contract_test.go` alongside implementation
- Each endpoint gets its own contract test function
- Verify: Content-Type header, required fields, field types
- PTT contract tests valid and invalid inputs in subtests

### PTT Validation Testing
- Valid states: "tx", "rx" (case-sensitive, lowercase only)
- Invalid states tested: "TX", "RX", "transmit", "receive", "1", "0", "true", "false", ""
- Error response structure: `{"error":"invalid_state","message":"state must be 'tx' or 'rx'"}`
- Malformed JSON returns: `{"error":"invalid_request","message":"failed to parse request body"}`

### Response Structures Verified
- HealthResponse: status (string), rigctld (string), fldigi (string)
- RigStatus: frequency (int64→float64 in JSON), mode (string), ptt (bool), connected (bool)
- ModemStatus: mode (string), tx (bool), connected (bool)
- PTTResponse: state (string)
- ErrorResponse: error (string), message (string, optional)

## 2026-03-02 Task 6: Modem Service Integration

### Service Wrapper Pattern (Following RigService)
- ModemService wraps fldigi.Client with health monitoring and reconnection
- Same BackoffConfig as RigService (shared from same package)
- Start(ctx) / Stop() lifecycle with context cancellation
- Background health check goroutine every 5 seconds
- Connection loop handles auto-reconnect on connection loss

### ModemService Structure
- Fields: client, logger, health, status, connected, reconnecting
- Configuration: xmlrpcAddr, defaultMode, healthInterval, backoffConfig
- Lifecycle: ctx, cancel, wg (sync.WaitGroup for goroutine coordination)

### Health Monitoring
- ModemHealth struct: OK, Error, Mode, LastCheck
- performHealthCheck() probes fldigi via Ping(), GetMode(), GetTX()
- Health degraded logs when transition from OK→not OK
- Health restored logs when transition from not OK→OK

### Mode Management
- SetDefaultMode(string) sets the desired mode after connection
- EnsureMode(string) sets mode idempotently - returns nil if already set
- Mode is ensured after initial connection AND after reconnection
- DO NOT force transmit at startup - only set mode

### Adapter Pattern for HTTP Interface
- modemClientAdapter adapts ModemService to http.ModemClient interface
- Adapter converts internal types to HTTP types (ModemStatus → http.ModemStatus)
- Allows ModemService to be passed to http.NewServer()

### Testing Approach (Following RigService Tests)
- mockFldigiServer using httptest.Server with XML-RPC handler
- Handler parses XML methodCall and returns appropriate XML-RPC response
- Tests for: Connect success, backoff, context cancellation, health, status, EnsureMode
- Tests for Start/Stop lifecycle, health check loop, default mode setting
- Concurrent access test verifies thread safety
- Benchmark tests for Health() and Status() methods

## 2026-03-02 Task 6: Modem Service Integration

### ModemService Architecture
- Wraps `*fldigi.Client` with health monitoring and reconnection
- Package: `internal/app/modem_service.go`
- Uses same lifecycle pattern as RigService: `Start(ctx)`, `Stop()`
- Background goroutines for health check and reconnection

### Lifecycle Pattern (Shared with RigService)
- `NewModemService(xmlrpcURL, logger)` - creates service
- `SetDefaultMode(mode)` - configures mode to ensure after connection
- `Start(ctx)` - starts background health check and connection loops
- `Stop()` - graceful shutdown via context cancellation and WaitGroup
- Internal `connectionLoop` handles initial connect and reconnection
- Internal `healthCheckLoop` probes every 5 seconds when connected

### Exponential Backoff
- `BackoffConfig` struct: InitialInterval, MaxInterval, Multiplier, MaxAttempts
- Default: 1s initial, 30s max, 2.0 multiplier, unlimited attempts
- Shared between RigService and ModemService via `DefaultBackoffConfig()`

### Adapter Pattern for HTTP Interface
- `modemClientAdapter` adapts `ModemService` to `http.ModemClient`
- Maps internal types (`ModemHealth`, `ModemStatus`) to HTTP types
- Similar adapter for `RigService` → `http.RigClient`

### App Integration
- App struct holds both `rigService` and `modemService`
- `New()` creates both services with config values
- `Run()` starts both services, passes adapters to HTTP server
- Graceful shutdown stops all services in sequence

### Health Monitoring
- `ModemHealth` struct: OK, Error, Mode, LastCheck
- Status changes logged with structured logging (slog)
- Health transitions (OK→degraded, degraded→OK) logged appropriately
- Mode mismatch logged but not forced (idempotent SetMode handles this)

### Thread Safety
- All public methods use `sync.RWMutex` for thread-safe access
- `mu.RLock()` for reads, `mu.Lock()` for writes
- Connection state, health, and status protected by mutex

### Testing Patterns
- Mock fldigi XML-RPC server using `httptest.Server`
- Table-driven tests for multiple scenarios
- Context cancellation tests for backoff behavior
- Concurrent access tests verify thread safety


## 2026-03-02 Task 9: Control Coordinator + PTT Watchdog

### Package Structure
- Package: `internal/control/` - separate from app package for clean separation
- Defines own interfaces (RigController, ModemController) rather than depending on concrete types
- Interfaces allow any implementation to be coordinated, not just app services

### Coordinator Architecture
- `Coordinator` struct orchestrates PTT between rig and modem with safety watchdog
- `CoordinatorConfig` struct: PTTTimeout (default 60s)
- State machine: RX → TX (if healthy) → RX (manual or timeout)
- Thread-safe via `sync.RWMutex` on all state access

### PTT Ordering (Critical for Hardware Safety)
- **Enter TX**: Modem TX first, then Rig PTT - ensures modem ready before RF applied
- **Enter RX**: Rig PTT first, then Modem TX - ensures RF stopped before modem stops
- Rollback on failure: If rig PTT fails during TX entry, modem TX is rolled back

### Watchdog Pattern
- Background goroutine checks every 1 second
- Tracks `lastTXStart` timestamp when entering TX
- If `time.Since(lastTXStart) > pttTimeout`, forces RX with WARN log
- Watchdog started in `Start(ctx)` and stopped via context in `Stop()`

### Error Design
- Sentinel errors: `ErrDegraded`, `ErrNotRunning`
- `ErrDegraded` returned when TX attempted while rig or modem unhealthy
- `ErrNotRunning` returned when `SetPTT()` called before `Start()`

### Interface Design
- `RigController`: `SetPTT(bool) (bool, error)`, `Health() RigHealthStatus`
- `ModemController`: `SetTX(bool) error`, `Health() ModemHealthStatus`
- Separate health status types (RigHealthStatus, ModemHealthStatus) for coordinator
- Interfaces allow mocking in tests without concrete service dependencies

### Testing Patterns
- Mock implementations with sync.RWMutex for thread-safe mock state
- Tests cover: TX blocked when degraded, TX allowed when healthy, forced RX after timeout
- Concurrent access test: 50 goroutines × 100 operations each
- Idempotent state transitions tested (already-in-state returns nil)
- Lifecycle tests: Start is idempotent, Stop is idempotent, Stop without Start is safe

### Lifecycle Management
- `Start(ctx)` is idempotent - safe to call multiple times
- `Stop()` is idempotent - safe to call multiple times or without Start
- Stop sets internal state to RX for clean shutdown
- WaitGroup ensures watchdog goroutine exits before Stop returns

### Health Check Before TX
- `IsHealthy()` checks both `rig.Health().OK` and `modem.Health().OK`
- `enterTX()` checks health before attempting state change
- Logs health state when blocking TX due to degradation
## 2026-03-02 Task 10: Smoke/Integration Scripts

### Smoke Test Script Design
- Location: `scripts/smoke-tx500-fldigi.sh`
- Exit codes: 0 (pass), 1 (fail), 2 (missing dependency)
- Options: `--skip-daemon` for partial testing, `--evidence-dir` for custom output

### Dependency Check Pattern
- Use bash arrays for dependency list (rigctld, fldigi, daemon)
- Port check uses: `nc -z` (preferred), `lsof -i`, or `/dev/tcp` fallback
- Each dependency check includes remediation hint in output

### Port Detection
- rigctld: 4532 (TCP) - check with `\get_freq` command
- fldigi XML-RPC: 7362 (HTTP) - check with `fldigi.version` method
- CleanComms daemon: 8080 (HTTP) - check `/health` endpoint

### Functional Check Pattern
- PSK31 mode: query `modem.get_name` via XML-RPC
- PTT toggle: POST to `/api/v1/rig/ptt` with `{"state":"rx"}`
- Status endpoints: `/api/v1/rig/status`, `/api/v1/modem/status`

### PTT Watchdog Test Design
- Location: `scripts/test-ptt-watchdog.sh`
- Tests forced RX behavior via PTT API
- Verifies watchdog coordinator is active via health endpoint
- Tests idempotent RX commands for safety
- Exit code 2 when daemon unavailable (distinct from failure)

### Evidence File Pattern
- Write to `.sisyphus/evidence/task-10-*.txt`
- Include timestamp, all check results, summary counts
- Timestamp in ISO 8601 format: `date -u +"%Y-%m-%dT%H:%M:%SZ"`

### CI/No-Hardware Considerations
- Scripts use `--skip-daemon` option for partial testing
- Port checks gracefully degrade when tools unavailable
- Warnings instead of failures for degraded states (hardware not connected)
- Explicit skip messages for unavailable checks

## 2026-03-02 Task 11: Operator Evidence Pack

### Evidence Checklist Script Design
- Location: `scripts/check-evidence.sh`
- Lists all expected evidence files from tasks 1-11
- Checks existence and non-empty status of each file
- Verbose mode with `--verbose` or `-v` flag
- Exit code 0 if all files found, 1 if any missing/empty

### Expected Evidence Files Pattern
- Happy path evidence: `task-N-description.txt`
- Error case evidence: `task-N-description-error.txt`
- Each task should have both happy path AND error case evidence
- Files stored in `.sisyphus/evidence/`

### Evidence Pack Contents
- Metadata: timestamp, platform, architecture, Go version
- Evidence checklist results with file sizes
- Environment assumptions (runtime, external deps, hardware)
- Build and test verification output
- Notes on missing evidence and recommendations

### Environment Assumptions Documented
- Platform: macOS (Darwin) ARM64
- Go version requirement: 1.21+
- External dependencies with port numbers (rigctld:4532, fldigi:7362)
- Hardware: TX-500, DigiRig, serial port pattern

### Script Output Format
- Header with timestamp
- Individual file status: [FOUND], [MISSING], [EMPTY]
- Summary counts: total expected, found, empty, missing
- Final PASS/FAIL verdict with exit code

### Evidence File Naming Convention
- Pattern: `task-{number}-{description}.{ext}`
- Examples: `task-1-go-scaffold.txt`, `task-9-ptt-watchdog-error.txt`
- Description uses kebab-case, matches QA scenario name



## 2026-03-02 Task 12: Final Verification Sweep

### Verification Command Chain
- Run `go test ./...` first - should exit 0
- Run `go build ./...` second - should exit 0
- Run smoke scripts with `|| true` to capture output even on failure
- Smoke scripts expected to fail without hardware (graceful degradation)

### Expected Hardware Failure Behavior
- Smoke script exit code 1 with "FAILED" status
- PTT watchdog exit code 2 with "SKIPPED" status
- Scripts must identify specific missing dependencies by name and port
- Scripts should provide helpful start commands for each missing dep

### Final Audit Report Structure
- Timestamp and audit type header
- Verification summary with overall PASS/FAIL banner
- Each step with: command, exit code, status, output, notes
- Evidence file references for traceability
- Acceptance criteria checklist with [✓] markers
- Component status table for quick reference

### Exit Code Semantics for Scripts
- 0: Success (all checks passed)
- 1: Failure (checks failed, actionable errors)
- 2: Skipped (prerequisites not met, cannot run)
- This distinction helps distinguish "failed" vs "cannot run"

### Verification Pass Criteria
- Unit tests: must pass (exit 0)
- Build: must succeed (exit 0)
- Smoke scripts: must run and report gracefully (exit non-zero is expected)
- All evidence files must be referenced in audit report
## 2026-03-02 Task 5: Rig Service Integration

### Service Wrapper Pattern
- RigService wraps `*rigctld.Client` with health monitoring and reconnection
- Package: `internal/app/rig_service.go`
- Same BackoffConfig pattern used for ModemService
- Start(ctx) / Stop() lifecycle with context cancellation

### RigService Structure
- Fields: client, logger, health, status, connected, reconnecting
- Configuration: host, port, healthInterval, backoffConfig
- Lifecycle: ctx, cancel, wg (sync.WaitGroup for goroutine coordination)
- Health interval: 5 seconds (default)

### Exponential Backoff Configuration
- BackoffConfig struct: InitialInterval (1s), MaxInterval (30s), Multiplier (2.0), MaxAttempts (0=unlimited)
- Backoff sequence: 1s → 2s → 4s → 8s → 16s → 30s (capped)
- All retry failures logged with attempt count and next retry interval
- Context cancellation honored between retry attempts

### Health Monitoring
- RigHealth struct: OK, Error, LastCheck
- performHealthCheck() uses client.Ping() to verify connection
- Health status updated on every health check cycle
- Connection loss triggers automatic reconnection attempt

### Connection State Management
- connected bool tracks current connection state
- reconnecting bool prevents multiple concurrent reconnect attempts
- Background connectionLoop monitors state and initiates reconnect
- Reconnection runs in separate goroutine to avoid blocking health checks

### Status Retrieval
- Status() fetches live values: Frequency, Mode, PTT from rigctld
- Returns disconnected status if not connected
- Caches last known status internally for efficiency
- All errors during status fetch logged but don't fail the call

### Adapter Pattern for HTTP Interface
- rigClientAdapter adapts RigService to http.RigClient interface
- Maps RigHealth → http.HealthStatus (Error → Message field mapping)
- Maps RigStatus → http.RigStatus (direct field mapping)
- Allows RigService to be passed to http.NewServer()

### Thread Safety
- All public methods use `sync.RWMutex` for thread-safe access
- `mu.RLock()` for reads (Health, Status, IsConnected)
- `mu.Lock()` for writes (Connect, performHealthCheck)
- Concurrent access tested with 10 goroutines × 10 operations

### Testing Approach
- mockRigctldServer pattern: TCP server on random port with response map
- Tests for: Connect success, backoff timing, context cancellation
- Health transition tests verify OK→degraded state changes
- Start/Stop lifecycle tests verify goroutine cleanup
- Benchmark tests for Health() and Status() methods
- Mock server records requests for verification

### App Integration
- App struct holds `rigService *RigService`
- `New()` creates RigService with config.Rigctld.Host/Port
- `Run()` calls rigService.Start(ctx) to begin background loops
- HTTP server receives rigClientAdapter wrapping the service
- Graceful shutdown: HTTP server first, then rigService.Stop()