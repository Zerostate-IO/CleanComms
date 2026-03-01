# Lab599 Digi-link Mobile TX-500MP

![Support Tier](https://img.shields.io/badge/Support-Community%20(Tier%202)-yellow)
![Protocol](https://img.shields.io/badge/Protocol-TS--2000-blue)

The Lab599 Digi-link Mobile TX-500MP is a mobile HF/50MHz transceiver, part of the LAB599 product family. It shares the LAB599 CAT protocol with the Discovery TX-500 but may have a reduced command subset.

---

## Overview

| Attribute | Value |
|-----------|-------|
| **Manufacturer** | Lab599 |
| **Model** | Digi-link Mobile TX-500MP |
| **Model Code** | `tx-500mp` |
| **Support Tier** | 2 (Community-Validated) |
| **Hamlib Model ID** | 2050 |
| **Introduction Year** | 2022 |

### Aliases
- TX-500MP
- Digi-link Mobile

---

## CAT Protocol Support

The TX-500MP uses Kenwood TS-2000 compatible CAT protocol. While it shares the LAB599 CAT protocol family with the TX-500, extended command support may differ.

### Protocol Profile

| Profile | Protocol Type | Description |
|---------|---------------|-------------|
| `ts-2000` | Kenwood TS-2000 | Standard Kenwood-compatible mode for broad software compatibility |

### Recommendation Policy

**Preferred Profile:** `ts-2000`

The TX-500MP shares the LAB599 CAT protocol family with the TX-500 but extended command support is uncertain. Use TS-2000 standard commands for maximum compatibility.

---

## Serial Configuration

| Parameter | Value |
|-----------|-------|
| Default Baud Rate | 9600 |
| Supported Baud Rates | 9600 |
| Data Bits | 8 |
| Stop Bits | 1 |
| Parity | None |
| Flow Control | None |

*Source: [hamlib] TX-500 Backend (tx500.c, shared with TX-500MP)*

---

## CAT Capabilities

| Capability | Supported | Notes |
|------------|-----------|-------|
| Frequency Control | Yes | Standard FA/FB commands |
| Mode Control | Yes | USB, LSB, CW, AM, FM |
| VFO Control | Yes | VFO A/B switching |
| Split Control | Yes | |
| Filter Control | No | Requires extended mode (unverified) |
| AGC Control | No | Requires extended mode (unverified) |
| Power Control | No | Requires extended mode (unverified) |
| Antenna Control | No | Single antenna only |
| S-Meter | Yes | SM command |
| Memory Channels | Yes | Standard Kenwood format |

*Source: [hamlib] TX-500MP backend, [official] TX-500MP User Manual*

---

## Unsupported Controls

The following controls are **not confirmed** for TX-500MP and should not be relied upon:

### Extended Commands (Status Uncertain)

| Command | Function | TX-500 Support | TX-500MP Status |
|---------|----------|----------------|-----------------|
| `TX0` | PTT Off | Supported | Unverified |
| `TX1` | PTT On | Supported | Unverified |
| `RX` | Receiver Control | Supported | Unverified |
| `KI` | Key Input | Supported | Unverified |
| `PC` | Power Control | Supported | Unverified |
| `AG` | AGC Control | Supported | Unverified |

### Extended Metering (Status Uncertain)

| Capability | TX-500 Extended | TX-500MP Status |
|------------|-----------------|-----------------|
| SWR Reading | Supported | Unverified |
| ALC Reading | Supported | Unverified |
| Power Output Reading | Supported | Unverified |

> **Important:** The TX-500MP may have a reduced command subset compared to TX-500 extended mode. Verify specific command support against official TX-500MP documentation before relying on extended features.

---

## PTT Capabilities

| Method | Supported | Notes |
|--------|-----------|-------|
| CAT PTT | Yes | Standard Kenwood commands |
| RTS PTT | Yes | Serial RTS line control |
| DTR PTT | Yes | Serial DTR line control |
| Hardware PTT | Yes | Dedicated PTT connection |
| VOX | Yes | Voice-activated transmit |

| Parameter | Value |
|-----------|-------|
| PTT Timeout | 0 (unlimited) |
| Recommended PTT Delay | 50ms |

*Source: [hamlib] TX-500MP backend, [official] TX-500MP User Manual*

---

## Audio Capabilities

| Capability | Value | Notes |
|------------|-------|-------|
| USB Audio | Yes | Built-in USB sound card |
| Audio Input | USB | Primary for digital modes |
| Audio Output | USB | Primary for digital modes |
| CAT Audio Streaming | No | Audio via USB only, not CAT |
| ACC Port | Yes | Accessory port available |
| Input Level Control | Yes | Via USB audio interface |
| Output Level Control | Yes | Via USB audio interface |
| Sample Rates | 48000, 44100 Hz | Standard USB audio rates |

*Source: [official] TX-500MP User Manual*

---

## Known Issues

### TX5MP-0001: Extended Command Support Uncertain

| Attribute | Value |
|-----------|-------|
| **ID** | TX5MP-0001 |
| **Title** | Extended Command Support Uncertain |
| **Severity** | Major |
| **Confidence** | Low |
| **Source Tier** | hamlib |
| **Affected Versions** | All |
| **Impact** | cat-control, digital-modes |

**Description:** The TX-500MP shares the LAB599 CAT protocol family with the TX-500 but may have a reduced command subset. Extended commands (TX0, TX1, RX, KI, PC, AG) available on TX-500 extended mode may not be fully supported on TX-500MP.

**Workaround:** Use standard TS-2000 commands for maximum compatibility. Consult official TX-500MP documentation for confirmed extended command support.

---

### TX5MP-0002: Mobile Installation Power Considerations

| Attribute | Value |
|-----------|-------|
| **ID** | TX5MP-0002 |
| **Title** | Mobile Installation Power Considerations |
| **Severity** | Minor |
| **Confidence** | Medium |
| **Source Tier** | community-verified |
| **Affected Versions** | All |
| **Impact** | hardware |

**Description:** The TX-500MP is designed for mobile installation and may have different power management behavior compared to the portable TX-500.

**Workaround:** Use a dedicated 12V power supply rated for at least 10A continuous. Avoid sharing power with other high-current devices.

---

## Interoperability Notes

### TX-500 vs TX-500MP Differences

The TX-500MP and TX-500 share the LAB599 CAT protocol family but have key differences:

| Aspect | TX-500 | TX-500MP |
|--------|--------|----------|
| Form Factor | Portable | Mobile |
| Power Source | Internal battery + external | External 12V only |
| Extended Mode | Dual protocol (TS-2000 + LAB599 extended) | Single protocol (TS-2000) |
| Extended Commands | Fully supported | Status uncertain |
| Hamlib Model ID | 2054 | 2050 |

### Software Compatibility

Software known to work with TX-500MP TS-2000 mode:
- WSJT-X
- JS8Call
- fldigi
- Hamlib/rigctld

### Hamlib Integration

Hamlib model ID 2050 provides TX-500MP support. The TX-500MP uses the same Hamlib backend code (tx500.c) as the TX-500 portable transceiver (model ID 2054).

*Source: [hamlib] Hamlib TX-500 Backend*

---

## Sources

| Source | Type | URL |
|--------|------|-----|
| TX-500MP User Manual | Official | https://downloads.lab599.com/TX500MP/Lab599-TX500MP-User-Manual-EN.pdf |
| LAB599 CAT Protocol Specification | Official | https://downloads.lab599.com/Lab599-CAT-protocol.pdf |
| Hamlib TX-500 Backend | Hamlib | https://github.com/Hamlib/Hamlib/blob/master/rigs/kenwood/tx500.c |

---

## See Also

- [Radio Capability Knowledge Base](README.md)
- [Source Ledger](sources.md)
- [TX-500 Profile](tx-500.md)
- [Radio Capability Schema](../../data/radios/schema/radio-capability.schema.json)

---

*Last verified: 2026-02-28*
