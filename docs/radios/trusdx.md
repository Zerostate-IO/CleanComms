# (tr)uSDX

![Support Tier](https://img.shields.io/badge/Support-Community%20(Tier%202)-yellow)
![Protocol](https://img.shields.io/badge/Protocol-Kenwood%20TS--480-blue)

The (tr)uSDX is a compact, open-source QRP SSB/CW transceiver designed by DL2MAN and PE1NNZ. It emulates the Kenwood TS-480 CAT protocol for software compatibility.

---

## Overview

| Attribute | Value |
|-----------|-------|
| **Manufacturer** | DL2MAN / PE1NNZ (Open Source) |
| **Model** | (tr)uSDX |
| **Model Code** | `trusdx` |
| **Support Tier** | 2 (Community-Validated) |
| **Hamlib Model ID** | 2055 |
| **Introduction Year** | 2021 |

### Aliases
- truSDX
- trusdx

---

## CAT Protocol Support

The (tr)uSDX emulates a **subset of the Kenwood TS-480 CAT protocol**. This provides broad compatibility with amateur radio software while maintaining the radio's compact firmware footprint.

### Protocol Profile

| Profile | Protocol Type | Description |
|---------|---------------|-------------|
| `ts-480` | Kenwood TS-480 | TS-480 command subset emulation for CAT control |

### Supported TS-480 Commands

The (tr)uSDX responds to the following TS-480 CAT commands:

| Command | Description |
|---------|-------------|
| `FA;` / `FAnnnnnn;` | Get / Set frequency in Hz |
| `MD;` / `MDn;` | Get / Set mode (1=LSB, 2=USB, 3=CW, 4=FM, 5=AM) |
| `IF;` | Get transceiver status (frequency, mode) |
| `ID;` | Get transceiver ID (returns 020 = TS-480) |
| `TX0;` | Set TX (transmit) state |
| `TX1;` | Set TX state (alternative) |
| `TX2;` | Set Tune state (CW mode required) |
| `RX;` | Set RX (receive) state |
| `PS;` / `PS1;` | Power status |
| `AI;` / `AI0;` | Auto-information mode |
| `AG0;` | AGC control |
| `XT1;` | XT command |
| `RT1;` | RT command |
| `RC;` | Read S-meter |
| `FL0;` | Filter control |
| `RS;` | RS command |
| `VX;` | Voice control |

*Source: [community-verified] DL2MAN Technical Details*

---

## Serial Configuration

### Firmware < 2.00t

| Parameter | Value |
|-----------|-------|
| Default Baud Rate | 38400 |
| Supported Baud Rates | 38400 |
| Data Bits | 8 |
| Stop Bits | 1 |
| Parity | None |
| Flow Control | None |

### Firmware >= 2.00t

| Parameter | Value |
|-----------|-------|
| Default Baud Rate | 115200 |
| Supported Baud Rates | 38400, 115200 |
| Data Bits | 8 |
| Stop Bits | 1 |
| Parity | None |
| Flow Control | None |

### Control Line Requirements

| Line | State | Notes |
|------|-------|-------|
| DTR | HIGH | Required for proper operation |
| RTS | LOW (RX) | May be HIGH to key CW/PTT |

*Source: [community-verified] DL2MAN Technical Details*

---

## CAT Capabilities

| Capability | Supported | Notes |
|------------|-----------|-------|
| Frequency Control | Yes | FA command |
| Mode Control | Yes | MD command (LSB, USB, CW, FM, AM) |
| VFO Control | No | Single VFO only |
| Split Control | No | Not supported |
| Filter Control | Limited | FL0 command (basic) |
| AGC Control | Limited | AG0 command (basic) |
| Power Control | No | Fixed 5W output |
| Antenna Control | No | Single antenna |
| S-Meter | Yes | RC command |
| Memory Channels | No | Not supported |

*Source: [community-verified] DL2MAN Technical Details, [hamlib] (tr)uSDX backend*

---

## PTT Capabilities

| Method | Supported | Notes |
|--------|-----------|-------|
| CAT PTT | Yes | TX0, TX1, TX2, RX commands |
| RTS PTT | Yes | RTS line control (may be HIGH for TX) |
| DTR PTT | No | DTR must remain HIGH |
| Hardware PTT | Yes | Dedicated PTT jack |
| VOX | Yes | Voice-activated transmit |

| Parameter | Value |
|-----------|-------|
| PTT Timeout | 0 (unlimited) |
| Recommended PTT Delay | 50ms |

*Source: [community-verified] DL2MAN Technical Details*

---

## Audio Capabilities

### USB Audio

The (tr)uSDX does not have a built-in USB sound card. Audio routing options are:

| Capability | Value | Notes |
|------------|-------|-------|
| USB Audio | No | No built-in USB sound card |
| Audio Input | CAT streaming | Via UA1/UA2 commands (firmware-dependent) |
| Audio Output | CAT streaming | Via UA1/UA2 commands (firmware-dependent) |
| CAT Audio Streaming | Yes | Firmware-dependent, see below |
| ACC Port | No | No dedicated accessory port |

### CAT Audio Streaming (Firmware-Dependent)

> **Important:** CAT audio streaming is a unique (tr)uSDX feature that transmits audio data over the same USB serial connection used for CAT control. This capability is **firmware-dependent** and requires version 2.00u or newer for reliable operation.

#### Streaming Commands

| Command | Description |
|---------|-------------|
| `UA0;` | CAT streaming OFF (CAT control only) |
| `UA1;` | CAT streaming ON with speaker ON |
| `UA2;` | CAT streaming ON with speaker OFF |
| `USnnnnn...;` | Audio stream indicator (followed by U8 samples until `;`) |

#### Streaming Specifications

| Parameter | RX | TX |
|-----------|-----|-----|
| Sample Rate | 7825 Hz | 11520 Hz (or lower) |
| Bit Depth | 8-bit unsigned | 8-bit unsigned |
| Dynamic Range | 46 dB | 46 dB |

#### Streaming Behavior

- **RX Mode**: Transceiver sends audio stream to host until `TX0;` command is issued
- **TX Mode**: Host sends audio stream to transceiver until `RX;` command is issued
- **CAT Interleaving**: Audio stream can be interrupted by CAT commands starting with `;`
- **Resume**: Audio stream resumes after `;US` indicator

*Source: [community-verified] DL2MAN Technical Details*

---

## Firmware Gates

| Capability | Minimum Version | Notes |
|------------|-----------------|-------|
| 115200 Baud Rate | 2.00t | Higher baud rate for improved throughput |
| CAT Audio Streaming | 2.00u | Required for reliable digital modes over USB only |
| Alpha Firmware | Various | Some alpha versions may have TX-RX transition issues |

*Firmware version requirements based on community documentation.*

---

## Known Issues

### TRU-0001: Hamlib Port Reset on Connection

| Attribute | Value |
|-----------|-------|
| **ID** | TRU-0001 |
| **Title** | Hamlib Port Reset on Connection |
| **Severity** | Minor |
| **Confidence** | Medium |
| **Source Tier** | community-verified |
| **Affected Versions** | All |
| **Impact** | cat-control |

**Description:** When Hamlib connects to the (tr)uSDX, it resets the serial port. This causes the radio to reset, and it is not yet available when Hamlib tries to connect. This results in connection failures.

**Workaround:** Run rigctld as a TCP server separately, keeping the port open before WSJT-X or other applications connect. This prevents Hamlib from resetting the port.

---

### TRU-0002: Alpha Firmware TX-RX Transition Issues

| Attribute | Value |
|-----------|-------|
| **ID** | TRU-0002 |
| **Title** | Alpha Firmware TX-RX Transition Issues |
| **Severity** | Major |
| **Confidence** | Medium |
| **Source Tier** | community-verified |
| **Affected Versions** | Alpha firmware versions |
| **Impact** | digital-modes, ptt |

**Description:** Some alpha firmware versions do not properly transition from TX to RX state, causing issues with digital mode operation.

**Workaround:** Use stable firmware releases (2.00u or newer recommended) for digital mode operation.

---

### TRU-0003: Clone/Knockoff Quality Issues

| Attribute | Value |
|-----------|-------|
| **ID** | TRU-0003 |
| **Title** | Clone/Knockoff Quality Issues |
| **Severity** | Major |
| **Confidence** | High |
| **Source Tier** | community-verified |
| **Affected Versions** | N/A (hardware) |
| **Impact** | hardware |

**Description:** Many reported issues with (tr)uSDX performance are traced to clone or knockoff units with poor quality control. These units may not accept firmware updates or may have substandard components.

**Workaround:** Purchase only from official suppliers listed on the DL2MAN website to ensure quality components and firmware upgrade capability.

---

## Hamlib Integration

### Backend Support

| Hamlib Version | Status |
|----------------|--------|
| 4.5+ | Stable |
| 4.0 - 4.4 | Partial (may require workarounds) |

**Model ID:** 2055

### Configuration Notes

For reliable operation with WSJT-X and similar applications:

1. Connect external power before USB cable
2. Use rigctld in TCP server mode to prevent port reset issues
3. Configure for Kenwood TS-480 protocol (Hamlib model 2055)
4. Ensure firmware 2.00u or newer for CAT audio streaming

*Source: [hamlib] Hamlib Supported Radios Wiki*

---

## Sources

| Source | Type | URL |
|--------|------|-----|
| (tr)uSDX Technical Details | Community-Verified | https://dl2man.de/5-trusdx-details/ |
| Kenwood TS-480 Command Reference | Official | https://www.kenwood.com/i/products/info/amateur/ts_480/pdf/ts_480_pc.pdf |
| Hamlib (tr)uSDX Backend | Hamlib | https://github.com/Hamlib/Hamlib/wiki/Supported-Radios |

---

## See Also

- [Radio Capability Knowledge Base](README.md)
- [Source Ledger](sources.md)
- [Radio Capability Schema](../../data/radios/schema/radio-capability.schema.json)

---

*Last verified: 2026-02-28*
