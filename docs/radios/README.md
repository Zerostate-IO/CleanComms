# Radio Capability Knowledge Base

This directory contains the authoritative knowledge base for CleanComms radio hardware support. It defines provenance standards, contribution workflows, and documentation conventions for all target radios.

---

## Scope

This KB covers capability data for the following radios:

| Radio | Support Tier | Status |
|-------|--------------|--------|
| Lab599 Discovery TX-500 | 1 (Primary) | Full support, CI-gated |
| Digi-link Mobile / TX-500MP | 2 (Community) | Best-effort support |
| FX-4CR | 2 (Community) | Best-effort support |
| (tr)uSDX | 2 (Community) | Best-effort support |
| Xiegu X6100 | 2 (Community) | Best-effort support |

**Data types tracked:**
- Serial/communication parameters (baud rates, flow control)
- CAT command support (frequency, mode, filters, etc.)
- PTT control mechanisms (CAT, RTS, DTR)
- Audio routing capabilities (CODEC paths, sample rates)
- Known issues and firmware-specific behavior

---

## Source Policy

### Provenance Hierarchy

All capability claims must trace to an authoritative source. When sources conflict, higher tiers take precedence.

| Tier | Label | Description |
|------|-------|-------------|
| 1 | `official` | Vendor documentation, manufacturer manuals, firmware release notes |
| 2 | `hamlib` | Hamlib project documentation, rig backend source code, Hamlib wiki |
| 3 | `community-verified` | Community forums, user reports with multiple independent confirmations |
| 4 | `unknown` | Unverified claims, single-source reports |

### Normative vs Non-Normative Claims

**Official sources define normative claims.** Data from `official` tier sources is considered authoritative and does not require additional verification tags.

**Community claims require tagging.** Any claim from `community-verified` or `unknown` tier sources must include:
- `confidence: "needs-verification"` or `confidence: "low"`
- An explicit uncertainty label in the record

Example tagging for uncertain data:
```json
{
  "description": "CAT audio streaming may require firmware 1.2+",
  "source_tier": "community-verified",
  "confidence": "needs-verification"
}
```

### Uncertainty Labels

When data is uncertain, use these labels:

| Label | When to Use |
|-------|-------------|
| `unknown` | No reliable source available |
| `needs-verification` | Source exists but requires validation |
| `conflicting` | Multiple sources disagree |

Never leave uncertain data untagged. If you cannot verify a claim, mark it explicitly.

---

## Update Workflow

### Adding a New Radio

1. **Create source entries** in `sources.md` for all authoritative references
2. **Create capability record** in `data/radios/` following the schema
3. **Validate JSON** against `data/radios/schema/radio-capability.schema.json`
4. **Submit PR** with both source and capability changes

### Updating Existing Records

1. **Update sources first** if adding new references to `sources.md`
2. **Modify capability record** with new data and provenance tags
3. **Update "last_verified" timestamp** in the record
4. **Validate JSON** before submitting PR

### Validation Command

```bash
# Basic JSON validity check
python3 -m json.tool < data/radios/<radio>.json > /dev/null

# Full schema validation (requires jsonschema)
python3 -c "import jsonschema; jsonschema.validate(
    instance=json.load(open('data/radios/<radio>.json')),
    schema=json.load(open('data/radios/schema/radio-capability.schema.json'))
)"
```

### Source Discovery

When researching new capabilities:
1. Start with official vendor documentation
2. Cross-reference with Hamlib backend source code
3. Search community forums for real-world validation
4. Document all sources in `sources.md` with tier assignments

---

## Phase Depth

The KB is built in two phases with increasing granularity.

### Phase Roadmap

#### Phase 1: Capability Synthesis (Current)

**Status: Complete.** The [matrix.md](matrix.md) document provides cross-radio capability synthesis for all five target radios:

- CAT protocol support comparison
- PTT control mechanisms
- Audio routing capabilities
- Firmware dependency gates
- Known risk flags with provenance
- TX-500 dual-protocol recommendation matrix

Phase 1 answers: *"Can this radio do X?"*

#### Phase 2: Command-Level Deepening (Planned)

**Status: Not started.** Phase 2 will extend the KB with per-command documentation:

- Per-command support tables (e.g., `FA;` frequency read, `MD;` mode set)
- Response format specifications (byte layouts, terminators)
- Timing constraints and quirks (inter-command delays, timeouts)
- Firmware-version-specific behavior differences

Phase 2 answers: *"How exactly does this radio implement X?"*

**Boundary:** Phase 1 records remain valid for Phase 2. The schema supports nested capability structures that Phase 2 will populate with command-level details. No breaking changes to existing Phase 1 data.

---

## Phase 2 Command Table Templates

The following placeholder sections define the structure for Phase 2 command-level documentation. These templates are **not populated** with verified data. They exist to guide future research and maintain consistent column structure across all radios.

### Required Columns

