# CleanComms

![License: GPL-3.0](https://img.shields.io/badge/License-GPL--3.0-blue.svg)
![Status: Pre-Alpha](https://img.shields.io/badge/Status-Pre--Alpha-orange.svg)
![Go Version](https://img.shields.io/badge/Go-1.21+-00ADD8.svg?logo=go)

CleanComms is a Linux-first amateur radio HF operating suite designed for reliability, modern architecture, and seamless hardware orchestration. Built by [ZeroState-IO](https://github.com/ZeroState-IO), it provides a robust foundation for digital mode operations where the backend daemon maintains strict ownership of CAT control, PTT signaling, and audio routing.

## 📡 Overview

CleanComms moves away from the traditional model of scattered hardware control across multiple UI applications. Instead, a central **CleanComms Daemon** acts as the single source of truth for your radio hardware, providing:

- **Backend-Orchestrated Control**: CAT, PTT, and Audio are managed by a unified service.
- **Safe Transmit Path**: Integrated PTT watchdogs and emergency release mechanisms.
- **Mode-Switch Transactions**: Deterministic transitions between digital modes (starting with JS8Call) with automatic rollback on failure.
- **Linux-First Design**: Optimized for Linux-based workflows and field operations.

## 🚀 Current Status: Pre-Alpha

CleanComms is currently in **Pre-Alpha**. The project is undergoing active foundational development. 

- [x] Governance and Project Charter
- [ ] Core Daemon Architecture (In Progress)
- [ ] JS8Call Integration (Planned)
- [ ] Local Web Dashboard (Planned)

**Warning**: This software is not yet ready for production use or field deployment. APIs and configurations are subject to breaking changes.

## 📻 Supported Radios

We follow a tiered support policy to ensure reliability for our users.

### Primary (Tier 1)
*Fully supported, CI-gated, and validated by the core team.*
- **Lab599 Discovery TX-500** (Initial Focus)

### Community-Validated (Tier 2)
*Validated by community members; support is best-effort based on community feedback.*
- **Digi-link mobile / TX-500MP**
- **FX-4CR**
- **(tr)usdx**
- **Xiegu X6100**

## 🏗 Architecture Snapshot

CleanComms uses a decoupled architecture to ensure stability and flexibility:

1.  **CleanComms Daemon (Go)**: The core engine. It owns the Hamlib/rigctld connection, manages PTT state machines, and orchestrates engine adapters.
2.  **Engine Adapters**: Lightweight bridges to digital mode engines (e.g., JS8Call). They communicate with the daemon via internal gRPC/TCP, never touching the hardware directly.
3.  **Web Dashboard (JS/TS)**: A local, browser-based UI for status monitoring, mode switching, and diagnostics.

## 🛠 Quickstart

> [!NOTE]
> Detailed installation instructions will be provided as we reach Alpha status.

Currently, the project is in a planning and early scaffolding phase. Developers interested in the architecture can explore the `.sisyphus/plans` directory.

```bash
# Clone the repository
git clone https://github.com/ZeroState-IO/CleanComms.git
cd CleanComms

# Explore the governance and planning
ls -R .sisyphus/plans/
```

## 🤝 Contributing

We welcome contributions from the amateur radio and open-source communities! Please see our [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on how to get involved.

All contributors must adhere to our [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## 🔒 Security

Security is a priority for CleanComms. If you discover a security vulnerability, please follow the instructions in our [SECURITY.md](SECURITY.md) to report it privately.

## 🆘 Support

For usage questions, feature requests, or community discussion, please use [GitHub Discussions](https://github.com/ZeroState-IO/CleanComms/discussions). See [SUPPORT.md](SUPPORT.md) for more details.

## ⚖️ License

CleanComms is licensed under the **GPL-3.0-or-later**. See the [LICENSE](LICENSE) file for the full text.

---
*73 de ZeroState-IO*
