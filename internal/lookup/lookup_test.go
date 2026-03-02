package lookup

import (
	"context"
	"errors"
	"log/slog"
	"testing"
	"time"
)
// mockProvider is a mock implementation of Provider for testing.
type mockProvider struct {
	name      string
	supports  func(string) bool
	lookup    func(context.Context, string) (*CallsignInfo, error)
	lookupCnt int
}

func (m *mockProvider) Name() string {
	return m.name
}

func (m *mockProvider) Supports(callsign string) bool {
	if m.supports != nil {
		return m.supports(callsign)
	}
	return true
}

func (m *mockProvider) Lookup(ctx context.Context, callsign string) (*CallsignInfo, error) {
	m.lookupCnt++
	if m.lookup != nil {
		return m.lookup(ctx, callsign)
	}
	return nil, ErrNotFound
}

func TestIsUSCallsign(t *testing.T) {
	tests := []struct {
		callsign string
		want     bool
	}{
		{"W1AW", true},
		{"K1ABC", true},
		{"N2XYZ", true},
		{"AA0AA", true},
		{"AL9K", true},
		{"KA1ABC", true},
		{"WZ1ZZZ", true},
		{"DL1ABC", false}, // German
		{"JA1ABC", false}, // Japanese
		{"VK1ABC", false}, // Australian
		{"", false},
		{"A", false},
		{"AM1ABC", false}, // AM is not US amateur prefix
	}

	for _, tt := range tests {
		t.Run(tt.callsign, func(t *testing.T) {
			got := isUSCallsign(tt.callsign)
			if got != tt.want {
				t.Errorf("isUSCallsign(%q) = %v, want %v", tt.callsign, got, tt.want)
			}
		})
	}
}

func TestCache(t *testing.T) {
	cache := NewCache(time.Hour)

	info := &CallsignInfo{
		Callsign:  "W1AW",
		Name:      "ARRL HQ",
		Source:    "test",
		FetchedAt: time.Now(),
	}

	// Test Set and Get
	cache.Set(info)
	got := cache.Get("W1AW")
	if got == nil {
		t.Fatal("expected cached entry, got nil")
	}
	if got.Callsign != "W1AW" {
		t.Errorf("got callsign %q, want %q", got.Callsign, "W1AW")
	}

	// Test case-insensitive
	got = cache.Get("w1aw")
	if got == nil {
		t.Fatal("expected case-insensitive match")
	}

	// Test Delete
	cache.Delete("W1AW")
	got = cache.Get("W1AW")
	if got != nil {
		t.Error("expected nil after delete")
	}

	// Test Clear
	cache.Set(info)
	cache.Set(&CallsignInfo{Callsign: "K1ABC", Source: "test"})
	if cache.Size() != 2 {
		t.Errorf("cache size = %d, want 2", cache.Size())
	}
	cache.Clear()
	if cache.Size() != 0 {
		t.Errorf("cache size after clear = %d, want 0", cache.Size())
	}
}

func TestCacheExpiry(t *testing.T) {
	// Use very short TTL for testing
	cache := NewCache(100 * time.Millisecond)

	info := &CallsignInfo{
		Callsign:  "W1AW",
		Source:    "test",
		FetchedAt: time.Now(),
	}

	cache.Set(info)

	// Should be present immediately
	if got := cache.Get("W1AW"); got == nil {
		t.Fatal("expected cached entry immediately after set")
	}

	// Wait for expiry
	time.Sleep(150 * time.Millisecond)

	// Should be expired
	if got := cache.Get("W1AW"); got != nil {
		t.Error("expected nil after expiry")
	}
}

func TestCachePrune(t *testing.T) {
	cache := NewCache(100 * time.Millisecond)

	// Add multiple entries
	cache.Set(&CallsignInfo{Callsign: "W1AW", Source: "test"})
	cache.Set(&CallsignInfo{Callsign: "K1ABC", Source: "test"})
	cache.Set(&CallsignInfo{Callsign: "N2XYZ", Source: "test"})

	if cache.Size() != 3 {
		t.Fatalf("cache size = %d, want 3", cache.Size())
	}

	// Wait for expiry
	time.Sleep(150 * time.Millisecond)

	// Prune should remove all expired entries
	pruned := cache.Prune()
	if pruned != 3 {
		t.Errorf("pruned = %d, want 3", pruned)
	}
	if cache.Size() != 0 {
		t.Errorf("cache size after prune = %d, want 0", cache.Size())
	}
}

func TestCachedProvider(t *testing.T) {
	lookupCount := 0
	mock := &mockProvider{
		name: "mock",
		lookup: func(ctx context.Context, callsign string) (*CallsignInfo, error) {
			lookupCount++
			return &CallsignInfo{
				Callsign:  callsign,
				Name:      "Test User",
				Source:    "mock",
				FetchedAt: time.Now(),
			}, nil
		},
	}

	cache := NewCache(time.Hour)
	cached := NewCachedProvider(mock, cache)

	// First lookup should call provider
	info1, err := cached.Lookup(context.Background(), "W1AW")
	if err != nil {
		t.Fatalf("first lookup failed: %v", err)
	}
	if lookupCount != 1 {
		t.Errorf("lookup count = %d, want 1", lookupCount)
	}

	// Second lookup should use cache
	info2, err := cached.Lookup(context.Background(), "W1AW")
	if err != nil {
		t.Fatalf("second lookup failed: %v", err)
	}
	if lookupCount != 1 {
		t.Errorf("lookup count after cache hit = %d, want 1", lookupCount)
	}

	// Results should match
	if info1.Callsign != info2.Callsign {
		t.Errorf("cached result mismatch")
	}
}

