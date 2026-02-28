# CleanComms Foundation Execution Plan

## TL;DR
> **Summary**: Build a Linux-first, backend-orchestrated HF operating suite foundation in Go where the daemon owns CAT/PTT/audio coordination and JS8Call is the first integrated mode engine.
> **Deliverables**:
> - Production-ready daemon skeleton (Fiber + internal gRPC + lifecycle)
> - Rig/PTT/session orchestration with TX-500-first profile model
> - JS8Call-first adapter path with unified state/events
> - Full TDD/CI baseline and agent-executable verification evidence
> **Effort**: XL
> **Parallel**: YES - 3 waves
> **Critical Path**: Task 1 -> 2 -> 3 -> 9 -> 12

## Context
### Original Request
Build CleanComms as a modern GPL HF suite with backend-owned CAT/PTT/audio, plugin-style engine integrations, Linux-first execution, TX-500 initial focus, and fast mode switching with a local web dashboard.

### Interview Summary
- Repo is greenfield with no existing source, tests, CI, or conventions.
- Confirmed decisions: Go + Fiber + internal gRPC, headless daemon + local web UI, JS8Call-first integration, full TDD from day 1.
- Architecture intent fixed: daemon is single source of truth for real-time state and hardware ownership; UI is control/observability only.
- Additional radios marked for support target list: Digi-link mobile (TX-500MP), FX-4CR, (tr)usdx, and Xiegu X6100.

### Metis Review (gaps addressed)
- Added guardrails for rig contention, PTT safety watchdogs, and scope anti-creep.
- Locked explicit defaults where user intent was not directly specified (see Defaults Applied in summary).
- Included simulator-first QA strategy so all acceptance criteria remain agent-executable.
- Defaulted rig ownership model to daemon-only CAT/PTT authority; engine adapters are command clients, never hardware owners.

## Work Objectives
### Core Objective
Deliver a decision-complete implementation sequence for a reliable TX-500-first CleanComms foundation that proves backend orchestration, safe transmit control, and JS8Call integration without multi-engine complexity.

### Deliverables
- Initial repo scaffolding, coding standards, and CI gates.
- Daemon runtime with API/control planes, versioned contracts, and observability.
- Rig control abstraction (Hamlib rigctld path first), PTT safety state machine, and mode-switch transaction framework.
- JS8Call adapter with health supervision and unified event mapping.
- Local web dashboard MVP for status, mode transitions, and diagnostics.
- Radio compatibility matrix with support tiers (Primary vs Community-Validated) including Digi-link mobile (TX-500MP), FX-4CR, (tr)usdx, and Xiegu X6100 as community-validated targets.

### Definition of Done (verifiable conditions with commands)
- `go test ./...` passes with agreed coverage threshold enforced in CI.
- `go test -race ./...` passes for daemon/control packages.
- `go build ./...` succeeds on Linux and macOS runners.
- `docker compose up -d` (simulators profile) launches rigctld dummy + JS8Call test harness and health checks pass.
- `curl -sf http://127.0.0.1:8080/api/v1/health` returns healthy with dependency status.
- `grpcurl -plaintext 127.0.0.1:9090 list` returns exposed internal services.

### Must Have
- Daemon-only hardware ownership model enforced by contract and code boundaries.
- Full TDD workflow (RED-GREEN-REFACTOR) for all backend modules.
- Deterministic mode-switch state machine with rollback on failure.
- PTT watchdog + emergency release path validated in automated tests.
- JS8Call-first adapter integrated without allowing direct CAT ownership drift.
- Audio ownership default: daemon owns profile validation/routing policy; engines consume daemon-assigned endpoints.
- Explicit support-tier policy: TX-500 as Primary (CI/simulator-gated), Digi-link mobile (TX-500MP), FX-4CR, (tr)usdx, and Xiegu X6100 as Community-Validated targets.

### Must NOT Have (guardrails, AI slop patterns, scope boundaries)
- No DSP modem rewrites.
- No WSJT-X/fldigi/FreeDV implementation in this plan scope.
- No claim of full certification for non-primary radios until community evidence artifacts are collected.
- No browser-direct hardware access.
- No unstable plugin marketplace/runtime loading work in Wave 1-3.
- No runtime plugin ABI stabilization in foundation; use compile-time adapters first.

