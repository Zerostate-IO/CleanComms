# CleanComms Radio Capability Knowledge Base (CAT/PTT/Audio)

## TL;DR
> **Summary**: Build a decision-ready, source-tagged knowledge base for all currently targeted radios, with phase 1 capability/limitations coverage and phase 2 full CAT command matrices.
> **Deliverables**:
> - Markdown KB docs for each target radio + cross-radio compatibility matrix
> - Machine-readable JSON schema + validated capability records
> - Source provenance model (official vs community-verified)
> - TX-500 dual-protocol recommendation policy (prefer LAB599 extended where feasible)
> **Effort**: Medium
> **Parallel**: YES - 3 waves
> **Critical Path**: Source Catalog -> Schema + Conventions -> Radio Records -> Matrix + Policy -> Validation + Evidence

## Context
### Original Request
Build a knowledge base of targeted radio settings/abilities/CAT protocol info and limitations to scope CleanComms support, explicitly covering TX-500 Kenwood + Kenwood-extended behavior and recommending extended mode where possible.

### Interview Summary
- Deliverable format: **Docs + JSON**.
- Source policy: **Tiered** (official for normative claims; community allowed when explicitly tagged).
- Depth strategy: **Two-phase** (phase 1 capability matrix first, phase 2 command-by-command CAT tables).

### Metis Review (gaps addressed)
- Enforce protocol-mode separation per radio (e.g., TX-500 TS-2000 vs LAB599 extended).
- Add firmware/version gates for capabilities where relevant.
- Add known-issues severity and confidence/provenance fields.
- Avoid overclaiming unsupported commands; mark unknowns explicitly.
- Capture Hamlib-vs-native protocol gaps distinctly.

## Work Objectives
### Core Objective
Create a reusable, auditable KB that lets CleanComms scope implementation without guesswork: what each target radio can do, under which protocol/mode/firmware constraints, with clear evidence.

### Deliverables
- `docs/radios/README.md` (KB index + policy)
- `docs/radios/matrix.md` (cross-radio capability matrix)
- `docs/radios/{radio}.md` for each target radio
- `docs/radios/sources.md` (authoritative source ledger)
- `data/radios/schema/radio-capability.schema.json`
- `data/radios/catalog/*.json` capability records (one per target radio)
- `scripts/validate-radio-kb.sh` validation script
- `.sisyphus/evidence/task-*-*.txt` QA evidence artifacts

### Definition of Done (verifiable conditions with commands)
- All targeted radios have both a Markdown profile and JSON record.
- JSON records validate against schema.
- Every normative claim maps to at least one official source in provenance.
- Community-derived claims are explicitly tagged and not mixed with normative claims.
- TX-500 includes explicit recommendation logic for extended protocol preference with fallback conditions.
- Commands:
  - `bash scripts/validate-radio-kb.sh`
  - `grep -R "\[source:" docs/radios`
  - `grep -R '"source_tier"' data/radios/catalog`

### Must Have
- Exact target scope: TX-500, TX-500MP/Digi-link, FX-4CR, (tr)uSDX, X6100.
- Protocol-aware capability modeling (not single flattened capability list).
- Firmware/version gating fields where capabilities differ by version.
- Known issues with severity + confidence + source attribution.

### Must NOT Have (guardrails, AI slop patterns, scope boundaries)
- No un-sourced “common knowledge” capability claims.
- No implementation code for daemon/radio control in this plan.
- No expansion to non-target radios unless explicitly tagged as out-of-scope appendix.
- No mixing official and community claims without explicit provenance tags.
- No vague capability labels (every field must be binary/enumerated or clearly nullable).

## Verification Strategy
> ZERO HUMAN INTERVENTION — all verification is agent-executed.
- Test decision: tests-after (bash + JSON schema validation script)
- QA policy: Every task includes happy + failure/edge scenarios with evidence files.
- Evidence: `.sisyphus/evidence/task-{N}-{slug}.txt`

## Execution Strategy
### Parallel Execution Waves
> Target: 5-8 tasks per wave.

