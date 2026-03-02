# F1 Plan Compliance Audit

Target plan: `.sisyphus/plans/cleancomms-operator-ui-v1-and-signal-id-v2.md`
Branch audited: `feature/operator-ui-v1-signal-id-v2`
Audit scope: code + commit history + lightweight command verification (no production code changes)

## Evidence Reviewed
- Plan requirements and task matrix in `.sisyphus/plans/cleancomms-operator-ui-v1-and-signal-id-v2.md`
- Implementation commits: `e66e2ec`, `c28d37c`, `47a1932`, `308f3e5`, `bb7fa74`, `dbdeea0`
- Backend files: `internal/app/app.go`, `internal/config/schema.go`, `internal/control/coordinator.go`, `internal/http/*.go`, `internal/ai/*.go`, `internal/storage/*.go`, `internal/lookup/*.go`
- Frontend files: `frontend/src/components/*`, `frontend/src/features/{setup,intent,operate,spectrum,logs,phonebook,map,solar,signalid}/*`
- Verification commands run:
  - `go test ./...` -> FAIL (`tests/integration/ptt_safety_test.go` imports `github.com/zerostate-io/cleancomms/internal/control`)
  - `go build ./...` -> PASS
  - `npm --prefix frontend test` -> FAIL (Playwright server URL already in use)
  - `npm --prefix frontend run build` -> PASS
  - `bash scripts/smoke-tx500-fldigi.sh` -> FAIL in current environment (deps absent)

## Wave Verdicts (PASS/FAIL)
- Wave 1 (T1-T5): **PASS**
- Wave 2 (T6-T9): **FAIL**
- Wave 3 (T10-T12): **FAIL**
- Wave 4 (T13-T14): **FAIL**
- Wave 5 (T15-T17): **FAIL**

## Task Compliance Matrix
| Task ID | Expected | Found | Status |
|---|---|---|---|
| T1 | Coordinator + feature flags wired, health exposes features | Coordinator integrated in `internal/app/app.go`; PTT routed via coordinator in `internal/http/handlers.go`; features in `/health` | PASS |
| T2 | Frontend shell with explicit Activate semantics | Shell and Activate flow in `frontend/src/App.tsx`, `frontend/src/components/TabStrip.tsx` | PASS |
| T3 | NA bandplan/common frequency datasets + schema validation | Present in `data/bandplans/north-america.json`, `data/frequencies/common-na.json`, schemas + validator script | PASS |
| T4 | SQLite WAL logging store with async writes/retention | WAL + async logging present in `internal/storage/sqlite.go` and `internal/storage/logging.go` | PASS |
| T5 | HamQTH primary + FCC fallback + cache + attribution | Provider chain present in `internal/lookup/service.go`, providers in `internal/lookup/hamqth.go` + `internal/lookup/fcc.go` | PASS |
| T6 | Guided Setup flow with capability-aware controls and persistence | Implemented under `frontend/src/features/setup/*` and routed at `/setup` | PASS |
| T7 | Intent + unified operating profile flow (live-safe pending/apply) | Components exist (`frontend/src/features/intent/*`) but not integrated into main operator shell/routes | FAIL |
| T8 | Operate workflow with deterministic API calls and coordinator safety | UI exists (`frontend/src/features/operate/*`) but required backend endpoints for mode/frequency are missing in `internal/http/handlers.go` | FAIL |
| T9 | Spectrum/waterfall foundation with click-to-tune hooks | Foundation exists in `frontend/src/features/spectrum/*` (mock stream/callbacks) | PASS |
| T10 | Logging UX + retention controls tied to SQLite retention path | UI exists, but retention in UI is localStorage stub (`frontend/src/features/logs/hooks.ts`) not wired to backend purge endpoint | FAIL |
| T11 | Callsign phonebook + policy-aware notes/lookup UX | UI and lookup integration exist, but policy-governed note protection/reveal controls not evidenced | FAIL |
| T12 | Map/grid + solar panels with offline/degraded behavior and sources | Panels exist, but currently hardwired to mock hooks (`useMockGridLocation`, `useMockSolarData`); backend context endpoints absent | FAIL |
| T13 | V2 contracts + async lane wired non-blocking into runtime | Contracts/queue files exist, but app wires `aiClient` as `nil` in `internal/app/app.go`; no active async lane | FAIL |
| T14 | V2 advisory UI with top-N + correction loop + reversible optimize + audit events | Advisory UI exists, but no correction/undo/audit flow found in `frontend/src/features/signalid/*` | FAIL |
| T15 | Policy/privacy hardening (conservative defaults, redaction controls/tests) | Partial config flags in `internal/config/schema.go` and policy docs, but no `internal/policy/**` implementation or redaction test evidence | FAIL |
| T16 | End-to-end integration + rollout gates with no V1 regression | No rollout gate scripts/evidence for shadow/assist/canary thresholds; core verification commands currently failing | FAIL |
| T17 | VPN-only remote mode with fail-closed startup validation + allowlist enforcement + optional read-only | Partial config fields only (`internal/config/schema.go`); no interface/CIDR validation or source-IP middleware enforcement found | FAIL |

## Key Constraint Checks
- Explicit activation semantics in UI: **PASS** (`frontend/src/App.tsx`, `frontend/src/components/TabStrip.tsx`)
- Coordinator safety path for PTT: **PASS** (`internal/http/handlers.go` -> coordinator -> `internal/control/coordinator.go`)
- V2 advisory non-blocking posture: **FAIL / UNVERIFIED** (advisory UI exists, but runtime AI lane not wired)
- Fail-closed defaults for policy/remote: **PARTIAL** (defaults and force-disable behavior present; fail-closed VPN validation/allowlist enforcement missing)

## Deviations and Risk
- High: Tasks T8, T10-T17 contain material mismatches between plan intent and executable behavior.
- Medium: Workflow modules (intent/operate/spectrum/logs/phonebook/map/solar/signal-id) are not fully integrated into the main shell route, reducing end-to-end operability.
- Medium: Plan file is modified by implementation commits (example commits include `.sisyphus/plans/cleancomms-operator-ui-v1-and-signal-id-v2.md`), conflicting with the plan read-only rule.

## Missing Evidence / Unverified Claims
- No objective evidence found for rollout gates (shadow/assist/canary thresholds) required by T16.
- No objective evidence for VPN allowlist/source-IP denial behavior required by T17.
- Playwright test suite could not be executed in this environment due occupied web server URL; claims depending on that run remain unverified.

## Final Verdict
**REJECT**

Audit timestamp (UTC): 2026-03-02T20:50:35Z  
Reviewer: OpenCode (gpt-5.3-codex)
