# CleanComms Public Launch Checklist

This document provides a deterministic, ordered checklist for launching the CleanComms repository publicly under the [Zerostate-IO](https://github.com/Zerostate-IO) organization. It verifies file completeness, policy coherence, and defines the exact GitHub repository configuration sequence.

**Target Organization:** Zerostate-IO  
**Repository:** CleanComms  
**License:** GPL-3.0-or-later  
**Launch Model:** Public, volunteer-maintained, Linux-first

---

## 1. Pre-Launch File Verification

Complete this section before making the repository public. All items must be checked.

### 1.1 Root-Level Community Profile Files

| File | Purpose | Status |
|------|---------|--------|
| [README.md](/README.md) | Project overview, quickstart, architecture | ☐ |
| [LICENSE](/LICENSE) | GPL-3.0-or-later full text | ☐ |
| [GOVERNANCE.md](/GOVERNANCE.md) | Decision authority, maintainer roles, SLA framing | ☐ |
| [CODE_OF_CONDUCT.md](/CODE_OF_CONDUCT.md) | Community standards | ☐ |
| [CONTRIBUTING.md](/CONTRIBUTING.md) | Contribution guidelines, plan safekeeping | ☐ |
| [SECURITY.md](/SECURITY.md) | Vulnerability reporting via GitHub Advisories | ☐ |
| [SUPPORT.md](/SUPPORT.md) | Support channels, volunteer SLA | ☐ |
| [CHANGELOG.md](/CHANGELOG.md) | Keep a Changelog format | ☐ |

### 1.2 GitHub Configuration Files

| File | Purpose | Status |
|------|---------|--------|
| [.github/CODEOWNERS](/.github/CODEOWNERS) | Code review routing to @Zerostate-IO/maintainers | ☐ |
| [.github/PULL_REQUEST_TEMPLATE.md](/.github/PULL_REQUEST_TEMPLATE.md) | PR checklist with scope, tests, plan safekeeping | ☐ |
| [.github/ISSUE_TEMPLATE/bug_report.yml](/.github/ISSUE_TEMPLATE/bug_report.yml) | Structured bug report form | ☐ |
| [.github/ISSUE_TEMPLATE/feature_request.yml](/.github/ISSUE_TEMPLATE/feature_request.yml) | Feature request form with impact assessment | ☐ |
| [.github/ISSUE_TEMPLATE/question.yml](/.github/ISSUE_TEMPLATE/question.yml) | Q&A routing form | ☐ |
| [.github/ISSUE_TEMPLATE/config.yml](/.github/ISSUE_TEMPLATE/config.yml) | Disables blank issues, links to Discussions/Security | ☐ |

### 1.3 GitHub Actions Workflows

| File | Purpose | Status |
|------|---------|--------|
| [.github/workflows/docs-governance.yml](/.github/workflows/docs-governance.yml) | Validates governance files on PR | ☐ |
| [.github/workflows/pr-governance.yml](/.github/workflows/pr-governance.yml) | Validates PR titles, issue references | ☐ |

### 1.4 Documentation Files

| File | Purpose | Status |
|------|---------|--------|
| [docs/repo-policies.md](/docs/repo-policies.md) | Branch protection, merge strategy, emergency override | ☐ |
| [docs/triage-playbook.md](/docs/triage-playbook.md) | Issue/PR triage, label taxonomy (14 labels), stale policy | ☐ |
| [docs/versioning-policy.md](/docs/versioning-policy.md) | SemVer 0.x semantics, graduation criteria | ☐ |
| [docs/community-operations.md](/docs/community-operations.md) | Discussions categories, routing, moderation | ☐ |
| [docs/release-runbook.md](/docs/release-runbook.md) | Release process, rollback, post-release | ☐ |
| [docs/launch-checklist.md](/docs/launch-checklist.md) | This document | ☐ |

### 1.5 Validation Scripts

| File | Purpose | Status |
|------|---------|--------|
| [scripts/check-governance.sh](/scripts/check-governance.sh) | Validates required files, markdown links, YAML, PR template | ☐ |
| [scripts/check-pr-policy.sh](/scripts/check-pr-policy.sh) | Validates conventional commit format, issue references | ☐ |

---

## 2. Policy Consistency Audit

Verify that language and policies are consistent across all governance documents. Resolve any contradictions before launch.

### 2.1 Volunteer SLA Consistency

All documents must use the exact phrase: **"5 business days target, not guaranteed"**

| Document | Location | Verified |
|----------|----------|----------|
| [GOVERNANCE.md](/GOVERNANCE.md) | "Volunteer SLA Framing" section | ☐ |
| [SECURITY.md](/SECURITY.md) | "Volunteer SLA" section (security reports) | ☐ |
| [SUPPORT.md](/SUPPORT.md) | "Volunteer SLA" section | ☐ |
| [CONTRIBUTING.md](/CONTRIBUTING.md) | "Volunteer SLA" section | ☐ |
| [docs/triage-playbook.md](/docs/triage-playbook.md) | "Response SLA and Communication" section | ☐ |
| [docs/community-operations.md](/docs/community-operations.md) | "Response Expectations" table | ☐ |

### 2.2 Security Routing Consistency

All security vulnerability references must point to **GitHub Security Advisories**.

| Document | Security Path | Verified |
|----------|---------------|----------|
| [SECURITY.md](/SECURITY.md) | GitHub Security Advisories (primary), email backup | ☐ |
| [SUPPORT.md](/SUPPORT.md) | References SECURITY.md | ☐ |
| [README.md](/README.md) | References SECURITY.md | ☐ |
| [docs/triage-playbook.md](/docs/triage-playbook.md) | "Security-sensitive reports are routed privately per SECURITY.md" | ☐ |
| [docs/community-operations.md](/docs/community-operations.md) | "Correct path: Follow the Security Policy... GitHub's private Security Advisory" | ☐ |
| [.github/ISSUE_TEMPLATE/config.yml](/.github/ISSUE_TEMPLATE/config.yml) | Links to security policy page | ☐ |

### 2.3 Version Bump Rules Consistency

Version bump rules must match between versioning policy and release runbook.

| Source | Rule | Verified Match |
|--------|------|----------------|
| [docs/versioning-policy.md](/docs/versioning-policy.md) | `fix` → PATCH, `feat` → MINOR, `breaking` → MINOR | — |
| [docs/release-runbook.md](/docs/release-runbook.md) | Bug fixes → PATCH, New features → MINOR, Breaking changes → MINOR | ☐ |

### 2.4 GitHub Discussions Categories

Discussions categories must match across all references.

| Category | Purpose | Defined In | Verified |
|----------|---------|------------|----------|
| **Q&A** | Questions, how-to, troubleshooting | [community-operations.md](/docs/community-operations.md) | ☐ |
| **Ideas** | Feature discussions, roadmap input | [community-operations.md](/docs/community-operations.md) | ☐ |
| **Announcements** | Maintainer-only project news | [community-operations.md](/docs/community-operations.md) | ☐ |
| **Show & Tell** | Community showcase | [community-operations.md](/docs/community-operations.md) | ☐ |

### 2.5 Label Taxonomy Verification

The 14 labels defined in [triage-playbook.md](/docs/triage-playbook.md) must be created in GitHub:

| Label | Color | Group |
|-------|-------|-------|
| `bug` | `#D73A4A` | type |
| `enhancement` | `#1D76DB` | type |
| `documentation` | `#0E8A16` | type |
| `question` | `#FBCA04` | type |
| `priority:critical` | `#B60205` | priority |
| `priority:high` | `#D93F0B` | priority |
| `priority:medium` | `#FBCA04` | priority |
| `priority:low` | `#0E8A16` | priority |
| `good-first-issue` | `#7057FF` | effort |
| `help-wanted` | `#008672` | effort |
| `blocked/external` | `#5319E7` | status |
| `waiting-for-info` | `#C2E0C6` | status |
| `stale` | `#E4E669` | status |
| `security` | `#B60205` | security |

### 2.6 CODEOWNERS Consistency

CODEOWNERS must reference `@Zerostate-IO/maintainers` for all paths:

| Path | Owner | Verified |
|------|-------|----------|
| `*` (default) | @Zerostate-IO/maintainers | ☐ |
| `/.github/` | @Zerostate-IO/maintainers | ☐ |
| `/docs/` | @Zerostate-IO/maintainers | ☐ |
| `/.sisyphus/` | @Zerostate-IO/maintainers | ☐ |
| Root governance files | @Zerostate-IO/maintainers | ☐ |

---

## 3. GitHub Repository Setup Sequence

**IMPORTANT:** Requires GitHub organization admin access for Zerostate-IO.

Complete these steps in order. Each step depends on the previous.

### Step 1: Create Maintainers Team

**Requires:** Org admin access

1. Navigate to https://github.com/orgs/Zerostate-IO/teams
2. Click "New team"
3. Configure:
   - **Team name:** `maintainers`
   - **Description:** `CleanComms maintainers with merge authority`
   - **Visibility:** Visible
   - **Team permissions:** Write (or Admin for repo-level override)
4. Add initial maintainers to the team
5. Verify team URL: `https://github.com/orgs/Zerostate-IO/teams/maintainers`

**Status:** ☐ Complete

---

### Step 2: Enable Branch Protection on `main`

**Requires:** Repo admin access

1. Navigate to https://github.com/Zerostate-IO/CleanComms/settings/branches
2. Click "Add branch protection rule"
3. Configure for `main`:
   - ☐ Require a pull request before merging
     - ☐ Require approvals: 1
     - ☐ Dismiss stale pull request approvals when new commits are pushed
   - ☐ Require status checks to pass before merging
     - ☐ Require branches to be up to date before merging
     - Add required checks (will appear after first workflow run):
       - `Validate Governance Files`
       - `Validate PR Policy`
   - ☐ Do not allow bypassing the above settings
4. Click "Create"

**Reference:** [docs/repo-policies.md](/docs/repo-policies.md) - Branch Protection section

**Status:** ☐ Complete

---

### Step 3: Enable GitHub Discussions

**Requires:** Repo admin access

1. Navigate to https://github.com/Zerostate-IO/CleanComms/settings
2. Scroll to "Features" section
3. Check "Discussions"
4. Navigate to https://github.com/Zerostate-IO/CleanComms/settings/discussions
5. Create the following categories:

| Category | Key | Format | Description |
|----------|-----|--------|-------------|
| Q&A | `q-a` | Question/Answer | General questions, how-to, troubleshooting |
| Ideas | `ideas` | Open-ended discussion | Feature discussions, roadmap input |
| Announcements | `announcements` | Announcement | Maintainer-only project news |
| Show & Tell | `show-and-tell` | Open-ended discussion | Community showcase |

**Reference:** [docs/community-operations.md](/docs/community-operations.md) - Discussions Categories section

**Status:** ☐ Complete

---

### Step 4: Create Label Set

**Requires:** Write access (maintainer)

Create labels via GitHub UI or `gh` CLI:

```bash
# Using GitHub CLI
gh label create "bug" --color "D73A4A" --description "Verified defect or unexpected behavior"
gh label create "enhancement" --color "1D76DB" --description "Improvement to existing behavior"
gh label create "documentation" --color "0E8A16" --description "Docs updates or missing documentation"
gh label create "question" --color "FBCA04" --description "Usage/help question"
gh label create "priority:critical" --color "B60205" --description "Production/safety/security impact, immediate attention"
gh label create "priority:high" --color "D93F0B" --description "Significant impact, schedule soon"
gh label create "priority:medium" --color "FBCA04" --description "Important but not urgent"
gh label create "priority:low" --color "0E8A16" --description "Nice-to-have, minor impact"
gh label create "good-first-issue" --color "7057FF" --description "Well-scoped starter task"
gh label create "help-wanted" --color "008672" --description "Maintainers welcome contributions"
gh label create "blocked/external" --color "5319E7" --description "Waiting on dependency or external actor"
gh label create "waiting-for-info" --color "C2E0C6" --description "Waiting on reporter for details"
gh label create "stale" --color "E4E669" --description "No activity, pending closure"
gh label create "security" --color "B60205" --description "Security-sensitive (use sparingly)"
```

**Reference:** [docs/triage-playbook.md](/docs/triage-playbook.md) - Label Taxonomy section

**Status:** ☐ Complete

---

### Step 5: Enable GitHub Security Advisories

**Requires:** Repo admin access

1. Navigate to https://github.com/Zerostate-IO/CleanComms/security/advisories
2. Verify "Security Advisories" is enabled
3. Confirm the advisory creation URL works:
   - https://github.com/Zerostate-IO/CleanComms/security/advisories/new
4. (Optional) Enable "Private vulnerability reporting" for anonymous submissions

**Reference:** [SECURITY.md](/SECURITY.md) - Reporting a Vulnerability section

**Status:** ☐ Complete

---

### Step 6: Verify CODEOWNERS Assignment

**Requires:** Write access

1. Open https://github.com/Zerostate-IO/CleanComms/blob/main/.github/CODEOWNERS
2. Verify all paths reference `@Zerostate-IO/maintainers`
3. Create a test PR to any path
4. Confirm `@Zerostate-IO/maintainers` is automatically requested for review

**Reference:** [.github/CODEOWNERS](/.github/CODEOWNERS)

**Status:** ☐ Complete

---

## 4. Post-Launch Verification

Complete these checks after the repository is public.

### 4.1 Run Governance Validation Script

```bash
./scripts/check-governance.sh
```

Expected output: `PASSED: All governance checks passed`

**Status:** ☐ Complete

---

### 4.2 Verify All README Links Resolve

Check that all links in README.md are valid:

```bash
# Check for broken links (requires linkchecker or similar)
# Manual verification of key links:
```

| Link | Target | Verified |
|------|--------|----------|
| Zerostate-IO org | https://github.com/Zerostate-IO | ☐ |
| CONTRIBUTING.md | /CONTRIBUTING.md | ☐ |
| CODE_OF_CONDUCT.md | /CODE_OF_CONDUCT.md | ☐ |
| SECURITY.md | /SECURITY.md | ☐ |
| SUPPORT.md | /SUPPORT.md | ☐ |
| LICENSE | /LICENSE | ☐ |
| GitHub Discussions | https://github.com/Zerostate-IO/CleanComms/discussions | ☐ |
| GitHub Issues | https://github.com/Zerostate-IO/CleanComms/issues | ☐ |

---

### 4.3 Create Test PR to Verify Workflows

1. Create a branch: `git checkout -b test/workflow-verification`
2. Make a trivial change (e.g., add a comment to README.md)
3. Open a PR with title: `test: verify CI workflows`
4. Verify both workflows run:
   - ☐ **Docs Governance** workflow runs (triggers on `**.md`)
   - ☐ **PR Governance** workflow runs (triggers on all PRs)
5. Verify PR title validation passes (conventional commit format)
6. Close the PR without merging
7. Delete the branch

**Status:** ☐ Complete

---

### 4.4 Verify Issue Templates

1. Navigate to https://github.com/Zerostate-IO/CleanComms/issues/new/choose
2. Verify three template options appear:
   - ☐ Bug Report
   - ☐ Feature Request
   - ☐ Question
3. Verify contact links appear:
   - ☐ GitHub Discussions
   - ☐ Security Policy
   - ☐ Documentation
4. Verify "Blank issue" is NOT available (blank_issues_enabled: false)

**Status:** ☐ Complete

---

### 4.5 Verify Discussions Categories

1. Navigate to https://github.com/Zerostate-IO/CleanComms/discussions
2. Verify four categories exist:
   - ☐ Q&A
   - ☐ Ideas
   - ☐ Announcements
   - ☐ Show & Tell

**Status:** ☐ Complete

---

### 4.6 Verify Security Advisory Access

1. Navigate to https://github.com/Zerostate-IO/CleanComms/security/advisories
2. Verify "New draft security advisory" button is visible
3. Verify the security policy renders correctly at:
   - https://github.com/Zerostate-IO/CleanComms/security/policy

**Status:** ☐ Complete

---

### 4.7 Cross-Document Link Verification

Verify all cross-references between governance documents resolve:

| From Document | To Document | Verified |
|---------------|-------------|----------|
| GOVERNANCE.md | CODEOWNERS | ☐ |
| GOVERNANCE.md | CONTRIBUTING.md | ☐ |
| GOVERNANCE.md | SECURITY.md | ☐ |
| GOVERNANCE.md | docs/versioning-policy.md | ☐ |
| GOVERNANCE.md | docs/release-runbook.md | ☐ |
| README.md | CONTRIBUTING.md | ☐ |
| README.md | CODE_OF_CONDUCT.md | ☐ |
| README.md | SECURITY.md | ☐ |
| README.md | SUPPORT.md | ☐ |
| SUPPORT.md | SECURITY.md | ☐ |
| SUPPORT.md | CODE_OF_CONDUCT.md | ☐ |
| SUPPORT.md | CONTRIBUTING.md | ☐ |
| CONTRIBUTING.md | CODE_OF_CONDUCT.md | ☐ |
| CONTRIBUTING.md | SECURITY.md | ☐ |
| CONTRIBUTING.md | SUPPORT.md | ☐ |
| docs/repo-policies.md | GOVERNANCE.md | ☐ |
| docs/repo-policies.md | CONTRIBUTING.md | ☐ |
| docs/release-runbook.md | docs/versioning-policy.md | ☐ |
| docs/release-runbook.md | GOVERNANCE.md | ☐ |
| docs/release-runbook.md | SECURITY.md | ☐ |
| docs/release-runbook.md | docs/community-operations.md | ☐ |
| docs/community-operations.md | SUPPORT.md | ☐ |
| docs/community-operations.md | GOVERNANCE.md | ☐ |
| docs/community-operations.md | CODE_OF_CONDUCT.md | ☐ |
| docs/community-operations.md | SECURITY.md | ☐ |
| docs/community-operations.md | CONTRIBUTING.md | ☐ |
| docs/community-operations.md | docs/triage-playbook.md | ☐ |
| docs/triage-playbook.md | SECURITY.md | ☐ |

---

## 5. Launch Day Checklist

Complete immediately before announcing the public launch.

### Pre-Announcement

| Item | Status |
|------|--------|
| Repository visibility set to Public | ☐ |
| All files from Section 1 present and committed | ☐ |
| All policy audits from Section 2 passed | ☐ |
| All GitHub setup from Section 3 complete | ☐ |
| All post-launch verifications from Section 4 passed | ☐ |
| Branch protection active on `main` | ☐ |
| Discussions enabled with 4 categories | ☐ |
| Security Advisories enabled | ☐ |
| All 14 labels created | ☐ |
| CODEOWNERS verified | ☐ |
| CI workflows pass on `main` | ☐ |

### Announcement

| Item | Status |
|------|--------|
| Create launch announcement in Discussions → Announcements | ☐ |
| Update README.md status badges if applicable | ☐ |

---

## 6. Summary

### Files Referenced in This Checklist

**Root Level:**
- [README.md](/README.md)
- [LICENSE](/LICENSE)
- [GOVERNANCE.md](/GOVERNANCE.md)
- [CODE_OF_CONDUCT.md](/CODE_OF_CONDUCT.md)
- [CONTRIBUTING.md](/CONTRIBUTING.md)
- [SECURITY.md](/SECURITY.md)
- [SUPPORT.md](/SUPPORT.md)
- [CHANGELOG.md](/CHANGELOG.md)

**GitHub Configuration:**
- [.github/CODEOWNERS](/.github/CODEOWNERS)
- [.github/PULL_REQUEST_TEMPLATE.md](/.github/PULL_REQUEST_TEMPLATE.md)
- [.github/ISSUE_TEMPLATE/bug_report.yml](/.github/ISSUE_TEMPLATE/bug_report.yml)
- [.github/ISSUE_TEMPLATE/feature_request.yml](/.github/ISSUE_TEMPLATE/feature_request.yml)
- [.github/ISSUE_TEMPLATE/question.yml](/.github/ISSUE_TEMPLATE/question.yml)
- [.github/ISSUE_TEMPLATE/config.yml](/.github/ISSUE_TEMPLATE/config.yml)
- [.github/workflows/docs-governance.yml](/.github/workflows/docs-governance.yml)
- [.github/workflows/pr-governance.yml](/.github/workflows/pr-governance.yml)

**Documentation:**
- [docs/repo-policies.md](/docs/repo-policies.md)
- [docs/triage-playbook.md](/docs/triage-playbook.md)
- [docs/versioning-policy.md](/docs/versioning-policy.md)
- [docs/community-operations.md](/docs/community-operations.md)
- [docs/release-runbook.md](/docs/release-runbook.md)

**Scripts:**
- [scripts/check-governance.sh](/scripts/check-governance.sh)
- [scripts/check-pr-policy.sh](/scripts/check-pr-policy.sh)

### Key Policies Confirmed

| Policy | Value |
|--------|-------|
| Response SLA | 5 business days target, not guaranteed |
| Security Reporting | GitHub Security Advisories (primary), security@zerostate.io (backup) |
| Merge Strategy | Squash merge only |
| Branch Protection | Required on `main`: 1 approval, CI passing |
| CODEOWNERS | @Zerostate-IO/maintainers for all paths |
| Discussions Categories | Q&A, Ideas, Announcements, Show & Tell |
| Labels | 14 labels (type, priority, effort, status, security) |
| Versioning | SemVer 0.x with conventional commits |
| Release Cadence | Readiness-based (no fixed dates) |

---

*This document is part of the CleanComms governance framework. For questions or updates, see [CONTRIBUTING.md](/CONTRIBUTING.md).*