Wave 1: source inventory + schema + conventions + scaffolding  
Wave 2: per-radio profiles and catalog entries  
Wave 3: matrix/policy synthesis + validation hardening + release notes for KB

### Dependency Matrix (full, all tasks)
- T1 blocks T2, T3, T4.
- T2 blocks T5-T9.
- T3 blocks T5-T9.
- T4 informs T6-T9.
- T5-T9 block T10.
- T10 blocks T11-T12.

### Agent Dispatch Summary (wave -> task count -> categories)
- Wave 1 -> 4 tasks -> writing + quick + unspecified-low
- Wave 2 -> 5 tasks -> writing + unspecified-high
- Wave 3 -> 3 tasks -> writing + quick

## TODOs
> Implementation + Test = ONE task. Never separate.
> EVERY task has Agent Profile + Parallelization + QA Scenarios.

- [x] 1. Build source ledger and provenance rubric

  **What to do**: Create `docs/radios/sources.md` listing all authoritative sources per target radio (vendor manuals/download pages, Hamlib references, community sources). Define provenance tags: `official`, `hamlib`, `community-verified`, `unknown` and confidence rules.
  **Must NOT do**: Do not include uncited claims or dead links.

  **Recommended Agent Profile**:
  - Category: `writing` - Reason: documentation structure + citation policy.
  - Skills: `[]` - no special skill required.
  - Omitted: `playwright` - no browser automation needed for docs authoring.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 2, 4, 5, 6, 7, 8, 9 | Blocked By: none

  **References**:
  - Pattern: `README.md` - targeted radios, architecture assumptions, and tier baseline.
  - Pattern: `README.md` - current tier scope.
  - External: `https://downloads.lab599.com/Lab599-CAT-protocol.pdf` - TX-500 CAT reference.
  - External: `https://github.com/Hamlib/Hamlib/wiki/Supported-Radios` - Hamlib model references.

  **Acceptance Criteria**:
  - [ ] `docs/radios/sources.md` exists and includes all five targeted radios.
  - [ ] Every source entry includes URL + source tier + last-checked date.
  - [ ] File has a section defining provenance and confidence rules.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```bash
  Scenario: Happy path source ledger completeness
    Tool: Bash
    Steps: test -f docs/radios/sources.md && grep -E "TX-500|TX-500MP|FX-4CR|uSDX|X6100" docs/radios/sources.md
    Expected: command exits 0 and all targets are present
    Evidence: .sisyphus/evidence/task-1-source-ledger.txt

  Scenario: Failure case missing provenance tags
    Tool: Bash
    Steps: grep -n "source_tier" docs/radios/sources.md || true
    Expected: if missing, validator output clearly indicates provenance policy absent
    Evidence: .sisyphus/evidence/task-1-source-ledger-error.txt
  ```

  **Commit**: YES | Message: `docs(radios): add source ledger and provenance rubric` | Files: `docs/radios/sources.md`

- [ ] 2. Define machine-readable schema for radio capabilities

  **What to do**: Create `data/radios/schema/radio-capability.schema.json` with fields for identity, tier, protocol profiles, firmware gates, CAT/PTT/audio capabilities, known issues, source provenance, and confidence.
  **Must NOT do**: Do not make protocol fields free-form; enforce enums where possible.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: schema design and constraint definition.
  - Skills: `[]` - local schema work only.
  - Omitted: `frontend-ui-ux` - not relevant.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 5, 6, 7, 8, 9, 10 | Blocked By: 1 (for provenance rubric)

  **References**:
  - Pattern: `.sisyphus/plans/radio-capability-kb.md` - confirmed requirements and guardrails.
  - Pattern: `README.md` - canonical target radio scope and tier definitions.

  **Acceptance Criteria**:
  - [ ] Schema file exists at `data/radios/schema/radio-capability.schema.json`.
  - [ ] Schema requires `source_tier` and `evidence` for each claim group.
  - [ ] Schema supports protocol-mode-specific capability blocks (e.g., TX-500 TS-2000 vs LAB599).

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```bash
  Scenario: Happy path schema loads as valid JSON
    Tool: Bash
    Steps: python3 -m json.tool data/radios/schema/radio-capability.schema.json >/dev/null
    Expected: command exits 0
    Evidence: .sisyphus/evidence/task-2-schema-valid-json.txt

  Scenario: Failure case rejects missing required fields
    Tool: Bash
    Steps: bash scripts/validate-radio-kb.sh --self-test-missing-required
    Expected: non-zero exit and explicit missing-field message
    Evidence: .sisyphus/evidence/task-2-schema-missing-required-error.txt
  ```

  **Commit**: YES | Message: `feat(kb): add radio capability JSON schema` | Files: `data/radios/schema/radio-capability.schema.json`, `scripts/validate-radio-kb.sh`

