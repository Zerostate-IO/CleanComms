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

