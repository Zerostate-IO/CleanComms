package lookup

import (
	"context"
	"log/slog"
	"strings"
	"time"
)

// ServiceConfig holds configuration for the LookupService.
type ServiceConfig struct {
	// HamQTH credentials (optional - if empty, HamQTH is disabled)
	HamQTHUsername string
	HamQTHPassword string

	// CacheTTL is the time-to-live for cached entries (default 24h)
	CacheTTL time.Duration
}

// Service provides callsign lookup with provider chain and caching.
type Service struct {
	providers []Provider
	cache     *Cache
	logger    *slog.Logger
	enabled   bool
}

// NewService creates a new lookup service with the given configuration.
func NewService(cfg ServiceConfig, logger *slog.Logger) *Service {
	if logger == nil {
		logger = slog.Default()
	}

	cache := NewCache(cfg.CacheTTL)

	// Build provider chain
	var providers []Provider

	// Add HamQTH as primary provider if credentials are configured
	if cfg.HamQTHUsername != "" && cfg.HamQTHPassword != "" {
		hamqth := NewHamQTHProvider(cfg.HamQTHUsername, cfg.HamQTHPassword)
		cachedHamQTH := NewCachedProvider(hamqth, cache)
		providers = append(providers, cachedHamQTH)
		logger.Info("lookup service: HamQTH provider enabled")
	} else {
		logger.Info("lookup service: HamQTH provider disabled (no credentials)")
	}

	// Add FCC as fallback for US callsigns
	fcc := NewFCCProvider()
	cachedFCC := NewCachedProvider(fcc, cache)
	providers = append(providers, cachedFCC)
	logger.Info("lookup service: FCC provider enabled as fallback")

	return &Service{
		providers: providers,
		cache:     cache,
		logger:    logger,
		enabled:   len(providers) > 0,
	}
}

// Lookup performs a callsign lookup using the provider chain.
// It tries each provider in order until one succeeds or all fail.
func (s *Service) Lookup(ctx context.Context, callsign string) (*CallsignInfo, error) {
	callsign = strings.ToUpper(strings.TrimSpace(callsign))

	if callsign == "" {
		return nil, ErrNotFound
	}

	if !s.enabled {
		return nil, ErrProviderDown
	}

	var lastErr error

	for _, provider := range s.providers {
		// Skip providers that don't support this callsign
		if !provider.Supports(callsign) {
			s.logger.Debug("provider does not support callsign",
				"provider", provider.Name(),
				"callsign", callsign,
			)
			continue
		}

		s.logger.Debug("trying provider for lookup",
			"provider", provider.Name(),
			"callsign", callsign,
		)

		info, err := provider.Lookup(ctx, callsign)
		if err == nil {
			s.logger.Info("lookup successful",
				"provider", provider.Name(),
				"callsign", callsign,
			)
			return info, nil
		}

		// Record error and try next provider
		lastErr = err
		s.logger.Debug("provider lookup failed",
			"provider", provider.Name(),
			"callsign", callsign,
			"error", err,
		)

		// Don't continue if it was a definitive "not found"
		if err == ErrNotFound {
			break
		}
	}

	// All providers failed
	if lastErr == ErrNotFound {
		return nil, ErrNotFound
	}

	return nil, lastErr
}

// IsEnabled returns true if at least one provider is configured.
func (s *Service) IsEnabled() bool {
	return s.enabled
}

// ClearCache clears all cached entries.
func (s *Service) ClearCache() {
	s.cache.Clear()
}

// PruneCache removes expired entries from the cache.
func (s *Service) PruneCache() int {
	return s.cache.Prune()
}

// CacheSize returns the number of entries in the cache.
func (s *Service) CacheSize() int {
	return s.cache.Size()
}

// ProviderStatus returns the status of each provider.
type ProviderStatus struct {
	Name     string `json:"name"`
	Enabled  bool   `json:"enabled"`
	Priority int    `json:"priority"`
}

// GetProviders returns information about configured providers.
func (s *Service) GetProviders() []ProviderStatus {
	result := make([]ProviderStatus, len(s.providers))
	for i, p := range s.providers {
		result[i] = ProviderStatus{
			Name:     p.Name(),
			Enabled:  true,
			Priority: i + 1,
		}
	}
	return result
}
