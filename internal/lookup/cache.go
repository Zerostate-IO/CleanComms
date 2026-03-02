package lookup

import (
	"context"
	"strings"
	"sync"
	"time"
)

// DefaultCacheTTL is the default time-to-live for cached entries.
const DefaultCacheTTL = 24 * time.Hour

// cachedEntry represents a cached lookup result.
type cachedEntry struct {
	info      *CallsignInfo
	expiresAt time.Time
}

// Cache provides an in-memory cache for callsign lookups with TTL.
type Cache struct {
	entries map[string]*cachedEntry
	ttl     time.Duration
	mu      sync.RWMutex
}

// NewCache creates a new cache with the specified TTL.
func NewCache(ttl time.Duration) *Cache {
	if ttl <= 0 {
		ttl = DefaultCacheTTL
	}
	return &Cache{
		entries: make(map[string]*cachedEntry),
		ttl:     ttl,
	}
}

// Get retrieves a cached entry. Returns nil if not found or expired.
func (c *Cache) Get(callsign string) *CallsignInfo {
	key := normalizeCallsign(callsign)

	c.mu.RLock()
	defer c.mu.RUnlock()

	entry, exists := c.entries[key]
	if !exists {
		return nil
	}

	if time.Now().After(entry.expiresAt) {
		return nil
	}

	return entry.info
}

// Set stores an entry in the cache.
func (c *Cache) Set(info *CallsignInfo) {
	if info == nil || info.Callsign == "" {
		return
	}

	key := normalizeCallsign(info.Callsign)

	c.mu.Lock()
	defer c.mu.Unlock()

	c.entries[key] = &cachedEntry{
		info:      info,
		expiresAt: time.Now().Add(c.ttl),
	}
}

// Delete removes an entry from the cache.
func (c *Cache) Delete(callsign string) {
	key := normalizeCallsign(callsign)

	c.mu.Lock()
	defer c.mu.Unlock()

	delete(c.entries, key)
}

// Clear removes all entries from the cache.
func (c *Cache) Clear() {
	c.mu.Lock()
	defer c.mu.Unlock()

	c.entries = make(map[string]*cachedEntry)
}

// Size returns the number of entries in the cache (including expired).
func (c *Cache) Size() int {
	c.mu.RLock()
	defer c.mu.RUnlock()

	return len(c.entries)
}

// Prune removes expired entries from the cache.
func (c *Cache) Prune() int {
	c.mu.Lock()
	defer c.mu.Unlock()

	now := time.Now()
	count := 0
	for key, entry := range c.entries {
		if now.After(entry.expiresAt) {
			delete(c.entries, key)
			count++
		}
	}
	return count
}

// CachedProvider wraps a Provider with caching.
type CachedProvider struct {
	provider Provider
	cache    *Cache
}

// NewCachedProvider creates a provider wrapper with caching.
func NewCachedProvider(provider Provider, cache *Cache) *CachedProvider {
	return &CachedProvider{
		provider: provider,
		cache:    cache,
	}
}

// Name returns the underlying provider name.
func (cp *CachedProvider) Name() string {
	return cp.provider.Name()
}

// Supports delegates to the underlying provider.
func (cp *CachedProvider) Supports(callsign string) bool {
	return cp.provider.Supports(callsign)
}

// Lookup checks cache first, then delegates to provider.
func (cp *CachedProvider) Lookup(ctx context.Context, callsign string) (*CallsignInfo, error) {
	// Check cache first
	if info := cp.cache.Get(callsign); info != nil {
		return info, nil
	}

	// Perform lookup
	info, err := cp.provider.Lookup(ctx, callsign)
	if err != nil {
		return nil, err
	}

	// Cache successful result
	cp.cache.Set(info)

	return info, nil
}

// GetCache returns the underlying cache for direct access.
func (cp *CachedProvider) GetCache() *Cache {
	return cp.cache
}

func normalizeCallsign(callsign string) string {
	return strings.ToUpper(strings.TrimSpace(callsign))
}
