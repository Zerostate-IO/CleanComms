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
