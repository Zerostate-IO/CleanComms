# Issue and PR Triage Playbook

This playbook defines how maintainers triage issues and pull requests in a way that is sustainable for a volunteer-run project.

## Scope and Principles

- CleanComms is volunteer-maintained. Response targets are goals, not guarantees.
- Triage is done in weekly passes, not daily inbox monitoring.
- Use labels to make work visible and queue management predictable.
- Security-sensitive reports are routed privately per `SECURITY.md`.

## Label Taxonomy

Keep labels lean and stable. Total active labels in this taxonomy: 14.

| Label | Group | Color | Description |
|---|---|---|---|
| `bug` | type | `#D73A4A` | Verified defect or behavior that deviates from expected operation |
| `enhancement` | type | `#1D76DB` | Improvement to existing behavior or capability |
| `documentation` | type | `#0E8A16` | Docs updates, clarification, or missing documentation |
| `question` | type | `#FBCA04` | Usage/help question that may be redirected to Discussions |
| `priority:critical` | priority | `#B60205` | Production/safety/security-adjacent impact requiring immediate attention |
| `priority:high` | priority | `#D93F0B` | Significant impact, should be scheduled soon |
| `priority:medium` | priority | `#FBCA04` | Important but not urgent; normal queue |
| `priority:low` | priority | `#0E8A16` | Nice-to-have or minor impact |
| `good-first-issue` | effort | `#7057FF` | Well-scoped starter task for new contributors |
| `help-wanted` | effort | `#008672` | Maintainers welcome external contributions |
| `blocked/external` | status | `#5319E7` | Waiting on dependency, upstream, vendor, or external actor |
| `waiting-for-info` | status | `#C2E0C6` | Waiting on reporter/contributor to provide requested details |
| `stale` | status | `#E4E669` | No activity for policy threshold; pending closure |
| `security` | security | `#B60205` | Use sparingly; move details to private reporting path in `SECURITY.md` |

## Severity and Priority Matrix

Use impact and urgency together when assigning priority.

| Impact \ Urgency | Low Urgency | Medium Urgency | High Urgency |
|---|---|---|---|
| Low Impact | `priority:low` | `priority:low` | `priority:medium` |
| Medium Impact | `priority:low` | `priority:medium` | `priority:high` |
| High Impact | `priority:medium` | `priority:high` | `priority:critical` |

Severity guidance:
- High impact includes safety, data loss, hard crashes, unrecoverable workflows, and security exposure.
- High urgency includes active breakage on supported paths, release blockers, or widespread user impact.

## Response SLA and Communication

- First response target for new issues and PRs: **5 business days**.
- This is a volunteer-friendly target and is **not guaranteed**.
- If delayed, maintainers should leave a short status update when possible.

## Escalation Thresholds

- If an issue/PR receives no maintainer response after 14 calendar days, escalate to maintainer lead.
- Escalation path:
  1. Add a concise status comment with links to prior context.
  2. Tag `@ZeroState-IO/maintainers` once.
  3. Open a GitHub Discussion if coordination is needed across multiple threads.
- Security reports do not follow public escalation; use `SECURITY.md` channels.

## Stale Policy

- If an issue/PR has no activity for 30 days, apply `stale` and post a reminder.
- If there is still no activity after 7 additional days, close as stale.
- Do not auto-close when:
  - `priority:critical` or `priority:high`
  - `security`
  - `blocked/external` with active external dependency tracking
- Closed stale items can be reopened with new evidence or reproducible details.

## Maintainer Rotation and WIP Guardrails

- Weekly triage pass is sufficient; daily triage is not expected.
- Review load target: max 2-3 PRs per week per maintainer.
- It is acceptable to say "no capacity" and defer work.
- Extended breaks without notice are acceptable in this volunteer project.
- Prefer carrying fewer active reviews to completion over expanding WIP.

## Triage Checklist

For each new issue/PR during weekly pass:

1. Confirm scope and route security-sensitive content to `SECURITY.md` process.
2. Apply one type label and one priority label.
3. Add effort/status labels only when they clarify next action.
4. Request missing info with concrete reproduction or environment asks.
5. Set clear next step (owner, dependency, or stale countdown).
