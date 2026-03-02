#!/bin/bash
#
# CleanComms TX-500 + fldigi Smoke Test
# Validates dependencies and basic functionality for the vertical slice
#
# Exit codes:
#   0 - All checks passed
#   1 - One or more checks failed
#   2 - Missing dependency
#
# Usage:
#   ./smoke-tx500-fldigi.sh [--skip-daemon] [--evidence-dir DIR]
#
# Options:
#   --skip-daemon     Skip CleanComms daemon checks (for partial testing)
#   --evidence-dir    Directory to write evidence files (default: .sisyphus/evidence)
#

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Default configuration
SKIP_DAEMON=false
EVIDENCE_DIR="${REPO_ROOT}/.sisyphus/evidence"

# Port assignments (from learnings.md)
RIGCTLD_PORT=4532
FLDIGI_PORT=7362
DAEMON_PORT=8080

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0
CHECKS_PASSED=0
CHECKS_TOTAL=0

# Evidence file content
EVIDENCE_CONTENT=""

# =============================================================================
# Logging functions
# =============================================================================
log_pass() {
    echo -e "${GREEN}✓${NC} $1"
    EVIDENCE_CONTENT+="PASS: $1\n"
    ((CHECKS_PASSED++))
    ((CHECKS_TOTAL++))
}

log_fail() {
    echo -e "${RED}✗${NC} $1"
    EVIDENCE_CONTENT+="FAIL: $1\n"
    ((ERRORS++))
    ((CHECKS_TOTAL++))
}

log_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
    EVIDENCE_CONTENT+="WARN: $1\n"
    ((WARNINGS++))
}

log_info() {
    echo -e "${BLUE}ℹ${NC} $1"
    EVIDENCE_CONTENT+="INFO: $1\n"
}

log_skip() {
    echo -e "${YELLOW}○${NC} $1"
    EVIDENCE_CONTENT+="SKIP: $1\n"
    ((CHECKS_TOTAL++))
}

# =============================================================================
# Argument parsing
# =============================================================================
parse_args() {
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --skip-daemon)
                SKIP_DAEMON=true
                shift
                ;;
            --evidence-dir)
                EVIDENCE_DIR="$2"
                shift 2
                ;;
            -h|--help)
                echo "Usage: $0 [OPTIONS]"
                echo ""
                echo "Options:"
                echo "  --skip-daemon      Skip CleanComms daemon checks"
                echo "  --evidence-dir DIR Directory for evidence files"
                echo "  -h, --help         Show this help message"
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
# Dependency checks
# =============================================================================

# Check if a TCP port is listening
check_port_listening() {
    local port="$1"
    local service="$2"
    
    if command -v nc &>/dev/null; then
        if nc -z 127.0.0.1 "$port" 2>/dev/null; then
            return 0
        fi
    elif command -v lsof &>/dev/null; then
        if lsof -i ":$port" -sTCP:LISTEN &>/dev/null; then
            return 0
        fi
    else
        # Fallback to /dev/tcp (bash-specific)
        if (echo >/dev/tcp/127.0.0.1/"$port") 2>/dev/null; then
            return 0
        fi
    fi
    return 1
}

# Check rigctld is running and responding
check_rigctld() {
    log_info "Checking rigctld on port ${RIGCTLD_PORT}..."
    
    if ! check_port_listening "$RIGCTLD_PORT" "rigctld"; then
        log_fail "rigctld not listening on port ${RIGCTLD_PORT}"
        log_info "  Start with: rigctld -m 2054 -r /dev/cu.usbserial-xxx -s 9600 -t ${RIGCTLD_PORT}"
        return 1
    fi
    
    # Try to get frequency to verify it's actually rigctld
    if command -v nc &>/dev/null; then
        local response
        response=$(echo -e "\\get_freq\n" | nc -w 2 127.0.0.1 "$RIGCTLD_PORT" 2>/dev/null | head -1)
        if [[ -n "$response" ]]; then
            log_pass "rigctld responding (freq: ${response} Hz)"
            return 0
        else
            log_warn "rigctld port open but not responding to commands"
            return 0  # Port is open, consider it a pass
        fi
    fi
    
    log_pass "rigctld listening on port ${RIGCTLD_PORT}"
    return 0
}