## Verification Strategy
> ZERO HUMAN INTERVENTION - all verification is agent-executed.
- Test decision: TDD + Go testing (`testing`, `testify`, `gomock` or `mockery`-generated mocks).
- QA policy: Every task contains happy-path and failure-path agent-executed scenarios.
- Evidence: `.sisyphus/evidence/task-{N}-{slug}.{ext}`

## Execution Strategy
### Parallel Execution Waves
> Target: 5-8 tasks per wave. Shared dependencies extracted into Wave 1.

Wave 1: Foundation and contract hardening (tasks 1-5)
Wave 2: Core orchestration and safety controls (tasks 6-10)
Wave 3: JS8Call integration and dashboard MVP (tasks 11-15)

### Dependency Matrix (full, all tasks)
| Task | Depends On |
|---|---|
| 1 | - |
| 2 | 1 |
| 3 | 1,2 |
| 4 | 1 |
| 5 | 2,4 |
| 6 | 3,5 |
| 7 | 3,5 |
| 8 | 6,7 |
| 9 | 6,8 |
| 10 | 7,8 |
| 11 | 6,8 |
| 12 | 9,11 |
| 13 | 10,11 |
| 14 | 9,10,12 |
| 15 | 12,13,14 |

### Agent Dispatch Summary (wave -> task count -> categories)
- Wave 1 -> 5 tasks -> `deep`, `quick`, `unspecified-high`
- Wave 2 -> 5 tasks -> `deep`, `unspecified-high`
- Wave 3 -> 5 tasks -> `unspecified-high`, `visual-engineering`, `deep`

## TODOs
> Implementation + Test = ONE task. Never separate.
> EVERY task MUST have: Agent Profile + Parallelization + QA Scenarios.

- [ ] 1. Establish repository baseline and architecture decision records

  **What to do**: Initialize Go module, standard directory layout (`cmd`, `internal`, `ui`, `proto`, `.github/workflows`), ADR template, and architecture docs that codify daemon hardware ownership, JS8Call-first scope, TX-500-first scope, support tiers, and non-goals.
  **Must NOT do**: Do not add WSJT-X/fldigi implementation code; do not define multi-rig support.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: Foundational architecture constraints must be precise and future-safe.
  - Skills: [`git-master`] - Reason: Clean commit boundaries for baseline scaffolding.
  - Omitted: [`frontend-ui-ux`] - Reason: No UI styling work in this task.

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: 2,3,4,5 | Blocked By: -

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `.sisyphus/plans/cleancomms-foundation-execution.md` - Confirmed project goals and boundaries.
  - External: `https://go.dev/doc/modules/layout` - Go module/project layout guidance.
  - External: `https://github.com/joelparkerhenderson/architecture-decision-record` - ADR structure.

  **Acceptance Criteria** (agent-executable only):
  - [ ] `go mod init` exists and `go test ./...` runs (even if no-op packages initially).
  - [ ] ADR documenting hardware ownership and scope constraints is present.
  - [ ] Compatibility matrix file exists with support tiers: Primary (TX-500) and Community-Validated targets (Digi-link mobile/TX-500MP, FX-4CR, (tr)usdx, Xiegu X6100).
  - [ ] CI stub workflow file exists and is syntactically valid.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```bash
  Scenario: Happy path - baseline project boots
    Tool: Bash
    Steps: Run `go test ./...` and `go list ./...`
    Expected: Commands succeed with zero failures
    Evidence: .sisyphus/evidence/task-1-repo-baseline.txt

  Scenario: Failure/edge case - forbidden scope check
    Tool: Bash
    Steps: `grep -R "WSJT-X" -n .` and verify no implementation files beyond ADR mention
    Expected: No engine implementation artifacts present
    Evidence: .sisyphus/evidence/task-1-repo-baseline-error.txt
  ```

  **Commit**: YES | Message: `chore(repo): initialize cleancomms foundation layout` | Files: [new baseline structure files]

