# CleanComms Operator UI V1 + Signal-ID V2 Learnings

## Session Start: 2026-03-02

### Inherited from tx500-digirig-fldigi-vertical-slice
- Coordinator exists at `internal/control/coordinator.go` with full PTT watchdog/safety logic
- Coordinator NOT wired to App - needs integration
- App lifecycle: New() -> Start(ctx) services -> HTTP server -> graceful shutdown
- Service pattern: RigService, ModemService wrap clients with health/reconnect
- Adapter pattern: service -> http.Client interface via adapter structs
- HTTP server uses interfaces (RigClient, ModemClient) for testability
- Health endpoint aggregates dependency health

### Key Architecture Points
- PTT ordering: TX=modem-first-then-rig, RX=rig-first-then-modem (RF safety)
- Coordinator guards TX when rig or modem unhealthy
- Config schema: ServerConfig, RigctldConfig, FldigiConfig, SafetyConfig


## Task 1: Wire Coordinator + Feature Flags (2026-03-02)

### Feature Flags Architecture
- `FeatureFlags` struct in `internal/config/schema.go` with YAML tags
- V1 modules default to enabled: logging, lookup, map, solar
- V2 signal-id gate defaults to disabled
- Exposed in health endpoint under `features` key

### Coordinator Integration Pattern
- Create adapters that implement `control.RigController` and `control.ModemController`
- `rigControllerAdapter` adapts `RigService` to coordinator's interface
- `modemControllerAdapter` adapts `ModemService` to coordinator's interface
- `coordinatorClientAdapter` adapts `Coordinator` to `http.CoordinatorClient`
- Coordinator initialized in `New()` with PTT timeout from config
- Coordinator started in `Run()` BEFORE HTTP server
- Coordinator stopped in shutdown BEFORE services (ensures PTT released)

### HTTP Layer Changes
- Added `CoordinatorClient` interface: `SetPTT(bool) error`, `GetPTT() bool`, `IsHealthy() bool`
- `handlePTT()` routes through CoordinatorClient, NOT direct RigClient
- `HealthResponse` extended with `Features map[string]bool` and `Coordinator string`
- Error code changed from `ptt_failed` to `ptt_blocked` when coordinator blocks TX

### New Method Required on ModemService
- `SetTX(tx bool) error` added for `control.ModemController` interface
- Calls `client.SetTX()` and updates cached status

### Test Updates Required
- All test files using `newTestServer()` need coordinator and features params
- `StubCoordinatorClient` added for testing
- Contract tests now verify `features` and `coordinator` fields in health response

### Adapter Pattern Variations
- `rigClientAdapter`: RigService -> http.RigClient (status, setPTT, health)
- `modemClientAdapter`: ModemService -> http.ModemClient (status, health)
- `rigControllerAdapter`: RigService -> control.RigController (setPTT, health)
- `modemControllerAdapter`: ModemService -> control.ModemController (setTX, health)
- `coordinatorClientAdapter`: Coordinator -> http.CoordinatorClient (setPTT, getPTT, isHealthy)

### PTT Error Response Changes
- Old: `{"error":"ptt_failed","message":"..."}` when rig command fails
- New: `{"error":"ptt_blocked","message":"system degraded: cannot enter TX mode"}` when coordinator blocks

