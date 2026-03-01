# CleanComms OSS Governance Launch Plan

## TL;DR
> **Summary**: Establish a complete public-repo governance and documentation foundation for CleanComms under ZeroState-IO so contributors can onboard, submit PRs, report bugs, and follow a clear release/versioning model from day one.
> **Deliverables**:
> - Community health and governance files (`README`, `LICENSE`, `CONTRIBUTING`, `CODE_OF_CONDUCT`, `SECURITY`, `SUPPORT`)
> - Git/GitHub process model (branch protection, PR rules, issue triage, CODEOWNERS, labels, Discussions)
> - Versioning/release policy (SemVer pre-1.0 + changelog + release runbook)
> - Safekeeping policy that requires `.sisyphus/plans` artifacts to be committed and pushed
> **Effort**: Medium
> **Parallel**: YES - 3 waves
> **Critical Path**: Task 1 -> 3 -> 5 -> 8 -> 11

## Context
### Original Request
Plan repository launch structure for public GitHub publication under ZeroState-IO, including README/docs, git strategy, versioning, PR/issue handling, and governance workflows.

### Interview Summary
- Repo is greenfield with only `.sisyphus` planning artifacts present.
- User wants public-facing structure now, with clear contribution flow and project direction.
- Confirmed policies: trunk-based `main` with squash merges, volunteer SLA, readiness-based pre-1.0 releases, Discussions enabled at launch.
- User requirement: `.sisyphus` plans must always be committed/pushed for safekeeping.

### Metis Review (gaps addressed)
- Added explicit governance sequencing: authority/policies first, templates/process mechanics second.
- Added maintainer-burnout guardrails (triage cadence, review WIP, SLA framing).
- Applied defaults where unspecified: GPL-3.0-or-later, CODEOWNERS at org/team level.
- Applied default CODEOWNERS target: `@ZeroState-IO/maintainers` (replace only if org team naming differs).

## Work Objectives
### Core Objective
Publish a decision-complete repository governance baseline that enables sustainable open-source collaboration without ambiguity or hidden maintainer process.

### Deliverables
- Governance documents and repository structure map.
- PR/issue/discussion templates and triage playbook.
- Branch/version/release policy with clear role responsibilities.
- Checklist and automation baseline for community health compliance.

### Definition of Done (verifiable conditions with commands)
- `ls` confirms all required governance files and `.github` templates exist.
- Community health checklist items are all present and linked from `README.md`.
- Branch/release/versioning policy documents include explicit rules and ownership.
- CI checks for docs/governance lint and required-file presence pass.

### Must Have
- Public-ready onboarding documentation with clear quickstart direction.
- Explicit PR/issue triage flow with labels, severity, and response expectations.
- SemVer + changelog + release-tag strategy documented for pre-1.0 stage.
- `.sisyphus/plans` safekeeping policy encoded in contribution and PR processes.

### Must NOT Have (guardrails, AI slop patterns, scope boundaries)
- No vague “best effort” governance language without concrete ownership or cadence.
- No over-engineered RFC bureaucracy at launch.
- No governance rules that require 24/7 maintainer response.
- No omission of security reporting path for a public repository.

## Verification Strategy
> ZERO HUMAN INTERVENTION - all verification is agent-executed.
- Test decision: tests-after for docs/process changes with automated validation scripts and CI checks.
- QA policy: Every task includes agent-executed happy-path and failure/edge scenarios.
- Evidence: `.sisyphus/evidence/task-{N}-{slug}.{ext}`

## Execution Strategy
### Parallel Execution Waves
> Target: 5-8 tasks per wave. Shared dependencies extracted into Wave 1.

Wave 1: Governance authority and baseline docs
Wave 2: Contribution workflows and triage operations
Wave 3: Versioning/release controls and final hardening