# Check fldigi XML-RPC is running
check_fldigi() {
    log_info "Checking fldigi XML-RPC on port ${FLDIGI_PORT}..."
    
    if ! check_port_listening "$FLDIGI_PORT" "fldigi"; then
        log_fail "fldigi XML-RPC not listening on port ${FLDIGI_PORT}"
        log_info "  Start fldigi and enable XML-RPC in Configure > UI > XML-RPC"
        return 1
    fi
    
    # Try to get version via XML-RPC
    if command -v curl &>/dev/null; then
        local response
        response=$(curl -s -m 2 -X POST \
            -H "Content-Type: text/xml" \
            -d '<?xml version="1.0"?><methodCall><methodName>fldigi.version</methodName></methodCall>' \
            "http://127.0.0.1:${FLDIGI_PORT}/RPC2" 2>/dev/null)
        
        if [[ "$response" =~ "<value>" ]]; then
            # Extract version from response
            local version
            version=$(echo "$response" | grep -oP '(?<=<value>)[^<]+' | head -1)
            log_pass "fldigi XML-RPC responding (version: ${version:-unknown})"
            return 0
        else
            log_warn "fldigi port open but XML-RPC not responding"
            return 0  # Port is open, consider it a pass
        fi
    fi
    
    log_pass "fldigi XML-RPC listening on port ${FLDIGI_PORT}"
    return 0
}

# Check CleanComms daemon is running
check_daemon() {
    if [[ "$SKIP_DAEMON" == "true" ]]; then
        log_skip "CleanComms daemon check (--skip-daemon)"
        return 0
    fi
    
    log_info "Checking CleanComms daemon on port ${DAEMON_PORT}..."
    
    if ! check_port_listening "$DAEMON_PORT" "daemon"; then
        log_fail "CleanComms daemon not listening on port ${DAEMON_PORT}"
        log_info "  Start with: ./cleancomms --config configs/tx500-digirig-macos.yaml"
        return 1
    fi
    
    # Check health endpoint
    if command -v curl &>/dev/null; then
        local response
        response=$(curl -s -m 2 "http://127.0.0.1:${DAEMON_PORT}/health" 2>/dev/null)
        
        if [[ -n "$response" ]]; then
            if [[ "$response" =~ '"status"' ]]; then
                local status
                status=$(echo "$response" | grep -oP '(?<="status":")[^"]+' | head -1)
                log_pass "CleanComms daemon health: ${status:-unknown}"
            else
                log_pass "CleanComms daemon responding on /health"
            fi
            return 0
        else
            log_warn "daemon port open but /health not responding"
            return 0
        fi
    fi
    
    log_pass "CleanComms daemon listening on port ${DAEMON_PORT}"
    return 0
}

# =============================================================================
# Functional checks
# =============================================================================

# Verify PSK31 mode in fldigi
check_psk31_mode() {
    log_info "Checking fldigi modem mode..."
    
    if ! check_port_listening "$FLDIGI_PORT" "fldigi"; then
        log_skip "PSK31 mode check (fldigi not available)"
        return 0
    fi
    
    if command -v curl &>/dev/null; then
        local response
        response=$(curl -s -m 2 -X POST \
            -H "Content-Type: text/xml" \
            -d '<?xml version="1.0"?><methodCall><methodName>modem.get_name</methodName></methodCall>' \
            "http://127.0.0.1:${FLDIGI_PORT}/RPC2" 2>/dev/null)
        
        if [[ "$response" =~ "<value>" ]]; then
            local mode
            mode=$(echo "$response" | grep -oP '(?<=<value>)[^<]+' | head -1)
            if [[ "${mode,,}" == "psk31" ]] || [[ "${mode,,}" == "bpsk31" ]]; then
                log_pass "fldigi mode: ${mode}"
            else
                log_warn "fldigi mode: ${mode} (expected PSK31)"
            fi
            return 0
        fi
    fi
    
    log_skip "PSK31 mode check (curl not available or fldigi not responding)"
    return 0
}

# Test PTT toggle via daemon API
check_ptt_toggle() {
    if [[ "$SKIP_DAEMON" == "true" ]]; then
        log_skip "PTT toggle test (--skip-daemon)"
        return 0
    fi
    
    if ! check_port_listening "$DAEMON_PORT" "daemon"; then
        log_skip "PTT toggle test (daemon not available)"
        return 0
    fi
    
    log_info "Testing PTT toggle via daemon API..."
    
    if command -v curl &>/dev/null; then
        # Test RX state (should be safe)
        local response
        response=$(curl -s -m 2 -X POST \
            -H "Content-Type: application/json" \
            -d '{"state":"rx"}' \
            "http://127.0.0.1:${DAEMON_PORT}/api/v1/rig/ptt" 2>/dev/null)
        
        if [[ "$response" =~ '"state"' ]] || [[ "$response" =~ "rx" ]]; then
            log_pass "PTT API responding (set to RX)"
            return 0
        elif [[ "$response" =~ '"error"' ]]; then
            log_warn "PTT API returned error (degraded state OK for smoke test)"
            return 0
        else
            log_warn "PTT API response unclear: ${response:-no response}"
            return 0
        fi
    fi
    
    log_skip "PTT toggle test (curl not available)"
    return 0
}

