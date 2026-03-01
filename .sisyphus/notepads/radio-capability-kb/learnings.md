## 2026-02-28 Task 1: Source Ledger

### Patterns Established
- Four-tier provenance model: `official` > `hamlib` > `community-verified` > `unknown`
- Confidence levels tied to tier combinations and corroboration
- Source tagging format: `[source: tier] - description`

### Source Inventory by Radio
- **TX-500**: LAB599 official CAT protocol PDF + user manual + Hamlib backend
- **TX-500MP**: LAB599 official manual (shares CAT protocol family with TX-500)
- **FX-4CR**: BG2FX vendor site (limited docs) + Hamlib
- **(tr)uSDX**: DL2MAN community site + TS-480 Kenwood reference + Hamlib
- **X6100**: Radioddity-hosted extended manual + Hamlib

### Key Insights
- TX-500 dual-protocol importance: TS-2000 vs LAB599 extended modes require separate capability tracking
- (tr)uSDX CAT audio streaming is firmware-dependent
- X6100 uses CI-V/IC-7000 compatibility mode with known caveats
- FX-4CR has the most documentation gaps among target radios

## 2026-02-28 Task 2: Radio Capability Schema

### Schema Design Patterns
- Protocol profiles as nested objects keyed by profile name (e.g., `ts-2000`, `lab599-extended`)
- Each profile has independent capability blocks: serial, cat, ptt, audio
- Provenance blocks attached at multiple levels: record, profile, and capability group
- Evidence array pattern: each claim group can have multiple evidence sources

### Enum Constraints
- `source_tier`: official | hamlib | community-verified | unknown
- `confidence`: high | medium | low | needs-verification
- `severity`: critical | major | minor | cosmetic
- `support_tier`: 1 (Primary) | 2 (Community-Validated)

### Key Schema Structures
- `$defs` for reusable components (source_tier, confidence, provenance_block, evidence_entry)
- Firmware gates as optional top-level object with capability-specific constraints
- Known issues require all four fields: description, severity, source_tier, confidence
- Recommendations block supports preferred/fallback profile pattern for TX-500 dual-protocol

### Validation Approach
- `python3 -m json.tool` for basic JSON validity
- Schema uses JSON Schema Draft 2020-12 with `$defs` for modularity


## 2026-02-28 Task 3: KB Documentation Index

### Documentation Structure
- README.md serves as entry point for radio KB with four core sections: Scope, Source Policy, Update Workflow, Phase Depth
- Provenance hierarchy echoed from sources.md with normative vs non-normative claim distinction
- Phase boundary clearly defined: Phase 1 (capability flags) vs Phase 2 (command-level detail)

### Key Conventions Documented
- Uncertainty labels: `unknown`, `needs-verification`, `conflicting` - never leave uncertain data untagged
- Community claims require `confidence: "needs-verification"` or `confidence: "low"` tagging
- Validation commands documented for contributors (python3 -m json.tool + jsonschema)

### Cross-References Established
- Schema referenced as authoritative structure definition
- sources.md linked for authoritative source ledger
- CONTRIBUTING.md and repo-policies.md linked for general guidelines

## 2026-02-28 Task 4: KB Validator Script

### Validator Architecture
- Script location: `scripts/validate-radio-kb.sh`
- Fail-fast with clear error messages and color-coded output
- Python fallback for JSON parsing (portable, no external dependencies beyond stdlib)
- Optional jsonschema for full schema validation

### Target Radio List (Phase 1 Scope)
- tx-500, tx-500mp, fx-4cr, trusdx, x6100
- Enforced via `TARGET_RADIOS` array in script

### Validation Layers
1. **JSON Syntax**: `python3 -m json.tool` for basic parseability
2. **Required Fields**: Manual check for schema_version, identity, support_tier, protocol_profiles, provenance
3. **Schema Conformance**: Optional with `jsonschema` package
4. **Provenance Coverage**: Analyzes evidence tiers, profile provenance blocks, known issue source_tier

### Self-Test Flags for CI/CD QA
- `--self-test-malformed-json`: Exits 0 when malformed JSON correctly rejected
- `--self-test-missing-required`: Exits 0 when missing fields detected
- `--self-test-missing-radio`: Exits 0 when missing radio file detected

