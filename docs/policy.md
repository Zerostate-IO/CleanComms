# CleanComms Policy Configuration

This document describes the policy flags and kill switches that control V2 AI and remote access features in CleanComms.

## Fail-Closed Philosophy

**All V2 and remote features default to DISABLED.** This is a deliberate security design choice:

- Features must be **explicitly enabled** in configuration
- Missing configuration keys are treated as `false`
- Invalid configurations fail safely (disabled)

This approach ensures that:
1. New installations are secure by default
2. Upgrades don't accidentally enable sensitive features
3. Misconfiguration errs on the side of caution

## Policy Flags

### `ai_enabled`

Controls whether V2 AI/ML features are active.

| Property | Value |
|----------|-------|
| **Default** | `false` |
| **Type** | Boolean |
| **Impact** | Enables/disables signal classification, AI suggestions |

```yaml
policy:
  ai_enabled: false  # Must explicitly set to true
```

**When enabled:**
- V2 signal classification features become available
- AI-powered suggestions can be generated

**When disabled (default):**
- All AI/ML features are blocked
- `signal_id_v2_enabled` feature flag is force-disabled

### `remote_access_enabled`

Controls whether remote access via VPN is permitted.

| Property | Value |
|----------|-------|
| **Default** | `false` |
| **Type** | Boolean |
| **Impact** | Allows binding to VPN interface for remote access |

```yaml
policy:
  remote_access_enabled: false  # Must explicitly set to true
```

**When enabled:**
- HTTP server can bind to VPN interface (if `remote.bind` is configured)
- Remote dashboard access via VPN becomes possible

**When disabled (default):**
- HTTP server binds only to localhost
- `remote.enabled` configuration is force-disabled

> **Security Note:** Remote access relies on VPN for security. No TLS or authentication is provided at the application layer. Only enable if you have a properly configured VPN.

### `auto_apply_suggestions`

Controls whether AI suggestions are automatically applied.

| Property | Value |
|----------|-------|
| **Default** | `false` |
| **Type** | Boolean |
| **Impact** | Allows automatic application of AI recommendations |

```yaml
policy:
  auto_apply_suggestions: false  # ALWAYS false
```

> **SAFETY KILL SWITCH:** This flag is **always forced to `false`** at runtime. Even if set to `true` in configuration, the application will:
> 1. Log an error message
> 2. Force the value to `false`
> 3. Continue operation with manual review required

This is a hard safety measure to ensure AI suggestions are always reviewed by a human operator before being applied.

## Enforcement Logic

The application enforces policy at startup:

```go
// Enforce policy: block V2 AI features if not explicitly enabled
if cfg.FeatureFlags.SignalIdV2Enabled && !cfg.Policy.AIEnabled {
    log.Warn("signal_id_v2_enabled is true but ai_enabled policy is false; disabling signal_id_v2")
    cfg.FeatureFlags.SignalIdV2Enabled = false
}

// Enforce policy: block remote access if not explicitly enabled
if cfg.Remote.Enabled && !cfg.Policy.RemoteAccessEnabled {
    log.Warn("remote.enabled is true but remote_access_enabled policy is false; disabling remote")
    cfg.Remote.Enabled = false
}

// Enforce policy: auto_apply_suggestions must ALWAYS be false
if cfg.Policy.AutoApplySuggestions {
    log.Error("auto_apply_suggestions must be false; forcing to false for safety")
    cfg.Policy.AutoApplySuggestions = false
}
```

## Configuration Example

```yaml
# Policy configuration (fail-closed defaults)
# All V2 and remote features must be EXPLICITLY enabled.
# Default state is DISABLED for security.
policy:
  # AI/ML features (V2 signal classification, etc.)
  # Set to true ONLY if you understand the implications.
  ai_enabled: false

  # Remote access via VPN
  # Set to true ONLY if you have VPN properly configured.
  remote_access_enabled: false

  # Auto-apply AI suggestions - ALWAYS false for safety.
  # This is a kill switch; suggestions must be manually reviewed.
  auto_apply_suggestions: false
```

## Audit Logging

All policy enforcement actions are logged at startup:

```
INFO  policy configuration ai_enabled=false remote_access_enabled=false auto_apply_suggestions=false
```

If policy violations are detected:

```
WARN  signal_id_v2_enabled is true but ai_enabled policy is false; disabling signal_id_v2
WARN  remote.enabled is true but remote_access_enabled policy is false; disabling remote
ERROR auto_apply_suggestions must be false; forcing to false for safety
```

## Security Considerations

1. **Defense in Depth:** Policy flags are one layer of security. VPN configuration, network segmentation, and proper firewall rules are also required for remote access.

2. **No Bypass:** Policy enforcement happens in the application core. There is no runtime API to change policy values.

3. **Configuration Validation:** On startup, the application validates policy configuration and logs the effective state.

4. **Principle of Least Privilege:** Features start disabled and must be explicitly enabled only when needed.

## Related Documentation

- [Remote Access Configuration](./setup/remote-access.md)
- [Feature Flags](../README.md#feature-flags)
- [Security Policy](../SECURITY.md)
