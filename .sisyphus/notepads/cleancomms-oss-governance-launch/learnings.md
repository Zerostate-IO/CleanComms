# Learnings - CleanComms OSS Governance Launch

## [2026-02-28T23:48:35Z] Session Start

### Project Context
- Target org: ZeroState-IO (public repo)
- License: GPL-3.0-or-later
- Git flow: trunk-based main + squash merge
- Response SLA: volunteer-friendly (5 business days first response target)
- Release cadence: readiness-based pre-1.0
- Discussions: enabled at launch
- `.sisyphus/plans` must always be committed/pushed for safekeeping

### Key Constraints
- No vague governance language without concrete ownership
- No over-engineered RFC bureaucracy at launch
- No 24/7 maintainer response expectations
- Security reporting path is mandatory

### Wave Structure
- Wave 1: Tasks 1-4 (Governance authority and baseline docs)
- Wave 2: Tasks 5-8 (Contribution workflows and triage operations)
- Wave 3: Tasks 9-12 (Versioning/release controls and final hardening)

### [2026-02-28] Task 1: GOVERNANCE.md Learnings
- **Structure matters for verification**: QA grep patterns expect specific heading strings. When the plan specifies "Decision Process" but you write "Decision Authority", the verification grep will fail even if content is correct. Match heading language to verification expectations.
- **Burnout guardrails are unusual**: Most OSS governance docs skip maintainer health. Including explicit "review load limits", "time off", and "community expectations" sections makes this document more sustainable.
- **Volunteer SLA framing requires explicit "not guaranteed" language**: Setting 5-day targets without saying "these are targets, not guarantees" can create entitlement. The explicit framing prevents future conflict.
- **CODEOWNERS reference is circular but correct**: GOVERNANCE.md points to CODEOWNERS for current maintainer list, CODEOWNERS points back to @ZeroState-IO/maintainers team. This keeps the team roster in one place (GitHub team settings).


## [2026-02-28T23:55:00Z] Task 1 Complete

### Session
- Session ID: ses_35956272dffezMPaxWRwQnctAp
- Commit: dc467d9 "docs(governance): define authority and decision model"

### Learnings
- **Structure matches verification**: QA grep patterns expect specific heading strings. When plan specifies sections, match exact language for verification success.
- **Burnout guardrails are valuable**: Most OSS governance skips maintainer health. Explicit "review load limits" and "time off" sections make governance sustainable.
- **Volunteer SLA must be explicit**: Setting 5-day targets without "not guaranteed" language creates entitlement. Always include explicit framing.
- **Circular references are OK**: GOVERNANCE.md -> CODEOWNERS -> GitHub team keeps roster in one place.
## README.md Creation
- Included tiered support policy for radios (Primary vs Community-Validated).
- Explicitly marked project as Pre-Alpha to manage expectations.
- Linked to future governance/community files (CONTRIBUTING, SECURITY, etc.) with '(coming soon)' markers to maintain link integrity while files are being created in parallel tasks.

## [2026-02-28T23:59:00Z] Task 2 Complete: Community Health Files

### Session
- Session ID: ses_35956272dffezMPaxWRwQnctAp
- Files Created: LICENSE, CODE_OF_CONDUCT.md, CONTRIBUTING.md, SECURITY.md, SUPPORT.md

### Learnings
- **Plan Safekeeping is a Hard Requirement**: Explicitly including the `.sisyphus/plans` commit requirement in `CONTRIBUTING.md` reinforces the project's structured planning workflow for all contributors.
- **GitHub Security Advisories as Primary Path**: Modern OSS projects should prefer GitHub's native private reporting tools over email-only paths to leverage built-in coordination features.
- **Embargo Language Prevents Zero-Days**: Explicitly defining "embargo expectations" in `SECURITY.md` sets clear boundaries for researchers and protects the user base during the fix window.
- **Placeholder Replacement is Critical**: When fetching standard templates (like Contributor Covenant), always ensure placeholders like `[INSERT CONTACT METHOD]` are replaced with project-specific info (e.g., `community@zerostate.io`).
## [2026-02-28T16:04:00Z] Task 4 Complete: CODEOWNERS and repo-policies.md