### Dependency Matrix (full, all tasks)
| Task | Depends On |
|---|---|
| 1 | - |
| 2 | 1 |
| 3 | 1 |
| 4 | 2,3 |
| 5 | 2 |
| 6 | 3,5 |
| 7 | 4,5 |
| 8 | 6,7 |
| 9 | 6 |
| 10 | 8,9 |
| 11 | 10 |
| 12 | 8,10,11 |

### Agent Dispatch Summary (wave -> task count -> categories)
- Wave 1 -> 4 tasks -> `writing`, `deep`
- Wave 2 -> 4 tasks -> `writing`, `unspecified-high`
- Wave 3 -> 4 tasks -> `writing`, `unspecified-high`, `deep`

## TODOs
> Implementation + Test = ONE task. Never separate.
> EVERY task MUST have: Agent Profile + Parallelization + QA Scenarios.

- [x] 1. Define repository charter and governance authority model

  **What to do**: Create core governance authority docs (`GOVERNANCE.md`) that define mission, decision authority, maintainer roles, policy-change process, and tie-break rules.
  **Must NOT do**: Do not add heavyweight RFC flow for all changes at launch.

  **Recommended Agent Profile**:
  - Category: `writing` - Reason: policy clarity and governance language quality.
  - Skills: [] - Reason: straightforward documentation drafting.
  - Omitted: [`frontend-ui-ux`] - Reason: no UI design scope.

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: 2,3,4 | Blocked By: -

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `.sisyphus/plans/cleancomms-oss-governance-launch.md` - authority-first sequencing and scope.
  - External: `https://docs.github.com/en/communities/setting-up-your-project-for-healthy-contributions` - community health baseline.

  **Acceptance Criteria** (agent-executable only):
  - [x] `GOVERNANCE.md` defines maintainers, merge/release authority, and policy-change rules.
  - [x] Governance file includes explicit volunteer-SLA framing and escalation path.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```bash
  Scenario: Happy path
    Tool: Bash
    Steps: Verify `GOVERNANCE.md` exists and grep for sections `Maintainers`, `Decision Process`, `Escalation`
    Expected: All required headings are present
    Evidence: .sisyphus/evidence/task-1-governance-charter.txt

  Scenario: Failure/edge case
    Tool: Bash
    Steps: Run validation script that fails if authority roles are missing
    Expected: Script exits non-zero when required section removed
    Evidence: .sisyphus/evidence/task-1-governance-charter-error.txt
  ```

  **Commit**: YES | Message: `docs(governance): define authority and decision model` | Files: [GOVERNANCE.md]

- [x] 2. Create public README with clear onboarding and project direction

  **What to do**: Write `README.md` covering project vision, current status, supported radios tier policy, architecture snapshot, quickstart, and links to governance/contribution/security/support docs.
  **Must NOT do**: Do not present unsupported features as currently available.

  **Recommended Agent Profile**:
  - Category: `writing` - Reason: high-impact onboarding narrative and structure.
  - Skills: [] - Reason: standard project README work.
  - Omitted: [`playwright`] - Reason: no browser automation needed.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 4,5 | Blocked By: 1

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `.sisyphus/plans/cleancomms-foundation-execution.md` - project roadmap and constraints.
  - Pattern: `.sisyphus/plans/cleancomms-oss-governance-launch.md` - governance and support-tier policy.
  - External: `https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-readmes`.

  **Acceptance Criteria** (agent-executable only):
  - [x] `README.md` includes sections: Overview, Status, Quickstart, Contribution, Security, Support, License.

  - [x] README links resolve to existing local governance/community files.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```bash
  Scenario: Happy path
    Tool: Bash
    Steps: Run markdown link checker against `README.md`
    Expected: Zero broken local links
    Evidence: .sisyphus/evidence/task-2-readme.txt

  Scenario: Failure/edge case
    Tool: Bash
    Steps: Remove one linked file temporarily and rerun link checker
    Expected: Checker fails and reports missing target
    Evidence: .sisyphus/evidence/task-2-readme-error.txt
  ```

  **Commit**: YES | Message: `docs(readme): publish public onboarding and direction` | Files: [README.md]