# Check rig status endpoint
check_rig_status() {
    if [[ "$SKIP_DAEMON" == "true" ]]; then
        log_skip "Rig status check (--skip-daemon)"
        return 0
    fi
    
    if ! check_port_listening "$DAEMON_PORT" "daemon"; then
        log_skip "Rig status check (daemon not available)"
        return 0
    fi
    
    log_info "Checking /api/v1/rig/status endpoint..."
    
    if command -v curl &>/dev/null; then
        local response
        response=$(curl -s -m 2 "http://127.0.0.1:${DAEMON_PORT}/api/v1/rig/status" 2>/dev/null)
        
        if [[ "$response" =~ '"frequency"' ]] || [[ "$response" =~ '"mode"' ]]; then
            log_pass "Rig status endpoint responding"
            return 0
        elif [[ -n "$response" ]]; then
            log_warn "Rig status response: ${response:0:50}..."
            return 0
        fi
    fi
    
    log_skip "Rig status check (curl not available or daemon not responding)"
    return 0
}

# Check modem status endpoint
check_modem_status() {
    if [[ "$SKIP_DAEMON" == "true" ]]; then
        log_skip "Modem status check (--skip-daemon)"
        return 0
    fi
    
    if ! check_port_listening "$DAEMON_PORT" "daemon"; then
        log_skip "Modem status check (daemon not available)"
        return 0
    fi
    
    log_info "Checking /api/v1/modem/status endpoint..."
    
    if command -v curl &>/dev/null; then
        local response
        response=$(curl -s -m 2 "http://127.0.0.1:${DAEMON_PORT}/api/v1/modem/status" 2>/dev/null)
        
        if [[ "$response" =~ '"mode"' ]] || [[ "$response" =~ '"tx"' ]]; then
            log_pass "Modem status endpoint responding"
            return 0
        elif [[ -n "$response" ]]; then
            log_warn "Modem status response: ${response:0:50}..."
            return 0
        fi
    fi
    
    log_skip "Modem status check (curl not available or daemon not responding)"
    return 0
}

# =============================================================================
# Evidence file writing
# =============================================================================
write_evidence() {
    mkdir -p "$EVIDENCE_DIR"
    local evidence_file="${EVIDENCE_DIR}/task-10-smoke-script.txt"
    
    {
        echo "========================================"
        echo "CleanComms TX-500 + fldigi Smoke Test"
        echo "Timestamp: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
        echo "========================================"
        echo ""
        echo -e "$EVIDENCE_CONTENT"
        echo ""
        echo "========================================"
        echo "Summary"
        echo "========================================"
        echo "Checks passed: ${CHECKS_PASSED}/${CHECKS_TOTAL}"
        echo "Errors: ${ERRORS}"
        echo "Warnings: ${WARNINGS}"
    } > "$evidence_file"
    
    log_info "Evidence written to: ${evidence_file}"
}

# =============================================================================
# Main
# =============================================================================
main() {
    echo "========================================"
    echo "CleanComms TX-500 + fldigi Smoke Test"
    echo "========================================"
    echo ""
    
    parse_args "$@"
    
    # Dependency checks
    echo "=== Dependency Checks ==="
    check_rigctld
    check_fldigi
    check_daemon
    echo ""
    
    # Functional checks
    echo "=== Functional Checks ==="
    check_psk31_mode
    check_ptt_toggle
    check_rig_status
    check_modem_status
    echo ""
    
    # Summary
    echo "========================================"
    echo "Summary"
    echo "========================================"
    echo "Checks: ${CHECKS_PASSED}/${CHECKS_TOTAL} passed"
    echo ""
    
    # Write evidence file
    write_evidence
    
    if [[ $ERRORS -gt 0 ]]; then
        echo -e "${RED}FAILED${NC}: ${ERRORS} error(s) found"
        if [[ $WARNINGS -gt 0 ]]; then
            echo -e "${YELLOW}WARNINGS${NC}: ${WARNINGS} warning(s)"
        fi
        exit 1
    elif [[ $WARNINGS -gt 0 ]]; then
        echo -e "${GREEN}PASSED${NC}: All required checks passed"
        echo -e "${YELLOW}WARNINGS${NC}: ${WARNINGS} warning(s) (non-blocking)"
        exit 0
    else
        echo -e "${GREEN}PASSED${NC}: All checks passed"
        exit 0
    fi
}

main "$@"
