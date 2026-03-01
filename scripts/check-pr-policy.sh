#!/bin/bash
#
# CleanComms PR Policy Validation Script
# Validates PR titles for conventional commit format, issue references, and plan safekeeping
#
# Exit codes:
#   0 - All checks passed (warnings don't cause failure)
#   1 - One or more hard checks failed
#
# Environment variables (set by GitHub Actions):
#   GITHUB_EVENT_PATH - Path to JSON payload with PR info
#

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

# Conventional commit types
CONVENTIONAL_TYPES="feat|fix|docs|style|refactor|test|chore"

log_pass() {
    echo -e "${GREEN}✓${NC} $1"
}

log_fail() {
    echo -e "${RED}✗${NC} $1"
    ((ERRORS++))
}

log_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
    ((WARNINGS++))
}

log_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

# =============================================================================
# Get PR data from GitHub event payload or environment
# =============================================================================
get_pr_data() {
    if [[ -z "${GITHUB_EVENT_PATH:-}" ]] || [[ ! -f "${GITHUB_EVENT_PATH:-}" ]]; then
        # Not running in GitHub Actions - use environment variables or defaults
        PR_TITLE="${PR_TITLE:-feat: example title}"
        PR_BODY="${PR_BODY:-Closes #123}"
        PR_NUMBER="${PR_NUMBER:-0}"
        PR_BASE_REF="${PR_BASE_REF:-main}"
        return
    fi

    # Extract PR info from GitHub event payload
    PR_TITLE=$(jq -r '.pull_request.title // empty' "${GITHUB_EVENT_PATH}" 2>/dev/null || echo "")
    PR_BODY=$(jq -r '.pull_request.body // empty' "${GITHUB_EVENT_PATH}" 2>/dev/null || echo "")
    PR_NUMBER=$(jq -r '.pull_request.number // 0' "${GITHUB_EVENT_PATH}" 2>/dev/null || echo "0")
    PR_BASE_REF=$(jq -r '.pull_request.base.ref // "main"' "${GITHUB_EVENT_PATH}" 2>/dev/null || echo "main")
    
    # Get list of changed files
    CHANGED_FILES=$(jq -r '.pull_request.changed_files // [] | .[]' "${GITHUB_EVENT_PATH}" 2>/dev/null || true)
}

# =============================================================================
# Check 1: Conventional Commit Title Format
# =============================================================================
# Pattern: type(scope)!?: description
# Examples:
#   feat: add new feature
#   fix(radio): correct CAT timeout handling
#   feat(api)!: breaking API change
#   docs: update README
# =============================================================================
check_conventional_commit() {
    echo ""
    echo "=== Check 1: Conventional Commit Title Format ==="
    
    if [[ -z "${PR_TITLE:-}" ]]; then
        log_fail "PR title is empty"
        log_info "Expected format: type(scope)?: description"
        log_info "Types: feat, fix, docs, style, refactor, test, chore"
        log_info "Example: feat(radio): add support for TX-500 CAT control"
        return
    fi
    
    log_info "PR title: \"${PR_TITLE}\""
    
    # Regex: type(optional-scope)!?: description
    # - type: feat|fix|docs|style|refactor|test|chore
    # - scope: optional, in parentheses
    # - !: optional, indicates breaking change
    # - : followed by space and description (at least 1 char)
    local pattern="^(${CONVENTIONAL_TYPES})(\([^)]+\))?!?: .+"
    
    if [[ "${PR_TITLE}" =~ ${pattern} ]]; then
        log_pass "PR title follows conventional commit format"
        
        # Extract and display components
        local type="${BASH_REMATCH[1]}"
        local scope="${BASH_REMATCH[2]:-}"
        local breaking="${BASH_REMATCH[3]:-}"
        
        log_info "  Type: ${type}"
        [[ -n "${scope}" ]] && log_info "  Scope: ${scope}"
        [[ -n "${breaking}" ]] && log_info "  Breaking: yes"
    else
        log_fail "PR title does not follow conventional commit format"
        log_info "Expected format: type(scope)?: description"
        log_info "Types: feat, fix, docs, style, refactor, test, chore"
        log_info "Examples:"
        log_info "  feat: add new feature"
        log_info "  fix(radio): correct CAT timeout handling"
        log_info "  docs: update installation guide"
        log_info "  refactor(api)!: breaking API restructure"
    fi
}