- [ ] 3. Create KB documentation index and authoring conventions

  **What to do**: Create `docs/radios/README.md` describing KB scope, phase 1 vs phase 2 depth, source policy, and contribution rules for adding/updating radio records.
  **Must NOT do**: Do not hide uncertainty; must include explicit "unknown/needs verification" guidance.

  **Recommended Agent Profile**:
  - Category: `writing` - Reason: policy + contributor-facing documentation.
  - Skills: `[]` - no special skill required.
  - Omitted: `git-master` - not needed for content drafting.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 10 | Blocked By: 1

  **References**:
  - Pattern: `CONTRIBUTING.md` - repository contributor tone.
  - Pattern: `docs/repo-policies.md` - policy style.

  **Acceptance Criteria**:
  - [ ] `docs/radios/README.md` exists with sections: Scope, Source Policy, Update Workflow, Phase Depth.
  - [ ] Includes explicit rule: official sources define normative claims.
  - [ ] Includes explicit rule: community claims require `community-verified` tag.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```bash
  Scenario: Happy path required sections present
    Tool: Bash
    Steps: grep -E "Scope|Source Policy|Update Workflow|Phase" docs/radios/README.md
    Expected: all required sections found
    Evidence: .sisyphus/evidence/task-3-doc-index-sections.txt

  Scenario: Failure case missing uncertainty guidance
    Tool: Bash
    Steps: grep -n "unknown\|needs verification" docs/radios/README.md || true
    Expected: if absent, QA flags failure with explicit missing guidance
    Evidence: .sisyphus/evidence/task-3-doc-index-uncertainty-error.txt
  ```

  **Commit**: YES | Message: `docs(radios): add kb index and authoring conventions` | Files: `docs/radios/README.md`

- [ ] 4. Build validator script for KB integrity checks

  **What to do**: Implement `scripts/validate-radio-kb.sh` to verify required files, JSON parseability, schema conformance, and provenance coverage checks between docs and catalog records.
  **Must NOT do**: Do not rely on non-portable tooling only; provide python fallback if `jq`/`yq` missing.

  **Recommended Agent Profile**:
  - Category: `quick` - Reason: deterministic shell validation script.
  - Skills: `[]` - standard bash only.
  - Omitted: `playwright` - no UI interaction required.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 2, 10, 11, 12 | Blocked By: 1

  **References**:
  - Pattern: `scripts/check-governance.sh` - existing validation style.
  - Pattern: `scripts/check-pr-policy.sh` - fail-fast output patterns.

  **Acceptance Criteria**:
  - [ ] Script exits non-zero on missing target radio records.
  - [ ] Script exits non-zero on malformed JSON.
  - [ ] Script reports provenance tier coverage per record.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```bash
  Scenario: Happy path validator passes on complete data
    Tool: Bash
    Steps: bash scripts/validate-radio-kb.sh
    Expected: exit 0 with summary showing all radios validated
    Evidence: .sisyphus/evidence/task-4-validator-pass.txt

  Scenario: Failure case malformed json detected
    Tool: Bash
    Steps: bash scripts/validate-radio-kb.sh --self-test-malformed-json
    Expected: non-zero exit and malformed-json file path in output
    Evidence: .sisyphus/evidence/task-4-validator-malformed-error.txt
  ```

  **Commit**: YES | Message: `chore(kb): add kb validator script` | Files: `scripts/validate-radio-kb.sh`

