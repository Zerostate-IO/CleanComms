## 2026-02-28 Task 2: Schema Rationale

### Protocol Profile Nesting
**Decision**: Model protocol profiles as nested objects keyed by profile name rather than an array.

**Rationale**:
- Enables direct access by profile name without array scanning
- Natural fit for radios with distinct protocol modes (TX-500: TS-2000 vs LAB599)
- Allows per-profile provenance tracking
- Profile names become self-documenting keys (`ts-2000`, `lab599-extended`)

### Provenance Granularity
**Decision**: Attach provenance blocks at record, profile, and capability-group levels.

**Rationale**:
- Record-level provenance covers general claims
- Profile-level provenance handles protocol-specific claims
- Capability-group provenance (e.g., serial, cat) allows mixed sources
- Prevents overclaiming when official docs cover some features but not others

### Known Issue Requirements
**Decision**: Require all four fields (description, severity, source_tier, confidence) for known issues.

**Rationale**:
- Prevents undocumented severity (critical vs cosmetic matters for users)
- Source tier prevents community issues from being treated as official
- Confidence level indicates verification status
- Aligns with sources.md provenance rubric

### Firmware Gates Pattern
**Decision**: Firmware gates as top-level optional object, not embedded in capabilities.

**Rationale**:
- Single capability may be gated by firmware across multiple profiles
- Avoids duplication when same gate applies to multiple features
- Clearer for downstream tooling to query "what firmware do I need?"
- Allows notes explaining gate rationale

### Schema Version Pattern
**Decision**: Use semver-minor format (e.g., "1.0") for schema_version.

**Rationale**:
- Simple versioning for schema evolution
- Breaking changes = major version bump
- Additions = minor version bump
- Easy string comparison for compatibility checks
