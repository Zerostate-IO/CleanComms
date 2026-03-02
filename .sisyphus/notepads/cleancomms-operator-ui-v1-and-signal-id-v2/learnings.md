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


## Task 3: NA Bandplan and Frequency Datasets (2026-03-02)

### Data Directory Structure
- `data/bandplans/schema/` - JSON schemas for bandplan validation
- `data/bandplans/*.json` - Regional bandplan data files
- `data/frequencies/schema/` - JSON schemas for frequency datasets
- `data/frequencies/*.json` - Common/calling frequency data files

### Schema Pattern (following radio-capability.schema.json)
- `$schema`: JSON Schema draft 2020-12
- `$id`: GitHub-based identifier URL
- `title`, `description` for documentation
- `required` array for mandatory fields
- `additionalProperties: false` for strict validation
- `$defs` for reusable type definitions

### Bandplan Schema Design
- Required: `schema_version`, `region`, `version`, `bands`
- Band object: `name`, `start_hz`, `end_hz`, `modes`, optional `license_class`, `power_limit_watts`, `notes`
- Mode enum: CW, SSB, LSB, USB, AM, FM, RTTY, DATA, FT8, FT4, PSK31, JS8, WSPR, JT65, JT9, SSTV, FAX
- Frequencies stored as integers (Hz) for precision

### Frequency Dataset Design
- Required: `schema_version`, `region`, `version`, `frequencies`
- Frequency entry: `frequency_hz`, `mode`, `band`, `description`
- Optional: `category` (calling, digital, cw, voice, emergency, beacon, repeater, satellite, experimental)
- Optional: `tags` array for filtering

### NA Bandplan Coverage (10 HF bands)
- 160m, 80m, 60m, 40m, 30m, 20m, 17m, 15m, 12m, 10m
- WARC bands (30m, 17m, 12m) marked with notes about secondary allocation
- LSB voice convention below 10 MHz, USB above 10 MHz

### Common NA Frequencies (61 entries)
- FT8: All bands from 160m to 10m (WSJT-X standard frequencies)
- FT4: Contest mode on most bands
- PSK31, RTTY: Traditional digital modes
- JS8/JS8Call: Weak-signal messaging
- WSPR: Propagation beacons
- CW and SSB calling frequencies
- FM simplex on 10m

### Validation Script Design
- `scripts/validate-data.sh` uses jq for structural validation
- Checks required fields, array lengths, mandatory bands
- Mandatory bands for NA: 20m, 40m, 80m
- Exits 0 on success, 1 on failure
- Color-coded output for readability

### Key Reference Frequencies (Hz)
- FT8: 1840000, 3573000, 5357000, 7074000, 10136000, 14074000, 18100000, 21074000, 24915000, 28074000
- WSPR: 3568600, 7038600, 10138700, 14095600, 18104600, 21094600, 24924600, 28124600
- JS8Call: 3582000, 7078000, 10130000, 14078000, 18102000, 21078000, 24922000, 28078000


## Task 4: SQLite WAL Logging Store (2026-03-02)

### Storage Package Structure
- `internal/storage/sqlite.go` - SQLite connection wrapper with WAL mode
- `internal/storage/schema.go` - Database schema definitions
- `internal/storage/logging.go` - Async logging service implementation
- `internal/storage/logging_test.go` - Unit tests with burst load verification

### SQLite Configuration Best Practices
- `PRAGMA journal_mode=WAL` - Write-Ahead Logging for better concurrent access
- `PRAGMA synchronous=NORMAL` - Safe async writes with WAL mode
- `PRAGMA busy_timeout=5000` - Handle concurrent access gracefully
- Ensure parent directory exists before opening database

### Async Write Pattern
- Buffered channel for write requests (default: 1000 entries)
- Background goroutine batches writes (default: 100 entries)
- Flush interval (default: 100ms) ensures bounded latency
- Non-blocking API responses - writes happen in background
- `LogQSO()` is async, `LogQSOSync()` for synchronous writes

### Database Schema
- `qso_log` table: id, timestamp, callsign, frequency_hz, mode, power_watts, notes, source
- `events` table: id, timestamp, type, category, data (JSON)
- `profiles` table: id, name, callsign, grid_locator, station_name, antenna, power_watts, is_default
- Indexes on timestamp and callsign for efficient queries

### Health Check Integration
- `LoggingService.Health()` returns buffer stats and DB health
- Health check must handle nil store gracefully
- Added `logging` field to `/health` endpoint response
- Logging health contributes to overall system health status