- [ ] 5. Author TX-500 profile (dual protocol with recommendation policy)

  **What to do**: Create `docs/radios/tx-500.md` + `data/radios/catalog/tx-500.json` with separate capability blocks for TS-2000 and LAB599-extended modes, firmware gates, and explicit recommendation: prefer LAB599 extended where environment supports it; fallback to TS-2000 for compatibility.
  **Must NOT do**: Do not claim extended commands are Hamlib-native unless verified.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: nuanced protocol-mode modeling.
  - Skills: `[]` - source interpretation and structured authoring.
  - Omitted: `frontend-ui-ux` - not relevant.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 10 | Blocked By: 1, 2, 3

  **References**:
  - External: `https://downloads.lab599.com/Lab599-CAT-protocol.pdf` - CAT protocol details.
  - External: `https://www.manualslib.com/manual/1818895/Lab599-Discovery-Tx-500.html` - menu/protocol setting context.
  - External: `https://github.com/Hamlib/Hamlib/wiki/Supported-Radios` - Hamlib model status.

  **Acceptance Criteria**:
  - [ ] TX-500 markdown + json files exist and validate.
  - [ ] Profile distinguishes TS-2000 vs LAB599 capabilities.
  - [ ] Recommendation section includes explicit "prefer extended when feasible" decision logic.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```bash
  Scenario: Happy path tx-500 profile completeness
    Tool: Bash
    Steps: grep -E "TS-2000|LAB599|prefer" docs/radios/tx-500.md && grep -E '"protocol_profiles"' data/radios/catalog/tx-500.json
    Expected: protocol split and recommendation present in both doc and json
    Evidence: .sisyphus/evidence/task-5-tx500-profile.txt

  Scenario: Failure case protocol flattening detected
    Tool: Bash
    Steps: bash scripts/validate-radio-kb.sh --check-radio tx-500 --require-protocol-split
    Expected: non-zero exit when TS-2000/LAB599 split missing
    Evidence: .sisyphus/evidence/task-5-tx500-protocol-split-error.txt
  ```

  **Commit**: YES | Message: `docs(kb): add tx-500 dual-protocol profile` | Files: `docs/radios/tx-500.md`, `data/radios/catalog/tx-500.json`

- [ ] 6. Author TX-500MP (Digi-link) profile

  **What to do**: Create `docs/radios/tx-500mp.md` + `data/radios/catalog/tx-500mp.json` covering CAT command subset, known unsupported controls, serial settings, and interoperability notes.
  **Must NOT do**: Do not conflate TX-500MP behavior with TX-500 extended behavior.

  **Recommended Agent Profile**:
  - Category: `writing` - Reason: profile documentation + catalog authoring.
  - Skills: `[]` - straightforward source-backed entry.
  - Omitted: `oracle` - no architecture decision required.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 10 | Blocked By: 1, 2, 3

  **References**:
  - External: `https://downloads.lab599.com/TX500MP/Lab599-TX500MP-User-Manual-EN.pdf` - model-specific docs.
  - External: `https://downloads.lab599.com/Lab599-CAT-protocol.pdf` - command baseline.
  - External: `https://github.com/Hamlib/Hamlib/wiki/Supported-Radios` - Hamlib reference.

  **Acceptance Criteria**:
  - [ ] TX-500MP profile includes supported command subset and unsupported controls.
  - [ ] JSON record includes explicit protocol type and baud defaults.
  - [ ] Provenance tags present for all capability groups.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```bash
  Scenario: Happy path tx-500mp record validates
    Tool: Bash
    Steps: bash scripts/validate-radio-kb.sh --check-radio tx-500mp
    Expected: exit 0 with no missing required fields
    Evidence: .sisyphus/evidence/task-6-tx500mp-validate.txt

  Scenario: Failure case unsupported-controls missing
    Tool: Bash
    Steps: grep -n "unsupported" docs/radios/tx-500mp.md || true
    Expected: QA flags failure when unsupported controls section absent
    Evidence: .sisyphus/evidence/task-6-tx500mp-unsupported-error.txt
  ```

  **Commit**: YES | Message: `docs(kb): add tx-500mp capability profile` | Files: `docs/radios/tx-500mp.md`, `data/radios/catalog/tx-500mp.json`

