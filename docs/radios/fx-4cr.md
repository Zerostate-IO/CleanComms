# FX-4CR

![Support Tier](https://img.shields.io/badge/Support-Community%20(Tier%202)-yellow)
![Protocol](https://img.shields.io/badge/Protocol-Kenwood%20TS--480-blue)
![Documentation](https://img.shields.io/badge/Docs-Limited-orange)

The FX-4CR is a portable HF transceiver manufactured by BG2FX. It is a **community-validated radio** with limited official documentation.

> ⚠️ **Warning**: This radio has the weakest official documentation among CleanComms target radios. All capability claims are derived from Hamlib implementation and community reports. Users should validate capabilities independently before field deployment.

---

## Overview

| Attribute | Value |
|-----------|-------|
| **Manufacturer** | BG2FX |
| **Model** | FX-4CR |
| **Model Code** | `fx-4cr` |
| **Support Tier** | 2 (Community-Validated) |
| **Hamlib Model ID** | 3074 |
| **Introduction Year** | 2017 |

### Aliases
- FX4CR

---

## CAT Protocol Support

The FX-4CR emulates a **Kenwood TS-480 compatible** CAT protocol. The exact command subset and compatibility level has not been officially documented.

### Protocol Profiles

| Profile | Protocol Type | Description |
|---------|---------------|-------------|
| `kenwood-ts480` | Kenwood TS-480 | TS-480 emulation mode with basic CAT control |

### Recommendation

**Profile:** `kenwood-ts480`

This is the only known CAT mode for the FX-4CR. Use with Hamlib for most reliable operation.

> **Note:** The exact subset of TS-480 commands supported is not documented. Test specific commands before relying on them.

---

## Serial Configuration

| Parameter | Value | Source |
|-----------|-------|--------|
| Default Baud Rate | 38400 | [hamlib] |
| Supported Baud Rates | 4800, 9600, 19200, 38400, 57600 | [hamlib] |
| Data Bits | 8 | [hamlib] |
| Stop Bits | 1 | [hamlib] |
| Parity | None | [hamlib] |
| Flow Control | None | [hamlib] |

*Source: [hamlib] Hamlib FX-4CR backend*

---

## CAT Capabilities

| Capability | Supported | Confidence | Notes |
|------------|-----------|------------|-------|
| Frequency Control | ✓ | Low | Standard TS-480 FA/FB commands assumed |
| Mode Control | ✓ | Low | USB, LSB, CW, AM, FM assumed |
| VFO Control | ✗ | Needs Verification | Not confirmed |
| Split Control | ✗ | Needs Verification | Not confirmed |
| Filter Control | ✗ | Low | Not in Hamlib implementation |
| AGC Control | ✗ | Low | Not in Hamlib implementation |
| Power Control | ✗ | Low | Not in Hamlib implementation |
| Antenna Control | ✗ | Low | Single antenna |
| S-Meter | ✓ | Low | SM command assumed |
| Memory Channels | ✗ | Low | Not in Hamlib implementation |

*Source: [hamlib] Hamlib FX-4CR backend. Confidence levels are intentionally conservative.*

---

## PTT Capabilities

| Method | Supported | Confidence | Notes |
|--------|-----------|------------|-------|
| CAT PTT | ✓ | Medium | Via Hamlib |
| RTS PTT | ✓ | Medium | Confirmed by users |
| DTR PTT | ✗ | Medium | Not confirmed |
| Hardware PTT | ✓ | Medium | Dedicated PTT jack |
| VOX | ✓ | Medium | Voice-activated transmit |

| Parameter | Value |
|-----------|-------|
| PTT Timeout | 0 (unlimited) |
| Recommended PTT Delay | 50ms |

*Source: [hamlib] Hamlib FX-4CR backend, [community-verified] user reports*

---

## Audio Capabilities

| Capability | Value | Confidence | Notes |
|------------|-------|------------|-------|
| USB Audio | ✓ | Medium | Built-in USB sound card |
| Audio Input | USB | Medium | Primary for digital modes |
| Audio Output | USB | Medium | Primary for digital modes |
| CAT Audio Streaming | ✗ | Medium | Audio via USB only |
| ACC Port | ✓ | Medium | Accessory port available |
| Input Level Control | ✓ | Medium | Via USB audio interface |
| Output Level Control | ✓ | Medium | Via USB audio interface |
| Sample Rates | 48000, 44100 Hz | Medium | Standard USB audio rates |

*Source: [community-verified] Community reports*

---

## Known Issues

> ⚠️ **Non-Normative**: The following issues are derived from community reports and Hamlib implementation. They have not been confirmed by official vendor documentation.

### FX4-0001: Limited Official Documentation

| Attribute | Value |
|-----------|-------|
| **ID** | FX4-0001 |
| **Title** | Limited Official Documentation |
| **Severity** | Major |
| **Confidence** | High |
| **Source Tier** | hamlib |
| **Affected Versions** | All |
| **Impact** | cat-control, digital-modes |

**Description:** The FX-4CR lacks publicly available official CAT protocol documentation. All capability claims are derived from Hamlib implementation and community reports, which may be incomplete or contain inaccuracies.

**Workaround:** Cross-reference Hamlib source code and community forums for specific command behavior. Test thoroughly before field deployment.

---

### FX4-0002: Digital Mode Audio Latency

| Attribute | Value |
|-----------|-------|
| **ID** | FX4-0002 |
| **Title** | Digital Mode Audio Latency |
| **Severity** | Minor |
| **Confidence** | Low |
| **Source Tier** | community-verified |
| **Affected Versions** | Unknown |
| **Impact** | audio, digital-modes |

**Description:** Community reports indicate the FX-4CR may exhibit higher audio latency than expected during digital mode operations. This can affect timing-sensitive modes like FT8 or JS8Call.

**Workaround:** Test audio latency with intended digital mode software before field use. Consider buffer size adjustments in audio configuration.

---

### FX4-0003: CAT Command Subset Uncertainty

| Attribute | Value |
|-----------|-------|
| **ID** | FX4-0003 |
| **Title** | CAT Command Subset Uncertainty |
| **Severity** | Major |
| **Confidence** | Medium |
| **Source Tier** | hamlib |
| **Affected Versions** | All |
| **Impact** | cat-control |

**Description:** The exact subset of Kenwood TS-480 commands supported by the FX-4CR is not documented. Some standard TS-480 commands may not be implemented or may behave differently than expected.

**Workaround:** Test specific CAT commands required by your application before relying on them. Consult Hamlib source code for implemented command list.

---

### FX4-0004: USB Serial Port Enumeration

| Attribute | Value |
|-----------|-------|
| **ID** | FX4-0004 |
| **Title** | USB Serial Port Enumeration |
| **Severity** | Minor |
| **Confidence** | Low |
| **Source Tier** | community-verified |
| **Affected Versions** | Unknown |
| **Impact** | cat-control |

**Description:** Some users report USB serial port enumeration issues on Linux systems. The port may require udev rule configuration or may not enumerate consistently across reboots.

**Workaround:** Create udev rules to assign consistent device names. Use USB ID-based identification rather than /dev/ttyUSB* enumeration.

---

### FX4-0005: VFO Control Not Confirmed

| Attribute | Value |
|-----------|-------|
| **ID** | FX4-0005 |
| **Title** | VFO Control Not Confirmed |
| **Severity** | Minor |
| **Confidence** | Needs Verification |
| **Source Tier** | unknown |
| **Affected Versions** | All |
| **Impact** | cat-control |

**Description:** VFO A/B switching and split mode capabilities are not confirmed. Hamlib implementation suggests limited VFO support.

**Workaround:** Test VFO and split operations before relying on them in the field.

---

## Hamlib Integration

### Backend Support

| Hamlib Version | Profile Support |
|----------------|-----------------|
| 4.0+ | ✓ Basic TS-480 emulation |

**Note:** Hamlib provides the most reliable CAT control method currently available for the FX-4CR. Consult the Hamlib source code for the specific command implementation.

*Source: [hamlib] Hamlib FX-4CR Backend Wiki*

---

## Sources

| Source | Type | URL |
|--------|------|-----|
| BG2FX Downloads | Official | https://bg2fx.com/downloads |
| Hamlib FX-4CR Backend | Hamlib | https://github.com/Hamlib/Hamlib/wiki/Supported-Radios |

---

## Documentation Gap

| Gap | Status |
|-----|--------|
| Official CAT command documentation | Needs verification |

If you have access to official FX-4CR documentation or can verify capabilities, please consider contributing to this knowledge base.

---

## See Also

- [Radio Capability Knowledge Base](README.md)
- [Source Ledger](sources.md)
- [Radio Capability Schema](../../data/radios/schema/radio-capability.schema.json)

---

*Last verified: 2026-02-28*
*Confidence level: Low - All claims require validation*