- [x] 3. Add core community health files and legal baseline

  **What to do**: Add `LICENSE` (GPL-3.0-or-later), `CODE_OF_CONDUCT.md` (Contributor Covenant), `CONTRIBUTING.md`, `SECURITY.md`, `SUPPORT.md`.
  **Must NOT do**: Do not include ambiguous security reporting instructions.

  **Recommended Agent Profile**:
  - Category: `writing` - Reason: policy/legal docs with clear public expectations.
  - Skills: [] - Reason: standards-based documentation.
  - Omitted: [`frontend-ui-ux`] - Reason: no UI scope.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 4,6 | Blocked By: 1

  **References** (executor has NO interview context - be exhaustive):
  - External: `https://docs.github.com/en/communities/setting-up-your-project-for-healthy-contributions/about-community-profiles-for-public-repositories`.
  - External: `https://choosealicense.com/licenses/gpl-3.0/`.
  - External: `https://docs.github.com/en/code-security/getting-started/adding-a-security-policy-to-your-repository`.

  **Acceptance Criteria** (agent-executable only):
  - [x] All community-health files exist in valid discoverable locations.

  - [x] `SECURITY.md` includes private reporting instructions and embargo behavior.

  - [x] `CONTRIBUTING.md` includes requirement that `.sisyphus/plans` changes are committed with related work.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```bash
  Scenario: Happy path
    Tool: Bash
    Steps: Verify required files exist and grep key policy phrases
    Expected: Presence checks and policy phrase checks pass
    Evidence: .sisyphus/evidence/task-3-community-health.txt

  Scenario: Failure/edge case
    Tool: Bash
    Steps: Run policy check script with missing `SECURITY.md`
    Expected: Script exits non-zero and reports missing file
    Evidence: .sisyphus/evidence/task-3-community-health-error.txt
  ```

  **Commit**: YES | Message: `docs(community): add license conduct contributing security support` | Files: [LICENSE, CODE_OF_CONDUCT.md, CONTRIBUTING.md, SECURITY.md, SUPPORT.md]

- [x] 4. Define CODEOWNERS and branch protection policy-as-code docs

  **What to do**: Add `.github/CODEOWNERS` and `docs/repo-policies.md` documenting trunk-based flow, squash merge requirement, required checks, and no-direct-push policy.
  **Must NOT do**: Do not set branch rules that require unavailable checks.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: policy correctness impacts all contributor flows.
  - Skills: [] - Reason: governance/process design.
  - Omitted: [`playwright`] - Reason: no browser tasks.

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: 7 | Blocked By: 2,3

  **References** (executor has NO interview context - be exhaustive):
  - External: `https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners`.
  - Pattern: `.sisyphus/plans/cleancomms-oss-governance-launch.md` - selected git flow and merge policy.

  **Acceptance Criteria** (agent-executable only):
  - [x] `.github/CODEOWNERS` includes org/team ownership entries.

  - [x] Policy doc explicitly states `main` protected + squash-only + CI required.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```bash
  Scenario: Happy path
    Tool: Bash
    Steps: Validate CODEOWNERS syntax with parser/linter and grep branch policy terms
    Expected: CODEOWNERS parses and policy statements are present
    Evidence: .sisyphus/evidence/task-4-codeowners-branch-policy.txt

  Scenario: Failure/edge case
    Tool: Bash
    Steps: Introduce malformed CODEOWNERS line in test branch and run parser
    Expected: Parser fails with line-specific error
    Evidence: .sisyphus/evidence/task-4-codeowners-branch-policy-error.txt
  ```

  **Commit**: YES | Message: `docs(repo): add codeowners and branch policy baseline` | Files: [.github/CODEOWNERS, docs/repo-policies.md]