func TestCachedProvider_PropagatesError(t *testing.T) {
	mock := &mockProvider{
		name: "mock",
		lookup: func(ctx context.Context, callsign string) (*CallsignInfo, error) {
			return nil, ErrNotFound
		},
	}

	cache := NewCache(time.Hour)
	cached := NewCachedProvider(mock, cache)

	_, err := cached.Lookup(context.Background(), "W1AW")
	if !errors.Is(err, ErrNotFound) {
		t.Errorf("expected ErrNotFound, got %v", err)
	}

	// Error should not be cached (subsequent call still invokes provider)
	if mock.lookupCnt != 1 {
		t.Errorf("lookup count = %d, want 1", mock.lookupCnt)
	}
}

func TestService_ProviderChain(t *testing.T) {
	primaryCalled := false
	fallbackCalled := false

	primary := &mockProvider{
		name: "primary",
		supports: func(callsign string) bool {
			return true
		},
		lookup: func(ctx context.Context, callsign string) (*CallsignInfo, error) {
			primaryCalled = true
			return nil, ErrProviderDown // Simulate primary failure
		},
	}

	fallback := &mockProvider{
		name: "fallback",
		supports: func(callsign string) bool {
			return true
		},
		lookup: func(ctx context.Context, callsign string) (*CallsignInfo, error) {
			fallbackCalled = true
			return &CallsignInfo{
				Callsign:  callsign,
				Name:      "Fallback User",
				Source:    "fallback",
				FetchedAt: time.Now(),
			}, nil
		},
	}

	cache := NewCache(time.Hour)
	svc := &Service{
		providers: []Provider{
			NewCachedProvider(primary, cache),
			NewCachedProvider(fallback, cache),
		},
		cache:   cache,
		logger:  slog.Default(),
		enabled: true,
	}
	info, err := svc.Lookup(context.Background(), "W1AW")
	if err != nil {
		t.Fatalf("lookup failed: %v", err)
	}

	if !primaryCalled {
		t.Error("expected primary provider to be called")
	}
	if !fallbackCalled {
		t.Error("expected fallback provider to be called")
	}
	if info.Source != "fallback" {
		t.Errorf("source = %q, want %q", info.Source, "fallback")
	}
}

func TestService_SkipUnsupportedProvider(t *testing.T) {
	usOnly := &mockProvider{
		name: "us-only",
		supports: func(callsign string) bool {
			return isUSCallsign(callsign)
		},
		lookup: func(ctx context.Context, callsign string) (*CallsignInfo, error) {
			return &CallsignInfo{Callsign: callsign, Source: "us-only"}, nil
		},
	}

	worldwide := &mockProvider{
		name: "worldwide",
		supports: func(callsign string) bool {
			return true
		},
		lookup: func(ctx context.Context, callsign string) (*CallsignInfo, error) {
			return &CallsignInfo{Callsign: callsign, Source: "worldwide"}, nil
		},
	}

	cache := NewCache(time.Hour)
	svc := &Service{
		providers: []Provider{
			NewCachedProvider(usOnly, cache),
			NewCachedProvider(worldwide, cache),
		},
		cache:   cache,
		logger:  slog.Default(),
		enabled: true,
	}
	// Non-US callsign should skip us-only provider
	info, err := svc.Lookup(context.Background(), "DL1ABC")
	if err != nil {
		t.Fatalf("lookup failed: %v", err)
	}
	if info.Source != "worldwide" {
		t.Errorf("source = %q, want %q", info.Source, "worldwide")
	}
	if usOnly.lookupCnt != 0 {
		t.Error("us-only provider should not have been called for non-US callsign")
	}
}

func TestService_NotFound(t *testing.T) {
	mock := &mockProvider{
		name: "mock",
		lookup: func(ctx context.Context, callsign string) (*CallsignInfo, error) {
			return nil, ErrNotFound
		},
	}
	cache := NewCache(time.Hour)
	svc := &Service{
		providers: []Provider{NewCachedProvider(mock, cache)},
		cache:     cache,
		logger:    slog.Default(),
		enabled:   true,
	}
	_, err := svc.Lookup(context.Background(), "INVALID")
	if !errors.Is(err, ErrNotFound) {
		t.Errorf("expected ErrNotFound, got %v", err)
	}
}

func TestService_EmptyCallsign(t *testing.T) {
	svc := &Service{enabled: true, logger: slog.Default()}
	_, err := svc.Lookup(context.Background(), "")
	if !errors.Is(err, ErrNotFound) {
		t.Errorf("expected ErrNotFound for empty callsign, got %v", err)
	}
}

func TestService_Disabled(t *testing.T) {
	svc := &Service{enabled: false, logger: slog.Default()}
	_, err := svc.Lookup(context.Background(), "W1AW")
	if !errors.Is(err, ErrProviderDown) {
		t.Errorf("expected ErrProviderDown for disabled service, got %v", err)
	}
}