### Files Created
- `.github/CODEOWNERS` - Code ownership definitions
- `docs/repo-policies.md` - Branch protection and merge policies

### Learnings
- **CODEOWNERS wildcard placement matters**: The `*` wildcard must come first as a default, then more specific paths follow. GitHub uses last-matching pattern, but for clarity and maintainability, default first is cleaner.
- **Policy docs need explicit enforcement status**: Using tables with "Enforced" vs "Optional" vs "Disabled" makes it immediately clear what's active vs aspirational.
- **Emergency override process prevents abuse**: Without documented override procedures, maintainers may be tempted to skip rules informally. Explicit steps (document emergency, get consensus, post-mortem) create accountability.
- **Cross-reference governance docs**: repo-policies.md explicitly references GOVERNANCE.md to avoid duplication and maintain single source of truth for authority.
- **CODEOWNERS patterns for hidden directories**: Using `/.github/` and `/.sisyphus/` with leading slashes anchors patterns to repo root, preventing accidental matches in subdirectories.

## [2026-02-28T16:20:00Z] Task 5 Complete: Triage Playbook

### Files Created
- `docs/triage-playbook.md` - Issue/PR triage policy with label taxonomy, SLA framing, escalation, stale handling, and maintainer guardrails

### Learnings
- **Label cap keeps triage usable**: A compact taxonomy (14 labels) covers type, priority, effort, status, and security without creating label sprawl.
- **Volunteer SLA consistency matters across docs**: Reusing the exact "5 business days target, not guaranteed" phrasing from governance/security prevents mixed contributor expectations.
- **Escalation needs a concrete time trigger**: Defining 14 days with no maintainer response gives contributors a clear next step without encouraging premature pings.
- **Stale policy must include explicit exceptions**: Excluding critical/high priority and security work from stale auto-closure avoids accidental loss of important threads.

## [2026-02-28T16:10:00Z] Task 3 Complete: Issue Templates and PR Template

### Files Created
- `.github/ISSUE_TEMPLATE/bug_report.yml` - Structured bug report form with repro steps, environment, logs
- `.github/ISSUE_TEMPLATE/feature_request.yml` - Feature request form with problem/solution/impact
- `.github/ISSUE_TEMPLATE/question.yml` - Simple Q&A routing form
- `.github/ISSUE_TEMPLATE/config.yml` - Disables blank issues, links to Discussions and Security
- `.github/PULL_REQUEST_TEMPLATE.md` - PR checklist with scope, test evidence, plan safekeeping

### Learnings
- **YAML forms prevent low-quality issues**: Using GitHub's issue form syntax (instead of markdown templates) enforces required fields at the UI level, reducing incomplete bug reports.
- **Environment fields should be structured**: Providing a template with OS, Go version, CleanComms version, radio model, and connection type prompts users for all relevant diagnostic info.
- **Impact assessment in feature requests helps prioritization**: Dropdown for impact level (nice-to-have / important / critical) plus use-case selection gives maintainers context for roadmap decisions.
- **config.yml blank_issues_enabled: false forces template use**: Prevents lazy "it doesn't work" issues by requiring users to pick a template.
- **Plan safekeeping in PR checklist reinforces workflow**: Including the `.sisyphus/plans` commit requirement in PR template creates a consistent reminder at the point of contribution.
- **Contact links route before issue creation**: Pointing users to Discussions for Q&A and Security policy for vulnerabilities in config.yml catches issues before they're opened in the wrong place.

## Versioning Policy Patterns
- **0.x Semantics**: Pre-1.0.0 stability is not guaranteed. Breaking changes trigger a MINOR bump.
- **Conventional Commits**: Used to drive versioning. 'feat!' or 'BREAKING CHANGE' footer are mandatory for breaking changes.
- **Graduation Criteria**: Objective conditions for 1.0.0 include API stability for 3 releases, production use, 80% test coverage, and complete documentation.
- **Readiness-Based Release**: No fixed dates; releases occur when criteria are met.