- [ ] 7. Author FX-4CR profile with risk-tagged known issues

  **What to do**: Create `docs/radios/fx-4cr.md` + `data/radios/catalog/fx-4cr.json` with CAT capability coverage plus known digital-mode issues tagged as `community-verified` with severity and confidence.
  **Must NOT do**: Do not elevate community issue reports to official normative status.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: careful risk/provenance framing.
  - Skills: `[]` - source classification focus.
  - Omitted: `quick` - nuanced source handling required.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 10 | Blocked By: 1, 2, 3

  **References**:
  - External: `https://bg2fx.com/downloads` - vendor source.
  - External: `https://github.com/Hamlib/Hamlib/wiki/Supported-Radios` - Hamlib listing.

  **Acceptance Criteria**:
  - [ ] FX-4CR profile separates official capabilities from community issue notes.
  - [ ] Known issue entries include `severity`, `confidence`, `source_tier`.
  - [ ] JSON validates against schema.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```bash
  Scenario: Happy path risk-tagged issue entries
    Tool: Bash
    Steps: grep -E '"known_issues"|"severity"|"confidence"|"community-verified"' data/radios/catalog/fx-4cr.json
    Expected: all risk/provenance fields present
    Evidence: .sisyphus/evidence/task-7-fx4cr-known-issues.txt

  Scenario: Failure case issue tier mislabeled as official
    Tool: Bash
    Steps: bash scripts/validate-radio-kb.sh --check-radio fx-4cr --fail-on-official-community-mix
    Expected: non-zero exit when community issue is tagged official
    Evidence: .sisyphus/evidence/task-7-fx4cr-tier-mix-error.txt
  ```

  **Commit**: YES | Message: `docs(kb): add fx-4cr profile with risk tags` | Files: `docs/radios/fx-4cr.md`, `data/radios/catalog/fx-4cr.json`

- [ ] 8. Author (tr)uSDX profile including CAT audio-streaming notes

  **What to do**: Create `docs/radios/trusdx.md` + `data/radios/catalog/trusdx.json` including TS-480 emulation behavior, baud/version differences, and explicit CAT-audio-streaming capability markers.
  **Must NOT do**: Do not represent CAT audio streaming as universally supported across all firmware.

  **Recommended Agent Profile**:
  - Category: `writing` - Reason: profile and structured catalog entry.
  - Skills: `[]` - no special runtime tools required.
  - Omitted: `oracle` - no new strategic decision needed.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 10 | Blocked By: 1, 2, 3

  **References**:
  - External: `https://dl2man.de/5-trusdx-details/` - protocol details.
  - External: `https://www.kenwood.com/i/products/info/amateur/ts_480/pdf/ts_480_pc.pdf` - TS-480 command reference.
  - External: `https://github.com/Hamlib/Hamlib/wiki/Supported-Radios` - Hamlib model listing.

  **Acceptance Criteria**:
  - [ ] Profile captures TS-480 emulation and CAT streaming distinctions.
  - [ ] JSON includes firmware-dependent baud behavior.
  - [ ] Provenance tags are present for non-vendor claims.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```bash
  Scenario: Happy path trusdx streaming fields present
    Tool: Bash
    Steps: grep -E '"cat_streaming"|"baud"|"firmware"' data/radios/catalog/trusdx.json
    Expected: fields found with non-empty values
    Evidence: .sisyphus/evidence/task-8-trusdx-streaming.txt

  Scenario: Failure case missing firmware gate
    Tool: Bash
    Steps: bash scripts/validate-radio-kb.sh --check-radio trusdx --require-firmware-gates
    Expected: non-zero exit when firmware gate is missing
    Evidence: .sisyphus/evidence/task-8-trusdx-firmware-gate-error.txt
  ```

  **Commit**: YES | Message: `docs(kb): add trusdx protocol profile` | Files: `docs/radios/trusdx.md`, `data/radios/catalog/trusdx.json`

