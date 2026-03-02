# TX-500 DigiRig fldigi Vertical Slice (macOS)

## TL;DR
> **Summary**: Build the first runnable CleanComms control slice on macOS for TX-500 + DigiRig using rigctld-direct CAT/PTT and fldigi PSK31 modem orchestration, with minimal reproducible smoke/integration harness.
> **Deliverables**:
> - Go daemon scaffold with rigctld and fldigi clients
> - macOS setup/runbook for TX-500 + DigiRig + fldigi
> - smoke/integration scripts and evidence artifacts
> - API surface for health, rig status, modem status, and PTT toggle
> **Effort**: Large
> **Parallel**: YES - 4 waves
> **Critical Path**: T1/T2/T3 -> T4/T5/T6 -> T7/T8/T9 -> T10/T11/T12

## Context
### Original Request
User asked for the next planning/build steps after KB completion and confirmed DigiRig can be used with TX-500.

### Interview Summary
- Runtime target: macOS dev host
- Control topology: rigctld direct (no flrig in first slice)
- First digital mode acceptance: PSK31
- Include minimal test harness in same slice

### Metis Review (gaps addressed)
- Guardrails added for scope creep (no dashboard, no multi-radio, no audio automation)
- Explicit ownership model added (daemon owns CAT/PTT; fldigi used as modem endpoint)
- Assumption and edge-case handling added (serial race, reconnect, PTT watchdog)
- Acceptance criteria made command-verifiable with concrete endpoints and scripts

## Work Objectives
### Core Objective
Deliver a deterministic first vertical slice that proves TX-500 CAT/PTT control and fldigi PSK31 orchestration work together on macOS with DigiRig.

### Deliverables
- `cmd/cleancomms/` daemon entrypoint and internal modules for rigctld + fldigi clients
- `configs/tx500-digirig-macos.yaml` configuration for first slice
- `docs/setup/tx500-digirig-macos.md` operator runbook
- `scripts/smoke-tx500-fldigi.sh` and `scripts/test-ptt-watchdog.sh`
- Evidence outputs in `.sisyphus/evidence/tx500-slice-*`

### Definition of Done (verifiable conditions with commands)
- `go test ./...` exits 0
- `go build ./...` exits 0
- `bash scripts/smoke-tx500-fldigi.sh` exits 0 on configured macOS setup
- `curl -s http://127.0.0.1:8080/health` returns `status=ok` and dependency statuses
- `curl` PTT toggle endpoint shows TX then RX transitions without stuck state

### Must Have
- TX-500 model ID alignment with KB (`2054`) and extended-profile-first policy
- rigctld direct integration and fldigi XML-RPC integration
- Explicit failure states and reconnect behavior in daemon logs/status
- Minimal but automated smoke checks runnable by agent/operator

### Must NOT Have (guardrails, AI slop patterns, scope boundaries)
- No dashboard/UI implementation
- No multi-radio support in this slice
- No flrig intermediary in primary path
- No audio-routing automation (document manual setup only)
- No process supervisor/orchestration of external tools beyond connectivity checks

## Verification Strategy
> ZERO HUMAN INTERVENTION — all verification is agent-executed where possible; hardware-coupled checks use deterministic scripted probes and explicit expected outputs.
- Test decision: tests-after (Go + shell smoke scripts)
- QA policy: Every task includes happy + failure scenario
- Evidence: `.sisyphus/evidence/task-{N}-{slug}.{ext}`

## Execution Strategy
### Parallel Execution Waves
Wave 1: foundation and contracts
Wave 2: protocol clients and API surface
Wave 3: scripts/runbook and hardening
Wave 4: end-to-end verification and evidence pack

### Dependency Matrix (full, all tasks)
T1 blocks T2,T3,T4; T2 blocks T5,T6; T3 blocks T7,T8; T4/T5/T6 block T9; T7/T8/T9 block T10; T10 blocks T11,T12; T12 blocks final verification wave.

### Agent Dispatch Summary (wave → task count → categories)
Wave1 → 4 tasks → unspecified-high/quick
Wave2 → 4 tasks → unspecified-high/deep
Wave3 → 2 tasks → writing/quick
Wave4 → 2 tasks + final verification wave → unspecified-high/deep/oracle

