# Architecture Research: Competitive Analysis

**Date**: 2026-02-28  
**Author**: CleanComms Team  
**Status**: Research Complete

This document summarizes research into similar amateur radio communication projects and extracts actionable insights for CleanComms architecture.

---

## Projects Analyzed

### 1. AMRRON (American Redoubt Radio Operator Network)

- **Repository**: https://gitlab.com/amrron
- **Platform**: GitLab
- **Approach**: Linux Mint + setup scripts
- **Focus**: Nationwide emergency communications network for preppers/patriots
- **Key Technologies**: JS8Call, Commstat (custom), fldigi, digital modes
- **Philosophy**: Community-driven, training exercises (T-REX), standardized protocols

### 2. EmComm Tools OS Community

- **Repository**: https://github.com/thetechprepper/emcomm-tools-os-community
- **Platform**: GitHub (105 stars, 23 forks)
- **Approach**: Full Ubuntu-based OS image with overlay filesystem
- **Focus**: Offline-first digital communications for offgrid operations
- **Key Technologies**: 
  - Plug-and-Play (PnP) radio support via udev rules
  - Zero-configuration mode switching
  - GPS auto-sync, offline maps, HF prediction tools
  - Pre-configured: JS8Call, fldigi, Winlink, ARDOP, Dire Wolf, YAAC, LinBPQ

---

## Architecture Comparison

| Aspect | AMRRON | EmComm Tools OS | CleanComms |
|--------|--------|-----------------|------------|
| Base OS | Linux Mint scripts | Ubuntu overlay image | Linux-first daemon |
| Distribution | Setup scripts | Full OS image | Package + daemon |
| Configuration | Manual + scripts | PnP udev rules + `et-*` tools | Daemon-managed |
| Software Stack | Glue scripts | Shell scripts + wrappers | Go daemon |
| Radio Support | Generic | Extensive udev rules per radio | Hamlib abstraction |
| Offline Capable | Partial | Full (maps, Wikipedia, etc.) | Full offline |
| UX Philosophy | Training/protocols | Turnkey appliance | Minimal CLI + API |

---

## Key Patterns to Adopt

### 1. Standardized Device Abstraction (from EmComm Tools)

EmComm Tools creates stable symlinks for radio hardware:

```bash
export ET_DEVICE_AUDIO="/dev/et-audio"
export ET_DEVICE_CAT="/dev/et-cat"
export ET_DEVICE_GPS="/dev/et-gps"
export ET_DEVICE_SDR="/dev/et-sdr"
```

**CleanComms Adoption**: Create similar abstraction layer via udev rules:

```bash
/dev/cleancomms-cat    → Hamlib/rigctld control
/dev/cleancomms-audio  → Audio device for digital modes
/dev/cleancomms-ptt    → PTT control line
/dev/cleancomms-gps    → GPS data stream (if available)
```

### 2. Radio Profile System (from EmComm Tools)

EmComm Tools stores radio configuration in JSON:

```json
{
  "rigctrl": {
    "primeRig": true,
    "model": 2038,
    "device": "/dev/et-cat"
  },
  "audio": {
    "input": "/dev/et-audio",
    "output": "/dev/et-audio"
  }
}
```

**CleanComms Adoption**: Store in `~/.config/cleancomms/radios/{radio-name}.json`

### 3. Mode Switcher Concept (from EmComm Tools)

Single command to switch between communication modes:

```bash
et-mode aprs-client     # YAAC
et-mode packet-digi     # Dire Wolf
et-mode winlink-hf      # ARDOP
et-mode js8call         # JS8Call
```

**CleanComms Adoption**: Daemon-managed mode switching with transaction semantics:

```bash
cleancomms mode set js8call
cleancomms mode set winlink-ardop
cleancomms mode status
```

### 4. Systemd User Services (from EmComm Tools)

Applications run as user-level systemd services:

```bash
systemctl --user start js8call
systemctl --user start rigctld
systemctl --user start direwolf
```

**CleanComms Adoption**: Daemon orchestrates services internally, exposing unified API.

### 5. Offline-First Data Sets (from EmComm Tools)

