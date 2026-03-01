# Cross-Radio Capability Matrix

This document provides a consolidated comparison of all CleanComms target radios across CAT protocol support, PTT/audio control, firmware dependencies, known-risk flags, and Hamlib integration notes.

---

## Quick Reference

| Radio | Support Tier | Protocol | Hamlib ID | Primary Source |
|-------|--------------|----------|-----------|----------------|
| Lab599 TX-500 | 1 (Primary) | Dual: TS-2000 + LAB599 Extended | 2054 | Official |
| Lab599 TX-500MP | 2 (Community) | TS-2000 | 2050 | Official + Hamlib |
| FX-4CR | 2 (Community) | TS-480 | 3074 | Hamlib |
| (tr)uSDX | 2 (Community) | TS-480 | 2055 | Community |
| Xiegu X6100 | 2 (Community) | CI-V (IC-7000) | 3074 | Official + Hamlib |

---

## CAT Protocol Support Matrix

| Capability | TX-500 (Extended) | TX-500 (TS-2000) | TX-500MP | FX-4CR | (tr)uSDX | X6100 |
|------------|-------------------|------------------|----------|--------|----------|-------|
| **Frequency Control** | ✓ | ✓ | ✓ | ✓ [L] | ✓ | ✓ |
| **Mode Control** | ✓ | ✓ | ✓ | ✓ [L] | ✓ | ✓ |
| **VFO Control** | ✓ | ✓ | ✓ | ✗ [L] | ✗ | ✓ |
| **Split Control** | ✓ | ✓ | ✓ | ✗ [L] | ✗ | ✓ |
| **Filter Control** | ✓ | ✗ | ✗ | ✗ | Limited | ✗ |
| **AGC Control** | ✓ | ✗ | ✗ | ✗ | Limited | ✗ |
| **Power Control** | ✓ | ✗ | ✗ | ✗ | ✗ | ✓ |
| **Antenna Control** | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| **Memory Channels** | ✓ | ✓ | ✓ | ✗ [L] | ✗ | ✗ |
| **S-Meter** | ✓ | ✓ | ✓ | ✓ [L] | ✓ | ✓ |
| **SWR Reading** | ✓ | ✗ | ✗ | ✗ | ✗ | ✓ |
| **ALC Reading** | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| **Power Output Reading** | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |

**Legend:**
- `[L]` = Low confidence (derived from Hamlib, not officially documented)
- `Limited` = Basic command only, not full control

**Source Tiers:**
- TX-500 Extended: [official] LAB599 CAT Protocol Specification
- TX-500 TS-2000: [official] LAB599 + [hamlib] tx500.c
- TX-500MP: [official] User Manual + [hamlib] tx500.c (medium confidence)
- FX-4CR: [hamlib] Backend only (low confidence)
- (tr)uSDX: [community-verified] DL2MAN + [hamlib] (medium confidence)
- X6100: [official] Extended Manual + [hamlib] (medium confidence for CAT subset)

---

## PTT Control Matrix

| Method | TX-500 | TX-500MP | FX-4CR | (tr)uSDX | X6100 |
|--------|--------|----------|--------|----------|-------|
| **CAT PTT** | ✓ | ✓ | ✓ [M] | ✓ | ✓ |
| **RTS PTT** | ✓ | ✓ | ✓ [M] | ✓ | ✓ (recommended) |
| **DTR PTT** | ✓ | ✓ | ✗ [M] | ✗ | ✗ |
| **Hardware PTT** | ✓ | ✓ | ✓ [M] | ✓ | ✓ |
| **VOX** | ✓ | ✓ | ✓ [M] | ✓ | ✓ |
| **PTT Delay** | 50ms | 50ms | 50ms | 50ms | 50ms |

**Legend:**
- `[M]` = Medium confidence (community-verified or inferred)
- (tr)uSDX: DTR must remain HIGH for proper operation

**Notes:**
- X6100: RTS PTT recommended over CAT PTT for digital modes (timing issues)
- (tr)uSDX: DTR line cannot be used for PTT; must stay HIGH

---

## Audio Capabilities Matrix

| Capability | TX-500 | TX-500MP | FX-4CR | (tr)uSDX | X6100 |
|------------|--------|----------|--------|----------|-------|
| **USB Audio** | ✓ | ✓ | ✓ [M] | ✗ | ✓ |
| **CAT Audio Streaming** | ✗ | ✗ | ✗ | ✓ [FW] | ✗ |
| **ACC Port** | ✓ | ✓ | ✓ [M] | ✗ | ✓ |
| **Input Level Control** | ✓ | ✓ | ✓ [M] | ✗ | ✓ |
| **Output Level Control** | ✓ | ✓ | ✓ [M] | ✗ | ✓ |
| **Sample Rates** | 48k, 44.1k | 48k, 44.1k | 48k, 44.1k [M] | 7825 RX / 11520 TX | 48k, 44.1k |

