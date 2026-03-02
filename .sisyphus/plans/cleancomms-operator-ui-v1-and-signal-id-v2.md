# CleanComms Operator UI (V1) + Signal Identification Foundation (V2)

## TL;DR
> **Summary**: Build a local-first operator UI with mixed-mode workflows (digital/CW/SSB), explicit safety activation, NA operating data, and operator context modules; ship V2 signal-ID foundation as a non-blocking dual-lane architecture with profile-based policy controls.
> **Deliverables**:
> - Frontend scaffold and workspace-centric operator console
> - V1 modules: setup/intent/operate, logging, bandplans/favorites, map/grid, solar, callsign phonebook
> - Backend extensions: feature flags, new data contracts, logging store, lookup adapters
> - V2 signal-ID foundation: ingest contracts, async inference lane, advisory UX, policy guardrails
> **Effort**: XL
> **Parallel**: YES - 5 waves
> **Critical Path**: T1 -> T2 -> T4 -> T7 -> T10 -> T13

## Context
### Original Request
Plan the full operator UI workflow for clean setup->intent->operate, include NA bandplans/frequencies, favorites/bookmarks, tabbed workspaces with explicit activation, small/large screen usability, and incorporate logging/map/grid/solar/phonebook. Keep V2 AI-assisted signal identification in mind and build toward it.

### Interview Summary
- Interaction model: Hybrid (guided setup + tabbed operator console)
- Activation safety: explicit activate button; selecting a tab does not auto-apply live radio changes
- Scope: full mixed-mode planning (digital + CW + SSB as first-class)
- Feature phasing: everything requested is in V1 scope
- Bookmark model: unified operating profile
- Callsign lookup: HamQTH primary with FCC offline US fallback
- V2 signal-ID baseline: IQ + spectrogram input, ham core mode families, policy configurable by profile
- V2 remote operation: allow UI access from remote machine over VPN-only transport, without app auth/HTTPS by default

### Metis Review (gaps addressed)
- Guardrail: coordinator-driven safety path must be wired before rich TX workflows
- Guardrail: V2 inference must not block V1 control/logging lanes
- Data gap closure required: NA bandplans/common frequencies/preset schemas are missing in repo
- Acceptance criteria must be agent-executable only; no human-only visual checks

## Work Objectives
### Core Objective
Deliver a decision-safe, operator-friendly UI and backend contract layer that enables practical field operation in V1 while preserving deterministic reliability and creating an additive runway for V2 signal identification.

### Deliverables
- Frontend project scaffold with responsive operator shell
- Workspace, setup, intent, and operate flows with explicit activation semantics
- V1 data assets for NA operation and unified operating profiles
- SQLite WAL logging subsystem with retention and export-safe defaults
- Callsign lookup adapter (HamQTH + FCC fallback), map/grid and solar panels
- V2 signal-ID interfaces, async inference lane, and advisory UI scaffolding under feature flags

### Definition of Done (verifiable conditions with commands)
- `go test ./...` exits 0
- `go build ./...` exits 0
- `npm --prefix frontend test` exits 0
- `npm --prefix frontend run build` exits 0
- `bash scripts/smoke-tx500-fldigi.sh` exits with deterministic expected code when dependencies are absent/present
- `curl -s http://127.0.0.1:8080/health` includes UI/logging/lookup feature state

### Must Have
- Explicit activation semantics and TX safety guardrails
- Non-blocking logging path (no network dependency in critical write path)
- Profile-configurable V2 policy behavior with conservative defaults
- Offline/degraded UX states for map/solar/lookup modules
- VPN-only remote mode in V2 with fail-closed startup validation

### Must NOT Have (guardrails, AI slop patterns, scope boundaries)
- No hidden auto-apply of AI recommendations to live radio settings
- No mandatory cloud inference or external RF content upload in V2 baseline
- No decoding/decryption workflow bundled into V2 classifier core
- No unbounded scope additions beyond approved modules and contracts
- No `0.0.0.0` binding as default or fallback path in remote mode

