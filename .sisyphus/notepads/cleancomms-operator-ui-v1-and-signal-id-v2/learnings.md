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



## Task 7: Intent + Operating Profile Flow (2026-03-02)

### Feature Module Structure
- `frontend/src/features/intent/` - Self-contained feature module
- `types.ts` - All TypeScript types for the feature
- `hooks.ts` - Custom hooks for state management
- `IntentPage.tsx` - Main page component
- `IntentSelector.tsx` - Listen/Broadcast toggle
- `ModeFamilySelector.tsx` - Mode family and frequency selection
- `ProfileManager.tsx` - Profile CRUD operations
- `index.ts` - Public exports

### Intent Types
- `IntentType`: 'listen' | 'broadcast'
- `ModeFamily`: 'digital' | 'cw' | 'ssb'
- `OperatingProfile`: Full profile with id, name, config, timestamps

### Explicit Activation Pattern (Extended from Task 2)
- `focused` state: UI selection only, does NOT change radio state
- `active` state: The config currently controlling the live radio
- `pending` derived state: Tracks differences between focused and active
- `activate()` function: The ONLY way to move focused → active
- Pending alert shows all pending changes with Activate button

### Pending State Detection
```typescript
const pending: PendingState = useMemo(() => {
  const intentChanged = focused.intent !== active.intent;
  const modeChanged = focused.mode !== active.mode;
  // ...check all fields
  return {
    intent: intentChanged ? focused.intent : undefined,
    hasChanges: intentChanged || modeChanged || /* ... */,
  };
}, [focused, active]);
```

### Profile Persistence
- Uses localStorage with key `cleancomms-operating-profiles`
- `useProfiles` hook manages CRUD operations
- Profiles include: id, name, intent, modeFamily, mode, frequency, notes, tags, timestamps
- Automatic persistence on profile changes

### Band-Aware SSB Recommendations
- Convention: LSB below 10 MHz, USB above 10 MHz
- `suggestSSBMode(frequencyHz)` helper returns correct mode
- Warning shown when selected SSB mode doesn't match convention
- Auto-adjusts SSB mode when frequency changes

### Mode Family Organization
- **Digital**: FT8, FT4, PSK31, RTTY, JS8, WSPR
- **CW**: Morse code (single mode with tone setting)
- **SSB**: USB/LSB (auto-selected based on band)

### Frequency Presets by Mode Family
- Each mode family has quick-select frequency presets
- Presets stored as constant arrays with freq (Hz) and label
- Clicking preset updates frequency AND SSB mode if applicable

### CSS Architecture for Feature
- `frontend/src/styles/Intent.css` - 900+ lines of styles
- Uses CSS custom properties from index.css
- BEM naming convention (e.g., `.intent-page__header`)
- Responsive breakpoint at 1400px

### Playwright Test Patterns
- Test suite: `Intent and Operating Profile Flow`
- Tests skip if intent page not available (graceful degradation)
- Profile persistence test verifies localStorage across reloads
- Intent safety tests verify pending state behavior

### Files Created
- `frontend/src/features/intent/types.ts` (185 lines)
- `frontend/src/features/intent/hooks.ts` (322 lines)
- `frontend/src/features/intent/IntentSelector.tsx` (75 lines)
- `frontend/src/features/intent/ModeFamilySelector.tsx` (246 lines)
- `frontend/src/features/intent/ProfileManager.tsx` (277 lines)
- `frontend/src/features/intent/IntentPage.tsx` (181 lines)
- `frontend/src/features/intent/index.ts` (50 lines)
- `frontend/src/styles/Intent.css` (943 lines)
- `frontend/tests/intent.spec.ts` (412 lines)

### Evidence Files
- `.sisyphus/evidence/task-7-operating-profile-create.md`
- `.sisyphus/evidence/task-7-intent-safety.md`

## Task 9: Spectrum/Waterfall Foundation UI (2026-03-02)

### Feature Package Structure
- `frontend/src/features/spectrum/` - Self-contained spectrum feature
- `types.ts` - TypeScript interfaces for spectrum data, markers, config
- `mockStream.ts` - Synthetic data generator for development/testing
- `hooks.ts` - Custom React hooks for stream subscription, waterfall history
- `FrequencyAxis.tsx` - SVG-based frequency scale with tick marks
- `SignalMarker.tsx` - Clickable signal overlay with hover states
- `SpectrumDisplay.tsx` - Canvas-based spectrum visualization
- `WaterfallDisplay.tsx` - Scrolling time-frequency display
- `index.ts` - Feature exports

### Canvas Rendering Best Practices
- Use `requestAnimationFrame` for smooth 60fps updates
- Handle device pixel ratio (DPR) for crisp rendering on high-DPI displays
- Use `ResizeObserver` for responsive canvas sizing
- Clear and redraw on each frame (no partial updates)
- Pre-compute color lookup tables for performance

### Stream Adapter Pattern
```typescript
interface SpectrumStreamAdapter {
  subscribe: (callback: (data: SpectrumData) => void) => () => void;
  isAvailable: () => boolean;
  start?: () => void;
  stop?: () => void;
}
```
- Subscribe returns unsubscribe function (cleanup pattern)
- `isAvailable()` check before subscribing prevents errors
- Optional `start/stop` for manual control

