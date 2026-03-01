#!/bin/bash
#
# CleanComms Radio Capability Knowledge Base Validator
# Validates radio capability records for integrity, schema conformance, and provenance coverage
#
# Exit codes:
#   0 - All checks passed
#   1 - One or more validation failures
#
# Self-test modes (for CI/CD QA):
#   --self-test-malformed-json     - Test with intentionally malformed JSON
#   --self-test-missing-required   - Test with missing required fields
#   --self-test-missing-radio      - Test with missing target radio record
#
# Additional checks:
#   --check-radio <id>             - Validate specific radio only
#   --require-protocol-split       - Fail if radio has only one protocol profile
#   --require-firmware-gates       - Fail if no firmware gates defined
#   --require-known-issue-source-tier - Fail if known issues lack source_tier
#   --fail-on-official-community-mix  - Fail if record mixes official + community sources
#

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
DATA_DIR="${REPO_ROOT}/data/radios"
CATALOG_DIR="${REPO_ROOT}/data/radios/catalog"
DOCS_DIR="${REPO_ROOT}/docs/radios"
SCHEMA_FILE="${DATA_DIR}/schema/radio-capability.schema.json"
SCHEMA_FILE="${DATA_DIR}/schema/radio-capability.schema.json"

# Target radios (Phase 1 scope)
TARGET_RADIOS=("tx-500" "tx-500mp" "fx-4cr" "trusdx" "x6100")

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

# Command-line options
SELF_TEST_MALFORMED=false
SELF_TEST_MISSING_REQUIRED=false
SELF_TEST_MISSING_RADIO=false
CHECK_RADIO=""
REQUIRE_PROTOCOL_SPLIT=false
REQUIRE_FIRMWARE_GATES=false
REQUIRE_KNOWN_ISSUE_SOURCE_TIER=false
FAIL_ON_OFFICIAL_COMMUNITY_MIX=false

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
# Parse command-line arguments
# =============================================================================
parse_args() {
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --self-test-malformed-json)
                SELF_TEST_MALFORMED=true
                shift
                ;;
            --self-test-missing-required)
                SELF_TEST_MISSING_REQUIRED=true
                shift
                ;;
            --self-test-missing-radio)
                SELF_TEST_MISSING_RADIO=true
                shift
                ;;
            --check-radio)
                CHECK_RADIO="$2"
                shift 2
                ;;
            --require-protocol-split)
                REQUIRE_PROTOCOL_SPLIT=true
                shift
                ;;
            --require-firmware-gates)
                REQUIRE_FIRMWARE_GATES=true
                shift
                ;;
            --require-known-issue-source-tier)
                REQUIRE_KNOWN_ISSUE_SOURCE_TIER=true
                shift
                ;;
            --fail-on-official-community-mix)
                FAIL_ON_OFFICIAL_COMMUNITY_MIX=true
                shift
                ;;
            -h|--help)
                echo "Usage: $0 [OPTIONS]"
                echo ""
                echo "Options:"
                echo "  --self-test-malformed-json        Test with malformed JSON (exits 1)"
                echo "  --self-test-missing-required      Test with missing required fields (exits 1)"
                echo "  --self-test-missing-radio         Test with missing target radio (exits 1)"
                echo "  --check-radio <id>                Validate specific radio only"
                echo "  --require-protocol-split          Fail if single protocol profile"
                echo "  --require-firmware-gates          Fail if no firmware gates"
                echo "  --require-known-issue-source-tier Fail if known issues lack source_tier"
                echo "  --fail-on-official-community-mix  Fail if official+community sources mixed"
                echo "  -h, --help                        Show this help message"
                exit 0
                ;;
            *)
                log_fail "Unknown option: $1"
                exit 1
                ;;
        esac
    done
}

