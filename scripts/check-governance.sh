#!/bin/bash
#
# CleanComms Governance Validation Script
# Validates required files, markdown links, issue templates, and PR template structure
#
# Exit codes:
#   0 - All checks passed
#   1 - One or more checks failed
#

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0

log_pass() {
    echo -e "${GREEN}✓${NC} $1"
}

log_fail() {
    echo -e "${RED}✗${NC} $1"
    ((ERRORS++))
}

log_info() {
    echo -e "  $1"
}

# =============================================================================
# Check 1: Required Governance Files
# =============================================================================
check_required_files() {
    echo ""
    echo "=== Check 1: Required Governance Files ==="
    
    local required_files=(
        "GOVERNANCE.md"
        "LICENSE"
        "CODE_OF_CONDUCT.md"
        "CONTRIBUTING.md"
        "SECURITY.md"
        "SUPPORT.md"
        "README.md"
        ".github/CODEOWNERS"
    )
    
    for file in "${required_files[@]}"; do
        if [[ -f "${REPO_ROOT}/${file}" ]]; then
            log_pass "${file} exists"
        else
            log_fail "${file} is missing"
        fi
    done
}

# =============================================================================
# Check 2: Markdown Local Links
# =============================================================================
check_markdown_links() {
    echo ""
    echo "=== Check 2: Markdown Local Links ==="
    
    local broken_links=0
    local md_files
    
    md_files=$(find "${REPO_ROOT}" -name "*.md" -not -path "*/.sisyphus/*" -not -path "*/node_modules/*" 2>/dev/null || true)
    
    if [[ -z "$md_files" ]]; then
        log_info "No markdown files found"
        return
    fi
    
    local broken_link_file=$(mktemp)
    
    while IFS= read -r md_file; do
        local rel_path="${md_file#${REPO_ROOT}/}"
        local file_dir
        file_dir=$(dirname "$md_file")
        
        while read -r match; do
            local link
            link=$(echo "$match" | sed -E 's/.*\]\(([^)]+)\).*/\1/')
            
            if [[ "$link" =~ ^https?:// ]] || [[ "$link" =~ ^mailto: ]] || [[ "$link" =~ ^# ]]; then
                continue
            fi
            
            local link_path="${link%%#*}"
            
            if [[ -z "$link_path" ]]; then
                continue
            fi
            
            local resolved_path
            if [[ "$link_path" =~ ^/ ]]; then
                resolved_path="${REPO_ROOT}${link_path}"
            else
                resolved_path="${file_dir}/${link_path}"
            fi
            
            resolved_path=$(cd "$(dirname "$resolved_path")" 2>/dev/null && pwd)/$(basename "$resolved_path") 2>/dev/null || resolved_path=""
            
            if [[ ! -f "$resolved_path" ]] && [[ ! -d "${resolved_path%/}" ]]; then
                echo "${rel_path}: ${link}" >> "$broken_link_file"
            fi
        done < <(grep -oE '\[[^\]]+\]\(([^)]+)\)' "$md_file" 2>/dev/null || true)
    done <<< "$md_files"
    
    if [[ -s "$broken_link_file" ]]; then
        while IFS= read -r broken; do
            log_fail "Broken link in ${broken}"
        done < "$broken_link_file"
        rm -f "$broken_link_file"
    else
        log_pass "All local markdown links are valid"
        rm -f "$broken_link_file"
    fi
}

# =============================================================================
# Check 3: YAML Syntax for Issue Templates
# =============================================================================
check_issue_templates() {
    echo ""
    echo "=== Check 3: Issue Template YAML Validation ==="
    
    local template_dir="${REPO_ROOT}/.github/ISSUE_TEMPLATE"
    
    if [[ ! -d "$template_dir" ]]; then
        log_fail "Issue template directory missing: .github/ISSUE_TEMPLATE/"
        return
    fi
    
    local yaml_files
    yaml_files=$(find "$template_dir" -name "*.yml" -o -name "*.yaml" 2>/dev/null || true)
    
    if [[ -z "$yaml_files" ]]; then
        log_fail "No YAML issue templates found in .github/ISSUE_TEMPLATE/"
        return
    fi
    
    # Try Python with yaml module first, then yq, then basic grep check
    local yaml_valid=false
    local validation_method=""
    
    if python3 -c "import yaml" 2>/dev/null; then
        validation_method="python"
    elif command -v yq &>/dev/null && yq --version 2>/dev/null | grep -q "v4"; then
        validation_method="yq"
    else
        validation_method="grep"
    fi
    
    while IFS= read -r yaml_file; do
        local rel_path="${yaml_file#${REPO_ROOT}/}"
        local filename=$(basename "$yaml_file")
        
        # config.yml is a special config file, not an issue form
        if [[ "$filename" == "config.yml" ]] || [[ "$filename" == "config.yaml" ]]; then
            case "$validation_method" in
                python)
                    if python3 -c "import yaml; yaml.safe_load(open('$yaml_file'))" 2>/dev/null; then
                        log_pass "${rel_path} has valid YAML syntax"
                    else
                        log_fail "${rel_path} has invalid YAML syntax"
                    fi
                    ;;
                yq)
                    if yq eval '.' "$yaml_file" >/dev/null 2>&1; then
                        log_pass "${rel_path} has valid YAML syntax"
                    else
                        log_fail "${rel_path} has invalid YAML syntax"
                    fi
                    ;;
                *)
                    if grep -qE '^(blank_issues_enabled|contact_links):' "$yaml_file" 2>/dev/null; then
                        log_pass "${rel_path} has valid config structure"
                    else
                        log_pass "${rel_path} exists (basic check)"
                    fi
                    ;;
            esac
            continue
        fi
        
        case "$validation_method" in
            python)
                if python3 -c "import yaml; yaml.safe_load(open('$yaml_file'))" 2>/dev/null; then
                    log_pass "${rel_path} has valid YAML syntax"
                else
                    log_fail "${rel_path} has invalid YAML syntax"
                fi
                ;;
            yq)
                if yq eval '.' "$yaml_file" >/dev/null 2>&1; then
                    log_pass "${rel_path} has valid YAML syntax"
                else
                    log_fail "${rel_path} has invalid YAML syntax"
                fi
                ;;
            *)
                if grep -qE '^(name|description|body):' "$yaml_file" 2>/dev/null; then
                    log_pass "${rel_path} has required issue template fields"
                else
                    log_fail "${rel_path} is missing required fields (name, description, body)"
                fi
                ;;
        esac
    done <<< "$yaml_files"
}