### Policy Enforcement Flags
- `--require-protocol-split`: Fails if radio has only one protocol profile
- `--require-firmware-gates`: Fails if no firmware gates defined
- `--require-known-issue-source-tier`: Fails if known issues lack source_tier
- `--fail-on-official-community-mix`: Fails if record mixes official + community sources

### Portability Notes
- Use `mktemp "${TMPDIR:-/tmp}/prefix.XXXXXX"` for macOS/Linux compatibility
- `--suffix` option not portable across mktemp implementations


## 2026-02-28 Task 5: TX-500 Profile

### Dual Protocol Implementation
- TX-500 is the first radio with dual protocol profiles (ts-2000 and lab599-extended)
- Recommendations block pattern: `preferred_profile`, `fallback_profile`, `fallback_criteria` array
- Extended profile includes additional CAT capabilities: filter_control, agc_control, power_control, extended metering

### Provenance Structure
- Record-level provenance with multiple evidence sources (official + hamlib)
- Profile-level provenance blocks for each protocol mode
- Capability-group provenance (serial, cat, ptt, audio) within each profile

### Known Issues Pattern
- Issue ID format: `{model-code-shorthand}-{sequence}` (e.g., TX5-0001)
- Community-verified issues tagged with `confidence: "medium"` and `source_tier: "community-verified"`
- Official issues tagged with `confidence: "high"` and `source_tier: "official"`

### Documentation Pairing
- Markdown file: Human-readable with tables, badges, and sections
- JSON file: Machine-readable with full provenance and capability data
- Both files should reference same sources and maintain consistency

### Validator Verification
- `--check-radio tx-500` validates basic structure
- `--require-protocol-split` validates dual-profile requirement
- Both commands must pass for complete validation

## 2026-02-28 Task 7: FX-4CR Profile

### Provenance Approach for Weakly-Documented Radios
- FX-4CR has no publicly available official CAT protocol specification
- Used conservative `hamlib` tier as primary source for top-level provenance
- Confidence levels intentionally set to `low` or `medium` (never `high` for capabilities)
- Community-verified sources used for PTT and audio capabilities

### Known Issue Risk Tagging Pattern
- All 5 known issues include required fields: `severity`, `confidence`, `source_tier`
- Severity distribution: 2 major, 3 minor
- Confidence distribution: 1 high (documentation gap itself), 2 medium, 2 low, 1 needs-verification
- Source tier distribution: 3 hamlib, 2 community-verified, 1 unknown
- Used `unknown` tier for unverified VFO control issue with `needs-verification` confidence

### Community Caveat Marking
- Markdown doc includes warning banner about limited official documentation
- Known issues section explicitly labeled as "Non-Normative"
- Each known issue table includes Source Tier column for transparency
- Confidence levels shown in capability tables

### Validator Behavior with --fail-on-official-community-mix
- FX-4CR record PASSES this check because it has NO `official` tier sources
- The flag only fails when a record mixes `official` WITH `community-verified`/`unknown`
- This is correct behavior for FX-4CR since official docs don't exist



## 2026-02-28 Task 9: X6100 Profile

### CI-V Compatibility Mode Pattern
- X6100 uses Icom CI-V protocol in IC-7000 compatibility mode
- Single protocol profile (no dual-protocol like TX-500)
- Official CI-V command subset is partial - requires inference from Hamlib source
- Community-verified issues are the primary source for quirks/caveats

### Known Issues Source Tagging
- All 4 known issues have source_tier and confidence fields
- Mix of hamlib and community-verified sources with appropriate confidence levels
- Issue IDs follow pattern: `X61-{sequence}` (4-character model prefix)

### Partial Documentation Handling
- Official documentation provides serial params and basic features
- CAT capabilities inferred from Hamlib backend (medium confidence)
- Community-verified issues have lower confidence but documented workarounds
- `unsupported_commands` array documents known gaps explicitly

### Firmware Gate Pattern
- Single firmware gate for USB audio stability (v1.1.8+)
- Firmware gates are optional but recommended for known version-specific issues

### Provenance at Multiple Levels
- Record-level provenance with hamlib tier (official source incomplete)
- Profile-level provenance with both official and hamlib evidence
- Capability-group provenance for serial, cat, ptt, audio blocks