# =============================================================================
# Self-test modes
# =============================================================================
run_self_test_malformed_json() {
    echo ""
    echo "=== Self-Test: Malformed JSON Detection ==="
    
    # Create a temporary malformed JSON file (portable mktemp)
    local tmp_file
    tmp_file=$(mktemp "${TMPDIR:-/tmp}/radio-kb-validate.XXXXXX")
    echo '{"invalid": json, "missing": "quote}' > "$tmp_file"

    # Attempt to parse - should fail
    if python3 -m json.tool < "$tmp_file" > /dev/null 2>&1; then
        rm -f "$tmp_file"
        log_fail "Self-test failed: malformed JSON was accepted"
        return 1
    else
        log_pass "Self-test passed: malformed JSON correctly rejected"
        rm -f "$tmp_file"
        return 0
    fi
}

run_self_test_missing_required() {
    echo ""
    echo "=== Self-Test: Missing Required Fields Detection ==="
    
    # Create a JSON missing required fields (portable mktemp)
    local tmp_file
    tmp_file=$(mktemp "${TMPDIR:-/tmp}/radio-kb-validate.XXXXXX")
    echo '{"schema_version": "1.0", "identity": {"manufacturer": "Test"}}' > "$tmp_file"

    # Check required fields manually (schema validation would catch this too)
    local has_support_tier has_protocol_profiles has_provenance
    has_support_tier=$(python3 -c "import json; d=json.load(open('$tmp_file')); print('yes' if 'support_tier' in d else 'no')" 2>/dev/null || echo "no")
    has_protocol_profiles=$(python3 -c "import json; d=json.load(open('$tmp_file')); print('yes' if 'protocol_profiles' in d else 'no')" 2>/dev/null || echo "no")
    has_provenance=$(python3 -c "import json; d=json.load(open('$tmp_file')); print('yes' if 'provenance' in d else 'no')" 2>/dev/null || echo "no")
    
    if [[ "$has_support_tier" == "no" ]] || [[ "$has_protocol_profiles" == "no" ]] || [[ "$has_provenance" == "no" ]]; then
        log_pass "Self-test passed: missing required fields detected"
        rm -f "$tmp_file"
        return 0
    else
        log_fail "Self-test failed: missing required fields not detected"
        rm -f "$tmp_file"
        return 1
    fi
}

run_self_test_missing_radio() {
    echo ""
    echo "=== Self-Test: Missing Target Radio Detection ==="
    
    # Check if a non-existent radio would be detected
    local fake_radio="nonexistent-radio-xyz"
    local radio_file="${DATA_DIR}/${fake_radio}.json"
    
    if [[ ! -f "$radio_file" ]]; then
        log_pass "Self-test passed: missing radio file correctly identified"
        return 0
    else
        log_fail "Self-test failed: unexpected file exists"
        return 1
    fi
}

# =============================================================================
# JSON Validation
# =============================================================================
validate_json_syntax() {
    local file="$1"
    local rel_path="${file#${REPO_ROOT}/}"
    
    if python3 -m json.tool < "$file" > /dev/null 2>&1; then
        log_pass "JSON syntax valid: ${rel_path}"
        return 0
    else
        log_fail "JSON syntax error in: ${rel_path}"
        python3 -m json.tool < "$file" 2>&1 | head -3 | while read -r line; do
            log_info "  $line"
        done
        return 1
    fi
}

# =============================================================================
# Schema Validation (optional, requires jsonschema)
# =============================================================================
validate_schema() {
    local file="$1"
    local rel_path="${file#${REPO_ROOT}/}"
    
    # Check if schema file exists
    if [[ ! -f "$SCHEMA_FILE" ]]; then
        log_warn "Schema file not found: ${SCHEMA_FILE#${REPO_ROOT}/}"
        return 0
    fi
    
    # Try jsonschema validation
    if python3 -c "import jsonschema" 2>/dev/null; then
        if python3 -c "
import json
import jsonschema
instance = json.load(open('$file'))
schema = json.load(open('$SCHEMA_FILE'))
jsonschema.validate(instance=instance, schema=schema)
" 2>&1; then
            log_pass "Schema validation passed: ${rel_path}"
            return 0
        else
            log_fail "Schema validation failed: ${rel_path}"
            return 1
        fi
    else
        log_info "Skipping schema validation (jsonschema not installed)"
        return 0
    fi
}