## [2026-02-28T16:25:00Z] Task 6 Complete: Docs Governance Workflow

### Files Created
- `.github/workflows/docs-governance.yml` - GitHub Actions workflow for PR governance validation
- `scripts/check-governance.sh` - Shell script with 4 validation checks

### Learnings
- **Subshell variable isolation in bash**: When piping to `while read`, the loop runs in a subshell and variable changes don't propagate back. Use process substitution `< <(command)` or temp files to capture state across subshells.
- **grep exit codes break set -e**: When `grep` finds no matches, it returns exit code 1, which triggers `set -e` exit. Use `|| true` after grep to handle the no-match case gracefully.
- **GitHub issue template config.yml is special**: Unlike issue form templates (*.yml with name/description/body), `config.yml` has its own schema (blank_issues_enabled, contact_links). Validation must handle it separately.
- **YAML validation needs multiple fallbacks**: GitHub Actions has Python with PyYAML, but local dev may not. Implement fallback chain: Python yaml module → yq v4 → grep-based field check.
- **Path-based workflow triggers prevent noise**: Using `paths:` filter in workflow ensures governance checks only run when relevant files change, not on every PR.
- **Workflow YAML validation is critical**: Invalid YAML in GitHub Actions silently fails until runtime. Always validate locally with `yq eval '.' file.yml` before committing.

## [2026-02-28T17:00:00Z] Task 8 Complete: Community Operations Guide

### Files Created
- `docs/community-operations.md` - Discussions category model, issue/discussion routing, moderation responsibilities, escalation paths

### Learnings
- **Routing matrix prevents confusion**: A decision matrix table (Situation | Channel | Why) gives contributors an immediate answer to "where do I post this?" without reading paragraphs of text.
- **Security routing must be explicit and repeated**: The "never post security in public" rule appears in SUPPORT.md, SECURITY.md, and community-operations.md. Repetition prevents accidental disclosure.
- **Feature request flow needs a gate**: Requiring Ideas discussion before formal issue creation prevents backlog bloat and ensures roadmap alignment.
- **Announcements category as maintainer-only**: Explicitly stating who can post in each category prevents community confusion about announcement permissions.
- **Cross-reference section creates document graph**: A dedicated cross-references section at the end of governance docs helps readers navigate the policy web and reinforces single source of truth.
- **SLA consistency across all docs is critical**: Using the exact "5 business days target, not guaranteed" phrasing from GOVERNANCE.md in community-operations.md prevents mixed expectations.


## [2026-02-28T17:15:00Z] Task 10 Complete: Changelog and Release Runbook

### Files Created
- `CHANGELOG.md` - Keep a Changelog format with Unreleased section and version comparison links
- `docs/release-runbook.md` - Full release process with preflight, tagging, GitHub release, post-release, and rollback

### Learnings
- **Keep a Changelog structure matters**: The [Unreleased] section at top allows continuous accumulation of changes between releases, making release prep a matter of moving items rather than writing from scratch.
- **Version comparison links enable traceability**: Including `[version]: https://github.com/org/repo/compare/vX...vY` links at the bottom of CHANGELOG.md creates automatic diff navigation for each release.
- **Rollback needs severity tiers**: Not all bad releases warrant the same response. Defining minor/major/security severity levels with corresponding actions prevents overreaction to minor issues.
- **Yanking vs deleting tags**: Yanking a GitHub release is less disruptive than deleting the tag (which breaks existing clones). Reserve tag deletion for severe security issues only.
- **Post-Release announcements tie to Discussions**: The Announcements category created in community-operations.md is the canonical place for release posts, reinforcing cross-document consistency.
- **Checklist format prevents skipped steps**: A linear checklist at the end of the runbook (complete release checklist) gives maintainers a quick reference that prevents missing steps during release pressure.


## [2026-02-28T16:32:00Z] Task 9 Complete: PR Governance Workflow

