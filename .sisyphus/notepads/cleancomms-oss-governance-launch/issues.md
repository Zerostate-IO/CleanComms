# Issues - CleanComms OSS Governance Launch

## [2026-02-28T23:48:35Z] Session Start

No issues encountered yet.

## [F2] Code Quality Review — Shell Scripts & Workflows

### BUGS (Must Fix)

**BUG-1: pr-governance.yml — Missing write permission for PR comments**
- File: `.github/workflows/pr-governance.yml`, line 14-16
- The `permissions` block only has `pull-requests: read`, but the "Comment on PR if checks fail" step calls `github.rest.issues.createComment()` which requires write access.
- **Impact**: The failure comment step will silently fail with 403. The PR will still be blocked (correct), but without the helpful diagnostic comment.
- **Fix**: Add `pull-requests: write` to the permissions block.

**BUG-2: check-pr-policy.sh — Check 3 (Plan Safekeeping) is entirely non-functional**
- File: `scripts/check-pr-policy.sh`, lines 70, 230, 238
- The jq expressions reference `.pull_request.changed_files[]` as if it's an array of filenames. In the GitHub event payload, `changed_files` is an **integer count**, NOT a file list.
- All three jq expressions fail silently (caught by `|| true` / `&>/dev/null`), so `plans_touched`, `plans_changed`, and `code_files` are never populated.
- **Impact**: Check 3 always falls through to the generic reminder on line 253. It never detects plan file changes or code-without-plan scenarios.
- **Fix**: Use the GitHub API (`GET /repos/{owner}/{repo}/pulls/{pull_number}/files`) to fetch actual changed file paths, or use `git diff` against the base branch.

**BUG-3: check-governance.sh — Duplicate grep / dead code in link checker**
- File: `scripts/check-governance.sh`, line 88 vs line 114
- Line 88 starts a pipe: `grep ... | while read -r match; do`
- Line 114 feeds the same `while` via process substitution: `done < <(grep ...)`
- In bash, the `< <(...)` redirect on `done` overrides the pipe input. The grep on line 88 executes and its output is discarded.
- **Impact**: Every markdown file has its links grepped **twice** — once wastefully. Not a correctness bug but a performance bug and confusing code.
- **Fix**: Remove the `grep ... || true |` prefix from line 88, keeping only the process substitution on line 114.

**BUG-4: check-pr-policy.sh — Breaking change indicator never captured**
- File: `scripts/check-pr-policy.sh`, line 102 vs line 110
- Regex: `^(type)(\([^)]+\))?!?: .+` — the `!` is not in a capture group.
- `BASH_REMATCH[3]` on line 110 is always empty, so `Breaking: yes` info line never appears.
- **Impact**: Cosmetic only — breaking change titles still pass validation, just don't get the info annotation.
- **Fix**: Change regex to `^(type)(\([^)]+\))?(!)?: .+` to capture `!` in group 3.

### MINOR ISSUES (Non-Blocking)

**MINOR-1: No trap for temp file cleanup (check-governance.sh)**
- Line 81 creates a temp file with `mktemp`. If the script is killed (SIGINT/SIGTERM), the file leaks.
- Fix: Add `trap 'rm -f "$broken_link_file"' EXIT` after creation.

**MINOR-2: Path resolution edge case (check-governance.sh)**
- Line 109: If the target directory doesn't exist, `cd` fails silently and `resolved_path` becomes `/<basename>` instead of empty. This could cause false negatives for broken links pointing to non-existent directories.

**MINOR-3: Shell injection vector in workflow YAML validation (docs-governance.yml)**
- Line 36: `python3 -c "import yaml; yaml.safe_load(open('$file'))"` — if a filename contained single quotes, this would break. Extremely unlikely for `.github/ISSUE_TEMPLATE/*.yml` files, but the safer pattern is: `python3 -c "import yaml,sys; yaml.safe_load(open(sys.argv[1]))" "$file"`

**MINOR-4: Duplicate YAML validation (docs-governance.yml)**
- Lines 32-39 duplicate the YAML check already performed inside `check-governance.sh` (Check 3). Both run `python3 yaml.safe_load()` on the same files. Redundant but not harmful.

**MINOR-5: `((ERRORS++))` / `((WARNINGS++))` fragility**
- In both scripts, `((ERRORS++))` returns exit code 1 when incrementing from 0 (old value 0 = falsy). Safe without `set -e`, but fragile if someone adds it later.
- Safer alternative: `ERRORS=$((ERRORS + 1))`

**MINOR-6: PR failure comment duplication (pr-governance.yml)**
- The "Comment on PR if checks fail" step adds a new comment on every failed run. Multiple pushes that fail will accumulate duplicate comments. Consider a comment marker to update-in-place.

### GOOD PRACTICES OBSERVED

- `set -uo pipefail` in both scripts (intentionally no `-e` given ERRORS counter pattern — correct)
- Proper quoting throughout (`"${variable}"` pattern consistently applied)
- `${BASH_SOURCE[0]}` for script directory resolution
- Array-based iteration for required files/sections
- Graceful fallback chain for YAML validation (python → yq → grep)
- Opt-out mechanism for issue references
- Warning vs error severity distinction for docs/chore PRs
- `actions/checkout@v4` and `actions/github-script@v7` — pinned major versions
- Proper path filtering on docs-governance.yml triggers
- Correct `types:` on pr-governance.yml including `edited` for title/body changes

### VERDICT: **APPROVE** with noted issues

The core functionality is correct:
- Governance file validation works as designed
- Conventional commit title validation works correctly
- Issue reference checking works correctly with proper opt-out
- Workflows trigger on the right events with correct permissions (except the write perm for comments)

The bugs affect secondary features (plan safekeeping, failure comments, cosmetic info) not the blocking checks. BUG-1 (permissions) and BUG-2 (changed_files) should be fixed before relying on those features, but they don't break the gate-keeping behavior.