## Verification Strategy
> ZERO HUMAN INTERVENTION — all verification is agent-executed.
- Test decision: tests-after + existing Go test stack + frontend test runner
- QA policy: every task includes executable happy + failure scenarios
- Evidence: `.sisyphus/evidence/task-{N}-{slug}.{ext}`

## Execution Strategy
### Parallel Execution Waves
> Target: 5-8 tasks per wave.

Wave 1: Foundation contracts and scaffolding (architecture and data)
Wave 2: V1 core operator workflows
Wave 3: V1 context modules (logging/map/solar/phonebook)
Wave 4: V2 signal-ID foundation (non-blocking lane + advisory UX)
Wave 5: Hardening, policy, and integration validation

### Dependency Matrix (full, all tasks)
T1 -> T2,T3,T4,T5
T2 -> T6,T7,T8
T3 -> T7,T8,T9
T4 -> T10,T11
T5 -> T11,T12
T6,T7,T8,T9 -> T13
T10,T11,T12 -> T14
T13,T14 -> T15,T16
T1 -> T17
T17 -> T16

### Agent Dispatch Summary (wave → task count → categories)
- Wave 1 → 5 tasks → quick, unspecified-high, writing
- Wave 2 → 4 tasks → visual-engineering, unspecified-high
- Wave 3 → 3 tasks → unspecified-high, writing
- Wave 4 → 2 tasks → deep, unspecified-high
- Wave 5 → 3 tasks → deep, unspecified-high

## TODOs
> Implementation + Test = ONE task. Never separate.
> EVERY task MUST have: Agent Profile + Parallelization + QA Scenarios.

- [x] 1. Wire safety coordinator and feature-flag foundation

  **What to do**: Integrate `internal/control/coordinator.go` into app runtime, add config-backed feature flags for V1 modules and V2 signal-ID gates, and expose feature state in health/status endpoints.
  **Must NOT do**: Do not alter existing rig/modem command semantics.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: cross-module backend wiring and contract updates
  - Skills: [] — use existing service patterns
  - Omitted: [`frontend-ui-ux`] — backend-only task

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: 2,3,4,5 | Blocked By: none

  **References**:
  - Pattern: `internal/app/app.go` — app lifecycle and adapter wiring
  - Pattern: `internal/control/coordinator.go` — TX watchdog/state machine
  - Pattern: `internal/config/schema.go` — config extension style
  - API: `internal/http/server.go` — health/status contract points

  **Acceptance Criteria**:
  - [ ] `go test ./...` passes with coordinator integrated
  - [ ] `curl -s http://127.0.0.1:8080/health` includes feature flags payload

  **QA Scenarios**:
  ```
  Scenario: Coordinator guards TX when unhealthy
    Tool: Bash
    Steps: Start daemon with modem unreachable; POST /api/v1/rig/ptt {"state":"tx"}
    Expected: 503 with explicit degraded reason; no TX transition
    Evidence: .sisyphus/evidence/task-1-coordinator-feature-flags.txt

  Scenario: Feature flags disable V2 endpoints
    Tool: Bash
    Steps: Set V2 flag false; request /api/v2/signal/identify
    Expected: deterministic disabled response (404 or 403 per contract)
    Evidence: .sisyphus/evidence/task-1-v2-flag-gate.txt
  ```

  **Commit**: YES | Message: `feat(core): wire coordinator and feature flags` | Files: `internal/app/*`, `internal/config/*`, `internal/http/*`