- [ ] 9. Author X6100 profile with CI-V compatibility quirks

  **What to do**: Create `docs/radios/x6100.md` + `data/radios/catalog/x6100.json` documenting CI-V/IC-7000 compatibility behavior, common CAT mode-switch caveats, and recommended interoperability configuration notes.
  **Must NOT do**: Do not claim vendor confirmation for purely community observations.

  **Recommended Agent Profile**:
  - Category: `writing` - Reason: profile and compatibility mapping.
  - Skills: `[]` - source tagging discipline only.
  - Omitted: `quick` - requires nuanced source attribution.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 10 | Blocked By: 1, 2, 3

  **References**:
  - External: `https://radioddity.s3.amazonaws.com/2024-01-19_Extended_manual_for_Xiegu_X6100_v1.0.pdf` - manual details.
  - External: `https://github.com/Hamlib/Hamlib/wiki/Supported-Radios` - Hamlib model listing.

  **Acceptance Criteria**:
  - [ ] X6100 profile includes CI-V interoperability notes and caveat separation.
  - [ ] JSON record includes known-issues with confidence and source_tier.
  - [ ] Record validates via validator script.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```bash
  Scenario: Happy path x6100 profile validates
    Tool: Bash
    Steps: bash scripts/validate-radio-kb.sh --check-radio x6100
    Expected: exit 0 and profile marked complete
    Evidence: .sisyphus/evidence/task-9-x6100-validate.txt

  Scenario: Failure case caveats missing source tier
    Tool: Bash
    Steps: bash scripts/validate-radio-kb.sh --check-radio x6100 --require-known-issue-source-tier
    Expected: non-zero exit when known issue lacks source tier
    Evidence: .sisyphus/evidence/task-9-x6100-source-tier-error.txt
  ```

  **Commit**: YES | Message: `docs(kb): add x6100 capability profile` | Files: `docs/radios/x6100.md`, `data/radios/catalog/x6100.json`

- [ ] 10. Build cross-radio capability matrix and protocol recommendation table

  **What to do**: Create `docs/radios/matrix.md` comparing CAT protocol support, PTT/audio control, firmware dependencies, known-risk flags, and Hamlib-vs-native notes across all targets. Include explicit TX-500 recommendation table (extended preferred; TS-2000 fallback criteria).
  **Must NOT do**: Do not aggregate without preserving source-tier distinctions.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: synthesis across records with policy implications.
  - Skills: `[]` - based on completed records.
  - Omitted: `playwright` - no UI testing required.

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: 11, 12 | Blocked By: 5, 6, 7, 8, 9, 3

  **References**:
  - Pattern: `docs/radios/{radio}.md` - all per-radio profiles.
  - Pattern: `data/radios/catalog/*.json` - machine-readable source of truth.

  **Acceptance Criteria**:
  - [ ] Matrix includes all five target radios and all required capability columns.
  - [ ] TX-500 recommendation logic is explicit and testable.
  - [ ] Matrix links each major claim back to source tiers.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```bash
  Scenario: Happy path matrix completeness
    Tool: Bash
    Steps: grep -E "TX-500|TX-500MP|FX-4CR|uSDX|X6100" docs/radios/matrix.md
    Expected: all target radios present in matrix
    Evidence: .sisyphus/evidence/task-10-matrix-complete.txt

  Scenario: Failure case missing tx-500 recommendation
    Tool: Bash
    Steps: grep -n "extended.*preferred\|fallback" docs/radios/matrix.md || true
    Expected: QA flags missing policy language if not found
    Evidence: .sisyphus/evidence/task-10-tx500-policy-error.txt
  ```

  **Commit**: YES | Message: `docs(kb): add cross-radio capability matrix` | Files: `docs/radios/matrix.md`

