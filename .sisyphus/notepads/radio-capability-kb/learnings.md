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