**Legend:**
- `[M]` = Medium confidence (community-verified)
- `[FW]` = Firmware-dependent (requires 2.00u+)

**Notes:**
- (tr)uSDX is unique: no USB sound card, audio transmitted via CAT serial connection
- (tr)uSDX CAT streaming: 8-bit unsigned, 46 dB dynamic range
- X6100: Firmware 1.1.8+ recommended for USB audio stability

---

## Firmware Dependencies

| Radio | Capability | Minimum Version | Notes |
|-------|------------|-----------------|-------|
| **TX-500** | Extended Protocol | 1.0.0 | Base extended mode |
| **TX-500** | Full Extended Metering | 1.1.0 | SWR, ALC, power output |
| **(tr)uSDX** | 115200 Baud Rate | 2.00t | Higher throughput |
| **(tr)uSDX** | CAT Audio Streaming | 2.00u | Required for USB-only digital modes |
| **(tr)uSDX** | Reliable TX-RX Transitions | 2.00u | Alpha firmware has issues |
| **X6100** | USB Audio Stability | 1.1.8 | Earlier versions may drop audio |

---

## Known Risk Flags

### TX-500

| ID | Issue | Severity | Confidence | Source |
|----|-------|----------|------------|--------|
| TX5-0001 | Serial Port Enumeration Race | Minor | Medium | community-verified |
| TX5-0002 | Extended Mode Requires Explicit Activation | Minor | High | official |

### TX-500MP

| ID | Issue | Severity | Confidence | Source |
|----|-------|----------|------------|--------|
| TX5MP-0001 | Extended Command Support Uncertain | Major | Low | hamlib |
| TX5MP-0002 | Mobile Installation Power Considerations | Minor | Medium | community-verified |

### FX-4CR

| ID | Issue | Severity | Confidence | Source |
|----|-------|----------|------------|--------|
| FX4-0001 | Limited Official Documentation | Major | High | hamlib |
| FX4-0002 | Digital Mode Audio Latency | Minor | Low | community-verified |
| FX4-0003 | CAT Command Subset Uncertainty | Major | Medium | hamlib |
| FX4-0004 | USB Serial Port Enumeration | Minor | Low | community-verified |
| FX4-0005 | VFO Control Not Confirmed | Minor | Needs Verification | unknown |

### (tr)uSDX

| ID | Issue | Severity | Confidence | Source |
|----|-------|----------|------------|--------|
| TRU-0001 | Hamlib Port Reset on Connection | Minor | Medium | community-verified |
| TRU-0002 | Alpha Firmware TX-RX Transition Issues | Major | Medium | community-verified |
| TRU-0003 | Clone/Knockoff Quality Issues | Major | High | community-verified |

### X6100

| ID | Issue | Severity | Confidence | Source |
|----|-------|----------|------------|--------|
| X61-0001 | CI-V Mode-Switch Response Delay | Minor | Medium | community-verified |
| X61-0002 | CI-V Address Not Configurable | Minor | Low | community-verified |
| X61-0003 | Incomplete IC-7000 Command Compatibility | Major | Medium | hamlib |
| X61-0004 | Firmware Update Resets CAT Settings | Minor | Medium | community-verified |

---

## Hamlib vs Native Notes

### TX-500 / TX-500MP

| Aspect | Hamlib | Native/Official |
|--------|--------|-----------------|
| **Model ID** | 2054 (TX-500), 2050 (TX-500MP) | N/A |
| **Protocol Support** | Both TS-2000 and Extended via same backend | LAB599 CAT Protocol Specification |
| **Extended Commands** | Supported via tx500.c backend | Documented in official PDF |
| **Version Note** | Specific version compatibility for extended commands not verified | Firmware 1.0.0+ for extended, 1.1.0+ for metering |

### FX-4CR

| Aspect | Hamlib | Native/Official |
|--------|--------|-----------------|
| **Model ID** | 3074 | N/A |
| **Protocol Support** | TS-480 emulation | No official CAT documentation available |
| **Reliability** | Primary control method | Community reports suggest quirks |
| **Confidence** | Medium | Low (no docs) |

### (tr)uSDX

