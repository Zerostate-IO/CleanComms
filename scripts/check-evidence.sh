#!/bin/bash
#
# Evidence Checklist Script for TX-500 DigiRig fldigi Vertical Slice
# Checks all expected evidence files from tasks 1-11
#
# Exit codes:
#   0 - All required evidence files found and non-empty
#   1 - One or more evidence files missing or empty
#
# Usage:
#   bash scripts/check-evidence.sh
#   bash scripts/check-evidence.sh --verbose
#

set -e

EVIDENCE_DIR=".sisyphus/evidence"
VERBOSE=false

if [[ "$1" == "--verbose" || "$1" == "-v" ]]; then
    VERBOSE=true
fi

# Expected evidence files for TX-500 vertical slice (tasks 1-11)
# Format: "task_number:evidence_file:description"
EXPECTED_EVIDENCE=(
    "1:task-1-go-scaffold.txt:Go scaffold happy path"
    "1:task-1-go-scaffold-error.txt:Go scaffold error case"
    "2:task-2-rigctld-client.txt:rigctld client happy path"
    "2:task-2-rigctld-client-error.txt:rigctld client error case"
    "3:task-3-fldigi-client.txt:fldigi client happy path"
    "3:task-3-fldigi-client-error.txt:fldigi client error case"
    "4:task-4-daemon-api.txt:daemon API happy path"
    "4:task-4-daemon-api-error.txt:daemon API error case"
    "5:task-5-rig-service.txt:rig service happy path"
    "5:task-5-rig-service-error.txt:rig service error case"
    "6:task-6-modem-service.txt:modem service happy path"
    "6:task-6-modem-service-error.txt:modem service error case"
    "7:task-7-macos-runbook.txt:macOS runbook happy path"
    "7:task-7-macos-runbook-error.txt:macOS runbook error case"
    "8:task-8-api-contract-tests.txt:API contract tests happy path"
    "8:task-8-api-contract-tests-error.txt:API contract tests error case"
    "9:task-9-ptt-watchdog.txt:PTT watchdog happy path"
    "9:task-9-ptt-watchdog-error.txt:PTT watchdog error case"
    "10:task-10-smoke-script.txt:smoke script happy path"
    "10:task-10-smoke-script-error.txt:smoke script error case"
    "11:task-11-evidence-pack.txt:evidence pack checklist"
)

found_count=0
missing_count=0
empty_count=0

echo "=========================================="
echo "TX-500 Vertical Slice Evidence Checklist"
echo "Timestamp: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
echo "=========================================="
echo ""

for entry in "${EXPECTED_EVIDENCE[@]}"; do
    IFS=':' read -r task file desc <<< "$entry"
    filepath="$EVIDENCE_DIR/$file"
    
    if [[ -f "$filepath" ]]; then
        size=$(wc -c < "$filepath" | tr -d ' ')
        if [[ "$size" -gt 0 ]]; then
            echo "[FOUND] Task $task: $file ($size bytes)"
            if $VERBOSE; then
                echo "        Description: $desc"
                echo "        First line: $(head -1 "$filepath" | cut -c1-60)"
            fi
            ((found_count++))
        else
            echo "[EMPTY] Task $task: $file (0 bytes)"
            ((empty_count++))
        fi
    else
        echo "[MISSING] Task $task: $file"
        if $VERBOSE; then
            echo "          Description: $desc"
        fi
        ((missing_count++))
    fi
done

echo ""
echo "=========================================="
echo "Summary"
echo "=========================================="
echo "Total expected: ${#EXPECTED_EVIDENCE[@]}"
echo "Found: $found_count"
echo "Empty: $empty_count"
echo "Missing: $missing_count"
echo ""

total_issues=$((missing_count + empty_count))
if [[ $total_issues -eq 0 ]]; then
    echo "PASS: All evidence files present and non-empty"
    exit 0
else
    echo "FAIL: $total_issues evidence file(s) missing or empty"
    exit 1
fi
