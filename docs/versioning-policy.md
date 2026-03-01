# Versioning Policy

This document outlines the versioning strategy for CleanComms. We follow [Semantic Versioning 2.0.0](https://semver.org/) with specific rules for the pre-1.0.0 development phase.

## 0.x Semantics (Pre-1.0.0)

During the `0.x` phase, CleanComms is in active development. The public API is not yet stable, and anything can change at any time.

- **No Stability Guarantee**: Breaking changes may occur in any `0.MINOR` release.
- **Readiness-Based**: Releases are driven by feature readiness and stability rather than a fixed schedule.

## Version Bump Rules

We use [Conventional Commits](https://www.conventionalcommits.org/) to determine version bumps.

| Change Type | Version Bump | Description |
| :--- | :--- | :--- |
| `fix` | `0.x.PATCH` | Bug fixes that do not change the public API. |
| `feat` | `0.MINOR.x` | New features or enhancements. |
| `breaking` | `0.MINOR.x` | Any change that breaks backward compatibility. |

### Breaking Change Signaling

Breaking changes must be explicitly signaled in commit messages and PR titles using one of the following:

1. **Exclamation Mark**: `feat!: ...` or `fix!: ...`
2. **Footer**: `BREAKING CHANGE: <description>` in the commit footer.

In the `0.x` phase, breaking changes trigger a `MINOR` bump (e.g., `0.4.2` -> `0.5.0`) to indicate a significant shift, even though SemVer allows them in `PATCH` for `0.x`.

## 1.0.0 Graduation Criteria

CleanComms will graduate to `1.0.0` when the following objective conditions are met:

1. **API Stability**: The public API has remained stable (no breaking changes) for at least 3 consecutive `0.x` releases.
2. **Production Use**: The suite is being used in production environments by real users with positive feedback on stability.
3. **Test Coverage**: Core components have at least 80% unit and integration test coverage.
4. **Documentation**: All public APIs, CLI commands, and configuration options are fully documented.
5. **No Planned Breaking Changes**: There are no known or planned breaking changes for the immediate roadmap following the `1.0.0` release.

## Release Cadence

CleanComms follows a **readiness-based release cadence**. We do not commit to specific dates for `1.0.0` or any other version. Releases occur when the defined criteria for that version are met.