- [x] 2. Scaffold frontend workspace shell

  **What to do**: Create frontend project scaffold and implement baseline app shell with collapsible sidebar, workspace tab strip, and explicit Activate control.
  **Must NOT do**: Do not auto-apply tab selection to live radio state.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` — Reason: foundational responsive IA
  - Skills: [`frontend-ui-ux`] — layout and interaction quality
  - Omitted: []

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: 6,7,8 | Blocked By: 1

  **References**:
  - Requirement: `.sisyphus/drafts/ui-workflow-planning.md`
  - Pattern: explicit activation from current interview decisions
  - API surface: `internal/http/server.go`

  **Acceptance Criteria**:
  - [ ] `npm --prefix frontend install && npm --prefix frontend run build` succeeds
  - [ ] Playwright can open shell and find tab list + Activate button

  **QA Scenarios**:
  ```
  Scenario: Tab focus vs activation safety
    Tool: Playwright
    Steps: Create two tabs; select tab B without pressing Activate
    Expected: UI focus changes, live-state badge remains on tab A
    Evidence: .sisyphus/evidence/task-2-tab-activation-safety.md

  Scenario: Small-screen collapse
    Tool: Playwright
    Steps: Resize to 1366x768 and 2560x1440, inspect sidebar state
    Expected: compact mode on laptop layout, expanded multi-pane on large layout
    Evidence: .sisyphus/evidence/task-2-responsive-shell.md
  ```

  **Commit**: YES | Message: `feat(ui): scaffold operator workspace shell` | Files: `frontend/**`

- [x] 3. Create NA bandplan and common-frequency datasets

  **What to do**: Add canonical datasets for North America bandplans and common calling/operating frequencies with schema validation.
  **Must NOT do**: Do not hardcode frequencies in UI components.

  **Recommended Agent Profile**:
  - Category: `writing` — Reason: structured data authoring + provenance
  - Skills: []
  - Omitted: [`frontend-ui-ux`]

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 7,8 | Blocked By: 1

  **References**:
  - Pattern: `data/radios/schema/radio-capability.schema.json`
  - Existing data style: `data/radios/catalog/*.json`

  **Acceptance Criteria**:
  - [ ] `jq` validation passes for new data files
  - [ ] dataset contains required NA HF bands and mode-tagged common frequencies

  **QA Scenarios**:
  ```
  Scenario: Dataset schema validation
    Tool: Bash
    Steps: Run json validation script against bandplan/frequency files
    Expected: exit 0; all required keys present
    Evidence: .sisyphus/evidence/task-3-na-datasets-validation.txt

  Scenario: Missing band failure
    Tool: Bash
    Steps: run test that asserts 20m/40m/80m presence
    Expected: fails if any mandatory band removed
    Evidence: .sisyphus/evidence/task-3-band-required-check.txt
  ```

  **Commit**: YES | Message: `feat(data): add NA bandplan and frequency datasets` | Files: `data/bandplans/*`, `data/frequencies/*`

- [x] 4. Implement SQLite WAL logging store

  **What to do**: Create local logging store with WAL mode, async writes, retention controls, and separate tables for events and user profile data.
  **Must NOT do**: Do not block UI/API writes on external lookups.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: persistence + reliability
  - Skills: []
  - Omitted: []

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 10,11 | Blocked By: 1

  **References**:
  - Research: `bg_45fe464e` findings (SQLite WAL recommendation)
  - Pattern: existing Go service lifecycle in `internal/app/*_service.go`

  **Acceptance Criteria**:
  - [ ] WAL mode enabled and verified at runtime
  - [ ] log append endpoint stays responsive under synthetic burst load

  **QA Scenarios**:
  ```
  Scenario: Burst logging under load
    Tool: Bash
    Steps: POST 1k synthetic log records via loop
    Expected: successful inserts, bounded latency, no deadlocks
    Evidence: .sisyphus/evidence/task-4-sqlite-burst.txt

  Scenario: DB unavailable fallback
    Tool: Bash
    Steps: start with invalid DB path and hit log endpoint
    Expected: deterministic error response and health degraded flag
    Evidence: .sisyphus/evidence/task-4-db-failure-path.txt
  ```

  **Commit**: YES | Message: `feat(storage): add sqlite wal logging subsystem` | Files: `internal/storage/**`, `internal/http/**`

- [x] 5. Add lookup adapters and cache layer (HamQTH + FCC fallback)

  **What to do**: Implement callsign lookup provider chain with HamQTH primary, FCC fallback, cache TTLs, and source attribution.
  **Must NOT do**: Do not leak provider credentials or block user logging path.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: external integration + reliability
  - Skills: []
  - Omitted: []

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 11,12 | Blocked By: 1

  **References**:
  - Research: `bg_c1175793` and `bg_45fe464e`
  - Policy: callsign source decision in draft

  **Acceptance Criteria**:
  - [ ] HamQTH session reuse works and refreshes before expiry
  - [ ] FCC fallback returns deterministic US-only responses when HamQTH unavailable

  **QA Scenarios**:
  ```
  Scenario: Primary lookup success
    Tool: Bash
    Steps: lookup known callsign with HamQTH reachable
    Expected: result includes source="hamqth" and normalized profile fields
    Evidence: .sisyphus/evidence/task-5-hamqth-success.txt

  Scenario: Primary outage fallback
    Tool: Bash
    Steps: disable HamQTH endpoint and repeat lookup
    Expected: source switches to "fcc" for US callsigns, explicit unsupported for non-US
    Evidence: .sisyphus/evidence/task-5-fcc-fallback.txt
  ```

  **Commit**: YES | Message: `feat(lookup): add hamqth primary with fcc fallback` | Files: `internal/lookup/**`, `internal/http/**`

- [ ] 6. Build guided Setup flow

  **What to do**: Implement Step 1 workflow for radio/setup profile selection, capability-aware controls, and profile persistence.
  **Must NOT do**: Do not expose unsupported rig features as enabled controls.

  **Recommended Agent Profile**:
  - Category: `visual-engineering`
  - Skills: [`frontend-ui-ux`]
  - Omitted: []

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 13 | Blocked By: 2

  **References**:
  - Data: `data/radios/catalog/*.json`
  - Pattern: `docs/radios/matrix.md`

  **Acceptance Criteria**:
  - [ ] selecting a radio profile reflects capability constraints in UI
  - [ ] profile save/load works across app restart

  **QA Scenarios**:
  ```
  Scenario: Capability-aware setup
    Tool: Playwright
    Steps: choose radio with limited features
    Expected: unsupported controls are disabled with explanation text
    Evidence: .sisyphus/evidence/task-6-capability-aware-setup.md

  Scenario: Invalid profile rejection
    Tool: Playwright
    Steps: submit setup with missing required values
    Expected: inline validation blocks progression and highlights fields
    Evidence: .sisyphus/evidence/task-6-validation-failure.md
  ```

  **Commit**: YES | Message: `feat(ui): add guided radio setup flow` | Files: `frontend/src/features/setup/**`

- [ ] 7. Build Intent + Operating Profile flow

  **What to do**: Implement Step 2 workflow (listen/broadcast intent, mode family, profile presets) using Unified Operating Profile schema.
  **Must NOT do**: Do not directly key profile semantics to a single mode engine.

  **Recommended Agent Profile**:
  - Category: `visual-engineering`
  - Skills: [`frontend-ui-ux`]
  - Omitted: []

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 13 | Blocked By: 2,3

  **References**:
  - Decision: unified operating profile from draft
  - Data: new bandplan/frequency assets

  **Acceptance Criteria**:
  - [ ] operator can create/edit/delete operating profiles
  - [ ] intent selection updates mode/preset recommendations without live apply

  **QA Scenarios**:
  ```
  Scenario: Create operating profile
    Tool: Playwright
    Steps: create profile for 20m PSK31 with notes/tags
    Expected: profile appears in list and can be reused
    Evidence: .sisyphus/evidence/task-7-operating-profile-create.md

  Scenario: Intent change without activation
    Tool: Playwright
    Steps: change from listen to broadcast intent on inactive tab
    Expected: pending badge updates; live state unchanged until Activate
    Evidence: .sisyphus/evidence/task-7-intent-safety.md
  ```

  **Commit**: YES | Message: `feat(ui): add intent and operating profile flow` | Files: `frontend/src/features/intent/**`

- [ ] 8. Build Operate workflow (mode/frequency/channel switching)

  **What to do**: Implement Step 3 operator console with mode controls, frequency controls, quick channel actions, and explicit apply semantics.
  **Must NOT do**: Do not bypass coordinator safety checks when toggling TX/PTT.

  **Recommended Agent Profile**:
  - Category: `visual-engineering`
  - Skills: [`frontend-ui-ux`]
  - Omitted: []

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 13 | Blocked By: 2,3

  **References**:
  - API: `internal/http/handlers.go`
  - Safety: `internal/control/coordinator.go`

  **Acceptance Criteria**:
  - [ ] one-click mode/channel updates issue deterministic API calls
  - [ ] PTT control follows coordinator state and blocked conditions

  **QA Scenarios**:
  ```
  Scenario: Safe mode switch and PTT
    Tool: Playwright
    Steps: switch mode, set frequency, request TX
    Expected: correct call order; blocked state shown if dependencies degraded
    Evidence: .sisyphus/evidence/task-8-operate-safe-switch.md

  Scenario: Invalid frequency boundary
    Tool: Playwright
    Steps: enter out-of-band frequency for selected profile
    Expected: rejected with bandplan-aware error message
    Evidence: .sisyphus/evidence/task-8-band-boundary-failure.md
  ```

  **Commit**: YES | Message: `feat(ui): implement operate workflow controls` | Files: `frontend/src/features/operate/**`

- [x] 9. Add spectrum/waterfall foundation UI

  **What to do**: Add spectrum/waterfall display component foundation with click-to-tune hooks and placeholder adapters for engine-fed streams.
  **Must NOT do**: Do not claim native IQ ingest exists in V1.

  **Recommended Agent Profile**:
  - Category: `visual-engineering`
  - Skills: [`frontend-ui-ux`]
  - Omitted: []

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 13 | Blocked By: 3

  **References**:
  - Research: `bg_cc4da1ea` spectrum patterns
  - Decision: engine-fed source default

  **Acceptance Criteria**:
  - [ ] component renders deterministic mock stream and click-to-tune callback
  - [ ] confidence that no hard dependency on V2 classifier exists

  **QA Scenarios**:
  ```
  Scenario: Click-to-tune callback
    Tool: Playwright
    Steps: click visible signal marker
    Expected: frequency control updates to target value
    Evidence: .sisyphus/evidence/task-9-click-to-tune.md

  Scenario: Stream unavailable fallback
    Tool: Playwright
    Steps: simulate missing stream adapter
    Expected: graceful empty-state panel with retry action
    Evidence: .sisyphus/evidence/task-9-stream-failure.md
  ```

  **Commit**: YES | Message: `feat(ui): add spectrum waterfall foundation` | Files: `frontend/src/features/spectrum/**`

- [ ] 10. Build logging UX + retention controls

  **What to do**: Implement log entry/history UI with fast writes, local filtering, and retention policy controls tied to SQLite store.
  **Must NOT do**: Do not send logs to remote services by default.

  **Recommended Agent Profile**:
  - Category: `unspecified-high`
  - Skills: []
  - Omitted: []

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: 14 | Blocked By: 4

  **References**:
  - Storage: task 4 implementation
  - Policy: local-first requirement

  **Acceptance Criteria**:
  - [ ] append latency remains within agreed threshold under burst load
  - [ ] retention purge job executes without corrupting active writes

  **QA Scenarios**:
  ```
  Scenario: High-frequency log appends
    Tool: Bash
    Steps: write burst logs while querying history endpoint
    Expected: no write failures; history remains queryable
    Evidence: .sisyphus/evidence/task-10-log-throughput.txt

  Scenario: Retention purge race
    Tool: Bash
    Steps: trigger purge during active inserts
    Expected: purge completes safely; DB integrity check passes
    Evidence: .sisyphus/evidence/task-10-retention-race.txt
  ```

  **Commit**: YES | Message: `feat(logs): add operator logging ui and retention` | Files: `frontend/src/features/logs/**`, `internal/storage/**`

- [ ] 11. Build callsign phonebook + lookup enrichment UI

  **What to do**: Create phonebook with notes, source attribution, cache freshness, and profile-configurable policy behavior for lookup/decode assist.
  **Must NOT do**: Do not expose sensitive notes without explicit reveal controls.

  **Recommended Agent Profile**:
  - Category: `visual-engineering`
  - Skills: [`frontend-ui-ux`]
  - Omitted: []

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: 14 | Blocked By: 4,5

  **References**:
  - Lookup adapters from task 5
  - Policy decision: configurable by profile

  **Acceptance Criteria**:
  - [ ] lookup source and freshness badge always displayed
  - [ ] notes CRUD works and respects profile policy settings

  **QA Scenarios**:
  ```
  Scenario: Lookup + notes flow
    Tool: Playwright
    Steps: search callsign, add note, reopen contact
    Expected: data persists and source badge shown
    Evidence: .sisyphus/evidence/task-11-phonebook-flow.md

  Scenario: Provider timeout fallback
    Tool: Playwright
    Steps: induce HamQTH timeout during lookup
    Expected: fallback notice shown with FCC or cached result
    Evidence: .sisyphus/evidence/task-11-lookup-timeout.md
  ```

  **Commit**: YES | Message: `feat(ui): add callsign phonebook and lookup enrichment` | Files: `frontend/src/features/phonebook/**`, `internal/lookup/**`

- [ ] 12. Build grid/map and solar context panels

  **What to do**: Add map/grid panel and solar panel with offline/degraded behavior, cache windows, and clear data source labeling.
  **Must NOT do**: Do not fail core operator flows when context providers are unavailable.

  **Recommended Agent Profile**:
  - Category: `visual-engineering`
  - Skills: [`frontend-ui-ux`]
  - Omitted: []

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: 14 | Blocked By: 5

  **References**:
  - Research: `bg_c1175793` (Leaflet + NOAA SWPC)
  - Requirement: small-screen + large-screen usability

  **Acceptance Criteria**:
  - [ ] map and solar panels render source + freshness metadata
  - [ ] offline mode shows cached/stale labels without blocking operate actions

  **QA Scenarios**:
  ```
  Scenario: Online context render
    Tool: Playwright
    Steps: open map and solar panels with network available
    Expected: data visible with source attribution and update timestamp
    Evidence: .sisyphus/evidence/task-12-context-online.md

  Scenario: Offline degraded context
    Tool: Playwright
    Steps: disable network and reload context panels
    Expected: cached values shown with stale/degraded indicators
    Evidence: .sisyphus/evidence/task-12-context-offline.md
  ```

  **Commit**: YES | Message: `feat(ui): add grid-map and solar context panels` | Files: `frontend/src/features/map/**`, `frontend/src/features/solar/**`

- [ ] 13. Add V2 signal-ID contracts and async service lane

  **What to do**: Implement V2 service interfaces (`AIService`, `http.AIClient`), versioned message contracts, async inference queue, join timeout, and kill switch flags.
  **Must NOT do**: Do not make V1 control path synchronous on V2 inference.

  **Recommended Agent Profile**:
  - Category: `deep`
  - Skills: []
  - Omitted: [`frontend-ui-ux`]

  **Parallelization**: Can Parallel: NO | Wave 4 | Blocks: 15,16 | Blocked By: 6,7,8,9

  **References**:
  - Oracle: `bg_58140f6a` dual-lane design
  - Pattern: service loops in `internal/app/modem_service.go`, `internal/app/rig_service.go`
  - Interface style: `internal/http/server.go`

  **Acceptance Criteria**:
  - [ ] V2 lane can be enabled in shadow mode without modifying V1 responses
  - [ ] timeout path returns advisory unavailable while V1 remains responsive

  **QA Scenarios**:
  ```
  Scenario: V2 shadow mode non-blocking
    Tool: Bash
    Steps: enable v2_shadow; run classify request while polling rig status
    Expected: rig status latency unchanged; classify response includes advisory payload
    Evidence: .sisyphus/evidence/task-13-shadow-nonblocking.txt

  Scenario: V2 circuit-breaker trip
    Tool: Bash
    Steps: force repeated inference failures
    Expected: kill-switch state transitions to V1_ONLY with logged reason
    Evidence: .sisyphus/evidence/task-13-circuit-breaker.txt
  ```

  **Commit**: YES | Message: `feat(v2): add async signal-id contracts and service lane` | Files: `internal/ai/**`, `internal/http/**`, `internal/config/**`

- [ ] 14. Build V2 advisory UI for top-N hypotheses and correction loop

  **What to do**: Add non-modal advisory panel with top-N hypotheses, confidence hierarchy, inline correction chits, reversible optimize actions, and profile policy controls.
  **Must NOT do**: Do not auto-apply AI suggestions to live rig settings.

  **Recommended Agent Profile**:
  - Category: `visual-engineering`
  - Skills: [`frontend-ui-ux`]
  - Omitted: []

  **Parallelization**: Can Parallel: NO | Wave 4 | Blocks: 15,16 | Blocked By: 10,11,12

  **References**:
  - Artistry: `bg_0bf9fb80` patterns
  - Policy: configurable by profile

  **Acceptance Criteria**:
  - [ ] operator can accept/reject/correct hypothesis inline without modal interruption
  - [ ] every optimize action exposes undo path and audit event

  **QA Scenarios**:
  ```
  Scenario: Advisory correction flow
    Tool: Playwright
    Steps: open hypothesis strip, correct label, submit
    Expected: correction applied to UI state and logged as feedback event
    Evidence: .sisyphus/evidence/task-14-correction-loop.md

  Scenario: No auto-apply safety
    Tool: Playwright
    Steps: trigger high-confidence suggestion without clicking Apply
    Expected: rig/mode state remains unchanged until explicit action
    Evidence: .sisyphus/evidence/task-14-no-autoapply.md
  ```

  **Commit**: YES | Message: `feat(ui-v2): add advisory signal-id interaction model` | Files: `frontend/src/features/signal-id/**`

- [ ] 15. Policy, compliance, and privacy hardening

  **What to do**: Implement profile-based V2 policy presets, compliance language surfaces, log redaction defaults, retention controls, and audit events.
  **Must NOT do**: Do not weaken default policy for new profiles.

  **Recommended Agent Profile**:
  - Category: `unspecified-high`
  - Skills: []
  - Omitted: []

  **Parallelization**: Can Parallel: YES | Wave 5 | Blocks: none | Blocked By: 13

  **References**:
  - Legal research: `bg_4d490e9a`
  - Policy decision: configurable by profile

  **Acceptance Criteria**:
  - [ ] new profile defaults to conservative policy and explicit consent messaging
  - [ ] redaction and retention controls are verifiable through automated tests

  **QA Scenarios**:
  ```
  Scenario: Conservative default profile
    Tool: Playwright
    Steps: create new profile and inspect policy settings
    Expected: conservative preset preselected; warning text visible
    Evidence: .sisyphus/evidence/task-15-default-policy.md

  Scenario: Redacted export check
    Tool: Bash
    Steps: export logs with redaction enabled
    Expected: sensitive fields removed/masked per policy
    Evidence: .sisyphus/evidence/task-15-redaction-export.txt
  ```

  **Commit**: YES | Message: `feat(policy): add profile-based compliance and privacy controls` | Files: `internal/policy/**`, `frontend/src/features/policy/**`

- [ ] 16. End-to-end integration and rollout gates

  **What to do**: Add integration tests and rollout gate checks (shadow, assist, canary thresholds), then validate full V1+V2 stack with deterministic evidence.
  **Must NOT do**: Do not mark rollout gate pass if V1 latency/reliability regresses.

  **Recommended Agent Profile**:
  - Category: `deep`
  - Skills: []
  - Omitted: []

  **Parallelization**: Can Parallel: YES | Wave 5 | Blocks: Final Verification Wave | Blocked By: 13,14

  **References**:
  - Oracle rollout gates from `bg_58140f6a`
  - Existing smoke scripts in `scripts/`

  **Acceptance Criteria**:
  - [ ] full integration suite passes for enabled V1 modules
  - [ ] V2 shadow/assist gates produce objective pass/fail evidence with no V1 regression

  **QA Scenarios**:
  ```
  Scenario: Full-stack happy path
    Tool: Bash
    Steps: run go tests, frontend tests, smoke scripts, and integration suite
    Expected: all required suites pass; evidence manifest complete
    Evidence: .sisyphus/evidence/task-16-fullstack-pass.txt

  Scenario: V1 regression gate
    Tool: Bash
    Steps: run latency and reliability checks with V2 enabled
    Expected: if thresholds exceeded, rollout gate fails and reports blocker
    Evidence: .sisyphus/evidence/task-16-regression-gate.txt
  ```

  **Commit**: YES | Message: `chore(verify): add rollout gates and end-to-end validation` | Files: `scripts/**`, `.sisyphus/evidence/**`, `frontend/tests/**`

- [ ] 17. Add VPN-only remote UI access mode (V2)

  **What to do**: Add explicit network access mode in config and HTTP middleware guardrails for VPN-only remote operation.
  **Must NOT do**: Do not expose remote mode through permissive bind defaults.

  **Recommended Agent Profile**:
  - Category: `unspecified-high`
  - Skills: []
  - Omitted: []

  **Parallelization**: Can Parallel: NO | Wave 5 | Blocks: 16 | Blocked By: 1

  **References**:
  - Config: `internal/config/schema.go` (`ServerConfig`)
  - Validation: `internal/config/config.go`
  - Wiring: `internal/app/app.go`
  - Server middleware insertion: `internal/http/server.go`
  - Default bind example: `configs/tx500-digirig-macos.yaml` (`127.0.0.1:8080`)
  - Architecture guidance: `bg_e6e4cf11`, `bg_e68b30f0`

  **Acceptance Criteria**:
  - [ ] Default mode remains localhost-only and unchanged
  - [ ] `network.mode=vpn` fails closed at startup if VPN interface or CIDR allowlist invalid
  - [ ] Remote requests from non-allowlisted source IPs are denied deterministically
  - [ ] Remote mode can optionally enforce read-only control surface by profile/policy

  **QA Scenarios**:
  ```
  Scenario: Fail-closed startup in vpn mode
    Tool: Bash
    Steps: set vpn mode with missing interface and start daemon
    Expected: startup exits non-zero with explicit config validation error
    Evidence: .sisyphus/evidence/task-17-vpn-fail-closed.txt

  Scenario: Source-IP allowlist enforcement
    Tool: Bash
    Steps: send request from disallowed source IP simulation/test harness
    Expected: 403 with access-denied reason and audit log entry
    Evidence: .sisyphus/evidence/task-17-ip-allowlist-enforcement.txt
  ```

  **Commit**: YES | Message: `feat(network): add vpn-only remote ui mode` | Files: `internal/config/**`, `internal/http/**`, `internal/app/**`, `configs/**`

## Final Verification Wave (4 parallel agents, ALL must APPROVE)
- [ ] F1. Plan Compliance Audit — oracle
- [ ] F2. Code Quality Review — unspecified-high
- [ ] F3. Real Manual QA — unspecified-high (+ playwright if UI)
- [ ] F4. Scope Fidelity Check — deep

## Commit Strategy
- Commit A: contracts + scaffold + datasets
- Commit B: core UI/workspace flows + safety wiring
- Commit C: logging/context modules + lookup integrations
- Commit D: V2 foundation + policy + final verification artifacts

## Success Criteria
- Operator can complete setup->intent->operate safely with explicit activation
- V1 logging/context modules operate locally-first with deterministic degraded behavior
- V2 signal-ID foundation runs as advisory, profile-configurable, non-blocking lane
- All checks and scenario evidence are reproducible from repository commands
