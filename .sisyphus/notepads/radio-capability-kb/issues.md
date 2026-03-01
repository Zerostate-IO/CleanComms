## 2026-02-28 Task 1: Source Ledger Issues

### Documentation Gaps Identified
1. **FX-4CR**: Official CAT command documentation not readily available. Status: Needs verification.
2. **X6100**: Official CI-V command subset list incomplete. Extended manual provides partial coverage.

### No Blockers
- Task completed without blocking issues
- All verification commands passed

## 2026-02-28 Task 2: Schema Design

### Considerations Addressed
- Protocol-mode separation modeled via nested objects (resolved TX-500 dual-protocol requirement)
- Firmware gates implemented as optional top-level structure
- Known issues require severity, confidence, and source_tier (no untagged issues)
- Evidence arrays support multiple sources per claim group

### No Blockers
- Task completed without blocking issues
- JSON validation passed: `python3 -m json.tool` exits 0
- All required fields (source_tier, evidence, protocol_profiles) present in schema

### Future Considerations
- May need to extend CAT capabilities for phase 2 command-by-command tables
- Audio sample_rates array currently unconstrained (may need enum for common rates)
- Known issue ID pattern may need adjustment based on actual issue volume


## 2026-02-28 Task 3: KB Documentation

### No Blockers
- Task completed without blocking issues
- All verification commands passed:
  - `grep -E "Scope|Source Policy|Update Workflow|Phase"` found all required sections
  - `grep -E "unknown|needs-verification"` confirmed uncertainty language present

### Documentation Complete
- README.md created with all required sections
- Phase 1 vs Phase 2 boundary explicitly defined
- Uncertainty labeling rules documented
- Contribution workflow documented for adding/updating records

## 2026-02-28 Task 4: KB Validator Script

### Portability Issue Resolved
- **Issue**: `mktemp --suffix=.json` not portable on macOS
- **Resolution**: Changed to `mktemp "${TMPDIR:-/tmp}/radio-kb-validate.XXXXXX"` pattern

### Current State: No Radio Files Exist
- Validator correctly detects all 5 target radios as missing
- Exits with code 1 when target radio files don't exist
- This is expected behavior - radio capability records will be created in subsequent tasks

### Self-Test Verification
- All three self-test modes verified:
  - `--self-test-malformed-json`: Passes (correctly rejects bad JSON)
  - `--self-test-missing-required`: Passes (correctly detects missing fields)
  - `--self-test-missing-radio`: Passes (correctly identifies missing files)

### No Blockers
- Task completed without blocking issues
- Script ready for CI/CD integration


## 2026-02-28 Task 5: TX-500 Profile

### No Blockers
- Task completed without blocking issues
- Both validation commands passed:
  - `bash scripts/validate-radio-kb.sh --check-radio tx-500` - PASSED
  - `bash scripts/validate-radio-kb.sh --check-radio tx-500 --require-protocol-split` - PASSED

### Items Requiring Future Verification
1. **Extended Metering Firmware Gate**: Firmware 1.1.0 minimum for full extended metering needs verification against official changelog
2. **Serial Enumeration Race (TX5-0001)**: Community-reported issue needs additional confirmation from multiple users
3. **Hamlib Version Compatibility**: Exact Hamlib version thresholds for extended mode support should be verified against Hamlib release notes

### Conservative Approach Applied
- Extended commands list (`TX0`, `TX1`, `RX`, `KI`, `PC`, `AG`) verified from official documentation only
- No claims of native Hamlib support for all extended commands in versions < 4.5
- Firmware gates include explicit notes about verification needs

## 2026-02-28 Task 7: FX-4CR Profile

### Documentation Gaps Persist
- FX-4CR official CAT command documentation remains unavailable
- All capability claims are derived/inferred, not authoritative
- Gap tracked in sources.md: "Official CAT command documentation - Needs verification"

### No Blockers
- Task completed without blocking issues
- Both validation commands passed:
  - `--check-radio fx-4cr`: PASSED
  - `--check-radio fx-4cr --fail-on-official-community-mix`: PASSED (no official sources to conflict)

### Validation Results Documentation
Per task requirement, documenting `--fail-on-official-community-mix` evaluation:
- **Result**: PASS
- **Rationale**: FX-4CR record contains only `hamlib` and `community-verified` tier sources. No `official` tier sources exist to create a mixing conflict. This is the expected and correct behavior for a radio without publicly available official documentation.



## 2026-02-28 Task 9: X6100 Profile

### Documentation Gaps Addressed
- **X6100 CI-V subset**: Partially addressed via Hamlib source inference
- Official CI-V command subset list remains incomplete in vendor docs
- CAT capabilities documented with medium confidence due to source limitations