| Aspect | Hamlib | Native/Official |
|--------|--------|-----------------|
| **Model ID** | 2055 | N/A |
| **Protocol Support** | TS-480 subset | DL2MAN community documentation |
| **CAT Audio** | Not in Hamlib core | UA0/UA1/UA2 commands via serial |
| **Workaround** | Use rigctld TCP mode to prevent port reset | Direct serial works with firmware 2.00u+ |

### X6100

| Aspect | Hamlib | Native/Official |
|--------|--------|-----------------|
| **Model ID** | 3074 | N/A |
| **Protocol Support** | CI-V IC-7000 mode | Extended Manual covers basics |
| **Command Subset** | Partial IC-7000 implementation | Official subset list incomplete |
| **Recommendation** | Hamlib recommended for abstraction | Test commands before relying |

---

## TX-500 Protocol Recommendation Table

The TX-500 supports two protocol profiles. Use this decision matrix to select the appropriate profile.

### Preferred Profile: `lab599-extended`

**Use extended mode when:**

| Criterion | Requirement |
|-----------|-------------|
| CleanComms Integration | Running with direct Hamlib integration |
| Extended Metering | Requiring SWR, ALC, or power output readings |
| Power Control | Needing RF power output adjustment |
| AGC Control | Requiring AGC speed/settings adjustment |
| Filter Control | Needing IF bandwidth adjustment |
| Firmware | Version 1.0.0+ (1.1.0+ for full metering) |

**Extended Mode Activation:**
> The TX-500 powers up in TS-2000 compatibility mode by default. Extended mode must be explicitly activated via menu setting or CAT command sequence.

### Fallback Profile: `ts-2000`

**Use TS-2000 mode when:**

| Criterion | Reason |
|-----------|--------|
| Third-Party Software | Application requires Kenwood standard protocol |
| Legacy Compatibility | Maximum compatibility with older CAT applications |
| Unknown Hamlib Version | Version compatibility for extended commands not verified |
| Minimal Features Needed | Only basic frequency/mode control required |

### Decision Flow

```
                    ┌─────────────────────────────┐
                    │ Do you need extended        │
                    │ features (SWR, power, AGC)? │
                    └───────────┬─────────────────┘
                                │
              ┌─────────────────┴─────────────────┐
              │                                   │
             Yes                                 No
              │                                   │
              ▼                                   ▼
    ┌─────────────────┐               ┌─────────────────────┐
    │ Is firmware     │               │ Does third-party    │
    │ ≥ 1.0.0?        │               │ software require    │
    └────────┬────────┘               │ Kenwood standard?   │
             │                        └──────────┬──────────┘
     ┌───────┴───────┐                           │
     │               │                ┌──────────┴──────────┐
    Yes             No               Yes                   No
     │               │                 │                    │
     ▼               ▼                 ▼                    ▼
┌──────────┐  ┌─────────────┐  ┌───────────────┐  ┌─────────────┐
│ Use      │  │ Upgrade FW  │  │ Use TS-2000   │  │ Use Extended│
│ Extended │  │ or use      │  │ (fallback)    │  │ (preferred) │
│          │  │ TS-2000     │  │               │  │             │
└──────────┘  └─────────────┘  └───────────────┘  └─────────────┘
```

---

## Summary Recommendations by Radio

### Primary Target: TX-500

- **Best supported** radio with official documentation
- Use `lab599-extended` profile when possible
- Full extended metering requires firmware 1.1.0+
- Enable extended mode in radio menu before use

### TX-500MP

- Use `ts-2000` profile (extended commands unverified)
- Suitable for mobile installations
- Conservative approach: assume reduced command subset

### FX-4CR

- **Weakest documentation** among target radios
- Validate all capabilities before field deployment
- Hamlib is the most reliable control method available
- Confidence levels intentionally conservative

### (tr)uSDX

- Unique CAT audio streaming capability (firmware 2.00u+)
- No USB sound card - streaming is only USB audio option
- Purchase from official suppliers to avoid clone issues
- Use rigctld TCP mode to prevent port reset issues

### X6100

- CI-V IC-7000 compatibility mode
- RTS PTT recommended over CAT PTT for digital modes
- Firmware 1.1.8+ recommended for USB audio stability
- Not all IC-7000 commands implemented

---

## References

- [Radio Capability Knowledge Base](README.md)
- [Source Ledger](sources.md)
- [TX-500 Profile](tx-500.md)
- [TX-500MP Profile](tx-500mp.md)
- [FX-4CR Profile](fx-4cr.md)
- [(tr)uSDX Profile](trusdx.md)
- [X6100 Profile](x6100.md)
- [Radio Capability Schema](../../data/radios/schema/radio-capability.schema.json)

---

*Last verified: 2026-02-28*