### Click-to-Tune Implementation
- Convert canvas click coordinates to frequency:
  - `normalizedX = clickX / canvasWidth` (0-1)
  - `offset = (normalizedX - 0.5) * span` (-span/2 to +span/2)
  - `frequency = centerFrequency + offset`
- Crosshair cursor indicates tunable area
- Frequency tooltip on hover for feedback

### Waterfall Color Mapping
- Normalize bins to 0-255 range for color lookup
- Pre-compute color LUT at component mount
- Interpolate between palette stops (plasma, viridis, heat, grayscale)
- ImageData API for efficient pixel-level rendering

### Graceful Fallback Pattern
1. Check `adapter` exists → empty state if null
2. Check `adapter.isAvailable()` → error state if false
3. Subscribe to stream → loading state until first data
4. Display data → normal operation
- Never crash or throw on stream failure
- Always provide retry mechanism

### TypeScript Strict Mode Handling
- Unused parameters: prefix with `_` or remove
- Unused imports: remove from import statement
- Null checks: use optional chaining or explicit guards

### Playwright Test Patterns
- Conditional testing: check element exists before interacting
- `isVisible().catch(() => false)` for graceful optional checks
- Test both success and error states
- Verify accessibility (aria-labels, roles)

### Files Created
- `frontend/src/features/spectrum/types.ts` (232 lines)
- `frontend/src/features/spectrum/mockStream.ts` (236 lines)
- `frontend/src/features/spectrum/hooks.ts` (350 lines)
- `frontend/src/features/spectrum/FrequencyAxis.tsx` (204 lines)
- `frontend/src/features/spectrum/SignalMarker.tsx` (195 lines)
- `frontend/src/features/spectrum/SpectrumDisplay.tsx` (418 lines)
- `frontend/src/features/spectrum/WaterfallDisplay.tsx` (308 lines)
- `frontend/src/features/spectrum/index.ts` (55 lines)
- `frontend/src/styles/Spectrum.css` (422 lines)
- `frontend/tests/spectrum.spec.ts` (385 lines)



## Task 8: Build Operate Workflow (2026-03-02)

### Feature Module Structure
- `frontend/src/features/operate/` - Self-contained operate feature
- `types.ts` - RadioMode, PTTState, RigStatus, HealthResponse, QuickChannel types
- `hooks.ts` - API hooks with safety checks
- `FrequencyControl.tsx` - Frequency input/tuning with validation
- `ModeControl.tsx` - Mode selection (USB, LSB, CW, RTTY, PKT, FM, AM)
- `PTTControl.tsx` - PTT button with coordinator safety checks
- `QuickChannels.tsx` - Quick frequency/mode selection buttons
- `OperatePage.tsx` - Main console combining all controls

### PTT Safety Implementation
- `canTransmit()` checks all safety conditions before TX:
  - Control disabled check
  - Blocked state check (from coordinator)
  - Health status unknown
  - System unhealthy
  - Coordinator unavailable
- PTT blocked returns 503 with `ptt_blocked` error code
- Visual states: Green=RX, Red=TX, Gray=Blocked
- TX timeout countdown with warning animations

### Frequency Control Design
- Direct input with MHz display and kHz precision
- Up/Down tuning buttons (100Hz, 1kHz, 10kHz, 100kHz steps)
- Band limit validation (1.8-30 MHz default)
- Band name display (160m, 80m, 60m, 40m, 30m, 20m, 17m, 15m, 12m, 10m, OOB)
- Error messages auto-clear after 2 seconds

### Mode Control Organization
- Modes grouped by category: Voice, CW, Digital
- Active mode highlighted with category-specific color
- Mode changes blocked while transmitting
- Categories: voice (USB/LSB/FM/AM), cw (CW), digital (RTTY/PKT)

### Quick Channels
- Pre-defined common frequencies for North America
- One-click sets both frequency and mode
- Channels grouped by band (80m, 40m, 20m, etc.)
- Active channel highlighted
- Channel changes blocked while transmitting

### API Integration Pattern
```typescript
// Polling hooks with configurable intervals
useRigStatus(pollInterval: number = 1000)
useHealthStatus(pollInterval: number = 2000)

// Mutation hooks with loading/error state
useSetFrequency()
useSetMode()
usePTTControl()
```

### Health Status Integration
- `/health` endpoint polled every 2 seconds
- TX blocked if `status !== 'ok'` or `coordinator !== 'ok'`
- Blocked reason derived from specific component failures:
  - Rig control unavailable
  - Modem unavailable
  - Coordinator unhealthy

### Keyboard Shortcuts
- Space bar: Hold for PTT (toggle mode)
- Arrow Up/Down: Tune frequency
- Shortcuts disabled when TX blocked