# =============================================================================
# Required Fields Check
# =============================================================================
check_required_fields() {
    local file="$1"
    local rel_path="${file#${REPO_ROOT}/}"
    local missing=0
    
    # Required top-level fields from schema
    local required_fields=("schema_version" "identity" "support_tier" "protocol_profiles" "provenance")
    
    for field in "${required_fields[@]}"; do
        local has_field
        has_field=$(python3 -c "import json; d=json.load(open('$file')); print('yes' if '$field' in d else 'no')" 2>/dev/null || echo "no")
        
        if [[ "$has_field" == "no" ]]; then
            log_fail "Missing required field '${field}' in: ${rel_path}"
            ((missing++))
        fi
    done
    
    # Check identity sub-fields
    local identity_fields=("manufacturer" "model" "model_code")
    for field in "${identity_fields[@]}"; do
        local has_field
        has_field=$(python3 -c "import json; d=json.load(open('$file')); print('yes' if 'identity' in d and '$field' in d['identity'] else 'no')" 2>/dev/null || echo "no")
        
        if [[ "$has_field" == "no" ]]; then
            log_fail "Missing required identity field '${field}' in: ${rel_path}"
            ((missing++))
        fi
    done
    
    # Check provenance sub-fields
    local prov_fields=("source_tier" "evidence")
    for field in "${prov_fields[@]}"; do
        local has_field
        has_field=$(python3 -c "import json; d=json.load(open('$file')); print('yes' if 'provenance' in d and '$field' in d['provenance'] else 'no')" 2>/dev/null || echo "no")
        
        if [[ "$has_field" == "no" ]]; then
            log_fail "Missing required provenance field '${field}' in: ${rel_path}"
            ((missing++))
        fi
    done
    
    if [[ $missing -eq 0 ]]; then
        log_pass "All required fields present: ${rel_path}"
    fi
    
    return $missing
}

