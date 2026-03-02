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


## Task 2: Scaffold Frontend Workspace Shell (2026-03-02)

### Frontend Stack Choices
- Vite 6.x for build tooling (fast HMR, modern ESM-first)
- React 18 with TypeScript for type safety
- CSS custom properties (no CSS modules - simpler for this use case)
- Playwright for E2E testing with Chromium

### Component Architecture
- `<App>` - Main shell container, manages all state
- `<Sidebar>` - Collapsible navigation, uses CSS transitions
- `<TabStrip>` - Horizontal tab list with explicit activation pattern
- `<ActivateButton>` - Separate from tabs, only appears when needed
- `<WorkspaceContent>` - Main content area with status panels

### Explicit Activation Pattern
- `focusedTabId` - UI highlight only, does NOT change radio state
- `activeTabId` - The tab currently controlling the live radio
- Activate button only appears when focused !== active
- Clicking Activate moves focusedTabId -> activeTabId
- This safety pattern prevents accidental radio changes

### CSS Architecture
- CSS custom properties for theming (--bg-primary, --accent-primary, etc.)
- Responsive breakpoints at 1400px and 1600px
- Dark industrial aesthetic with JetBrains Mono + Space Grotesk fonts
- Custom scrollbars, focus states, animations

### TypeScript Setup
- `vite-env.d.ts` required for CSS imports: `declare module '*.css'`
- Separate `types/index.ts` for data models
- `types/components.ts` for component prop interfaces
- Strict mode enabled with unused variable checks

### Playwright Configuration
- WebServer auto-starts dev server for tests
- Tests run against Chromium only (faster CI)
- Viewport tests for responsive breakpoints (1366x768, 2560x1440)
- Tests verify tab focus vs activation safety pattern