### Visual Design (Industrial/Radio Aesthetic)
- Dark theme with cyan accent (--accent-primary: #00d4aa)
- JetBrains Mono for display text
- PTT button animations: pulse for TX, warning/critical for timeout
- Color-coded health indicator
- Status bar with system health summary

### Test Coverage
- `operate.spec.ts` with mock API responses
- Safe mode switch and PTT tests
- Invalid frequency boundary tests
- Quick channel selection tests
- Keyboard shortcut tests
- Responsive layout tests

### Files Created
- `frontend/src/features/operate/types.ts` (133 lines)
- `frontend/src/features/operate/hooks.ts` (346 lines)
- `frontend/src/features/operate/FrequencyControl.tsx` (242 lines)
- `frontend/src/features/operate/ModeControl.tsx` (124 lines)
- `frontend/src/features/operate/PTTControl.tsx` (244 lines)
- `frontend/src/features/operate/QuickChannels.tsx` (172 lines)
- `frontend/src/features/operate/OperatePage.tsx` (225 lines)
- `frontend/src/styles/Operate.css` (956 lines)
- `frontend/tests/operate.spec.ts` (430 lines)

### Evidence Files
- `.sisyphus/evidence/task-8-operate-safe-switch.md`
- `.sisyphus/evidence/task-8-band-boundary-failure.md`
### Evidence Files
- `.sisyphus/evidence/task-8-operate-safe-switch.md`
- `.sisyphus/evidence/task-8-band-boundary-failure.md`


## Task 6: Guided Setup Flow (2026-03-02)

### Feature Module Structure
- `frontend/src/features/setup/` - Self-contained setup feature
- `types.ts` - TypeScript interfaces for radio catalog, setup profile, validation
- `hooks.ts` - Custom hooks for catalog loading, profile persistence, step navigation
- `RadioSelector.tsx` - Radio card grid with capability badges
- `SerialConfig.tsx` - Serial port configuration with radio-specific recommendations
- `AudioConfig.tsx` - Audio routing and PTT method selection
- `SetupPage.tsx` - Step wizard with validation and review

### Radio Catalog Loading
- Fetch from `public/data/radios/catalog/*.json`
- Graceful handling of missing catalog files (filter out null entries)
- Sort by support tier (Tier 1 first) then manufacturer
- Use `useRadioCatalog` hook for loading state management

### Capability-Aware UI Pattern
```typescript
// Extract capabilities from selected radio
const capabilities = useRadioCapabilities(radio, profileName);

// Use to disable/enable controls
<CapabilityBadge 
  label="USB Audio" 
  supported={!!capabilities?.audio?.usb_audio}
/>

// PTT methods show explanation when unavailable
{!available && (
  <span className="unavailable-note">
    This radio does not support {label}
  </span>
)}
```

### Step Wizard Pattern
- 4 steps: Radio → Serial → Audio → Review
- Step indicator with active/completed states
- `canProceed()` validation before allowing next step
- Back button always enabled (no validation on backward navigation)
- Review step has its own navigation (Back + Save buttons)

### Profile Persistence
- localStorage key: `cleancomms-setup`
- `useSetupProfile` hook manages state and persistence
- Auto-saves on every profile change
- Loads saved profile on mount

### Validation Architecture
```typescript
interface ValidationErrors {
  radioModelCode?: string;
  'serialConfig.path'?: string;
  'audioConfig.inputDeviceId'?: string;
  // ... nested field paths
}

const validateStep = useCallback((step: SetupStep): ValidationErrors => {
  // Return errors object, empty = valid
}, [profile, selectedRadio]);
```
- Dot-notation keys for nested fields
- Clear errors on field change
- Conditional validation (audio only required if radio supports USB audio)

### Routing with react-router-dom
```typescript
// In App.tsx
<BrowserRouter>
  <Routes>
    <Route path="/setup" element={<SetupPage />} />
    <Route path="/" element={<App />} />
  </Routes>
</BrowserRouter>
```
- Installed react-router-dom@latest
- Setup page at `/setup`, main app at `/`
- Tests navigate to `/setup` directly

### Mock Data Pattern
- Serial ports: Mock detection (would require backend in production)
- Audio devices: Use Web Audio API `navigator.mediaDevices.enumerateDevices()`
- Request permission before enumerating audio devices

### CSS Design for Setup
- Wizard layout with centered container (max-width: 900px)
- Radio cards in responsive grid (auto-fill, min 380px)
- Capability badges with supported/unsupported visual states
- Tier badges: Tier 1 (cyan), Tier 2 (warning yellow)
- Step indicator with connectors and completion checkmarks

### Files Created
- `frontend/src/features/setup/types.ts` (162 lines)
- `frontend/src/features/setup/hooks.ts` (390 lines)
- `frontend/src/features/setup/RadioSelector.tsx` (237 lines)
- `frontend/src/features/setup/SerialConfig.tsx` (253 lines)
- `frontend/src/features/setup/AudioConfig.tsx` (284 lines)
- `frontend/src/features/setup/SetupPage.tsx` (391 lines)
- `frontend/src/styles/Setup.css` (855 lines)
- `frontend/tests/setup.spec.ts` (285 lines)

### Evidence Files
- `.sisyphus/evidence/task-6-capability-aware-setup.md`
- `.sisyphus/evidence/task-6-validation-failure.md`

