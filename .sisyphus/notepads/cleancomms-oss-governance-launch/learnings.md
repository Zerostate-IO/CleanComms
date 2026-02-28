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