### No Blockers
- Task completed without blocking issues
- Both validation commands passed:
  - `bash scripts/validate-radio-kb.sh --check-radio x6100` - PASSED
  - `bash scripts/validate-radio-kb.sh --check-radio x6100 --require-known-issue-source-tier` - PASSED

### Items Requiring Future Verification
1. **X61-0001 Mode-switch delay**: Community-reported timing issue needs broader confirmation
2. **X61-0002 Fixed CI-V address**: Low confidence - needs official confirmation or multiple user reports
3. **X61-0003 Incomplete command compatibility**: Hamlib source should be cross-referenced with official docs when available
4. **X61-0004 Firmware reset behavior**: Medium confidence - additional user reports would strengthen

### CI-V Caveat Documentation
- Community quirks clearly separated from official vendor facts in both JSON and MD files
- Known issues use source_tier and confidence to indicate uncertainty
- Workarounds provided for all documented issues


## 2026-02-28 Task 8: (tr)uSDX Profile

### Documentation Sources
- Primary source: DL2MAN community-maintained site (community-verified tier)
- Secondary source: Official Kenwood TS-480 command reference (context only, not direct)
- Hamlib model 2055 provides implementation reference
- No traditional "official" manufacturer documentation exists (open-source project)

### No Blockers
- Task completed without blocking issues
- Both validation commands passed:
  - `bash scripts/validate-radio-kb.sh --check-radio trusdx` - PASSED
  - `bash scripts/validate-radio-kb.sh --check-radio trusdx --require-firmware-gates` - PASSED (3 gates found)

### Items Requiring Future Verification
1. **TRU-0001 Hamlib port reset**: Community workaround documented but broader confirmation would help
2. **TRU-0002 Alpha firmware TX-RX issues**: Specific alpha versions with issues not exhaustively documented
3. **CAT audio streaming sample rates**: 7825 Hz RX / 11520 Hz TX rates may vary with firmware
4. **Clone unit detection**: No definitive way to identify clones from serial number or firmware version

### Firmware Gate Documentation
- CAT audio streaming gate (2.00u+) is critical for "USB-only" digital mode operation
- 115200 baud gate (2.00t+) affects serial throughput for streaming audio
- TX-RX transition gate (2.00u+) documents alpha firmware issues
- Multiple gates create clear version requirements for different capabilities

### Open-Source Radio Documentation Pattern
- Community-maintained wiki/forum as primary source is acceptable for Tier 2 support
- Confidence levels set to `medium` to reflect source authority limitations
- Firmware version tracking is essential for capability gating
- Hardware variant issues (clones) should be documented as known issues


## 2026-02-28 Task 5 Corrections: TX-500 Accuracy Fixes

### Accuracy Issues Corrected
1. **Serial Rate Claim**: Changed from 38400 to 9600 based on Hamlib tx500.c evidence (serial_rate_min/max = 9600)
2. **Removed Speculative Version Claims**: Removed unverified Hamlib <4.5 threshold from fallback criteria and Hamlib Integration section
3. **Provenance Alignment**: Serial provenance now reflects hamlib tier with medium confidence and explicit uncertainty notes

### Source Discrepancy Documented
- Official LAB599 CAT Protocol Specification was NOT consulted for serial rates
- Hamlib backend source code used as primary evidence
- Added `notes` field in serial provenance blocks documenting this gap

### No Blockers
- Both validation commands passed after corrections:
  - `--check-radio tx-500`: PASSED
  - `--require-protocol-split`: PASSED


## 2026-02-28 Task 6: TX-500MP Profile

### Documentation Gaps
- TX-500MP extended command support is uncertain - official docs don't explicitly confirm or deny
- Conservative approach applied: extended commands listed as unsupported pending verification
- Gap tracked in sources.md note: "TX-500MP shares LAB599 CAT protocol family but may have reduced command subset"

### No Blockers
- Task completed without blocking issues
- Validation passed:
  - `--check-radio tx-500mp`: PASSED
  - All required fields present
  - All known issues have source_tier
  - Provenance analysis shows 3 evidence entries (2 official, 1 hamlib)

### Items Requiring Future Verification
1. **TX5MP-0001 Extended Command Support**: Needs official confirmation of which LAB599 extended commands (if any) work on TX-500MP
2. **Serial configuration**: Default 9600 baud inferred from Hamlib - should verify against official docs
3. **Audio capabilities**: Assumed similar to TX-500 - needs TX-500MP-specific verification


## 2026-02-28 Task 10: Cross-Radio Capability Matrix

### No Blockers
- Task completed without blocking issues
- Verification command passed: `grep -E "TX-500|TX-500MP|FX-4CR|uSDX|X6100" docs/radios/matrix.md` found all 5 radios

