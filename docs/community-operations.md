# Community Operations Guide

This document defines how CleanComms manages community interactions through GitHub Discussions, issue routing rules, moderation responsibilities, and escalation paths.

---

## GitHub Discussions Categories

CleanComms uses GitHub Discussions as the primary space for community conversation. The four categories below organize interactions by purpose.

### Q&A

**Purpose:** General questions, how-to guides, troubleshooting, and configuration help.

**What belongs here:**
- "How do I configure CleanComms for my IC-7300?"
- "What's the difference between VARA and Winlink modes?"
- "My radio won't connect, here's what I've tried..."

**Routed from:** `question.yml` issue template (users are encouraged to post here first)

**Response expectation:** Community members often help each other. Maintainers aim for a 5 business day first response target, but this is not guaranteed.

### Ideas

**Purpose:** Feature discussions, roadmap input, architectural debates, and "what if" conversations.

**What belongs here:**
- "Would anyone use a mobile companion app?"
- "Here's my proposal for improving the audio routing system"
- "What radios should we prioritize for Tier 2 support?"

**Routed from:** `feature_request.yml` issue template (non-urgent features should start here)

**Process:** Discuss the idea. If a maintainer agrees it belongs on the roadmap, convert to a formal issue. Not all ideas will become issues.

### Announcements

**Purpose:** Official project news from maintainers only.

**What belongs here:**
- Release announcements
- Policy changes
- Breaking change notifications
- Project milestones

**Who can post:** Maintainers only. Community members cannot create announcement posts.

### Show & Tell

**Purpose:** Community showcase of CleanComms in action.

**What belongs here:**
- Station setups using CleanComms
- Field operation reports
- Screenshots of your dashboard
- "Here's how I use CleanComms for ARES"

**Encouragement:** This is the place to celebrate what you have built. Share your setups, ask for feedback, inspire others.

---

## Issue vs Discussion Routing

Choosing the right channel ensures faster responses and cleaner project organization.

### Routing Decision Matrix

| Situation | Channel | Why |
|-----------|---------|-----|
| Bug or crash | GitHub Issues (`bug_report.yml`) | Needs tracking, reproduction, fix |
| Security vulnerability | GitHub Security Advisory | Private coordination required |
| Feature idea (early stage) | Discussions → Ideas | Discussion before commitment |
| Feature request (approved) | GitHub Issues (`feature_request.yml`) | Only after maintainer approval |
| Question / how-to | Discussions → Q&A | Community can help, benefits all |
| Confirmed bug in question form | Convert to Issue | If Q&A reveals a real bug |

### Security Reports

**Never route security issues through public channels.**

- No public GitHub issues
- No public Discussions posts
- No comments mentioning vulnerabilities

**Correct path:** Follow the [Security Policy](/SECURITY.md) and use GitHub's private Security Advisory feature at `https://github.com/ZeroState-IO/CleanComms/security/advisories`.

### Feature Request Flow

1. **Start in Discussions → Ideas** for most feature suggestions
2. Discuss with community and maintainers
3. If a maintainer agrees the feature belongs on the roadmap, they will approve creating a formal issue
4. Only then, use `feature_request.yml` to create the tracked issue

This prevents issue backlog bloat and ensures features align with project direction.

### Question vs Bug

If a question in Q&A reveals an actual bug:
1. A maintainer will confirm the bug
2. The maintainer will create a proper bug issue
3. The original discussion is linked for context

Do not create bug issues for things you are not sure are bugs.

---

## Moderation Responsibilities

### Who Moderates

Maintainers (listed in [CODEOWNERS](/.github/CODEOWNERS)) are responsible for community moderation across Issues and Discussions.

### Response Expectations

| Activity | Target | Guarantee |
|----------|--------|-----------|
| First response to new issues | 5 business days | None |
| First response in Discussions | 5 business days | None |
| Security report acknowledgment | 3 business days | Best effort |

These are targets, not guarantees. CleanComms is maintained by volunteers with jobs, families, and other commitments. See [GOVERNANCE.md](/GOVERNANCE.md) for the full volunteer SLA framing.

### Maintainer Moderation Duties

- Triage new issues and discussions to appropriate categories
- Close duplicate issues with a link to the original
- Move misplaced discussions to correct categories
- Enforce the Code of Conduct (see below)
- Lock threads that become unproductive or hostile
- Escalate serious issues (see escalation path)

### Community Self-Moderation

Community members help by:
- Answering questions in Q&A (often faster than maintainers)
- Reporting spam or abusive content to maintainers
- Using reactions instead of "+1" comments
- Searching before posting

---

## Code of Conduct Enforcement

All community interactions are governed by our [Code of Conduct](/CODE_OF_CONDUCT.md).

### Enforcement Steps

1. **Warning:** Maintainer posts a public warning in the thread
2. **Temporary block:** User is blocked from the repository for a cooling-off period
3. **Permanent ban:** Repeated or severe violations result in permanent removal

### Reporting Violations

Report Code of Conduct violations to the maintainers. If the issue involves a maintainer, escalate to ZeroState-IO organization admins.

---

## Escalation Path

From [GOVERNANCE.md](/GOVERNANCE.md):

| Situation | First Step | Escalation |
|-----------|------------|------------|
| Discussion not responded to | Wait 5 business days | Ping maintainers politely |
| Issue not triaged | Wait 5 business days | Comment asking for status |
| Policy disagreement | Open a Discussion | Request maintainer mediation |
| Code of conduct violation | Email maintainers | Contact ZeroState-IO org admins |
| Security issue | Follow [SECURITY.md](/SECURITY.md) | Direct contact via security channels |

### Contributor Etiquette

From GOVERNANCE.md:
- Do not ping maintainers more than once per week on the same issue
- Demands, ultimatums, or hostile language will not accelerate response times
- Entitled behavior may result in restricted interaction

---

## Cross-References

This document coordinates with:

- [SUPPORT.md](/SUPPORT.md) - Support channel overview
- [GOVERNANCE.md](/GOVERNANCE.md) - Decision authority and escalation
- [CODE_OF_CONDUCT.md](/CODE_OF_CONDUCT.md) - Community standards
- [SECURITY.md](/SECURITY.md) - Vulnerability reporting
- [CONTRIBUTING.md](/CONTRIBUTING.md) - Contribution guidelines
- [docs/triage-playbook.md](/docs/triage-playbook.md) - Issue triage procedures

---

## Policy Updates

This document may be updated as the community grows. Major changes will be announced in Discussions → Announcements. The canonical version always lives in the repository at `/docs/community-operations.md`.