## TODOs
> Implementation + Test = ONE task. Every task includes agent profile, references, acceptance criteria, and QA scenarios.

- [x] 1. Scaffold daemon and config contract
  **What to do**: Create Go structure (`cmd/cleancomms`, `internal/app`, `internal/config`) and `configs/tx500-digirig-macos.yaml` loader/validator.
  **Must NOT do**: No UI/dashboard, no multi-radio feature.
  **Recommended Agent Profile**: Category `unspecified-high`; Skills `[]`; Omitted `playwright`.
  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: 2,3,4 | Blocked By: none
  **References**: `README.md`, `data/radios/tx-500.json`, `docs/radios/README.md`
  **Acceptance Criteria**: `go test ./...` and `go build ./...` pass; invalid config fails fast with explicit message.
  **QA Scenarios**:
  ```bash
  Scenario: Happy path scaffold compiles
    Tool: Bash
    Steps: run `go test ./...` and `go build ./...`
    Expected: both exit 0
    Evidence: .sisyphus/evidence/task-1-go-scaffold.txt

  Scenario: Invalid config rejected
    Tool: Bash
    Steps: start daemon with missing rigctld endpoint fields
    Expected: non-zero exit and validation error text
    Evidence: .sisyphus/evidence/task-1-go-scaffold-error.txt
  ```
  **Commit**: YES | Message: `feat(core): scaffold cleancomms daemon runtime` | Files: `cmd/cleancomms/**`, `internal/config/**`, `configs/tx500-digirig-macos.yaml`

- [x] 2. Add rigctld client (TX-500)
  **What to do**: Implement `internal/rigctld` connect/status/freq/mode/PTT functions with robust error mapping.
  **Must NOT do**: Do not spawn rigctld.
  **Recommended Agent Profile**: Category `unspecified-high`; Skills `[]`; Omitted `frontend-ui-ux`.
  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 5,9 | Blocked By: 1
  **References**: `docs/radios/tx-500.md`, `data/radios/tx-500.json`, `https://www.hamlib.org/`, `https://man.archlinux.org/man/rigctld.1.en`
  **Acceptance Criteria**: client connects and reads status; PTT TX/RX transitions work; unavailable endpoint is handled gracefully.
  **QA Scenarios**:
  ```bash
  Scenario: Happy path rigctld operations
    Tool: Bash
    Steps: run with reachable rigctld and exercise status/PTT methods
    Expected: successful responses and expected state changes
    Evidence: .sisyphus/evidence/task-2-rigctld-client.txt

  Scenario: rigctld unavailable
    Tool: Bash
    Steps: run with closed rigctld port
    Expected: explicit dependency-unavailable error; no crash
    Evidence: .sisyphus/evidence/task-2-rigctld-client-error.txt
  ```
  **Commit**: YES | Message: `feat(radio): add rigctld tx-500 client` | Files: `internal/rigctld/**`

- [x] 3. Add fldigi XML-RPC client (PSK31)
  **What to do**: Implement `internal/fldigi` client for detect, mode set/get, tx/rx calls.
  **Must NOT do**: No audio routing automation.
  **Recommended Agent Profile**: Category `unspecified-high`; Skills `[]`; Omitted `playwright`.
  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 6,9 | Blocked By: 1
  **References**: `https://www.w1hkj.org/FldigiHelp/xmlrpc_control_page.html`, `docs/radios/matrix.md`
  **Acceptance Criteria**: detects fldigi, sets PSK31 idempotently, returns clear RPC error details on failure.
  **QA Scenarios**:
  ```bash
  Scenario: Happy path fldigi control
    Tool: Bash
    Steps: run against live fldigi XML-RPC endpoint and set PSK31
    Expected: mode reflects PSK31 and tx/rx methods succeed
    Evidence: .sisyphus/evidence/task-3-fldigi-client.txt

  Scenario: fldigi unavailable
    Tool: Bash
    Steps: run client when fldigi is down
    Expected: explicit endpoint/method failure output
    Evidence: .sisyphus/evidence/task-3-fldigi-client-error.txt
  ```
  **Commit**: YES | Message: `feat(modem): add fldigi xmlrpc client` | Files: `internal/fldigi/**`