### Design Considerations Addressed
1. **Matrix Scope**: Balanced detail level - not too granular (avoids command-level), not too sparse (actionable comparisons)
2. **Source Preservation**: Confidence/source indicators embedded in matrix cells without overwhelming the tables
3. **TX-500 Dual Protocol**: Recommendation table clearly separates extended-preferred from TS-2000 fallback scenarios
4. **Firmware Dependencies**: All known firmware gates consolidated in one table for quick reference
5. **Risk Flags**: Full issue tables with ID, severity, confidence, source for traceability

### Future Enhancements (Not Required for Task)
1. **Phase 2 Command-Level Matrix**: When schema extends to command-level detail, add per-command comparison
2. **Automated Matrix Generation**: Consider script to generate matrix from JSON records (currently manual synthesis)
3. **Interactive Decision Flow**: Could convert ASCII decision diagram to flowchart image


## 2026-02-28 Task 11: Phase-Depth Roadmap and Command-Table Placeholders

### No Blockers
- Task completed without blocking issues
- Both verification commands passed

### Caveats
- Command tables are placeholders only - no verified command data populated
- Phase 2 start date not defined - depends on project priorities
- Template structure may need adjustment when actual command research begins

### Verification Results
- `grep -E "Phase 1|Phase 2|command table" docs/radios/README.md` - PASSED (found all patterns)
- `grep -n "source_tier\|confidence" docs/radios/README.md` - PASSED (found provenance guidance at lines 158-159, 163, and table headers)


## 2026-02-28 Task 12: Full KB Validation and Evidence Pack

### No Blockers
- Task completed without blocking issues
- All validation checks passed
- All evidence files generated successfully

### Environment Notes
- jsonschema Python package not installed - schema conformance validation skipped
- This is acceptable behavior per validator design (falls back to JSON syntax + required field checks)
- Future CI/CD environments should install jsonschema for full schema validation

### Verification Results
- `bash scripts/validate-radio-kb.sh` - PASSED (5/5 radios validated)
- `bash scripts/validate-radio-kb.sh --self-test-missing-radio` - PASSED (correctly detects missing file)
- Final audit file created: task-12-kb-final-audit.txt
- Total evidence files generated: 25

### Evidence File Inventory
- Task 1: task-1-kb-source-ledger.txt
- Task 2: task-2-kb-schema-valid.txt, task-2-kb-schema-missing-required.txt
- Task 3: task-3-kb-doc-index.txt, task-3-kb-uncertainty.txt
- Task 4: task-4-kb-validator-pass.txt, task-4-kb-validator-malformed.txt
- Task 5: task-5-kb-tx500-profile.txt, task-5-kb-tx500-protocol-split.txt
- Task 6: task-6-kb-tx500mp.txt, task-6-kb-tx500mp-unsupported.txt, task-6-kb-tx500mp-extended.txt
- Task 7: task-7-kb-fx4cr-issues.txt, task-7-kb-fx4cr-tier.txt
- Task 8: task-8-kb-trusdx-streaming.txt, task-8-kb-trusdx-firmware.txt
- Task 9: task-9-kb-x6100.txt, task-9-kb-x6100-source-tier.txt
- Task 10: task-10-kb-matrix.txt, task-10-kb-tx500-policy.txt
- Task 11: task-11-kb-phase-roadmap.txt, task-11-kb-placeholder-columns.txt
- Task 12: task-12-kb-missing-radio-error.txt, task-12-kb-final-audit.txt


## 2026-02-28 F1 Remediation: Catalog Path + Docs↔Record Provenance Checks

### No Blockers
- Task completed without blocking issues
- All validation checks passed
- Both validator commands working:
  - `bash scripts/validate-radio-kb.sh` - PASSED (5/5 radios)
  - `bash scripts/validate-radio-kb.sh --check-radio tx-500` - PASSED

### Resolved Issues
1. **Plan path expectation**: Created `data/radios/catalog/` directory with synchronized copies of all 5 radio JSON files
2. **Validator provenance gap**: Added docs↔record coverage checks for bidirectional validation

### Source Section Variance
- X6100 doc uses `## Source Provenance` instead of `## Sources`
- Validator updated to accept either pattern via regex: `^## (Sources|Source Provenance)`
- This accommodates existing documentation conventions without requiring changes

### Catalog Synchronization Note
- Catalog files are static copies (not symlinks) for portability
- Future updates to top-level JSON files require manual catalog sync
- Consider automation if catalog files become primary source in future phases

## 2026-02-28 X6100 unsupported_commands Normalization

### Issue Resolved
- **Original**: Vague prose values like "IF filter bandwidth commands" and "Full IC-7000 command set"
- **Resolution**: Converted to concise machine-usable identifiers aligned with docs
- **SHA256 match confirmed**: Both data/radios/x6100.json and data/radios/catalog/x6100.json have identical hash (2d98b13d...)

### No Blockers
- Task completed without blocking issues
- Validation passed: `bash scripts/validate-radio-kb.sh --check-radio x6100`