# =============================================================================
# Check 4: PR Template Structure
# =============================================================================
check_pr_template() {
    echo ""
    echo "=== Check 4: PR Template Structure ==="
    
    local pr_template="${REPO_ROOT}/.github/PULL_REQUEST_TEMPLATE.md"
    
    if [[ ! -f "$pr_template" ]]; then
        log_fail "PR template missing: .github/PULL_REQUEST_TEMPLATE.md"
        return
    fi
    
    # Required sections based on CleanComms PR template
    local required_sections=(
        "Linked Issue"
        "Scope Statement"
        "Test Evidence"
        "Checklist"
    )
    
    local missing_sections=()
    
    for section in "${required_sections[@]}"; do
        if grep -q "## ${section}" "$pr_template" 2>/dev/null; then
            log_pass "PR template has '${section}' section"
        else
            log_fail "PR template missing '${section}' section"
            missing_sections+=("$section")
        fi
    done
    
    if [[ ${#missing_sections[@]} -eq 0 ]]; then
        log_pass "PR template structure is valid"
    fi
}

# =============================================================================
# Main
# =============================================================================
main() {
    echo "========================================"
    echo "CleanComms Governance Validation"
    echo "========================================"
    
    check_required_files
    check_markdown_links
    check_issue_templates
    check_pr_template
    
    echo ""
    echo "========================================"
    if [[ $ERRORS -gt 0 ]]; then
        echo -e "${RED}FAILED${NC}: ${ERRORS} check(s) failed"
        echo "========================================"
        exit 1
    else
        echo -e "${GREEN}PASSED${NC}: All governance checks passed"
        echo "========================================"
        exit 0
    fi
}

main "$@"