Pre-loaded offline data:
- FCC database (updated 11/12/25)
- SSN data for propagation
- Winlink RMS list
- OpenStreetMap tiles (via mbtileserver)
- Wikipedia (via Kiwix)

**CleanComms Adoption**: Built-in data sync command:

```bash
cleancomms data update fcc
cleancomms data update rms-list
cleancomms data status
```

### 6. Desktop Notifications (from EmComm Tools)

```bash
notify-user "Radio connected: FT-991A"
notify-user "Mode switched to JS8Call"
```

**CleanComms Adoption**: Optional D-Bus notifications via `--notify` flag.

### 7. Robust Download with Retries (from EmComm Tools)

```bash
download_with_retries "$url" "$filename" "$checksum" 3 2
```

**CleanComms Adoption**: Internal retry logic in daemon for data updates.

---

## What CleanComms Does Differently

### 1. Daemon-First Architecture

**Why**: Shell scripts are hard to maintain, test, and extend.

**Approach**: 
- Single Go binary daemon
- Type-safe configuration
- Structured logging
- Built-in health checks

### 2. API-First Design

**Why**: EmComm Tools is desktop/GNOME-only. CleanComms should support headless, remote, and embedded use cases.

**Approach**:
- REST API for all operations
- WebSocket for real-time status
- gRPC for internal engine communication

### 3. Single Binary Distribution

**Why**: Full OS images are hard to update and tie users to specific versions.

**Approach**:
- Single `cleancommsd` binary
- Packages for Arch, Debian, Fedora, Nix
- Configuration in `~/.config/cleancomms/`

### 4. Modern Radio Abstraction

**Why**: Hamlib is powerful but complex. CleanComms should provide a clean API.

**Approach**:
- Hamlib/rigctld as backend
- Auto-detect connected radios via udev events
- Unified radio API regardless of hardware

### 5. JS8Call as First-Class Citizen

**Why**: Both AMRRON and EmComm Tools prioritize JS8Call for weak-signal operations.

**Approach**:
- Deep JS8Call integration (API, message queue, relay logic)
- First engine adapter implemented
- Message buffering and store-and-forward

### 6. Commstat-like Status Reporting

**Why**: AMRRON's Commstat provides standardized situation reports.

**Approach**:
- Structured JSON status output
- Machine-readable for integration
- Human-readable summary mode

---

## udev Rules Reference

EmComm Tools maintains extensive udev rules for PnP support:

| Radio | File | Notes |
|-------|------|-------|
| FT-991A | 78-et-ft991a.rules | Full CAT + Audio |
| FT-891 | 79-et-digirig-dr891.rules | Via DigiRig |
| IC-705 | 80-et-ic705.rules | Full CAT + Audio + GPS |
| IC-7200 | 81-et-ic7200.rules | CAT only |
| IC-7100 | 82-et-ic7100.rules | Full CAT + Audio |
| IC-7300 | 83-et-ic7300.rules | CAT only |
| TX-500 | 90-et-digirig-mobile.rules | Via DigiRig Mobile |
| X6100 | 89-et-xiegu-x6100.rules | Full CAT + Audio |

**CleanComms Approach**: Start with TX-500 (Tier 1), expand to community-validated radios.

---

## Recommended Implementation Order

1. **Phase 1: Core Daemon**
   - Hamlib/rigctld integration
   - Radio profile loading
   - Basic API (status, mode switch)

2. **Phase 2: JS8Call Integration**
   - Engine adapter pattern
   - Message queue
   - API exposure

3. **Phase 3: PnP Support**
   - udev rules for supported radios
   - Auto-detection and configuration
   - Desktop notifications

4. **Phase 4: Offline Data**
   - Data sync command
   - Local caching
   - Offline maps integration

5. **Phase 5: Web Dashboard**
   - React-based UI
   - WebSocket status
   - Mobile-responsive

---

## References

- [EmComm Tools Community Documentation](https://community.emcommtools.com)
- [EmComm Tools GitHub](https://github.com/thetechprepper/emcomm-tools-os-community)
- [AMRRON Website](https://amrron.com)
- [AMRRON GitLab](https://gitlab.com/amrron)
- [Hamlib Documentation](https://hamlib.github.io)
- [JS8Call](https://js8call.com)

---

*Research compiled for CleanComms architecture planning.*