- [ ] 2. Implement TDD/quality toolchain and CI gates

  **What to do**: Add test runner config, coverage thresholds, race checks, linting, formatting checks, and GitHub Actions pipeline for Linux/macOS build+test matrix.
  **Must NOT do**: Do not weaken failing thresholds to pass quickly.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: Multi-tool quality pipeline with strict policy tuning.
  - Skills: [] - Reason: Standard toolchain setup.
  - Omitted: [`playwright`] - Reason: No browser automation needed yet.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 3,5 | Blocked By: 1

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `.sisyphus/plans/cleancomms-foundation-execution.md` - TDD-from-day-1 policy.
  - External: `https://go.dev/doc/tutorial/add-a-test` - Go testing baseline.
  - External: `https://github.com/golangci/golangci-lint-action` - CI lint action.

  **Acceptance Criteria** (agent-executable only):
  - [ ] `go test ./... -cover` enforces configured minimum coverage.
  - [ ] `go test -race ./...` runs in CI.
  - [ ] Pull request CI fails on lint/test/build failures.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```bash
  Scenario: Happy path - all quality checks pass
    Tool: Bash
    Steps: Run `go test ./... -cover` then `go test -race ./...` then lint command
    Expected: All commands exit 0
    Evidence: .sisyphus/evidence/task-2-quality-ci.txt

  Scenario: Failure/edge case - CI gate enforcement
    Tool: Bash
    Steps: Introduce temporary lint violation in test branch and run lint
    Expected: Lint exits non-zero and CI would fail
    Evidence: .sisyphus/evidence/task-2-quality-ci-error.txt
  ```

  **Commit**: YES | Message: `test(ci): enforce tdd quality gates and matrix checks` | Files: [.github/workflows/*, tool configs]

- [ ] 3. Define and implement v1 control contracts (HTTP + internal gRPC)

  **What to do**: Create versioned API contract for rig/session/engine commands, event schema, correlation IDs, idempotency fields, and health surfaces.
  **Must NOT do**: Do not expose unstable engine-specific payloads as public API.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: Contract decisions constrain all downstream work.
  - Skills: [] - Reason: Domain-specific design.
  - Omitted: [`frontend-ui-ux`] - Reason: Backend contract work only.

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: 6,7,11 | Blocked By: 1,2

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `.sisyphus/plans/cleancomms-foundation-execution.md` - Canonical ownership model and scope.
  - External: `https://grpc.io/docs/what-is-grpc/core-concepts/` - gRPC contract design.
  - External: `https://datatracker.ietf.org/doc/html/rfc9457` - Problem Details for API error model.

  **Acceptance Criteria** (agent-executable only):
  - [ ] Contract files compile and generated stubs build successfully.
  - [ ] API spec includes explicit error codes for timeout, busy, rejected, unavailable.
  - [ ] Contract tests cover idempotency and correlation ID propagation.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```bash
  Scenario: Happy path - contract generation and conformance tests
    Tool: Bash
    Steps: Run proto/codegen command and `go test ./... -run Contract`
    Expected: Generation succeeds and contract tests pass
    Evidence: .sisyphus/evidence/task-3-contracts.txt

  Scenario: Failure/edge case - invalid command payload
    Tool: Bash
    Steps: Send malformed JSON/proto request to command endpoint in integration test
    Expected: Deterministic 4xx/invalid-argument response with structured error
    Evidence: .sisyphus/evidence/task-3-contracts-error.txt
  ```

  **Commit**: YES | Message: `feat(api): add versioned v1 control and event contracts` | Files: [api/proto/spec files]

- [ ] 4. Build daemon lifecycle, config system, and observability baseline

  **What to do**: Implement process bootstrap, config profiles, structured logs, metrics endpoint, readiness/liveness probes, graceful shutdown with timeout, and startup dependency checks.
  **Must NOT do**: Do not embed business logic in bootstrap code.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: Runtime reliability and instrumentation depth.
  - Skills: [] - Reason: Standard backend reliability patterns.
  - Omitted: [`playwright`] - Reason: Non-UI task.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 5,6 | Blocked By: 1

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `.sisyphus/plans/cleancomms-foundation-execution.md` - observability and lifecycle goals.
  - External: `https://pkg.go.dev/context` - cancellation/shutdown propagation.
  - External: `https://opentelemetry.io/docs/languages/go/` - telemetry baseline patterns.

  **Acceptance Criteria** (agent-executable only):
  - [ ] Daemon starts with config profile and exposes health + metrics endpoints.
  - [ ] SIGTERM triggers graceful shutdown within configured timeout.
  - [ ] Structured logs contain correlation IDs for requests.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```bash
  Scenario: Happy path - daemon health and metrics
    Tool: Bash
    Steps: Start daemon, curl `/api/v1/health` and `/metrics`
    Expected: Both endpoints return success with dependency fields
    Evidence: .sisyphus/evidence/task-4-lifecycle-observability.txt

  Scenario: Failure/edge case - dependency missing at startup
    Tool: Bash
    Steps: Start daemon with invalid rig endpoint config
    Expected: Daemon reports degraded/not-ready with explicit dependency error
    Evidence: .sisyphus/evidence/task-4-lifecycle-observability-error.txt
  ```

  **Commit**: YES | Message: `feat(core): add daemon lifecycle config and observability baseline` | Files: [core runtime files]

- [ ] 5. Create simulation harness for rig and engine integration tests

  **What to do**: Add docker-compose or equivalent local harness for Hamlib dummy rigctld and JS8Call test fixture, with deterministic ports and seeded test data.
  **Must NOT do**: Do not require physical radio hardware for baseline CI.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: Cross-process integration test orchestration.
  - Skills: [] - Reason: Standard simulation harness work.
  - Omitted: [`frontend-ui-ux`] - Reason: Infrastructure only.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 6,7,11 | Blocked By: 2,4

  **References** (executor has NO interview context - be exhaustive):
  - External: `https://hamlib.sourceforge.net/html/rigctld.1.html` - rigctld startup/config flags.
  - External: `https://github.com/js8call/js8call` - JS8Call baseline behavior and API assumptions.
  - Pattern: `.sisyphus/plans/cleancomms-foundation-execution.md` - simulator-first verification policy.

  **Acceptance Criteria** (agent-executable only):
  - [ ] Simulators start with one command and pass health checks.
  - [ ] Integration tests can connect to rig and JS8 endpoints without manual setup.
  - [ ] Harness teardown leaves no lingering processes.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```bash
  Scenario: Happy path - simulators available
    Tool: Bash
    Steps: Run `docker compose up -d`, then probe rig and JS8 fixture ports
    Expected: All required ports accept connections and health checks pass
    Evidence: .sisyphus/evidence/task-5-sim-harness.txt

  Scenario: Failure/edge case - one simulator unavailable
    Tool: Bash
    Steps: Stop rig container/process and run integration preflight
    Expected: Preflight fails fast with actionable error
    Evidence: .sisyphus/evidence/task-5-sim-harness-error.txt
  ```

  **Commit**: YES | Message: `test(infra): add deterministic rig and js8 simulation harness` | Files: [compose/test harness files]

- [ ] 6. Implement Rig API abstraction and Hamlib rigctld adapter

  **What to do**: Build internal Rig API (`set/get freq`, `mode`, `ptt`, `split`, `status`) and implement rigctld transport adapter with timeout, retry, and capability discovery.
  **Must NOT do**: Do not allow multiple independent rig writers outside daemon arbitration.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: Hardware abstraction correctness and contention control are critical.
  - Skills: [] - Reason: Domain-specific implementation.
  - Omitted: [`playwright`] - Reason: Backend protocol task.

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: 8,9,11 | Blocked By: 3,5

  **References** (executor has NO interview context - be exhaustive):
  - External: `https://hamlib.sourceforge.net/manuals/4.7/group__rig.html` - error/capability model.
  - External: `https://hamlib.sourceforge.net/html/rigctld.1.html` - rigctld command behavior.
  - Pattern: `.sisyphus/plans/cleancomms-foundation-execution.md` - one rig API principle.

  **Acceptance Criteria** (agent-executable only):
  - [ ] Adapter maps Hamlib error codes to internal typed errors.
  - [ ] Capability discovery populates internal feature flags.
  - [ ] Concurrency tests prove single-writer arbitration.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```bash
  Scenario: Happy path - set and read frequency through adapter
    Tool: Bash
    Steps: Start dummy rigctld, run integration test for set/get frequency and mode
    Expected: Values round-trip correctly with success status
    Evidence: .sisyphus/evidence/task-6-rig-adapter.txt

  Scenario: Failure/edge case - timeout handling
    Tool: Bash
    Steps: Point adapter to non-responsive rig endpoint and run timeout test
    Expected: Deterministic timeout error classification and retry cap respected
    Evidence: .sisyphus/evidence/task-6-rig-adapter-error.txt
  ```

  **Commit**: YES | Message: `feat(rig): add rig api and hamlib rigctld adapter` | Files: [internal/rig/*]

- [ ] 7. Implement PTT safety state machine and watchdog controls

  **What to do**: Create explicit TX state machine with guard conditions, maximum TX timer, emergency release path, and transition audit events.
  **Must NOT do**: Do not permit indefinite TX state without watchdog.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: Safety-critical logic and deterministic transitions.
  - Skills: [] - Reason: Project-specific safety model.
  - Omitted: [`frontend-ui-ux`] - Reason: No UI design involved.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 8,10,12 | Blocked By: 3,5

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `.sisyphus/plans/cleancomms-foundation-execution.md` - required PTT guardrails.
  - External: `https://hamlib.sourceforge.net/manuals/4.7/group__rig.html` - PTT command semantics.

  **Acceptance Criteria** (agent-executable only):
  - [ ] State machine unit tests cover legal and illegal transitions.
  - [ ] Watchdog auto-release test passes for stuck TX condition.
  - [ ] Audit events include transition reason and correlation ID.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```bash
  Scenario: Happy path - controlled TX lifecycle
    Tool: Bash
    Steps: Trigger TX on, observe state transition, trigger TX off in integration test
    Expected: Transitions follow IDLE->ARMED->TX->IDLE without violations
    Evidence: .sisyphus/evidence/task-7-ptt-safety.txt

  Scenario: Failure/edge case - stuck TX watchdog
    Tool: Bash
    Steps: Simulate missing TX-off event and wait for watchdog interval
    Expected: Automatic emergency release and explicit alarm event
    Evidence: .sisyphus/evidence/task-7-ptt-safety-error.txt
  ```

  **Commit**: YES | Message: `feat(safety): add ptt state machine and watchdog enforcement` | Files: [internal/safety/*]

- [ ] 8. Implement radio session transaction manager (mode switch orchestration)

  **What to do**: Implement transactional mode-switch coordinator with lock acquisition, staged operations, rollback, and health gate checks.
  **Must NOT do**: Do not perform partial state changes without rollback policy.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: Orchestration correctness across multiple subsystems.
  - Skills: [] - Reason: Core domain orchestration.
  - Omitted: [`playwright`] - Reason: Backend orchestration task.

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: 9,10,12,13 | Blocked By: 6,7

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `.sisyphus/plans/cleancomms-foundation-execution.md` - mode switch backend transaction steps.
  - External: `https://martinfowler.com/articles/patterns-of-distributed-systems/saga.html` - rollback orchestration concept.

  **Acceptance Criteria** (agent-executable only):
  - [ ] Switch transaction tests validate lock->configure->start->verify flow.
  - [ ] Failure injection tests validate rollback to previous stable state.
  - [ ] Session manager exposes current phase and last failure reason.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```bash
  Scenario: Happy path - successful mode transition
    Tool: Bash
    Steps: Call mode-switch API to JS8 profile in simulator environment
    Expected: Transaction reaches COMMITTED state with healthy dependencies
    Evidence: .sisyphus/evidence/task-8-session-manager.txt

  Scenario: Failure/edge case - adapter start failure rollback
    Tool: Bash
    Steps: Inject adapter startup failure and run transition
    Expected: Transaction reaches ROLLED_BACK with previous state restored
    Evidence: .sisyphus/evidence/task-8-session-manager-error.txt
  ```

  **Commit**: YES | Message: `feat(session): add transactional mode switch coordinator` | Files: [internal/session/*]

- [ ] 9. Implement engine supervisor framework (process + health + restart policy)

  **What to do**: Build engine supervisor with managed process lifecycle, startup probes, heartbeat checks, exponential backoff restarts, and terminal-failure escalation.
  **Must NOT do**: Do not auto-restart indefinitely without backoff cap and circuit-breaker state.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: Process supervision and fault containment complexity.
  - Skills: [] - Reason: Standard reliability engineering patterns.
  - Omitted: [`frontend-ui-ux`] - Reason: Backend process control only.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 12,14 | Blocked By: 6,8

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `.sisyphus/plans/cleancomms-foundation-execution.md` - engine adapter lifecycle expectations.
  - External: `https://pkg.go.dev/os/exec` - process execution and control.

  **Acceptance Criteria** (agent-executable only):
  - [ ] Supervisor can start/stop managed process and report health state.
  - [ ] Crash loop protection transitions to degraded state after retry cap.
  - [ ] Events emit restart count, failure reason, and next retry interval.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```bash
  Scenario: Happy path - supervised process healthy
    Tool: Bash
    Steps: Launch supervisor-managed mock engine and query health endpoint
    Expected: Engine state reports RUNNING and healthy
    Evidence: .sisyphus/evidence/task-9-engine-supervisor.txt

  Scenario: Failure/edge case - repeated crash loop
    Tool: Bash
    Steps: Use crashing mock binary under supervisor and observe retries
    Expected: State becomes DEGRADED after retry cap with alert event
    Evidence: .sisyphus/evidence/task-9-engine-supervisor-error.txt
  ```

  **Commit**: YES | Message: `feat(supervisor): add engine lifecycle and crash containment` | Files: [internal/supervisor/*]

- [ ] 10. Implement audio routing abstraction and profile binding layer

  **What to do**: Define backend audio routing model (device selection, sample rate policy, channel mapping), configuration validation, and profile binding for TX-500 field setup.
  **Must NOT do**: Do not implement cross-platform advanced DSP processing in foundation phase.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: Device orchestration and validation logic complexity.
  - Skills: [] - Reason: Custom domain abstraction.
  - Omitted: [`playwright`] - Reason: Non-UI task.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 13,14 | Blocked By: 7,8

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `.sisyphus/plans/cleancomms-foundation-execution.md` - single source of truth for audio/profile settings.
  - External: `https://www.freedesktop.org/wiki/Software/PulseAudio/Documentation/User/Modules/` - Linux audio routing reference.

  **Acceptance Criteria** (agent-executable only):
  - [ ] Audio profile schema validates required fields and constraints.
  - [ ] Runtime rejects invalid sample-rate/device combinations with explicit errors.
  - [ ] Profile load operation is idempotent and observable.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```bash
  Scenario: Happy path - valid TX-500 field profile
    Tool: Bash
    Steps: Load valid profile fixture and query active audio route
    Expected: Profile accepted and active route reflects fixture values
    Evidence: .sisyphus/evidence/task-10-audio-profiles.txt

  Scenario: Failure/edge case - incompatible route config
    Tool: Bash
    Steps: Load profile with unsupported sample rate/device mapping
    Expected: Validation fails with actionable error code and message
    Evidence: .sisyphus/evidence/task-10-audio-profiles-error.txt
  ```

  **Commit**: YES | Message: `feat(audio): add routing abstraction and profile validation` | Files: [internal/audio/*]

- [ ] 11. Implement JS8Call transport adapter (TCP/UDP JSON) and event normalization

  **What to do**: Build JS8Call adapter for command dispatch, connection management, heartbeat, response correlation, and normalized event publication into daemon event bus.
  **Must NOT do**: Do not give JS8Call independent authority over daemon state transitions.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: External protocol handling and internal normalization are core integration risks.
  - Skills: [] - Reason: Custom adapter work.
  - Omitted: [`frontend-ui-ux`] - Reason: Integration backend task.

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: 12,13 | Blocked By: 6,8

  **References** (executor has NO interview context - be exhaustive):
  - External: `https://github.com/js8call/js8call` - protocol and implementation source.
  - External: `https://www.delta25.de/JS8-2021-11/JS8Call_Guide.pdf` - command/event behavior documentation.
  - Pattern: `.sisyphus/plans/cleancomms-foundation-execution.md` - JS8Call-first integration decision.

  **Acceptance Criteria** (agent-executable only):
  - [ ] Adapter can connect, authenticate session identity, and receive heartbeat/state messages.
  - [ ] Command-response mapping works under concurrent requests.
  - [ ] Normalized event schema emitted for station, rig, and message events.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```bash
  Scenario: Happy path - command and event flow
    Tool: Bash
    Steps: Run JS8 fixture, issue GET_CALLSIGN and send test message command
    Expected: Valid response payload and corresponding normalized events
    Evidence: .sisyphus/evidence/task-11-js8-adapter.txt

  Scenario: Failure/edge case - dropped connection recovery
    Tool: Bash
    Steps: Terminate JS8 fixture connection during active polling
    Expected: Adapter enters reconnect loop with bounded backoff and recovers
    Evidence: .sisyphus/evidence/task-11-js8-adapter-error.txt
  ```

  **Commit**: YES | Message: `feat(js8call): add transport adapter and event normalization` | Files: [internal/engine/js8call/*]

- [ ] 12. Integrate JS8Call into session manager and mode activation workflow

  **What to do**: Wire JS8Call adapter into transaction manager so `ActivateMode(JS8)` performs lock, profile application, engine start, health verification, and commit/rollback.
  **Must NOT do**: Do not bypass transaction manager with direct engine start calls.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: Cross-module orchestration with safety and rollback constraints.
  - Skills: [] - Reason: Core integration logic.
  - Omitted: [`playwright`] - Reason: Backend integration.

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: 14,15 | Blocked By: 9,11

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `.sisyphus/plans/cleancomms-foundation-execution.md` - backend mode-switch sequence requirements.
  - External: `https://github.com/js8call/js8call` - engine behavior expectations.

  **Acceptance Criteria** (agent-executable only):
  - [ ] Mode activation endpoint drives full transaction and returns committed state.
  - [ ] Failure path rolls back and leaves rig/PTT/session in safe previous state.
  - [ ] Transaction logs include all stage timings and outcomes.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```bash
  Scenario: Happy path - JS8 mode activation transaction
    Tool: Bash
    Steps: Call activate-mode API in simulator env with healthy dependencies
    Expected: Response state=COMMITTED and active_mode=JS8
    Evidence: .sisyphus/evidence/task-12-js8-activation.txt

  Scenario: Failure/edge case - health gate rejection
    Tool: Bash
    Steps: Force JS8 heartbeat failure then call activate-mode API
    Expected: Transaction aborts or rolls back with explicit dependency failure
    Evidence: .sisyphus/evidence/task-12-js8-activation-error.txt
  ```

  **Commit**: YES | Message: `feat(session): integrate js8 activation transaction path` | Files: [session + js8 integration files]

- [ ] 13. Build unified state/event store and operator-facing telemetry endpoints

  **What to do**: Implement canonical in-memory state model for rig/session/engine status with replayable event stream and dashboard-ready query endpoints.
  **Must NOT do**: Do not duplicate state ownership inside UI layer.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: Cross-domain state consistency and event replay concerns.
  - Skills: [] - Reason: Core backend modeling.
  - Omitted: [`frontend-ui-ux`] - Reason: Data/API task.

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: 14,15 | Blocked By: 10,11

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `.sisyphus/plans/cleancomms-foundation-execution.md` - single source of truth requirement.
  - External: `https://12factor.net/logs` - event/log stream discipline.

  **Acceptance Criteria** (agent-executable only):
  - [ ] State snapshot endpoint returns rig/session/engine state in one payload.
  - [ ] Event stream endpoint emits normalized ordered events.
  - [ ] Replay tests validate deterministic state reconstruction from event history.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```bash
  Scenario: Happy path - state snapshot and stream available
    Tool: Bash
    Steps: Trigger state changes then query snapshot and stream endpoints
    Expected: Snapshot reflects latest state and stream shows ordered events
    Evidence: .sisyphus/evidence/task-13-state-telemetry.txt

  Scenario: Failure/edge case - out-of-order event injection
    Tool: Bash
    Steps: Inject synthetic out-of-order event in test harness
    Expected: System rejects or reorders deterministically with audit marker
    Evidence: .sisyphus/evidence/task-13-state-telemetry-error.txt
  ```

  **Commit**: YES | Message: `feat(state): add unified status model and event telemetry apis` | Files: [internal/state/*, api handlers]

- [ ] 14. Deliver local web dashboard MVP (status, controls, diagnostics)

  **What to do**: Build minimal operator dashboard showing rig status, active mode, transaction timeline, engine health, and controls for safe JS8 activation/deactivation.
  **Must NOT do**: Do not add browser-side hardware APIs or direct CAT/PTT calls.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` - Reason: UI/UX execution tied to backend orchestration state.
  - Skills: [`frontend-ui-ux`] - Reason: Intentional non-generic operational console design.
  - Omitted: [`playwright`] - Reason: Automation used in QA, not core implementation.

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: 15 | Blocked By: 9,10,12

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `.sisyphus/plans/cleancomms-foundation-execution.md` - end-goal operator experience.
  - Pattern: `.sisyphus/plans/cleancomms-foundation-execution.md` - UI is dashboard, not authority.
  - External: `https://www.w3.org/WAI/standards-guidelines/wcag/` - accessibility baseline.

  **Acceptance Criteria** (agent-executable only):
  - [ ] Dashboard loads on desktop/mobile viewports and shows live rig/session/engine status.
  - [ ] Mode activation control triggers backend transaction and renders progress/result.
  - [ ] Error states display actionable diagnostics from structured backend errors.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```bash
  Scenario: Happy path - operator activates JS8 from dashboard
    Tool: Playwright
    Steps: Open dashboard, click `Activate JS8`, watch timeline/status cards update
    Expected: UI shows committed JS8 activation and healthy engine status
    Evidence: .sisyphus/evidence/task-14-dashboard-mvp.png

  Scenario: Failure/edge case - transaction failure surfaced clearly
    Tool: Playwright
    Steps: Trigger backend health fault then click `Activate JS8`
    Expected: UI shows failed state, reason code, and safe fallback status
    Evidence: .sisyphus/evidence/task-14-dashboard-mvp-error.png
  ```

  **Commit**: YES | Message: `feat(ui): add cleancomms dashboard for status and js8 control` | Files: [ui/*]

- [ ] 15. Run end-to-end hardening, release checks, and operator workflow verification

  **What to do**: Execute full test matrix, resilience tests, docs hardening, runbook verification for startup/recovery/safe mode switching, and ship community validation bundle instructions for non-primary radios.
  **Must NOT do**: Do not mark complete without captured evidence artifacts for all major flows.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: Comprehensive integration hardening and release confidence.
  - Skills: [] - Reason: Multi-surface verification task.
  - Omitted: [`frontend-ui-ux`] - Reason: Verification, not redesign.

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: Final Verification Wave | Blocked By: 12,13,14

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `.sisyphus/plans/cleancomms-foundation-execution.md` - complete acceptance and QA policy.
  - Pattern: `.sisyphus/plans/cleancomms-foundation-execution.md` - intended field-ready user flow.

  **Acceptance Criteria** (agent-executable only):
  - [ ] Full backend+UI+simulator test suite passes in CI and local reproducible run.
  - [ ] Resilience scenarios (restart, dependency loss, reconnect) pass with evidence.
  - [ ] Operator runbook validates launch->activate JS8->deactivate->shutdown flow.
  - [ ] Community validation template exists for non-primary radios with required log bundle fields and reproduction checklist.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```bash
  Scenario: Happy path - full operator flow
    Tool: Bash + Playwright
    Steps: Start stack, run API smoke tests, execute dashboard activation/deactivation flow
    Expected: All checks pass and flow completes without manual reconfiguration
    Evidence: .sisyphus/evidence/task-15-e2e-hardening.txt

  Scenario: Failure/edge case - daemon restart during active session
    Tool: Bash + Playwright
    Steps: Activate JS8, restart daemon process, observe recovery in UI/API
    Expected: Safe recovery path, no stuck TX, and clear degraded->healthy transition
    Evidence: .sisyphus/evidence/task-15-e2e-hardening-error.txt
  ```

  **Commit**: YES | Message: `chore(release): harden e2e flow and finalize foundation readiness` | Files: [test/report/runbook artifacts]

## Final Verification Wave (4 parallel agents, ALL must APPROVE)
- [ ] F1. Plan Compliance Audit - oracle
- [ ] F2. Code Quality Review - unspecified-high
- [ ] F3. Real Manual QA - unspecified-high (+ playwright if UI)
- [ ] F4. Scope Fidelity Check - deep

## Commit Strategy
- Commit per completed task when acceptance criteria and QA evidence are both present.
- Conventional commits required: `feat(scope): ...`, `fix(scope): ...`, `test(scope): ...`, `chore(scope): ...`.
- No multi-task mega-commits; keep one task per commit where practical.

## Success Criteria
- Operator can launch daemon + UI and execute deterministic mode transition into JS8 workflow without manual hardware reconfiguration.
- All critical controls (rig state, PTT safety, health, rollback) are observable and test-verified.
- Foundation is ready for next engine integration by implementing same adapter contract, with no daemon contract breaking changes.