### Validator Verification
- `--check-radio x6100` validates basic structure - PASSED
- `--require-known-issue-source-tier` validates source_tier requirement - PASSED
- No --require-protocol-split needed (single protocol is valid for X6100)


## 2026-02-28 Task 8: (tr)uSDX Profile

### TS-480 Protocol Emulation Pattern
- (tr)uSDX emulates Kenwood TS-480 CAT protocol (NOT TS-2000 like TX-500)
- Only a subset of TS-480 commands are supported - documented in `unsupported_commands` array
- Extended commands (UA0, UA1, UA2, US) are (tr)uSDX-specific for CAT audio streaming
- Single protocol profile (no dual-protocol like TX-500)

### CAT Audio Streaming Feature
- Unique capability: audio transmitted over same USB serial connection as CAT control
- No built-in USB sound card - audio must use CAT streaming or external audio interface
- Sample rates differ by direction: RX 7825 Hz, TX 11520 Hz
- 8-bit unsigned samples with 46 dB dynamic range
- Commands: UA0 (off), UA1 (on with speaker), UA2 (on without speaker)

### Firmware-Dependent Behavior
- Multiple firmware gates required for this radio:
  1. CAT audio streaming: 2.00u+
  2. 115200 baud rate: 2.00t+
  3. Reliable TX-RX transitions: 2.00u+ (alpha versions have issues)
- Serial configuration varies by firmware version (38400 vs 115200 baud)
- DTR must remain HIGH, RTS LOW on RX (may be HIGH for CW/PTT)

### Provenance for Open-Source Radios
- No traditional "official" manufacturer documentation
- DL2MAN site is primary community-maintained reference (community-verified tier)
- Official Kenwood TS-480 reference provides base protocol context
- Hamlib model 2055 provides implementation reference
- Confidence levels set to `medium` for capabilities (community sources)

### Known Issues Pattern
- Issue ID format: `TRU-{sequence}` (4-character prefix)
- 3 known issues documented with appropriate source_tier and confidence
- Hardware quality issue (TRU-0003) included due to prevalence of clone units
- Hamlib port reset issue (TRU-0001) has documented workaround

### Validator Verification
- `--check-radio trusdx` validates basic structure - PASSED
- `--require-firmware-gates` validates firmware gates - PASSED (3 gates found)
- `cat_audio_streaming: true` with firmware gates properly captures dependency


## 2026-02-28 Task 5 Corrections: TX-500 Accuracy Fixes

### Serial Rate Correction
- Original: Claimed default 38400 baud with multiple supported rates (4800-38400)
- Correction: Hamlib tx500.c backend shows serial_rate_min/max = 9600
- New values: default_baud = 9600, supported_baud_rates = [9600]
- Provenance: Changed from `official` tier to `hamlib` tier with `medium` confidence
- Added notes field explaining source discrepancy

### Speculative Claims Removed
- Removed unverified Hamlib version threshold (<4.5) from fallback_criteria
- Removed version compatibility table from markdown Hamlib Integration section
- Replaced with neutral statement: "Specific version compatibility for extended commands has not been verified"

### Mixed-Source Provenance Handling
- Serial configuration provenance now explicitly notes discrepancy between sources
- `confidence: "medium"` used where official documentation not consulted
- Added `notes` field in provenance blocks to document uncertainty

### Source URL Update
- Changed Hamlib source from wiki to source code file reference
- URL: https://github.com/Hamlib/Hamlib/blob/master/rigs/kenwood/tx500.c


## 2026-02-28 Task 6: TX-500MP Profile