### Files Created
- `.github/workflows/pr-governance.yml` - GitHub Actions workflow for PR policy enforcement
- `scripts/check-pr-policy.sh` - Shell script with 3 validation checks

### Learnings
- **Conventional commit regex needs careful escaping**: The pattern `^(feat|fix|docs|style|refactor|test|chore)(\([^)]+\))?!?: .+` in bash requires proper escaping for parentheses and handling optional scope/breaking marker.
- **Issue reference opt-out prevents false positives**: Allowing explicit "No issue reference needed" in PR body handles chore/docs PRs gracefully without blocking legitimate contributions.
- **Soft warnings for docs/chore PRs**: Using a warning (not failure) for missing issue references on `docs:` and `chore:` titled PRs reduces friction for minor contributions while still encouraging issue tracking.
- **Plan safekeeping check is always non-blocking**: Per requirements, this check only warns and never fails CI. It serves as a reminder rather than enforcement.
- **GitHub Actions PR comment on failure improves UX**: Using `actions/github-script` to post a formatted comment when checks fail gives contributors immediate, actionable feedback in the PR UI.
- **Environment variable fallbacks enable local testing**: The script checks for `GITHUB_EVENT_PATH` and falls back to `PR_TITLE`/`PR_BODY` env vars, enabling `PR_TITLE="feat: test" ./check-pr-policy.sh` for local validation.
- **Breaking change marker detection**: The `!` marker before `:` (e.g., `feat(api)!:`) is captured separately in the regex, allowing future enhancement to warn about breaking changes in release notes.


## [2026-02-28T16:38:00Z] Task 12 Complete: Launch Checklist

### Files Created
- `docs/launch-checklist.md` - Comprehensive public launch checklist with file verification, policy audit, GitHub setup sequence, and post-launch verification

### Learnings
- **Checklists need checkbox format for verification**: Using `☐` checkboxes in markdown creates a scannable, verifiable format that can be literally checked during the launch process.
- **Policy consistency audit prevents launch surprises**: Explicitly listing where each policy (SLA, security routing, versioning) appears across documents catches contradictions before they confuse contributors.
- **GitHub setup sequence must be ordered**: Steps like "create team" before "configure CODEOWNERS" and "enable branch protection" after "workflows exist" are dependencies that must be documented explicitly.
- **Label creation via CLI is reproducible**: Including `gh label create` commands with exact colors and descriptions ensures consistent label setup across repos.
- **Cross-document link table catches orphan references**: A table of From/To document links systematically verifies the document graph is connected.
- **Post-launch verification includes test PR**: Creating a test PR to verify CI workflows pass is essential validation that can't be done with just static checks.
- **Launch day checklist is a separate phase**: Distinguishing "pre-launch" (file verification) from "launch day" (final checks + announcement) creates a clear go/no-go decision point.

## [2026-03-01T00:56:05Z] Final Verification F1: Plan Compliance Audit

### Audit Scope
- Verified all 12 governance tasks in `.sisyphus/plans/cleancomms-oss-governance-launch.md` against acceptance criteria.
- Reviewed governance files, templates, docs, workflows, and scripts.
- Ran `./scripts/check-governance.sh` (PASS).

### Verdict Snapshot
- APPROVE: Tasks 1-10
- REJECT: Tasks 11-12

### Key Gaps Found
- Task 11 gap: PR governance checks do not validate required PR evidence/checklist completion; script only checks title + issue reference and optional warning for plan safekeeping.
- Task 11 gap: plan safekeeping logic uses `.pull_request.changed_files[]`, but GitHub payload provides `changed_files` as a count (number), so changed-file detection is ineffective.
- Task 11 gap: acceptance mentions PR title/commit format; current implementation enforces PR title only.
- Task 12 gap: launch-readiness criterion for zero unresolved policy contradictions is not met due to SLA inconsistencies (e.g., SECURITY.md includes 48h acknowledgment + 5 business day framing, while other docs use different security-response targets).

### Additional Consistency Note
- Local markdown cross-links validated by script; no broken local links detected.

## [2026-03-01T01:15:00Z] Final Verification F3: Real Manual QA

