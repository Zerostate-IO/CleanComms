# Repository Policies

This document defines the branch protection rules, merge strategy, and operational policies for the CleanComms repository. For governance authority and decision processes, see [GOVERNANCE.md](/GOVERNANCE.md).

---

## Branch Protection

### `main` Branch

The `main` branch is protected and follows trunk-based development practices.

**Protection Rules:**

| Rule | Status | Description |
|------|--------|-------------|
| No direct push | **Enforced** | All changes must come through pull requests |
| Require PR review | **Enforced** | At least one maintainer approval required |
| Require status checks | **Enforced** | CI must pass before merge |
| Require signed commits | Optional | Encouraged but not required |
| Allow force pushes | **Disabled** | Never allowed on `main` |
| Allow deletions | **Disabled** | Branch cannot be deleted |

**Rationale:** Direct pushes to `main` bypass review and CI, creating risk of broken builds, unreviewed code, and lost accountability. All changes flow through PRs to ensure:

1. Code review by maintainers
2. CI validation
3. Documented change history
4. Attribution to contributors

---

## Merge Strategy

### Squash Merge Only

All merges to `main` use **squash merge** to maintain a linear, readable history.

**Why squash merge:**

- **Clean history:** Each PR becomes a single commit with a descriptive message
- **Attribution preserved:** The squash commit credits the PR author
- **Bisect-friendly:** Linear history makes `git bisect` reliable for debugging
- **No merge commits:** Avoids noisy merge bubbles in history

**Merge commit message format:**

```
<type>(<scope>): <description>

Co-authored-by: Contributor Name <email@example.com>
```

**Do not use:**

- Merge commits (creates non-linear history)
- Rebase and merge (loses PR context in GitHub UI)

---

## Required Checks

All pull requests must pass required CI checks before merging.

### Current Required Checks

| Check | Description | Required |
|-------|-------------|----------|
| Build | Code compiles successfully | Yes |
| Test | Unit tests pass | Yes |
| Lint | Code style passes | Yes |

> **Note:** Required checks are configured in GitHub branch protection settings. The list above reflects current requirements. As CI infrastructure matures, additional checks may be added.

### Check Failures

If a required check fails:

1. The PR cannot be merged
2. The contributor must address the failure
3. Maintainers may provide guidance but will not merge failing PRs

---

## Emergency Override Process

In rare circumstances, maintainers may need to bypass standard procedures.

### When Override is Appropriate

- **Security hotfix:** Critical vulnerability requiring immediate patch
- **Broken main:** CI is broken and blocking all work
- **Infrastructure failure:** GitHub or CI provider outage

### Override Procedure

1. **Document the emergency:** Create an issue describing the situation
2. **Obtain maintainer consensus:** At least one other maintainer must agree (or be unavailable)
3. **Perform the override:** Use admin rights to merge or push
4. **Post-mortem:** Within 48 hours, document what happened and how to prevent recurrence

### Override is NOT Appropriate

- Impatience with review timeline
- Contributor pressure
- Minor bugs that have workarounds
- Feature requests marked "urgent"

---

## Branch Naming Conventions

While not enforced, consistent branch naming improves clarity:

| Pattern | Example | Use Case |
|---------|---------|----------|
| `feature/<description>` | `feature/js8call-integration` | New features |
| `fix/<description>` | `fix/ptt-timeout` | Bug fixes |
| `docs/<description>` | `docs/api-reference` | Documentation |
| `refactor/<description>` | `refactor/audio-routing` | Code refactoring |
| `chore/<description>` | `chore/update-dependencies` | Maintenance tasks |

---

## Commit Message Guidelines

We follow conventional commit format for clear, searchable history:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

**Examples:**

```
feat(daemon): add PTT watchdog timer

fix(rigctl): handle connection timeout gracefully

docs(readme): update installation instructions
```

---

## Policy Updates

This document may be updated as the project matures. Changes to repository policies require:

1. Discussion in GitHub Discussions or a dedicated issue
2. Maintainer consensus
3. Update to this document
4. Update to GitHub branch protection settings (if applicable)

For governance authority, see [GOVERNANCE.md](/GOVERNANCE.md).

---

## References

- [GOVERNANCE.md](/GOVERNANCE.md) - Project governance and decision authority
- [CONTRIBUTING.md](/CONTRIBUTING.md) - Contribution guidelines
- [GitHub Docs: Branch Protection](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
