// Package lookup provides callsign lookup services with provider chain and caching.
package lookup

import (
	"context"
	"errors"
	"time"
)

// Errors returned by the lookup package.
var (
	ErrNotFound      = errors.New("callsign not found")
	ErrNotSupported  = errors.New("callsign not supported by provider")
	ErrProviderDown  = errors.New("provider unavailable")
	ErrInvalidResult = errors.New("invalid lookup result")
)

// CallsignInfo contains the result of a callsign lookup.
type CallsignInfo struct {
	Callsign     string    `json:"callsign"`
	Name         string    `json:"name,omitempty"`
	Address      string    `json:"address,omitempty"`
	City         string    `json:"city,omitempty"`
	State        string    `json:"state,omitempty"`
	PostalCode   string    `json:"postal_code,omitempty"`
	Country      string    `json:"country,omitempty"`
	Grid         string    `json:"grid,omitempty"`
	LicenseClass string    `json:"license_class,omitempty"`
	Expires      time.Time `json:"expires,omitempty"`
	Source       string    `json:"source"`
	FetchedAt    time.Time `json:"fetched_at"`
}

// Provider defines the interface for callsign lookup providers.
type Provider interface {
	// Name returns the provider name for source attribution.
	Name() string

	// Lookup performs a callsign lookup.
	Lookup(ctx context.Context, callsign string) (*CallsignInfo, error)

	// Supports returns true if this provider can handle the given callsign.
	Supports(callsign string) bool
}

// isUSCallsign checks if a callsign follows US callsign patterns.
// US callsigns: K*, W*, N*, A*, AA-AL, KA-KZ, NA-NZ, WA-WZ
func isUSCallsign(callsign string) bool {
	if len(callsign) < 2 {
		return false
	}

	prefix := callsign[:1]
	switch prefix {
	case "K", "W", "N":
		return true
	case "A":
		// AA-AL are US amateur callsigns
		if len(callsign) >= 2 {
			second := callsign[1]
			return second >= 'A' && second <= 'L'
		}
	}
	return false
}
