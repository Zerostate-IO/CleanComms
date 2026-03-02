package app

import "fmt"

// Version information set at build time via ldflags.
var (
	// Version is the semantic version of CleanComms.
	Version = "0.0.0-dev"
	// GitCommit is the git commit hash.
	GitCommit = "unknown"
	// BuildDate is the build timestamp.
	BuildDate = "unknown"
)

// VersionInfo returns formatted version information.
func VersionInfo() string {
	return fmt.Sprintf("CleanComms %s (commit: %s, built: %s)", Version, GitCommit, BuildDate)
}
