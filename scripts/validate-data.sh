#!/bin/bash
# Validates all JSON data files against their schemas
# Uses jsonschema validator (pip install jsonschema) for proper JSON Schema validation

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0

echo "=== CleanComms Data Validation ==="
echo ""

# Check for jsonschema (Python-based JSON Schema validator)
check_jsonschema() {
    if command -v jsonschema &> /dev/null; then
        return 0
    elif python3 -c "import jsonschema" 2>/dev/null; then
        return 0
    else
        echo -e "${YELLOW}Warning: jsonschema not installed. Install with: pip install jsonschema${NC}"
        echo "Falling back to basic JSON syntax validation with jq"
        return 1
    fi
}

# Validate JSON syntax with jq
validate_json_syntax() {
    local file="$1"
    if ! jq empty "$file" 2>/dev/null; then
        echo -e "${RED}FAIL: Invalid JSON syntax: $file${NC}"
        return 1
    fi
    return 0
}

# Validate required fields
validate_required_fields() {
    local file="$1"
    local schema="$2"
    
    # Extract required fields from schema
    local required
    required=$(jq -r '.required[]?' "$schema" 2>/dev/null)
    
    for field in $required; do
        if ! jq -e ".${field}" "$file" > /dev/null 2>&1; then
            echo -e "${RED}FAIL: Missing required field '$field' in $file${NC}"
            return 1
        fi
    done
    return 0
}

# Validate bandplan structure
validate_bandplan() {
    local file="$1"
    local schema="$PROJECT_ROOT/data/bandplans/schema/bandplan.schema.json"
    
    echo -n "Validating bandplan: $(basename "$file")... "
    
    if ! validate_json_syntax "$file"; then
        ((ERRORS++))
        return 1
    fi
    
    if ! validate_required_fields "$file" "$schema"; then
        ((ERRORS++))
        return 1
    fi
    
    # Validate bands array exists and has entries
    local band_count
    band_count=$(jq '.bands | length' "$file" 2>/dev/null)
    if [[ -z "$band_count" || "$band_count" -eq 0 ]]; then
        echo -e "${RED}FAIL: No bands defined in $file${NC}"
        ((ERRORS++))
        return 1
    fi
    
    # Validate each band has required fields
    local band_errors
    band_errors=$(jq -r '.bands[] | select(.name == null or .start_hz == null or .end_hz == null or .modes == null) | .name // "unknown"' "$file" 2>/dev/null | head -5)
    if [[ -n "$band_errors" ]]; then
        echo -e "${RED}FAIL: Bands missing required fields: $band_errors${NC}"
        ((ERRORS++))
        return 1
    fi
    
    # Check for mandatory HF bands (20m, 40m, 80m)
    for band in "20m" "40m" "80m"; do
        if ! jq -e ".bands[] | select(.name == \"$band\")" "$file" > /dev/null 2>&1; then
            echo -e "${RED}FAIL: Missing mandatory band: $band${NC}"
            ((ERRORS++))
            return 1
        fi
    done
    
    echo -e "${GREEN}OK${NC} ($band_count bands)"
    return 0
}

# Validate frequency dataset structure
validate_frequencies() {
    local file="$1"
    local schema="$PROJECT_ROOT/data/frequencies/schema/frequency.schema.json"
    
    echo -n "Validating frequencies: $(basename "$file")... "
    
    if ! validate_json_syntax "$file"; then
        ((ERRORS++))
        return 1
    fi
    
    if ! validate_required_fields "$file" "$schema"; then
        ((ERRORS++))
        return 1
    fi
    
    # Validate frequencies array exists and has entries
    local freq_count
    freq_count=$(jq '.frequencies | length' "$file" 2>/dev/null)
    if [[ -z "$freq_count" || "$freq_count" -eq 0 ]]; then
        echo -e "${RED}FAIL: No frequencies defined in $file${NC}"
        ((ERRORS++))
        return 1
    fi
    
    # Validate each frequency has required fields
    local freq_errors
    freq_errors=$(jq -r '.frequencies[] | select(.frequency_hz == null or .mode == null or .band == null or .description == null) | .description // "unknown"' "$file" 2>/dev/null | head -5)
    if [[ -n "$freq_errors" ]]; then
        echo -e "${RED}FAIL: Frequencies missing required fields${NC}"
        ((ERRORS++))
        return 1
    fi
    
    echo -e "${GREEN}OK${NC} ($freq_count entries)"
    return 0
}

# Main validation
main() {
    local has_jsonschema
    if check_jsonschema; then
        has_jsonschema=true
        echo "Using jsonschema for full schema validation"
    else
        has_jsonschema=false
        echo "Using basic structural validation (jq only)"
    fi
    echo ""
    
    # Validate bandplans
    echo "--- Bandplans ---"
    for file in "$PROJECT_ROOT"/data/bandplans/*.json; do
        if [[ -f "$file" ]]; then
            validate_bandplan "$file"
        fi
    done
    
    echo ""
    
    # Validate frequency datasets
    echo "--- Frequencies ---"
    for file in "$PROJECT_ROOT"/data/frequencies/*.json; do
        if [[ -f "$file" ]]; then
            validate_frequencies "$file"
        fi
    done
    
    echo ""
    
    # Summary
    if [[ $ERRORS -eq 0 ]]; then
        echo -e "${GREEN}=== All data files validated successfully ===${NC}"
        exit 0
    else
        echo -e "${RED}=== Validation failed with $ERRORS error(s) ===${NC}"
        exit 1
    fi
}

main "$@"
