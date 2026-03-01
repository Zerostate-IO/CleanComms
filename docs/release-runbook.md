# Release Runbook

This document describes the step-by-step process for creating CleanComms releases. Only maintainers may execute releases. See [GOVERNANCE.md](/GOVERNANCE.md) for release authority.

---

## Overview

CleanComms follows a **readiness-based release cadence**. We do not ship on fixed dates. Releases occur when:
- All acceptance criteria are met
- Tests pass on `main`
- Documentation is updated
- Changelog reflects changes since last release

Version numbers follow [Semantic Versioning](/docs/versioning-policy.md) with `0.x.y` conventions during pre-1.0 development.

---

## Version Bump Decision

Before starting a release, determine the correct version bump:

| Change Type | Bump | Example |
|-------------|------|---------|
| Bug fixes only | PATCH | `0.4.1` → `0.4.2` |
| New features | MINOR | `0.4.2` → `0.5.0` |
| Breaking changes | MINOR | `0.4.2` → `0.5.0` |

**How to determine:**
1. Review merged PRs since last release
2. Check PR titles for Conventional Commits prefixes (`feat`, `fix`, `feat!`, `fix!`)
3. Look for `BREAKING CHANGE:` footers in commit messages
4. If any breaking change exists, it is a MINOR bump
5. If only fixes exist, it is a PATCH bump

---

## Preflight Checklist

Complete all items before tagging a release.

### 1. Code Quality

- [ ] All CI checks pass on `main` branch
- [ ] No open pull requests marked as blocking
- [ ] Code coverage meets or exceeds current baseline

### 2. Documentation

- [ ] CHANGELOG.md updated with all changes since last release
- [ ] CHANGELOG entries categorized correctly (Added, Changed, Fixed, etc.)
- [ ] Version comparison link added to CHANGELOG bottom
- [ ] Any new CLI flags or config options documented
- [ ] Breaking changes documented with migration guidance

### 3. Version Housekeeping

- [ ] Version bump decision made (PATCH vs MINOR)
- [ ] No uncommitted changes in working directory
- [ ] Local branch is up to date with `origin/main`

### 4. Sanity Check

- [ ] Build completes locally without errors
- [ ] Basic smoke test passes (daemon starts, dashboard loads)
- [ ] No known critical bugs that should block release

---

## Tagging Process

### 1. Update Changelog

Move items from `[Unreleased]` to the new version section:

```markdown
## [0.5.0] - 2026-03-15

### Added
- New feature X for doing Y
- Support for radio model Z

### Fixed
- Bug in audio routing under condition Q

---

## [Unreleased]

### Added
- (Empty - ready for next cycle)
```

Add the comparison link at the bottom:

```markdown
[0.5.0]: https://github.com/ZeroState-IO/CleanComms/compare/v0.4.2...v0.5.0
```

### 2. Commit the Changelog Update

```bash
git add CHANGELOG.md
git commit -m "chore(release): prepare v0.5.0 changelog"
git push origin main
```

### 3. Create Annotated Tag

```bash
git tag -a v0.5.0 -m "Release v0.5.0: JS8Call integration, audio routing fixes"
git push origin v0.5.0
```

**Tag message format:**
- Start with `Release vX.Y.Z:`
- Follow with a brief 1-2 sentence summary of key changes
- Do not paste the entire changelog into the tag message

---

## GitHub Release Process

### 1. Draft the Release

1. Navigate to https://github.com/ZeroState-IO/CleanComms/releases/new
2. Select the tag you just pushed (e.g., `v0.5.0`)
3. Release title: `v0.5.0` (match the tag)
4. Target: `main`

### 2. Write Release Notes

Copy the relevant section from CHANGELOG.md and format for readability:

```markdown
## What's Changed

### Added
- New feature X for doing Y
- Support for radio model Z

### Fixed
- Bug in audio routing under condition Q

### Breaking Changes
- (If any, include migration guidance)

**Full Changelog**: https://github.com/ZeroState-IO/CleanComms/compare/v0.4.2...v0.5.0
```

### 3. Pre-Release Flag

For `0.x` releases, consider whether to mark as pre-release:
- If this is a routine development release, mark as **pre-release**
- If this release represents a significant milestone toward 1.0.0, consider unchecking pre-release