- [x] 4. Expose minimal HTTP API
  **What to do**: Implement `/health`, `/api/v1/rig/status`, `/api/v1/rig/ptt`, `/api/v1/modem/status`.
  **Must NOT do**: No auth/session subsystem.
  **Recommended Agent Profile**: Category `quick`; Skills `[]`; Omitted `deep`.
  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 8,10 | Blocked By: 1
  **References**: `README.md`, `docs/release-runbook.md`
  **Acceptance Criteria**: stable JSON payloads; dependency health surfaced; invalid PTT payload rejected.
  **QA Scenarios**:
  ```bash
  Scenario: Happy path endpoint checks
    Tool: Bash
    Steps: curl all endpoints while daemon runs
    Expected: HTTP 200 and expected JSON keys
    Evidence: .sisyphus/evidence/task-4-daemon-api.txt

  Scenario: Invalid PTT payload
    Tool: Bash
    Steps: POST invalid `state` to PTT endpoint
    Expected: HTTP 400 with allowed values
    Evidence: .sisyphus/evidence/task-4-daemon-api-error.txt
  ```
  **Commit**: YES | Message: `feat(api): add health and control endpoints` | Files: `internal/http/**`, `cmd/cleancomms/**`

- [ ] 5. Integrate rigctld lifecycle in app service
  **What to do**: Add startup probe, reconnect/backoff, and degraded-state mapping.
  **Must NOT do**: No hidden retries without surfaced status.
  **Recommended Agent Profile**: Category `unspecified-high`; Skills `[]`; Omitted `writing`.
  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 9,10 | Blocked By: 2,4
  **References**: `scripts/validate-radio-kb.sh`, `docs/radios/tx-500.md`
  **Acceptance Criteria**: dependency failures transition health to degraded; reconnect behavior observable.
  **QA Scenarios**:
  ```bash
  Scenario: Happy path dependency online
    Tool: Bash
    Steps: run daemon with rigctld up and query health repeatedly
    Expected: status remains ok
    Evidence: .sisyphus/evidence/task-5-rig-service.txt

  Scenario: Runtime rigctld drop
    Tool: Bash
    Steps: stop rigctld while daemon runs
    Expected: health transitions to degraded with cause
    Evidence: .sisyphus/evidence/task-5-rig-service-error.txt
  ```
  **Commit**: YES | Message: `feat(core): integrate rigctld dependency lifecycle` | Files: `internal/app/**`

- [ ] 6. Integrate fldigi lifecycle in app service
  **What to do**: Add modem probe/reconnect and PSK31 ensure path at startup.
  **Must NOT do**: Do not force transmit at startup.
  **Recommended Agent Profile**: Category `unspecified-high`; Skills `[]`; Omitted `deep`.
  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 9,10 | Blocked By: 3,4
  **References**: `https://www.w1hkj.org/FldigiHelp/xmlrpc_control_page.html`
  **Acceptance Criteria**: modem status independent from rig status; restart recovery works.
  **QA Scenarios**:
  ```bash
  Scenario: Happy path modem online
    Tool: Bash
    Steps: run daemon with fldigi up and check modem status
    Expected: connected and active mode PSK31
    Evidence: .sisyphus/evidence/task-6-modem-service.txt

  Scenario: fldigi restart recovery
    Tool: Bash
    Steps: restart fldigi while daemon runs
    Expected: degraded then recovered state
    Evidence: .sisyphus/evidence/task-6-modem-service-error.txt
  ```
  **Commit**: YES | Message: `feat(modem): integrate fldigi dependency lifecycle` | Files: `internal/app/**`