### Test Matrix Results

| Test Case | Expected | Actual | Verdict |
|-----------|----------|--------|---------|
| `check-governance.sh` on clean repo | exit 0, all ✓ | exit 0, 17 passes | ✅ PASS |
| `check-pr-policy.sh` valid conv commit + issue ref | exit 0 | exit 0, all checks pass | ✅ PASS |
| `check-pr-policy.sh` opt-out issue ref | exit 0 | exit 0, "explicitly skipped" | ✅ PASS |
| `check-pr-policy.sh` invalid title + no issue | exit 1 | exit 1, 2 errors | ✅ PASS |
| `check-pr-policy.sh` valid title, missing issue | exit 1 | exit 1, 1 error | ✅ PASS |
| `check-pr-policy.sh` docs PR, no issue | exit 0 + warning | exit 0, 1 warning (non-blocking) | ✅ PASS |
| Remove SECURITY.md → check-governance.sh | exit 1 | exit 1, "SECURITY.md is missing" | ✅ PASS |
| Restore SECURITY.md after test | file present | file restored, verified | ✅ PASS |
| README.md local links resolve | all 5 links valid | CONTRIBUTING.md, CODE_OF_CONDUCT.md, SECURITY.md, SUPPORT.md, LICENSE all exist | ✅ PASS |
| All 17 governance files readable | non-empty, proper headers | All present, 14-496 lines each, proper markdown headings | ✅ PASS |
| check-governance.sh markdown link scan | no broken links | "All local markdown links are valid" | ✅ PASS |

### Behavioral Notes
- `check-pr-policy.sh` uses `${PR_TITLE:-default}` (bash `:-` operator): empty string env vars get replaced by defaults. This is intentional for local dev workflow — script always has sensible fallback data.
- `check-governance.sh` uses grep-based YAML validation fallback (no python/yq needed). Fields checked: `name`, `description`, `body` for issue templates; `blank_issues_enabled`, `contact_links` for config.yml.
- docs/chore PRs get soft warnings (not failures) for missing issue references — good UX for minor contributions.

### QA Verdict: ✅ APPROVE

All governance scripts work correctly from a contributor's perspective:
- Happy paths pass cleanly
- Error cases fail with actionable messages
- File removal is correctly detected
- All document links resolve
- All 17 governance documents are well-formed and readable
- No artifacts left behind from testing

## [2026-03-01T02:05:00Z] Final Verification F4: Scope Fidelity Check

### Guardrail Results
- **No over-engineered RFC bureaucracy at launch:** PASS. Governance explicitly rejects RFC-heavy launch process (`GOVERNANCE.md`:88).
- **No 24/7 maintainer response expectation:** PASS. No 24/7 language found; docs use volunteer-target framing.
- **Security reporting path documented and correct:** PASS. Private reporting path exists and is consistently routed to GitHub Security Advisories, with email backup (`SECURITY.md`:19-23; `SUPPORT.md`:14; `docs/community-operations.md`:86).
- **Concrete governance ownership (not vague best effort):** PARTIAL PASS. Ownership is concrete (maintainer team + escalation tables), but org/team identifier is inconsistent across docs (`@ZeroState-IO/maintainers` vs `@Zerostate-IO/maintainers`), which introduces ambiguity.
- **Volunteer-friendly SLA consistency across docs:** FAIL. SLA wording/timing is inconsistent: `SECURITY.md` states hard "within 48 hours" acknowledgment (`SECURITY.md`:26) while governance/community tables use 3-business-day best-effort security acknowledgment (`GOVERNANCE.md`:121, `docs/community-operations.md`:120) and 5-business-day first-response target elsewhere.

### Scope Boundary Result
- **Scope creep beyond the 12 defined tasks:** PASS. Implemented artifacts align with task-defined outputs (governance files, templates, policies, workflows, scripts, launch checklist) without obvious extra framework/process expansion beyond plan scope.

### Verdict
- **REJECT** for scope fidelity at this stage due to SLA inconsistency and ownership identifier inconsistency across governance docs.