### Single Protocol Implementation
- TX-500MP uses single TS-2000 protocol profile (unlike TX-500's dual protocol)
- Extended LAB599 commands listed as unsupported pending verification
- Conservative approach: assume reduced command subset vs TX-500 extended mode
- `unsupported_commands` array explicitly lists uncertain extended commands

### Provenance for Variant Radios
- Official TX-500MP User Manual exists but may not detail extended commands
- Hamlib model ID 3074 (different from TX-500's 2054)
- Mixed evidence sources: official + hamlib with medium confidence
- Notes field in provenance blocks documents uncertainty about extended support

### Known Issues Pattern
- Issue ID format: `TX5MP-{sequence}` (6-character prefix for variant)
- TX5MP-0001 documents extended command uncertainty as major severity
- Community-verified issue for mobile power considerations
- All issues include required source_tier and confidence fields

### Documentation Pairing
- Markdown includes dedicated "Unsupported Controls" section (per task requirement)
- Interoperability notes section documents TX-500 vs TX-500MP differences
- Explicit table comparing extended command support between models
- Conservative wording: "unverified" status instead of "not supported"


## 2026-02-28 Task 6: TX-500MP Profile

### Shared Hamlib Backend Pattern
- TX-500MP shares Hamlib model ID 2050 with TX-500 (no separate backend)
- Source URL should reference tx500.c, not non-existent tx500mp.c
- Model ID 3074 was incorrect (that's Microtelecom Perseus)

### Single Protocol Profile Pattern
- TX-500MP uses single TS-2000 protocol (no dual-protocol like TX-500)
- Conservative claims for extended commands: marked as unverified
- `unsupported_commands` array lists TX-500 extended commands pending verification

### Provenance for Uncertain Capabilities
- Top-level provenance uses `hamlib` tier with `medium` confidence
- Extended command support explicitly noted as uncertain in `notes` field
- Known issue TX5MP-0001 documents the command subset uncertainty

### Mobile vs Portable Differentiation
- TX-500MP is mobile-only (external 12V power) vs TX-500 portable (internal battery)
- Different form factor but same CAT protocol family
- Extended command subset may differ between models


## 2026-02-28 Task 10: Cross-Radio Capability Matrix

### Matrix Design Patterns
- Six core matrices: Quick Reference, CAT Protocol, PTT Control, Audio, Firmware Dependencies, Risk Flags
- Each matrix uses consistent column ordering across all 5 radios
- Source tier indicators embedded in cells: [official], [hamlib], [community-verified], [L/M] for confidence
- Hamlib-vs-Native section provides per-radio comparison of Hamlib capabilities vs official docs

### TX-500 Recommendation Table Structure
- Explicit "Preferred Profile: lab599-extended" section with use criteria table
- Explicit "Fallback Profile: ts-2000" section with fallback criteria table
- ASCII decision flow diagram for profile selection
- Firmware version requirements clearly stated (1.0.0 base, 1.1.0+ for full metering)
- Note about extended mode requiring explicit activation (not default on power-up)

### Confidence Preservation Approach
- Low confidence cells marked with [L] suffix (FX-4CR capabilities)
- Medium confidence cells marked with [M] suffix (community-verified PTT/audio)
- Source tier column in Quick Reference shows primary source for each radio
- Known Risk Flags table includes full provenance: severity, confidence, source_tier

### Unique Radio Characteristics Highlighted
- (tr)uSDX: Only radio with CAT audio streaming (no USB sound card)
- TX-500: Only radio with dual protocol profiles
- FX-4CR: Weakest documentation - all capabilities require validation
- X6100: CI-V IC-7000 mode with incomplete command compatibility
- TX-500MP: Extended commands uncertain despite sharing LAB599 family

### Summary Recommendations Section
- Per-radio recommendation summary with key caveats
- Primary target (TX-500) distinguished from community-validated radios
- Firmware version requirements reiterated for quick reference

### Verification Pattern
- grep verification uses pattern matching for all 5 radio names
- All radios must appear in matrix for verification to pass


## 2026-02-28 Task 11: Phase-Depth Roadmap and Command-Table Placeholders

### Phase Roadmap Structure
- Explicit "Phase Roadmap" section with status indicators for each phase
- Phase 1 status: Complete with matrix.md reference for cross-radio synthesis
- Phase 2 status: Not started with clear scope definition
- Phase boundary explicitly documented: no breaking changes to Phase 1 data

### Command Table Template Design
- Nine required columns: command, direction, supported, profile, firmware_min, source_tier, confidence, evidence_url, notes
- Per-radio placeholder tables with profile-specific subsections where applicable
- TX-500: Dual profile tables (ts-2000 + lab599-extended)
- (tr)uSDX: Dual tables (ts-480 emulation + trusdx-extended for CAT audio)
- Single-table radios: TX-500MP, FX-4CR, X6100

### Placeholder Convention
- All cells use `(placeholder)` to avoid prefilling unverified data
- Per-radio notes document caveats and expected source tiers
- Provenance requirement emphasized: all entries must include source_tier and confidence

### Verification Pattern
- `grep -E "Phase 1|Phase 2|command table"` validates roadmap language
- `grep -n "source_tier\|confidence"` validates provenance column guidance


## 2026-02-28 Task 12: Full KB Validation and Evidence Pack

### Evidence Pack Structure
- One evidence file per QA scenario from each task (1-12)
- Naming convention: `task-{N}-kb-{description}.txt` for radio-capability-kb plan
- Each evidence file includes: timestamp, command, output, exit status
- Final audit file consolidates all pass/fail outcomes

### Validation Coverage
- Happy path: Full validator run with all 5 radios passing
- Negative path: --self-test-missing-radio demonstrates failure detection
- Self-test modes verified: malformed-json, missing-required, missing-radio
- Schema conformance optional when jsonschema package unavailable

### Evidence Capture Pattern
- Evidence files are append-only artifacts (never modify after creation)
- Timestamps in ISO 8601 format for auditability
- Exit status explicitly recorded for each command
- Color codes in output preserved for readability

### Final Audit Structure
- Executive summary with overall status
- Per-task verification with PASS/FAIL indicators
- Evidence file cross-references
- Definition of Done checklist
- Notes section for environment-specific behavior (e.g., jsonschema skip)


## 2026-02-28 F1 Remediation: Catalog Path + Docs↔Record Provenance Checks

### Catalog Directory Pattern
- Plan originally referenced `data/radios/catalog/*.json` path
- Created catalog directory as synchronized copies of top-level JSON files
- Both `data/radios/*.json` and `data/radios/catalog/*.json` now exist for backward compatibility
- Catalog files are exact copies (not symlinks) to ensure portability across filesystems

### Docs↔Record Provenance Coverage Checks
- Added new validator functions for docs↔record bidirectional coverage:
  - `check_doc_exists`: Verifies docs/radios/{radio}.md exists
  - `check_doc_sources_section`: Verifies `## Sources` or `## Source Provenance` section exists
  - `check_doc_source_provenance`: Verifies source tier signals ([official], [hamlib], [community-verified], [source:)
  - `check_catalog_record_exists`: Verifies data/radios/catalog/{radio}.json exists
  - `check_docs_record_coverage`: Comprehensive coverage check combining all above

### Validator Enhancement Pattern
- New variables: `CATALOG_DIR`, `DOCS_DIR` for path resolution
- Coverage checks integrated into `validate_radio_file` function
- Failures counted as errors (non-zero exit) when coverage incomplete
- Source section pattern flexible: accepts "## Sources" OR "## Source Provenance"

### Backward Compatibility Preserved
- Top-level `data/radios/*.json` files remain primary source
- Catalog copies are additive, not replacement
- Existing validation behavior unchanged
- All five radios validated with new coverage checks
## 2026-02-28 Correction: TX-500MP Hamlib Model ID Wording

### Documentation Accuracy Fix
- TX-500MP has distinct Hamlib model ID 2050 (NOT shared with TX-500 which is 2054)
- Wording corrected in three places: overview table, comparison table, and Hamlib integration section
- Both radios share the same backend code (tx500.c) but have different model IDs
- Pattern: When documenting related radios, be explicit about model ID differences to avoid confusion

## 2026-02-28 X6100 unsupported_commands Normalization

### Identifier Convention Established
- Changed from prose descriptions ("IF filter bandwidth commands") to kebab-case identifiers ("if-filter-bandwidth")
- Aligned `unsupported_commands` array with docs/radios/x6100.md "Notable Gaps" table
- Added two entries not previously in JSON but documented in markdown: `memory-channels`, `alc-metering`
- Removed vague "Full IC-7000 command set" entry (implied by specific gaps)

### Machine-Usable Format Pattern
- Identifiers use kebab-case: `if-filter-bandwidth`, `agc-control`, `memory-channels`, `alc-metering`
- Names align with corresponding `filter_control`, `agc_control`, `memory_channels`, and `metering.alc` boolean capability fields
- This pattern enables programmatic cross-reference between unsupported_commands and capability flags