Default for `0.x`: **mark as pre-release**.

### 4. Publish

Click **Publish release**.

---

## Post-Release Steps

### 1. Announce in Discussions

Create a post in **Discussions → Announcements**:

**Title:** `CleanComms v0.5.0 Released`

**Body:**
```markdown
CleanComms v0.5.0 is now available.

## Highlights
- Brief summary of key changes

## Breaking Changes
- (If any, with migration notes)

## Installation
(Installation instructions or link to README)

## Full Changelog
See the [release notes](https://github.com/ZeroState-IO/CleanComms/releases/tag/v0.5.0) for complete details.

As always, feedback is welcome in Discussions → Q&A or Ideas.
```

### 2. Update Version References (If Applicable)

If any files contain hardcoded version strings (e.g., install scripts, documentation examples), update them to reflect the new version.

### 3. Reset Unreleased Section

Ensure CHANGELOG.md has an empty `[Unreleased]` section ready for the next cycle:

```markdown
## [Unreleased]

### Added
- (New items will accumulate here)

### Fixed
- (New items will accumulate here)
```

---

## Rollback Procedure

If a release contains a critical bug or security issue discovered post-publication, follow these steps.

### 1. Assess Severity

| Severity | Action |
|----------|--------|
| Minor bug, workaround exists | Document in issue, fix in next release |
| Major bug, no workaround | Yank release, patch immediately |
| Security vulnerability | Yank release, follow [SECURITY.md](/SECURITY.md) embargo process |

### 2. Yank the Release

**GitHub Release:**
1. Navigate to the release page
2. Click **Edit**
3. Check **Set as a pre-release** and **Set as the latest release** (uncheck latest)
4. Update description with: `**YANKED** - See issue #XXX for details`
5. Save

**Tag (optional, for severe cases):**
```bash
# Delete remote tag (use with caution - breaks existing clones)
git push --delete origin v0.5.0

# Delete local tag
git tag -d v0.5.0
```

Note: Deleting tags is disruptive. Prefer yanking the GitHub release unless the tag contains dangerous code.

### 3. Communicate

1. **Update the release notes** with yank status and issue link
2. **Post in Discussions → Announcements** explaining the situation
3. **Update any documentation** that references the yanked version

### 4. Fix Forward

1. Create a hotfix branch from the yanked version tag or `main`
2. Implement the fix
3. Increment PATCH version (e.g., `v0.5.0` → `v0.5.1`)
4. Follow the standard release process for the patch
5. Announce the fix release

### 5. Post-Mortem (For Major Issues)

For significant rollback events:
1. Document what went wrong
2. Identify how it escaped detection
3. Add preflight checklist items to prevent recurrence
4. Update this runbook if process gaps exist

---

## Quick Reference

### Complete Release Checklist

```
[ ] Determine version bump (PATCH/MINOR)
[ ] Update CHANGELOG.md with release section
[ ] Add version comparison link to CHANGELOG
[ ] Commit changelog: git commit -m "chore(release): prepare vX.Y.Z"
[ ] Push to main: git push origin main
[ ] Create tag: git tag -a vX.Y.Z -m "Release vX.Y.Z: summary"
[ ] Push tag: git push origin vX.Y.Z
[ ] Draft GitHub release with changelog content
[ ] Mark as pre-release (for 0.x)
[ ] Publish release
[ ] Announce in Discussions → Announcements
[ ] Verify empty [Unreleased] section in CHANGELOG
```

### Useful Commands

```bash
# View recent tags
git tag -l --sort=-version:refname | head -10

# Show tag details
git show v0.5.0

# Compare two versions
git log v0.4.2..v0.5.0 --oneline

# Check if tag exists remotely
git ls-remote --tags origin | grep v0.5.0
```

---

## Cross-References

- [Versioning Policy](/docs/versioning-policy.md) - Version bump rules and 1.0.0 graduation criteria
- [GOVERNANCE.md](/GOVERNANCE.md) - Release authority and maintainer responsibilities
- [Community Operations](/docs/community-operations.md) - Announcements category for release posts

---

## Policy Updates

This runbook may be updated as release processes evolve. Major changes will be announced in Discussions → Announcements. The canonical version always lives in the repository at `/docs/release-runbook.md`.