| Column | Description |
|--------|-------------|
| `command` | CAT command string (e.g., `FA;`, `MD;`)
| `direction` | `read`, `write`, or `read/write`
| `supported` | `yes`, `no`, `partial`, or `unknown`
| `profile` | Protocol profile this command applies to
| `firmware_min` | Minimum firmware version required (or `n/a`)
| `source_tier` | `official`, `hamlib`, `community-verified`, or `unknown`
| `confidence` | `high`, `medium`, `low`, or `needs-verification`
| `evidence_url` | Link to source documentation or code
| `notes` | Caveats, quirks, or implementation details |

**Important:** All Phase 2 command entries must include `source_tier` and `confidence` fields. No command claims should be made without provenance tracking.

---

### TX-500 Command Table (Phase 2 Placeholder)

#### TS-2000 Profile Commands

| command | direction | supported | profile | firmware_min | source_tier | confidence | evidence_url | notes |
|---------|-----------|-----------|---------|--------------|-------------|------------|--------------|-------|
| (placeholder) | (placeholder) | (placeholder) | ts-2000 | (placeholder) | (placeholder) | (placeholder) | (placeholder) | (placeholder) |

#### LAB599 Extended Profile Commands

| command | direction | supported | profile | firmware_min | source_tier | confidence | evidence_url | notes |
|---------|-----------|-----------|---------|--------------|-------------|------------|--------------|-------|
| (placeholder) | (placeholder) | (placeholder) | lab599-extended | (placeholder) | (placeholder) | (placeholder) | (placeholder) | (placeholder) |

---

### TX-500MP Command Table (Phase 2 Placeholder)

| command | direction | supported | profile | firmware_min | source_tier | confidence | evidence_url | notes |
|---------|-----------|-----------|---------|--------------|-------------|------------|--------------|-------|
| (placeholder) | (placeholder) | (placeholder) | ts-2000 | (placeholder) | (placeholder) | (placeholder) | (placeholder) | (placeholder) |

**Note:** TX-500MP extended command support is uncertain. Commands should be verified against TX-500 extended behavior before populating.

---

### FX-4CR Command Table (Phase 2 Placeholder)

| command | direction | supported | profile | firmware_min | source_tier | confidence | evidence_url | notes |
|---------|-----------|-----------|---------|--------------|-------------|------------|--------------|-------|
| (placeholder) | (placeholder) | (placeholder) | ts-480 | (placeholder) | (placeholder) | (placeholder) | (placeholder) | (placeholder) |

**Note:** FX-4CR has limited official CAT documentation. Most command entries will require `hamlib` or `community-verified` source tiers with appropriate confidence levels.

---

### (tr)uSDX Command Table (Phase 2 Placeholder)

#### TS-480 Emulation Commands

| command | direction | supported | profile | firmware_min | source_tier | confidence | evidence_url | notes |
|---------|-----------|-----------|---------|--------------|-------------|------------|--------------|-------|
| (placeholder) | (placeholder) | (placeholder) | ts-480 | (placeholder) | (placeholder) | (placeholder) | (placeholder) | (placeholder) |

#### (tr)uSDX Extended Commands (CAT Audio)

| command | direction | supported | profile | firmware_min | source_tier | confidence | evidence_url | notes |
|---------|-----------|-----------|---------|--------------|-------------|------------|--------------|-------|
| (placeholder) | (placeholder) | (placeholder) | trusdx-extended | (placeholder) | (placeholder) | (placeholder) | (placeholder) | (placeholder) |

**Note:** (tr)uSDX CAT audio commands (`UA0`, `UA1`, `UA2`, `US`) require firmware 2.00u+ and should be documented with `community-verified` source tier.

---

### X6100 Command Table (Phase 2 Placeholder)

| command | direction | supported | profile | firmware_min | source_tier | confidence | evidence_url | notes |
|---------|-----------|-----------|---------|--------------|-------------|------------|--------------|-------|
| (placeholder) | (placeholder) | (placeholder) | ci-v-ic7000 | (placeholder) | (placeholder) | (placeholder) | (placeholder) | (placeholder) |

**Note:** X6100 uses CI-V IC-7000 compatibility mode with incomplete command implementation. Not all IC-7000 commands are supported.
---

## Schema Reference

The JSON schema at `data/radios/schema/radio-capability.schema.json` is the authoritative definition of record structure. Key sections:

| Section | Purpose |
|---------|---------|
| `radio_id` | Unique identifier matching filename |
| `support_tier` | 1 (Primary) or 2 (Community-Validated) |
| `protocol_profiles` | Protocol modes with capability blocks |
| `provenance` | Source tracking at record/profile/group levels |
| `known_issues` | Documented problems with severity and confidence |
| `firmware_gates` | Version-specific capability constraints |

When in doubt, validate against the schema.

---

## References

- [sources.md](sources.md) - Authoritative source ledger by radio
- [radio-capability.schema.json](../../data/radios/schema/radio-capability.schema.json) - JSON schema definition
- [CONTRIBUTING.md](../../CONTRIBUTING.md) - General contribution guidelines
- [repo-policies.md](../repo-policies.md) - Branch and merge policies
