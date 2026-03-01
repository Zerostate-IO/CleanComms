# CleanComms Governance

This document defines the governance model, decision authority, maintainer responsibilities, and operational policies for the CleanComms open source project under [Zerostate-IO](https://github.com/Zerostate-IO).

---

## Mission and Purpose

CleanComms is a Linux-first amateur radio HF operating suite with backend-managed CAT control, PTT signaling, and audio routing. The project aims to provide a reliable, well-architected foundation for amateur radio operators who prefer Linux-based workflows.

**Core Principles:**

- **Linux-first**: Primary platform is Linux; other platforms are secondary
- **Backend ownership**: CAT, PTT, and audio are managed by backend services, not scattered across UI components
- **Sustainable open source**: We optimize for long-term maintainer health, not maximum velocity
- **Transparency**: Decisions, policies, and processes are documented and publicly accessible

---

## Maintainer Roles

### Maintainer

Maintainers are responsible for project health, code quality, and community support. The maintainer team is identified via the GitHub team `@Zerostate-IO/maintainers`.

**Responsibilities:**

- Triage incoming issues and pull requests
- Review and merge PRs that meet acceptance criteria
- Create and publish releases
- Update documentation and policies
- Moderate community discussions

**Current Maintainers:**

See [CODEOWNERS](/.github/CODEOWNERS) for the authoritative list of code owners and reviewers.

### Emeritus Maintainer

Maintainers who step back from active duty retain the Emeritus title. They may return to active status by mutual agreement with the active maintainer team.

### How to Become a Maintainer

1. Demonstrate sustained, high-quality contributions over time
2. Show good judgment in code review and community interaction
3. Be nominated by an existing maintainer
4. Receive approval from the maintainer team

There is no fixed timeline or quota. Maintainer status is earned through consistent contribution and trust-building.

---

## Decision Process and Authority

### Merge Authority

Only maintainers may merge pull requests into `main`. All merges use **squash merge** to keep history linear and readable.

**Merge requirements:**

- At least one maintainer approval
- All required CI checks passing
- No unresolved review comments marked as blocking
- PR follows [CONTRIBUTING](/CONTRIBUTING.md) guidelines

### Release Authority

Only maintainers may create releases. Releases follow the [versioning policy](/docs/versioning-policy.md) and use readiness-based timing for pre-1.0 versions.

**Release requirements:**

- All tests passing on `main`
- Changelog updated with release notes
- Version tag follows `v0.x.y` convention
- Release notes published on GitHub

See the [release runbook](/docs/release-runbook.md) for detailed steps.

### Policy Change Authority

**Minor policy changes** (clarifications, typo fixes, non-structural updates):
- Any maintainer may approve and merge

**Major policy changes** (new rules, governance changes, license changes):
- Require discussion in GitHub Discussions or a dedicated issue
- Require maintainer consensus (all active maintainers must have opportunity to weigh in)
- Minimum 7-day comment period for community input
- No RFC-style bureaucracy at launch, but maintainers may introduce more formal processes if scale demands it

**Tie-breaking:**

When maintainers disagree and cannot reach consensus:
1. Discussion continues for at least 48 more hours
2. If still deadlocked, the longest-tenured maintainer makes the final call
3. The decision is documented with rationale

---

## Escalation Path

| Situation | First Step | Escalation |
|-----------|------------|------------|
| Bug report not triaged | Wait 5 business days | Comment on issue asking for status |
| PR review delayed | Wait 10 business days | Ping maintainers in GitHub Discussions |
| Policy disagreement | Open a Discussion | Request maintainer mediation |
| Security issue | Follow [SECURITY.md](/SECURITY.md) | Direct contact via security channels |
| Code of conduct violation | Email maintainers | Contact ZeroState-IO org admins |

---

## Volunteer SLA Framing

CleanComms is maintained by volunteers. We set realistic expectations to ensure sustainable contribution.

### Response Time Targets

| Activity | Target | Guarantee |
|----------|--------|-----------|
| First response to new issues | 5 business days | None |
| PR first review | 10 business days | None |
| Security report acknowledgment | 3 business days | Best effort |

**These are targets, not guarantees.** Maintainers have jobs, families, and other commitments. If response times slip, it is not a failure, it is the nature of volunteer work.

### Maintainer Burnout Guardrails

To prevent maintainer burnout, we set explicit expectations:

**Triage cadence:**
- Maintainers are not expected to triage daily
- A weekly triage pass is sufficient
- Issues older than 30 days without activity may be marked stale

**Review load limits:**
- Maintainers should not feel obligated to review more than 2-3 PRs per week
- Complex PRs may take multiple weeks to review thoroughly
- It is acceptable to say "I do not have capacity for this right now"

**Time off:**
- Maintainers may take extended breaks without formal notice
- Other maintainers should cover during absences
- If no maintainers are active, the project enters a reduced-activity state

**Community expectations:**
- Contributors should not ping maintainers more than once per week on the same issue
- Demands, ultimatums, or hostile language will not accelerate response times
- Entitled behavior may result in restricted interaction

---

## CODEOWNERS

The `.github/CODEOWNERS` file defines which individuals or teams are automatically requested for review on changes to specific paths. The primary CODEOWNERS target is `@Zerostate-IO/maintainers`.

All paths not explicitly assigned default to the maintainer team.

---

## Policy Updates

This governance document may be updated as the project evolves. Major changes will be announced in GitHub Discussions. The canonical version always lives in the repository at `/GOVERNANCE.md`.

---

## License

CleanComms is licensed under [GPL-3.0-or-later](/LICENSE). All contributions are subject to this license.