- [ ] 11. Integrate phase-depth roadmap and phase 2 command-table placeholders

  **What to do**: In `docs/radios/README.md`, add phase roadmap and explicit placeholders for phase 2 command-by-command CAT tables per radio (without inventing commands now). Ensure each placeholder lists expected columns and provenance requirements.
  **Must NOT do**: Do not prefill command tables with unverified entries.

  **Recommended Agent Profile**:
  - Category: `writing` - Reason: roadmap and contributor guidance.
  - Skills: `[]` - docs policy work.
  - Omitted: `deep` - no further discovery required.

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: 12 | Blocked By: 10, 3

  **References**:
  - Pattern: `docs/radios/README.md` - KB index.
  - Pattern: `docs/radios/matrix.md` - phase 1 synthesis context.

  **Acceptance Criteria**:
  - [ ] README includes phase 1/phase 2 boundary definition.
  - [ ] Phase 2 section contains per-radio command-table placeholder templates.
  - [ ] Placeholder templates include provenance and confidence columns.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```bash
  Scenario: Happy path phase roadmap present
    Tool: Bash
    Steps: grep -E "Phase 1|Phase 2|command table" docs/radios/README.md
    Expected: roadmap and phase 2 placeholders found
    Evidence: .sisyphus/evidence/task-11-phase-roadmap.txt

  Scenario: Failure case placeholder missing provenance columns
    Tool: Bash
    Steps: grep -n "source_tier\|confidence" docs/radios/README.md || true
    Expected: QA fails if provenance columns are not documented
    Evidence: .sisyphus/evidence/task-11-placeholder-columns-error.txt
  ```

  **Commit**: YES | Message: `docs(kb): add phase roadmap and command-table placeholders` | Files: `docs/radios/README.md`

- [ ] 12. Run full KB validation and capture evidence pack

  **What to do**: Execute validator + grep checks, produce evidence files for all tasks, and create a concise verification summary in `.sisyphus/evidence/task-12-kb-final-audit.txt`.
  **Must NOT do**: Do not mark complete if any target radio record fails schema or provenance checks.

  **Recommended Agent Profile**:
  - Category: `quick` - Reason: deterministic command execution and evidence capture.
  - Skills: `[]` - no external skill needed.
  - Omitted: `writing` - this is validation-first, not prose-first.

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: Final Verification Wave | Blocked By: 4, 10, 11

  **References**:
  - Pattern: `.sisyphus/evidence/task-7-governance-ci.txt` - evidence formatting precedent.
  - Pattern: `scripts/validate-radio-kb.sh` - validation entry point.

  **Acceptance Criteria**:
  - [ ] `bash scripts/validate-radio-kb.sh` exits 0.
  - [ ] Evidence files exist for tasks 1-12.
  - [ ] Final audit file lists pass/fail per requirement and confirms all PASS.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```bash
  Scenario: Happy path full audit pass
    Tool: Bash
    Steps: bash scripts/validate-radio-kb.sh && test -f .sisyphus/evidence/task-12-kb-final-audit.txt
    Expected: validator passes and final audit file exists
    Evidence: .sisyphus/evidence/task-12-kb-final-audit.txt

  Scenario: Failure case one radio record removed
    Tool: Bash
    Steps: bash scripts/validate-radio-kb.sh --self-test-missing-radio
    Expected: non-zero exit with missing-radio identifier in output
    Evidence: .sisyphus/evidence/task-12-kb-missing-radio-error.txt
  ```

  **Commit**: YES | Message: `chore(kb): validate radio kb and add evidence pack` | Files: `.sisyphus/evidence/*`, `docs/radios/*`, `data/radios/*`, `scripts/validate-radio-kb.sh`

## Final Verification Wave (4 parallel agents, ALL must APPROVE)
- [ ] F1. Plan Compliance Audit — oracle
- [ ] F2. Code Quality Review — unspecified-high
- [ ] F3. Real Manual QA — unspecified-high (+ playwright if UI)
- [ ] F4. Scope Fidelity Check — deep

## Commit Strategy
- Commit 1: docs/radios structure + source ledger + schema + validator script.
- Commit 2: per-radio docs/json records + matrix.
- Commit 3: TX-500 recommendation policy + validation fixes + final evidence updates.

## Success Criteria
- CleanComms can derive implementation scope per radio without new discovery calls.
- Every capability/limitation is traceable to source tier.
- KB supports both human planning and machine consumption.
