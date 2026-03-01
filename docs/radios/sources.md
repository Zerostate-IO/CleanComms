# Radio Capability Sources

This document catalogs authoritative sources for each target radio in the CleanComms knowledge base. Every capability claim must trace back to one of these sources with an explicit provenance tier.

---

## Provenance Tiers

Sources are classified by authority level. Higher tiers take precedence when sources conflict.

| Tier | Label | Description |
|------|-------|-------------|
| 1 | `official` | Vendor documentation, manufacturer manuals, firmware release notes |
| 2 | `hamlib` | Hamlib project documentation, rig backend source code, Hamlib wiki |
| 3 | `community-verified` | Community forums, user reports, third-party documentation with multiple confirmations |
| 4 | `unknown` | Unverified claims, single-source reports, or information requiring validation |

### Confidence Guidance

When citing sources, assign confidence levels based on tier combination and corroboration:

| Confidence | Criteria |
|------------|----------|
| **High** | Official source confirms, or official + hamlib agree |
| **Medium** | Hamlib-only source, or community-verified with multiple independent reports |
| **Low** | Single community report, or conflicting information between sources |
| **Needs Verification** | Unknown tier, or official documentation is ambiguous/missing |

### Source Tagging Format

In capability records, tag claims using this format:

```
[source: tier] - brief description
```

Example: `[source: official] LAB599 CAT protocol v1.2`

---

## Source Ledger by Radio

### Lab599 Discovery TX-500

| Source | URL | Tier | Last Checked |
|--------|-----|------|--------------|
| LAB599 CAT Protocol Specification | https://downloads.lab599.com/Lab599-CAT-protocol.pdf | official | 2026-02-28 |
| TX-500 User Manual | https://www.manualslib.com/manual/1818895/Lab599-Discovery-Tx-500.html | official | 2026-02-28 |
| Hamlib TX-500 Backend | https://github.com/Hamlib/Hamlib/wiki/Supported-Radios#lab599 | hamlib | 2026-02-28 |

**Notes:** TX-500 supports two CAT protocol modes: TS-2000 compatible (Kenwood standard) and LAB599 extended mode. Official documentation covers both. Extended mode provides additional commands not available in TS-2000 mode.

---

### Digi-link Mobile / TX-500MP

| Source | URL | Tier | Last Checked |
|--------|-----|------|--------------|
| TX-500MP User Manual | https://downloads.lab599.com/TX500MP/Lab599-TX500MP-User-Manual-EN.pdf | official | 2026-02-28 |
| LAB599 CAT Protocol Specification | https://downloads.lab599.com/Lab599-CAT-protocol.pdf | official | 2026-02-28 |
| Hamlib TX-500MP Backend | https://github.com/Hamlib/Hamlib/wiki/Supported-Radios#lab599 | hamlib | 2026-02-28 |

**Notes:** TX-500MP shares the LAB599 CAT protocol family but may have a reduced command subset compared to TX-500. Verify specific command support against official documentation.

---

### FX-4CR

| Source | URL | Tier | Last Checked |
|--------|-----|------|--------------|
| BG2FX Downloads | https://bg2fx.com/downloads | official | 2026-02-28 |
| Hamlib FX-4CR Backend | https://github.com/Hamlib/Hamlib/wiki/Supported-Radios | hamlib | 2026-02-28 |

**Notes:** Official vendor documentation may be limited. Community reports suggest digital mode quirks that require `community-verified` tagging. Known issues should cite specific forum threads or user reports with severity and confidence.

---

### (tr)uSDX

| Source | URL | Tier | Last Checked |
|--------|-----|------|--------------|
| (tr)uSDX Technical Details | https://dl2man.de/5-trusdx-details/ | community-verified | 2026-02-28 |
| Kenwood TS-480 Command Reference | https://www.kenwood.com/i/products/info/amateur/ts_480/pdf/ts_480_pc.pdf | official | 2026-02-28 |
| Hamlib (tr)uSDX Backend | https://github.com/Hamlib/Hamlib/wiki/Supported-Radios | hamlib | 2026-02-28 |

**Notes:** (tr)uSDX emulates Kenwood TS-480 CAT protocol. The DL2MAN site is the primary community-maintained reference. CAT audio streaming capability varies by firmware version. Always gate streaming claims with firmware version information.

---

### Xiegu X6100

| Source | URL | Tier | Last Checked |
|--------|-----|------|--------------|
| X6100 Extended Manual | https://radioddity.s3.amazonaws.com/2024-01-19_Extended_manual_for_Xiegu_X6100_v1.0.pdf | official | 2026-02-28 |
| Hamlib X6100 Backend | https://github.com/Hamlib/Hamlib/wiki/Supported-Radios | hamlib | 2026-02-28 |

**Notes:** X6100 uses Icom CI-V protocol with IC-7000 compatibility mode. CAT mode-switch caveats are documented in community reports and should be tagged `community-verified` with confidence levels.

---

## Cross-Radio Sources

These sources apply to multiple radios and provide general reference material.

| Source | URL | Tier | Scope |
|--------|-----|------|-------|
| Hamlib Supported Radios | https://github.com/Hamlib/Hamlib/wiki/Supported-Radios | hamlib | All target radios |
| Hamlib Source Repository | https://github.com/Hamlib/Hamlib | hamlib | Backend implementation details |

---

## Updating This Ledger

When adding new sources or updating existing entries:

1. Verify the URL is accessible and authoritative
2. Assign the appropriate provenance tier
3. Update the "Last Checked" date
4. Note any gaps or verification needs in the Notes column
5. Do not add dead links or sources without verifiable URLs

---

## Gap Tracking

Sources that need discovery or verification:

| Radio | Gap | Status |
|-------|-----|--------|
| FX-4CR | Official CAT command documentation | Needs verification |
| X6100 | Official CI-V command subset list | Partial - extended manual available |

Update this table as gaps are resolved through research or community contribution.
