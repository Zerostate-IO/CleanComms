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