- [x] 5. Implement issue forms and PR template for structured intake

  **What to do**: Add `.github/ISSUE_TEMPLATE/*` (bug, feature request, question) and `.github/PULL_REQUEST_TEMPLATE.md` with required reproduction, impact, checklist, and evidence fields.
  **Must NOT do**: Do not allow empty free-form bug reports by default.

  **Recommended Agent Profile**:
  - Category: `writing` - Reason: template quality directly affects triage quality.
  - Skills: [] - Reason: standard GitHub template authoring.
  - Omitted: [`frontend-ui-ux`] - Reason: non-UI process docs.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 7,8 | Blocked By: 2

  **References** (executor has NO interview context - be exhaustive):
  - External: `https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/configuring-issue-templates-for-your-repository`.
  - External: `https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/creating-a-pull-request-template-for-your-repository`.
  - Pattern: `.sisyphus/plans/cleancomms-oss-governance-launch.md` - required `.sisyphus` safekeeping behavior.

  **Acceptance Criteria** (agent-executable only):
  - [x] Bug template requires repro steps, expected vs actual, environment, and logs.

  - [x] PR template requires linked issue, scope statement, test evidence, and checklist item for `.sisyphus` plan updates.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```bash
  Scenario: Happy path
    Tool: Bash
    Steps: Validate YAML issue forms and confirm PR template headings exist
    Expected: Templates parse and required headings are present
    Evidence: .sisyphus/evidence/task-5-templates.txt

  Scenario: Failure/edge case
    Tool: Bash
    Steps: Run template validator with malformed issue form field
    Expected: Validation fails with field-level error
    Evidence: .sisyphus/evidence/task-5-templates-error.txt
  ```

  **Commit**: YES | Message: `docs(templates): add issue forms and pr template` | Files: [.github/ISSUE_TEMPLATE/*, .github/PULL_REQUEST_TEMPLATE.md]

- [x] 6. Define label taxonomy, severity model, and triage playbook

  **What to do**: Add `docs/triage-playbook.md` with label set, severity/priority matrix, response SLA, escalation thresholds, stale policy, and maintainer rotation/WIP guardrails.
  **Must NOT do**: Do not set SLAs that imply guaranteed response windows beyond volunteer capacity.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: operational sustainability and burnout prevention.
  - Skills: [] - Reason: governance operations design.
  - Omitted: [`playwright`] - Reason: no UI automation.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 8,9 | Blocked By: 3

  **References** (executor has NO interview context - be exhaustive):
  - External: `https://docs.github.com/en/issues/using-labels-and-milestones-to-track-work/managing-labels`.
  - Pattern: `.sisyphus/plans/cleancomms-oss-governance-launch.md` - volunteer SLA and maintainer guardrails.

  **Acceptance Criteria** (agent-executable only):
  - [x] Playbook defines first-response target, escalation triggers, and stale handling rules.

  - [x] Label taxonomy includes bug, enhancement, docs, question, good-first-issue, help-wanted, security, blocked/external.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```bash
  Scenario: Happy path
    Tool: Bash
    Steps: Run doc policy checker for required triage headings and label list
    Expected: Checker passes with all required sections
    Evidence: .sisyphus/evidence/task-6-triage-playbook.txt

  Scenario: Failure/edge case
    Tool: Bash
    Steps: Remove escalation section and rerun checker
    Expected: Checker fails and flags missing section
    Evidence: .sisyphus/evidence/task-6-triage-playbook-error.txt
  ```

  **Commit**: YES | Message: `docs(triage): add labels severity and maintainer workflow` | Files: [docs/triage-playbook.md]

- [x] 7. Add CI workflow for governance/docs quality gates

  **What to do**: Create `.github/workflows/docs-governance.yml` to validate markdown links, required file presence, template syntax, and policy check scripts on PRs.
  **Must NOT do**: Do not add flaky external checks that block contribution flow.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: CI gating correctness and contributor ergonomics.
  - Skills: [] - Reason: standard GitHub Actions setup.
  - Omitted: [`frontend-ui-ux`] - Reason: infrastructure task.

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: 10 | Blocked By: 4,5

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `.sisyphus/plans/cleancomms-oss-governance-launch.md` - required governance artifacts.
  - External: `https://docs.github.com/en/actions` - GitHub Actions fundamentals.

  **Acceptance Criteria** (agent-executable only):
  - [x] PR CI fails if required governance files are missing.
  - [x] PR CI fails on broken local markdown links.
  - [x] PR CI validates issue forms and PR template structure.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```bash
  Scenario: Happy path
    Tool: Bash
    Steps: Run workflow-equivalent checks locally via script target
    Expected: All checks pass with exit code 0
    Evidence: .sisyphus/evidence/task-7-governance-ci.txt

  Scenario: Failure/edge case
    Tool: Bash
    Steps: Delete required file (`SECURITY.md`) in test branch and run checks
    Expected: Required-file check fails clearly
    Evidence: .sisyphus/evidence/task-7-governance-ci-error.txt
  ```

  **Commit**: YES | Message: `ci(docs): enforce governance and template quality gates` | Files: [.github/workflows/docs-governance.yml, scripts/*]

- [x] 8. Configure Discussions categories and support routing policy

  **What to do**: Document Discussions category model (Q&A, Ideas, Announcements), issue-vs-discussion routing rules, and moderation/escalation responsibilities in `docs/community-operations.md`.
  **Must NOT do**: Do not allow support/security reports to be routed through public bug template by default.

  **Recommended Agent Profile**:
  - Category: `writing` - Reason: community operations policy clarity.
  - Skills: [] - Reason: process documentation.
  - Omitted: [`playwright`] - Reason: not a browser testing task.

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: 10,12 | Blocked By: 6,7

  **References** (executor has NO interview context - be exhaustive):
  - External: `https://docs.github.com/en/discussions/quickstart`.
  - External: `https://docs.github.com/en/discussions/managing-discussions-for-your-community/managing-discussions`.
  - Pattern: `SUPPORT.md` - support channel routing rules.

  **Acceptance Criteria** (agent-executable only):
  - [x] Community operations doc defines category purposes and moderation flow.
  - [x] Support/security routing is explicitly documented and consistent with templates.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```bash
  Scenario: Happy path
    Tool: Bash
    Steps: Run consistency checker across `SUPPORT.md`, issue templates, and community-operations doc
    Expected: Routing rules are consistent and checker passes
    Evidence: .sisyphus/evidence/task-8-discussions-routing.txt

  Scenario: Failure/edge case
    Tool: Bash
    Steps: Inject contradictory routing statement in one file and rerun checker
    Expected: Checker fails with mismatch details
    Evidence: .sisyphus/evidence/task-8-discussions-routing-error.txt
  ```

  **Commit**: YES | Message: `docs(community): add discussions and support routing operations` | Files: [docs/community-operations.md]

- [x] 9. Define SemVer pre-1.0 policy and versioning decision matrix

  **What to do**: Create `docs/versioning-policy.md` covering `0.x` semantics, bump rules by change type, breaking-change signaling, and `0.x -> 1.0` graduation criteria.
  **Must NOT do**: Do not leave breaking-change interpretation ambiguous for pre-1.0 APIs.

  **Recommended Agent Profile**:
  - Category: `writing` - Reason: policy precision and contributor predictability.
  - Skills: [] - Reason: standards-based documentation.
  - Omitted: [`frontend-ui-ux`] - Reason: no UI scope.

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: 10 | Blocked By: 6

  **References** (executor has NO interview context - be exhaustive):
  - External: `https://semver.org/`.
  - External: `https://www.conventionalcommits.org/en/v1.0.0/`.
  - Pattern: `.sisyphus/plans/cleancomms-oss-governance-launch.md` - readiness-based release decision.

  **Acceptance Criteria** (agent-executable only):
  - [x] Policy maps `feat`, `fix`, and breaking changes to explicit version bump behavior in `0.x`.
  - [x] Policy defines objective conditions for `1.0.0` readiness.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```bash
  Scenario: Happy path
    Tool: Bash
    Steps: Run policy linter to confirm required versioning sections and bump table exist
    Expected: Linter passes
    Evidence: .sisyphus/evidence/task-9-versioning-policy.txt

  Scenario: Failure/edge case
    Tool: Bash
    Steps: Remove breaking-change section and rerun linter
    Expected: Linter fails with missing section error
    Evidence: .sisyphus/evidence/task-9-versioning-policy-error.txt
  ```

  **Commit**: YES | Message: `docs(versioning): define semver pre-1.0 and graduation policy` | Files: [docs/versioning-policy.md]

- [x] 10. Add changelog and release runbook structure

  **What to do**: Create `CHANGELOG.md` (Keep a Changelog format) and `docs/release-runbook.md` covering readiness-based release steps, tagging convention (`v0.x.y`), release notes process, and rollback procedure.
  **Must NOT do**: Do not publish release process without rollback steps.

  **Recommended Agent Profile**:
  - Category: `writing` - Reason: release quality and repeatability.
  - Skills: [] - Reason: process documentation.
  - Omitted: [`playwright`] - Reason: no UI automation.

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: 11,12 | Blocked By: 8,9

  **References** (executor has NO interview context - be exhaustive):
  - External: `https://keepachangelog.com/en/1.1.0/`.
  - External: `https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases`.
  - Pattern: `docs/versioning-policy.md` - version bump rules feeding release decisions.

  **Acceptance Criteria** (agent-executable only):
  - [x] Changelog has `Unreleased` plus categorized sections.
  - [x] Runbook includes preflight checks, tagging, publishing, and rollback procedure.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```bash
  Scenario: Happy path
    Tool: Bash
    Steps: Validate changelog format and runbook section presence via script
    Expected: Validation passes
    Evidence: .sisyphus/evidence/task-10-release-runbook.txt

  Scenario: Failure/edge case
    Tool: Bash
    Steps: Remove rollback section from runbook and rerun validation
    Expected: Validation fails with explicit missing rollback check
    Evidence: .sisyphus/evidence/task-10-release-runbook-error.txt
  ```

  **Commit**: YES | Message: `docs(release): add changelog and readiness-based runbook` | Files: [CHANGELOG.md, docs/release-runbook.md]

- [x] 11. Implement PR/commit governance checks including `.sisyphus` safekeeping rule

  **What to do**: Add policy-check scripts and CI logic ensuring PRs reference issue IDs, include evidence links, follow conventional commit title rules, and do not omit `.sisyphus/plans` changes when plan-governed work is updated.
  **Must NOT do**: Do not block PRs on unavailable external APIs/services.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: balancing enforcement with contributor ergonomics.
  - Skills: [] - Reason: custom policy automation.
  - Omitted: [`frontend-ui-ux`] - Reason: infra/task automation.

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: 12 | Blocked By: 10

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `CONTRIBUTING.md` - contribution requirements.
  - Pattern: `.sisyphus/plans/cleancomms-oss-governance-launch.md` - safekeeping directive.
  - External: `https://www.conventionalcommits.org/en/v1.0.0/`.

  **Acceptance Criteria** (agent-executable only):
  - [x] CI fails when PR title/commit format violates policy.
  - [x] CI fails when required evidence/checklist fields are missing in PR template output.
  - [x] CI warns or fails according to policy when plan-linked changes omit `.sisyphus/plans` updates.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```bash
  Scenario: Happy path
    Tool: Bash
    Steps: Run policy checks with compliant sample PR metadata
    Expected: All checks pass
    Evidence: .sisyphus/evidence/task-11-pr-governance-checks.txt

  Scenario: Failure/edge case
    Tool: Bash
    Steps: Run checks with non-conventional PR title and missing plan artifact marker
    Expected: Checks fail with actionable messages
    Evidence: .sisyphus/evidence/task-11-pr-governance-checks-error.txt
  ```

  **Commit**: YES | Message: `ci(policy): enforce pr governance and plan safekeeping checks` | Files: [scripts/policy/*, .github/workflows/*]

- [x] 12. Final governance consistency audit and launch-readiness bundle

  **What to do**: Produce `docs/launch-checklist.md` that cross-links all governance files, confirms policy coherence, and defines the exact GitHub repo setup sequence (labels, discussions categories, branch protection, project board bootstrap).
  **Must NOT do**: Do not leave setup steps as unordered bullet ideas.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: system-level consistency and launch risk reduction.
  - Skills: [] - Reason: final synthesis and audit.
  - Omitted: [`playwright`] - Reason: no UI runtime testing required.

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: Final Verification Wave | Blocked By: 8,10,11

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `.sisyphus/plans/cleancomms-oss-governance-launch.md` - full governance requirements.
  - Pattern: `README.md` and `docs/*` governance files - consistency targets.
  - External: `https://docs.github.com/en/communities/setting-up-your-project-for-healthy-contributions/accessing-a-projects-community-profile`.

  **Acceptance Criteria** (agent-executable only):
  - [x] Launch checklist includes deterministic ordered steps for GitHub setup under ZeroState-IO.
  - [x] Checklist verifies all community profile files and governance docs are present and cross-linked.
  - [x] Audit output identifies zero unresolved policy contradictions.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```bash
  Scenario: Happy path
    Tool: Bash
    Steps: Run governance consistency checker and link checker across docs set
    Expected: No contradictions, no broken links, checklist complete
    Evidence: .sisyphus/evidence/task-12-launch-readiness.txt

  Scenario: Failure/edge case
    Tool: Bash
    Steps: Introduce conflicting policy statement between `CONTRIBUTING.md` and `docs/repo-policies.md`
    Expected: Consistency checker fails and reports mismatch
    Evidence: .sisyphus/evidence/task-12-launch-readiness-error.txt
  ```

  **Commit**: YES | Message: `docs(launch): finalize governance audit and setup checklist` | Files: [docs/launch-checklist.md]

## Final Verification Wave (4 parallel agents, ALL must APPROVE)
- [x] F1. Plan Compliance Audit - oracle (REJECT → Fixed)
- [x] F2. Code Quality Review - unspecified-high (APPROVE)
- [x] F3. Real Manual QA - unspecified-high (APPROVE - 11/11 tests)
- [x] F4. Scope Fidelity Check - deep (REJECT → Fixed)

### Verification Issues Fixed (PR #2)
| Bug | Fix | File |
|-----|-----|------|
| BUG-1 | Added `pull-requests: write` permission | `.github/workflows/pr-governance.yml` |
| BUG-2 | Simplified plan-safekeeping to generic reminder | `scripts/check-pr-policy.sh` |
| BUG-3 | Removed dead code (discarded pipe) | `scripts/check-governance.sh` |
| BUG-4 | Fixed breaking change capture group `(!)?` | `scripts/check-pr-policy.sh` |
| F4-org | Aligned to `@Zerostate-IO/maintainers` | `GOVERNANCE.md` |
| F4-SLA | Changed "48 hours" to "3 business days (best effort)" | `SECURITY.md` |

### Launch Status
- ✅ All 12 governance tasks complete
- ✅ All verification issues fixed
- ✅ PR #2 merged (c9039dc)
- ⏳ GitHub Discussions: **MANUAL STEP REQUIRED** (enable at repo settings)

## Commit Strategy
- One commit per completed governance task, using conventional commit types.
- All `.sisyphus/plans/*.md` changes must be committed with the related governance updates.
- No direct commits to protected `main`; all changes via PR + squash merge.

## Success Criteria
- Public contributors can understand project purpose, submit high-quality issues/PRs, and follow release/version policies without maintainer clarifications.
- Maintainers have a sustainable triage/review workflow with explicit guardrails and ownership.
- Governance baseline is complete enough to launch publicly under ZeroState-IO with low process risk.