- [ ] 7. Write macOS setup/runbook
  **What to do**: Add `docs/setup/tx500-digirig-macos.md` with cabling, serial/audio checks, startup sequence, and troubleshooting.
  **Must NOT do**: Do not claim automation exists for audio routing.
  **Recommended Agent Profile**: Category `writing`; Skills `[]`; Omitted `unspecified-high`.
  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 11 | Blocked By: 3
  **References**: `docs/radios/tx-500.md`, `https://digirig.net/selecting-digirig-configuration/`, hamlib docs
  **Acceptance Criteria**: includes port map (`4532`,`7362`), PSK31 validation steps, and failure matrix.
  **QA Scenarios**:
  ```bash
  Scenario: Happy path runbook replay
    Tool: Bash
    Steps: follow runbook commands in order
    Expected: dependencies reachable at documented ports
    Evidence: .sisyphus/evidence/task-7-macos-runbook.txt

  Scenario: Invalid serial path
    Tool: Bash
    Steps: run with incorrect `/dev/cu.*` path
    Expected: documented error and recovery step are accurate
    Evidence: .sisyphus/evidence/task-7-macos-runbook-error.txt
  ```
  **Commit**: YES | Message: `docs(setup): add tx500 digirig fldigi macos runbook` | Files: `docs/setup/tx500-digirig-macos.md`

- [ ] 8. Add minimal API contract tests
  **What to do**: Implement endpoint tests for health/rig/modem/PTT plus invalid payload checks.
  **Must NOT do**: No heavy framework migration.
  **Recommended Agent Profile**: Category `quick`; Skills `[]`; Omitted `deep`.
  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 10 | Blocked By: 4
  **References**: API handlers from task 4
  **Acceptance Criteria**: `go test ./...` includes contract suite; invalid PTT state asserts HTTP 400.
  **QA Scenarios**:
  ```bash
  Scenario: Happy path contract suite
    Tool: Bash
    Steps: run `go test ./... -run TestAPIContract`
    Expected: contract tests pass
    Evidence: .sisyphus/evidence/task-8-api-contract-tests.txt

  Scenario: Invalid PTT contract
    Tool: Bash
    Steps: run invalid payload test case
    Expected: fails if endpoint accepts invalid values
    Evidence: .sisyphus/evidence/task-8-api-contract-tests-error.txt
  ```
  **Commit**: YES | Message: `test(api): add endpoint contract tests` | Files: `internal/http/**/*_test.go`

- [ ] 9. Add control coordinator + PTT watchdog
  **What to do**: Enforce ready-state ordering and auto-RX safety timeout.
  **Must NOT do**: No macro transmission engine.
  **Recommended Agent Profile**: Category `deep`; Skills `[]`; Omitted `writing`.
  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: 10 | Blocked By: 5,6
  **References**: `data/radios/tx-500.json`, `docs/radios/tx-500.md`
  **Acceptance Criteria**: TX blocked when degraded; timeout forces RX; timeout configurable.
  **QA Scenarios**:
  ```bash
  Scenario: Happy path TX/RX cycle
    Tool: Bash
    Steps: toggle tx then rx through API
    Expected: ordered state changes and success responses
    Evidence: .sisyphus/evidence/task-9-ptt-watchdog.txt

  Scenario: Stuck TX prevention
    Tool: Bash
    Steps: enter TX and wait past watchdog timeout
    Expected: forced RX and logged safety event
    Evidence: .sisyphus/evidence/task-9-ptt-watchdog-error.txt
  ```
  **Commit**: YES | Message: `feat(safety): add ptt watchdog coordinator` | Files: `internal/control/**`, `internal/app/**`

- [ ] 10. Add smoke/integration scripts
  **What to do**: Create `scripts/smoke-tx500-fldigi.sh` and `scripts/test-ptt-watchdog.sh` with deterministic exit codes.
  **Must NOT do**: Do not assume CI hardware presence.
  **Recommended Agent Profile**: Category `quick`; Skills `[]`; Omitted `playwright`.
  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: 11,12 | Blocked By: 5,6,8,9
  **References**: `scripts/validate-radio-kb.sh` output style
  **Acceptance Criteria**: smoke script fails fast on missing dependency; watchdog script verifies forced RX.
  **QA Scenarios**:
  ```bash
  Scenario: Happy path smoke checks
    Tool: Bash
    Steps: run smoke script with all dependencies up
    Expected: script exits 0 with pass summary
    Evidence: .sisyphus/evidence/task-10-smoke-script.txt

  Scenario: Dependency missing
    Tool: Bash
    Steps: run smoke script with fldigi stopped
    Expected: non-zero exit with named missing dependency
    Evidence: .sisyphus/evidence/task-10-smoke-script-error.txt
  ```
  **Commit**: YES | Message: `test(smoke): add tx500 fldigi smoke scripts` | Files: `scripts/smoke-tx500-fldigi.sh`, `scripts/test-ptt-watchdog.sh`

