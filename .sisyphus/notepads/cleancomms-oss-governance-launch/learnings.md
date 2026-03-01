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