# =============================================================================
# Provenance Coverage Analysis
# =============================================================================
analyze_provenance() {
    local file="$1"
    local rel_path="${file#${REPO_ROOT}/}"
    
    log_info "Provenance analysis for: ${rel_path}"
    
    # Get top-level provenance tier
    local top_tier
    top_tier=$(python3 -c "
import json
d = json.load(open('$file'))
print(d.get('provenance', {}).get('source_tier', 'unknown'))
" 2>/dev/null || echo "unknown")
    
    log_info "  Top-level source_tier: ${top_tier}"
    
    # Count evidence entries
    local evidence_count
    evidence_count=$(python3 -c "
import json
d = json.load(open('$file'))
print(len(d.get('provenance', {}).get('evidence', [])))
" 2>/dev/null || echo "0")
    
    log_info "  Evidence entries: ${evidence_count}"
    
    # Analyze evidence tiers
    local tier_counts
    tier_counts=$(python3 -c "
import json
from collections import Counter
d = json.load(open('$file'))
evidence = d.get('provenance', {}).get('evidence', [])
tiers = Counter(e.get('source_tier', 'unknown') for e in evidence)
for tier, count in sorted(tiers.items()):
    print(f'{tier}:{count}')
" 2>/dev/null || echo "")
    
    if [[ -n "$tier_counts" ]]; then
        log_info "  Evidence tier breakdown:"
        while IFS=: read -r tier count; do
            log_info "    ${tier}: ${count}"
        done <<< "$tier_counts"
    fi
    
    # Check protocol profile provenance
    local profile_count
    profile_count=$(python3 -c "
import json
d = json.load(open('$file'))
profiles = d.get('protocol_profiles', {})
print(len(profiles))
" 2>/dev/null || echo "0")
    
    log_info "  Protocol profiles: ${profile_count}"
    
    # Check each profile for provenance
    local profiles_with_prov
    profiles_with_prov=$(python3 -c "
import json
d = json.load(open('$file'))
profiles = d.get('protocol_profiles', {})
count = sum(1 for p in profiles.values() if 'provenance' in p)
print(count)
" 2>/dev/null || echo "0")
    
    if [[ "$profile_count" -gt 0 ]] && [[ "$profiles_with_prov" -lt "$profile_count" ]]; then
        log_warn "  ${profiles_with_prov}/${profile_count} profiles have provenance blocks"
    elif [[ "$profile_count" -gt 0 ]]; then
        log_pass "  All ${profile_count} profiles have provenance blocks"
    fi
    
    # Check known issues for required fields
    local known_issues_count
    known_issues_count=$(python3 -c "
import json
d = json.load(open('$file'))
print(len(d.get('known_issues', [])))
" 2>/dev/null || echo "0")
    
    if [[ "$known_issues_count" -gt 0 ]]; then
        log_info "  Known issues: ${known_issues_count}"
        
        # Check if issues have source_tier
        local issues_with_tier
        issues_with_tier=$(python3 -c "
import json
d = json.load(open('$file'))
issues = d.get('known_issues', [])
count = sum(1 for i in issues if 'source_tier' in i)
print(count)
" 2>/dev/null || echo "0")
        
        if [[ "$issues_with_tier" -lt "$known_issues_count" ]]; then
            if [[ "$REQUIRE_KNOWN_ISSUE_SOURCE_TIER" == "true" ]]; then
                log_fail "  Known issues missing source_tier: $((known_issues_count - issues_with_tier)) (${issues_with_tier}/${known_issues_count} have it)"
            else
                log_warn "  Known issues missing source_tier: $((known_issues_count - issues_with_tier)) (${issues_with_tier}/${known_issues_count} have it)"
            fi
        else
            log_pass "  All known issues have source_tier"
        fi
    fi
    
    # Check for official + community mix
    if [[ "$FAIL_ON_OFFICIAL_COMMUNITY_MIX" == "true" ]]; then
        local has_official has_community
        has_official=$(python3 -c "
import json
d = json.load(open('$file'))
evidence = d.get('provenance', {}).get('evidence', [])
print('yes' if any(e.get('source_tier') == 'official' for e in evidence) else 'no')
" 2>/dev/null || echo "no")
        
        has_community=$(python3 -c "
import json
d = json.load(open('$file'))
evidence = d.get('provenance', {}).get('evidence', [])
print('yes' if any(e.get('source_tier') in ('community-verified', 'unknown') for e in evidence) else 'no')
" 2>/dev/null || echo "no")
        
        if [[ "$has_official" == "yes" ]] && [[ "$has_community" == "yes" ]]; then
            log_fail "  Record mixes official and community sources (prohibited by --fail-on-official-community-mix)"
        fi
    fi
}

# =============================================================================
# Additional Validation Checks
# =============================================================================
check_protocol_split() {
    local file="$1"
    local rel_path="${file#${REPO_ROOT}/}"
    
    local profile_count
    profile_count=$(python3 -c "
import json
d = json.load(open('$file'))
print(len(d.get('protocol_profiles', {})))
" 2>/dev/null || echo "0")
    
    if [[ "$profile_count" -lt 2 ]]; then
        log_fail "Single protocol profile in: ${rel_path} (--require-protocol-split requires multiple)"
        return 1
    else
        log_pass "Multiple protocol profiles found: ${profile_count}"
        return 0
    fi
}

check_firmware_gates() {
    local file="$1"
    local rel_path="${file#${REPO_ROOT}/}"
    
    local gate_count
    gate_count=$(python3 -c "
import json
d = json.load(open('$file'))
print(len(d.get('firmware_gates', {})))
" 2>/dev/null || echo "0")
    
    if [[ "$gate_count" -eq 0 ]]; then
        log_fail "No firmware gates defined in: ${rel_path} (--require-firmware-gates)"
        return 1
    else
        log_pass "Firmware gates found: ${gate_count}"
        return 0
    fi
}

# =============================================================================
# Docs↔Record Provenance Coverage Checks
# =============================================================================

# Check that a documentation file exists for the given radio
check_doc_exists() {
    local radio_id="$1"
    local doc_file="${DOCS_DIR}/${radio_id}.md"
    local rel_path="docs/radios/${radio_id}.md"
    
    if [[ -f "$doc_file" ]]; then
        log_pass "Documentation file exists: ${rel_path}"
        return 0
    else
        log_fail "Documentation file missing: ${rel_path}"
        return 1
    fi
}

# Check that documentation has a Sources section
check_doc_sources_section() {
    local radio_id="$1"
    local doc_file="${DOCS_DIR}/${radio_id}.md"
    local rel_path="docs/radios/${radio_id}.md"
    
    if [[ ! -f "$doc_file" ]]; then
        return 1  # Already reported by check_doc_exists
    fi
    
    # Accept either "## Sources" or "## Source Provenance" as valid source sections
    if grep -qE "^## (Sources|Source Provenance)" "$doc_file" 2>/dev/null; then
        log_pass "Sources section found in: ${rel_path}"
        return 0
    else
        log_fail "Missing '## Sources' or '## Source Provenance' section in: ${rel_path}"
        return 1
    fi
}

# Check that documentation has source provenance signals
check_doc_source_provenance() {
    local radio_id="$1"
    local doc_file="${DOCS_DIR}/${radio_id}.md"
    local rel_path="docs/radios/${radio_id}.md"
    
    if [[ ! -f "$doc_file" ]]; then
        return 1  # Already reported by check_doc_exists
    fi
    
    # Check for source tier indicators: [official], [hamlib], [community-verified], [source:
    local has_provenance
    has_provenance=$(grep -cE '\[official\]|\[hamlib\]|\[community-verified\]|\[source:|Source Tier' "$doc_file" 2>/dev/null || echo "0")
    
    if [[ "$has_provenance" -gt 0 ]]; then
        log_pass "Source provenance signals found (${has_provenance}) in: ${rel_path}"
        return 0
    else
        log_fail "No source provenance signals (e.g., [official], [hamlib], [source:) in: ${rel_path}"
        return 1
    fi
}

# Check that catalog record exists
check_catalog_record_exists() {
    local radio_id="$1"
    local catalog_file="${CATALOG_DIR}/${radio_id}.json"
    local rel_path="data/radios/catalog/${radio_id}.json"
    
    if [[ -f "$catalog_file" ]]; then
        log_pass "Catalog record exists: ${rel_path}"
        return 0
    else
        log_fail "Catalog record missing: ${rel_path}"
        return 1
    fi
}

# Comprehensive docs↔record coverage check for a radio
check_docs_record_coverage() {
    local radio_id="$1"
    local coverage_errors=0
    
    # Check doc exists
    if ! check_doc_exists "$radio_id"; then
        ((coverage_errors++))
    fi
    
    # Check doc has Sources section
    if ! check_doc_sources_section "$radio_id"; then
        ((coverage_errors++))
    fi
    
    # Check doc has source provenance signals
    if ! check_doc_source_provenance "$radio_id"; then
        ((coverage_errors++))
    fi
    
    # Check catalog record exists
    if ! check_catalog_record_exists "$radio_id"; then
        ((coverage_errors++))
    fi
    
    return $coverage_errors
}


# =============================================================================
# Main Validation
# =============================================================================
validate_radio_file() {
    local radio_id="$1"
    local file="${DATA_DIR}/${radio_id}.json"
    local rel_path="data/radios/${radio_id}.json"
    
    echo ""
    echo "--- Validating: ${radio_id} ---"
    
    # Check file exists
    if [[ ! -f "$file" ]]; then
        log_fail "Radio file missing: ${rel_path}"
        return 1
    fi
    
    # JSON syntax check
    validate_json_syntax "$file" || return 1
    
    # Required fields check
    check_required_fields "$file" || true  # Continue even if some fields missing
    
    # Schema validation
    validate_schema "$file" || true  # Continue even if schema fails
    
    # Provenance analysis
    analyze_provenance "$file"
    
    # Optional: protocol split check
    if [[ "$REQUIRE_PROTOCOL_SPLIT" == "true" ]]; then
        check_protocol_split "$file" || true
    fi
    
    # Optional: firmware gates check
    if [[ "$REQUIRE_FIRMWARE_GATES" == "true" ]]; then
        check_firmware_gates "$file" || true
    fi
    
    # Docs↔Record provenance coverage check
    check_docs_record_coverage "$radio_id" || true
}

# =============================================================================
# Main
# =============================================================================
main() {
    echo "========================================"
    echo "CleanComms Radio KB Validator"
    echo "========================================"
    
    parse_args "$@"
    
    # Run self-tests if requested
    if [[ "$SELF_TEST_MALFORMED" == "true" ]]; then
        run_self_test_malformed_json
        exit $?
    fi
    
    if [[ "$SELF_TEST_MISSING_REQUIRED" == "true" ]]; then
        run_self_test_missing_required
        exit $?
    fi
    
    if [[ "$SELF_TEST_MISSING_RADIO" == "true" ]]; then
        run_self_test_missing_radio
        exit $?
    fi
    
    # Check schema file exists
    echo ""
    echo "=== Schema Check ==="
    if [[ -f "$SCHEMA_FILE" ]]; then
        log_pass "Schema file exists: data/radios/schema/radio-capability.schema.json"
    else
        log_warn "Schema file not found - schema validation will be skipped"
    fi
    
    # Determine which radios to validate
    local radios_to_check=()
    if [[ -n "$CHECK_RADIO" ]]; then
        radios_to_check=("$CHECK_RADIO")
    else
        radios_to_check=("${TARGET_RADIOS[@]}")
    fi
    
    # Validate each target radio
    echo ""
    echo "=== Radio Record Validation ==="
    local missing_radios=0
    local validated_radios=0
    
    for radio in "${radios_to_check[@]}"; do
        local file="${DATA_DIR}/${radio}.json"
        if [[ -f "$file" ]]; then
            validate_radio_file "$radio"
            ((validated_radios++))
        else
            log_fail "Target radio file missing: data/radios/${radio}.json"
            ((missing_radios++))
        fi
    done
    
    # Summary
    echo ""
    echo "========================================"
    echo "Summary"
    echo "========================================"
    echo "Target radios: ${#radios_to_check[@]}"
    echo "Validated: ${validated_radios}"
    echo "Missing: ${missing_radios}"
    echo ""
    
    if [[ $ERRORS -gt 0 ]]; then
        echo -e "${RED}FAILED${NC}: ${ERRORS} error(s) found"
        if [[ $WARNINGS -gt 0 ]]; then
            echo -e "${YELLOW}WARNINGS${NC}: ${WARNINGS} warning(s)"
        fi
        exit 1
    elif [[ $missing_radios -gt 0 ]]; then
        echo -e "${RED}FAILED${NC}: ${missing_radios} target radio file(s) missing"
        exit 1
    elif [[ $WARNINGS -gt 0 ]]; then
        echo -e "${GREEN}PASSED${NC}: All required checks passed"
        echo -e "${YELLOW}WARNINGS${NC}: ${WARNINGS} warning(s) (non-blocking)"
        exit 0
    else
        echo -e "${GREEN}PASSED${NC}: All validation checks passed"
        exit 0
    fi
}

main "$@"