- [ ] 11. Capture operator evidence pack
  **What to do**: Record command outputs and environment assumptions for API and smoke checks.
  **Must NOT do**: No fabricated outputs.
  **Recommended Agent Profile**: Category `writing`; Skills `[]`; Omitted `deep`.
  **Parallelization**: Can Parallel: YES | Wave 4 | Blocks: 12 | Blocked By: 7,10
  **References**: `.sisyphus/evidence/task-12-kb-final-audit.txt`, `docs/setup/tx500-digirig-macos.md`
  **Acceptance Criteria**: required evidence files exist, non-empty, and include command/exit status/timestamp.
  **QA Scenarios**:
  ```bash
  Scenario: Evidence completeness
    Tool: Bash
    Steps: run evidence checklist script
    Expected: all required evidence files found
    Evidence: .sisyphus/evidence/task-11-evidence-pack.txt

  Scenario: Missing evidence detection
    Tool: Bash
    Steps: remove one expected evidence artifact and run checklist
    Expected: checklist fails and reports missing path
    Evidence: .sisyphus/evidence/task-11-evidence-pack-error.txt
  ```
  **Commit**: YES | Message: `docs(evidence): capture tx500 slice artifacts` | Files: `.sisyphus/evidence/task-11-*`

- [ ] 12. Execute full verification sweep and final audit
  **What to do**: Run build/test/smoke/watchdog command chain and produce final PASS/FAIL audit.
  **Must NOT do**: Do not mark complete if failure-path checks are skipped.
  **Recommended Agent Profile**: Category `unspecified-high`; Skills `[]`; Omitted `artistry`.
  **Parallelization**: Can Parallel: NO | Wave 4 | Blocks: Final Verification Wave | Blocked By: 10,11
  **References**: `.sisyphus/plans/radio-capability-kb.md`, `.sisyphus/evidence/task-12-kb-final-audit.txt`
  **Acceptance Criteria**: `go test ./...`, `go build ./...`, smoke and watchdog scripts all pass; final audit written.
  **QA Scenarios**:
  ```bash
  Scenario: Happy path full sweep
    Tool: Bash
    Steps: run full verification command sequence
    Expected: all checks pass and final audit reports PASS
    Evidence: .sisyphus/evidence/task-12-vertical-slice-final-audit.txt

  Scenario: Forced-failure regression
    Tool: Bash
    Steps: set invalid fldigi port and rerun smoke
    Expected: failure is detected and final audit reports FAIL cause
    Evidence: .sisyphus/evidence/task-12-vertical-slice-final-audit-error.txt
  ```
  **Commit**: YES | Message: `chore(verify): finalize tx500 vertical slice audit` | Files: `.sisyphus/evidence/task-12-*`

## Final Verification Wave (4 parallel agents, ALL must APPROVE)
- [ ] F1. Plan Compliance Audit — oracle
- [ ] F2. Code Quality Review — unspecified-high
- [ ] F3. Real Manual QA — unspecified-high
- [ ] F4. Scope Fidelity Check — deep

## Commit Strategy
- Commit A: daemon scaffold + config schema + endpoints
- Commit B: rigctld/fldigi client integration + watchdog
- Commit C: scripts + runbook + evidence harness
- Commit D: final verification artifacts and plan checkbox updates

## Success Criteria
- TX-500 + DigiRig + rigctld + fldigi PSK31 first slice is reproducible on macOS using documented steps
- Daemon surfaces health and control APIs with deterministic behavior
- Smoke and failure-path checks execute and produce evidence artifacts