### HTTP API Endpoints
- `POST /api/v1/log` - Create new QSO entry (async, non-blocking)
- `GET /api/v1/log?limit=100&offset=0` - List entries with pagination
- Validation: callsign, frequency_hz, mode are required
- Default source: "api" if not specified

### Performance Results
- Burst load test: 1000 inserts in ~1ms
- Async writes ensure UI/API never blocks on log operations
- WAL mode enables concurrent reads during writes

### Error Handling
- Nil store check in `Health()` to prevent panic
- Service returns error if not healthy (won't accept writes)
- DB unavailable fallback test validates graceful degradation


## Task 5: Callsign Lookup with HamQTH + FCC Fallback (2026-03-02)

### Package Structure
- `internal/lookup/provider.go` - Provider interface and CallsignInfo type
- `internal/lookup/hamqth.go` - HamQTH API implementation with session management
- `internal/lookup/fcc.go` - FCC ULS API for US callsigns only
- `internal/lookup/cache.go` - In-memory cache with TTL
- `internal/lookup/service.go` - LookupService with provider chain
- `internal/lookup/lookup_test.go` - Comprehensive unit tests
- `internal/http/handlers_lookup.go` - HTTP handler and stub client

### Provider Interface Design
```go
type Provider interface {
    Name() string                                    // Source attribution
    Lookup(ctx context.Context, callsign string) (*CallsignInfo, error)
    Supports(callsign string) bool                   // Skip unsupported callsigns
}
```

### Provider Chain Pattern
- Providers ordered by priority: HamQTH (primary), FCC (fallback)
- `Supports()` method allows skipping providers that can't handle the callsign
- FCC only supports US callsigns (K*, W*, N*, AA-AL prefixes)
- Chain stops on `ErrNotFound` (definitive "not found")
- Chain continues on `ErrProviderDown` (try next provider)

### US Callsign Detection
- Prefix K, W, N: always US
- Prefix A with second letter A-L: US amateur (AA-AL)
- AM and beyond: not US amateur

### HamQTH Session Management
- Session-based auth: POST /xml.php?u=USER&p=PASS
- Session ID valid for ~1 hour, refresh 5 minutes before expiry
- Store session with mutex protection for concurrent access
- Query: GET /xml.php?id=SESSION&callsign=CALLSIGN

### Cache Layer Design
- In-memory map with mutex protection
- Configurable TTL (default 24 hours)
- Case-insensitive keys (normalized to uppercase)
- Errors are NOT cached (allows retry)
- `Prune()` method removes expired entries

### CachedProvider Wrapper
- Wraps any Provider with caching
- Transparent caching layer - same interface
- Returns cached result immediately if valid
- Falls through to provider on cache miss or expiry

### HTTP Handler Design
- Endpoint: `GET /api/v1/lookup/{callsign}`
- Feature flag check: `lookup_enabled` controls availability
- Returns 503 if service not configured
- Returns 404 if callsign not found
- Response includes source attribution (hamqth, fcc)

### Config Additions
```yaml
lookup:
  hamqth_username: ""
  hamqth_password: ""
  cache_ttl_hours: 24  # default
```

### Adapter Pattern (Following Existing Pattern)
- `lookupClientAdapter` adapts `lookup.Service` to `http.LookupClient`
- Created in `app.go` alongside other adapters
- Nil-safe: if lookupSvc is nil, adapter is nil

### Test Coverage
- `TestIsUSCallsign` - US prefix detection
- `TestCache` - Set/Get/Delete/Clear operations
- `TestCacheExpiry` - TTL expiration
- `TestCachePrune` - Expired entry removal
- `TestCachedProvider` - Cache hit/miss behavior
- `TestCachedProvider_PropagatesError` - Errors not cached
- `TestService_ProviderChain` - Primary failure -> fallback
- `TestService_SkipUnsupportedProvider` - Non-US skips FCC
- `TestService_NotFound` - Not found handling
- `TestService_EmptyCallsign` - Input validation
- `TestService_Disabled` - Service disabled handling

### Key Learnings
- `slog.Logger` panics on nil - always provide logger or use `slog.Default()`
- Test with `slog.Default()` when logger is needed
- Cache wrapper pattern enables transparent caching without modifying providers
- Provider interface with `Supports()` enables flexible filtering

### Files Created
- `internal/lookup/provider.go` (66 lines)
- `internal/lookup/hamqth.go` (231 lines)
- `internal/lookup/fcc.go` (170 lines)
- `internal/lookup/cache.go` (166 lines)
- `internal/lookup/service.go` (163 lines)
- `internal/lookup/lookup_test.go` (372 lines)
- `internal/http/handlers_lookup.go` (128 lines)