# =============================================================================
# Check 2: Issue Reference in PR Body
# =============================================================================
# Looks for: Closes #, Fixes #, Related to #, Issue #
# Allows opt-out with: "No issue reference needed" or "skip-issue-check"
# =============================================================================
check_issue_reference() {
    echo ""
    echo "=== Check 2: Issue Reference ==="
    
    # Handle empty PR body
    if [[ -z "${PR_BODY:-}" ]]; then
        log_warn "PR body is empty - cannot verify issue reference"
        log_info "Consider adding 'Closes #123' or 'No issue reference needed: <reason>'"
        return
    fi
    
    # Check for explicit opt-out
    local opt_out_patterns=(
        "no issue reference needed"
        "no issue needed"
        "skip-issue-check"
        "skip issue check"
    )
    
    local body_lower
    body_lower=$(echo "${PR_BODY}" | tr '[:upper:]' '[:lower:]')
    
    for pattern in "${opt_out_patterns[@]}"; do
        if [[ "${body_lower}" == *"${pattern}"* ]]; then
            log_pass "Issue reference check explicitly skipped"
            log_info "  Reason: '${pattern}' found in PR body"
            return
        fi
    done
    
    # Check for issue reference patterns
    local issue_patterns=(
        "Closes #"
        "closes #"
        "Fixes #"
        "fixes #"
        "Related to #"
        "related to #"
        "Issue #"
        "issue #"
        "Resolves #"
        "resolves #"
    )
    
    local found_reference=""
    for pattern in "${issue_patterns[@]}"; do
        if [[ "${PR_BODY}" == *"${pattern}"* ]]; then
            found_reference="${pattern}"
            break
        fi
    done
    
    if [[ -n "${found_reference}" ]]; then
        log_pass "Issue reference found in PR body"
        log_info "  Pattern matched: '${found_reference}'"
    else
        # Check if this looks like a docs-only or chore PR (soft warning)
        local title_lower
        title_lower=$(echo "${PR_TITLE}" | tr '[:upper:]' '[:lower:]')
        
        if [[ "${title_lower}" == docs* ]] || [[ "${title_lower}" == chore* ]]; then
            log_warn "No issue reference found (docs/chore PR - consider adding one or explicit opt-out)"
            log_info "Add 'Closes #123' or 'No issue reference needed: <reason>' to PR body"
        else
            log_fail "No issue reference found in PR body"
            log_info "Add one of the following to your PR body:"
            log_info "  Closes #<issue-number>"
            log_info "  Fixes #<issue-number>"
            log_info "  Related to #<issue-number>"
            log_info "  Issue #<issue-number>"
            log_info ""
            log_info "Or add 'No issue reference needed: <reason>' to skip this check"
        fi
    fi
}

# =============================================================================
# Check 3: Plan Safekeeping (Warning Only)
# =============================================================================
# Warns if:
# - PR touches .sisyphus/plans/ OR
# - PR touches files that may be governed by a plan
# AND .sisyphus/plans/ has no changes in this PR
# =============================================================================
check_plan_safekeeping() {
    echo ""
    echo "=== Check 3: Plan Safekeeping (Warning Only) ==="
    
    # In GitHub Actions, we need to fetch the actual changed files
    # For now, we check if the event contains file info or warn generally
    
    local plans_touched=false
    local plans_changed=false
    
    # Check if running in GitHub Actions with full event data
    if [[ -n "${GITHUB_EVENT_PATH:-}" ]] && [[ -f "${GITHUB_EVENT_PATH:-}" ]]; then
        # Check if any changed files are in .sisyphus/plans/
        if jq -e '.pull_request.changed_files[] | select(startswith(".sisyphus/plans/"))' "${GITHUB_EVENT_PATH}" &>/dev/null; then
            plans_touched=true
            plans_changed=true
        fi
        
        # Check for plan markers in changed files (look for references to .sisyphus/plans)
        # This is a heuristic - actual implementation would need to read the files
        local code_files
        code_files=$(jq -r '.pull_request.changed_files[] | select(endswith(".go") or endswith(".ts") or endswith(".js") or endswith(".py"))' "${GITHUB_EVENT_PATH}" 2>/dev/null || true)
        
        if [[ -n "${code_files}" ]] && [[ "${plans_changed}" == false ]]; then
            # Code files changed but no plan update - warn about potential safekeeping
            log_warn "Code files changed but .sisyphus/plans/ has no changes in this PR"
            log_info "If this work is tracked in a plan, ensure the plan is updated alongside code changes"
            log_info "See CONTRIBUTING.md: 'Plan Safekeeping' section"
            return
        fi
    fi
    
    # General reminder
    if [[ "${plans_changed}" == true ]]; then
        log_pass "Plan files included in this PR"
    else
        log_info "Reminder: If this PR includes work tracked in .sisyphus/plans/, commit plan updates too"
        log_info "  See: CONTRIBUTING.md - Plan Safekeeping"
    fi
}

# =============================================================================
# Main
# =============================================================================
main() {
    echo "========================================"
    echo "CleanComms PR Policy Validation"
    echo "========================================"
    
    # Get PR data
    get_pr_data
    
    log_info "PR #${PR_NUMBER:-0} targeting ${PR_BASE_REF:-main}"
    
    # Run checks
    check_conventional_commit
    check_issue_reference
    check_plan_safekeeping
    
    # Summary
    echo ""
    echo "========================================"
    echo "Summary"
    echo "========================================"
    
    if [[ $ERRORS -gt 0 ]]; then
        echo -e "${RED}FAILED${NC}: ${ERRORS} check(s) failed"
        if [[ $WARNINGS -gt 0 ]]; then
            echo -e "${YELLOW}WARNINGS${NC}: ${WARNINGS} warning(s)"
        fi
        echo ""
        echo "Please fix the issues above and update your PR."
        exit 1
    elif [[ $WARNINGS -gt 0 ]]; then
        echo -e "${GREEN}PASSED${NC}: All required checks passed"
        echo -e "${YELLOW}WARNINGS${NC}: ${WARNINGS} warning(s) (non-blocking)"
        echo ""
        echo "Consider addressing the warnings above, but they won't block merge."
        exit 0
    else
        echo -e "${GREEN}PASSED${NC}: All PR policy checks passed"
        exit 0
    fi
}

main "$@"
