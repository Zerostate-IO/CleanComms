package lookup

import (
	"context"
	"encoding/xml"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"
)

const (
	hamqthBaseURL = "https://www.hamqth.com/xml.php"
	hamqthTimeout = 10 * time.Second
	sessionBuffer = 5 * time.Minute // Refresh session before it expires
)

// HamQTHProvider implements Provider using the HamQTH API.
type HamQTHProvider struct {
	username string
	password string
	client   *http.Client

	// Session management
	mu         sync.Mutex
	sessionID  string
	sessionExp time.Time
}

// hamQTHSessionResponse represents the session XML response.
type hamQTHSessionResponse struct {
	Session struct {
		SessionID string `xml:"session_id"`
		Error     string `xml:"error"`
	} `xml:"session"`
}

// hamQTHSearchResponse represents the search result XML response.
type hamQTHSearchResponse struct {
	Search struct {
		Callsign string `xml:"callsign"`
		Name     string `xml:"nick,omitempty"`
		FullName string `xml:"name,omitempty"`
		Addr1    string `xml:"adr_street,omitempty"`
		Addr2    string `xml:"adr_city,omitempty"`
		State    string `xml:"adr_us_state,omitempty"`
		Zip      string `xml:"adr_zip,omitempty"`
		Country  string `xml:"country,omitempty"`
		Grid     string `xml:"grid,omitempty"`
		Adif     string `xml:"adif,omitempty"`
		Error    string `xml:"error,omitempty"`
	} `xml:"search"`
}

// NewHamQTHProvider creates a new HamQTH provider.
func NewHamQTHProvider(username, password string) *HamQTHProvider {
	return &HamQTHProvider{
		username: username,
		password: password,
		client: &http.Client{
			Timeout: hamqthTimeout,
		},
	}
}

// Name returns the provider name.
func (h *HamQTHProvider) Name() string {
	return "hamqth"
}

// Supports returns true for all callsigns (HamQTH has worldwide data).
func (h *HamQTHProvider) Supports(callsign string) bool {
	return len(strings.TrimSpace(callsign)) >= 3
}

// Lookup performs a callsign lookup via HamQTH.
func (h *HamQTHProvider) Lookup(ctx context.Context, callsign string) (*CallsignInfo, error) {
	callsign = strings.ToUpper(strings.TrimSpace(callsign))

	// Ensure we have a valid session
	sessionID, err := h.getSession(ctx)
	if err != nil {
		return nil, fmt.Errorf("%w: %v", ErrProviderDown, err)
	}

	// Build query URL
	u, err := url.Parse(hamqthBaseURL)
	if err != nil {
		return nil, fmt.Errorf("failed to parse URL: %w", err)
	}
	q := u.Query()
	q.Set("id", sessionID)
	q.Set("callsign", callsign)
	q.Set("prg", "cleancomms")
	u.RawQuery = q.Encode()

	// Make request
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u.String(), nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	resp, err := h.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("%w: %v", ErrProviderDown, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("%w: HTTP %d", ErrProviderDown, resp.StatusCode)
	}

	// Parse response
	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	var result hamQTHSearchResponse
	if err := xml.Unmarshal(data, &result); err != nil {
		return nil, fmt.Errorf("failed to parse XML: %w", err)
	}

	// Check for error in response
	if result.Search.Error != "" {
		if strings.Contains(strings.ToLower(result.Search.Error), "not found") ||
			strings.Contains(strings.ToLower(result.Search.Error), "does not exist") {
			return nil, ErrNotFound
		}
		// Session expired - clear and retry
		if strings.Contains(strings.ToLower(result.Search.Error), "session") {
			h.mu.Lock()
			h.sessionID = ""
			h.sessionExp = time.Time{}
			h.mu.Unlock()
			return nil, fmt.Errorf("%w: session expired", ErrProviderDown)
		}
		return nil, fmt.Errorf("hamqth error: %s", result.Search.Error)
	}

	// Validate result has callsign
	if result.Search.Callsign == "" {
		return nil, ErrNotFound
	}

	// Build CallsignInfo - use FullName if Nick is empty
	name := result.Search.Name
	if name == "" {
		name = result.Search.FullName
	}

	// Parse ADIF to get country info if needed
	country := result.Search.Country
	if country == "" && result.Search.Adif != "" {
		// ADIF can be used to look up country, but we'll skip for now
	}

	return &CallsignInfo{
		Callsign:     result.Search.Callsign,
		Name:         name,
		Address:      result.Search.Addr1,
		City:         result.Search.Addr2,
		State:        result.Search.State,
		PostalCode:   result.Search.Zip,
		Country:      country,
		Grid:         result.Search.Grid,
		LicenseClass: "", // HamQTH doesn't provide this
		Source:       "hamqth",
		FetchedAt:    time.Now(),
	}, nil
}

// getSession returns a valid session ID, creating a new one if necessary.
func (h *HamQTHProvider) getSession(ctx context.Context) (string, error) {
	h.mu.Lock()
	defer h.mu.Unlock()

	// Check if we have a valid session
	if h.sessionID != "" && time.Now().Before(h.sessionExp.Add(-sessionBuffer)) {
		return h.sessionID, nil
	}

	// Create new session
	u, err := url.Parse(hamqthBaseURL)
	if err != nil {
		return "", fmt.Errorf("failed to parse URL: %w", err)
	}
	q := u.Query()
	q.Set("u", h.username)
	q.Set("p", h.password)
	u.RawQuery = q.Encode()

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, u.String(), nil)
	if err != nil {
		return "", fmt.Errorf("failed to create request: %w", err)
	}

	resp, err := h.client.Do(req)
	if err != nil {
		return "", fmt.Errorf("failed to get session: %w", err)
	}
	defer resp.Body.Close()

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("failed to read response: %w", err)
	}

	var session hamQTHSessionResponse
	if err := xml.Unmarshal(data, &session); err != nil {
		return "", fmt.Errorf("failed to parse session response: %w", err)
	}

	if session.Session.Error != "" {
		return "", fmt.Errorf("hamqth auth error: %s", session.Session.Error)
	}

	if session.Session.SessionID == "" {
		return "", fmt.Errorf("empty session ID received")
	}

	// HamQTH sessions last ~1 hour, we'll set expiry to 55 minutes
	h.sessionID = session.Session.SessionID
	h.sessionExp = time.Now().Add(55 * time.Minute)

	return h.sessionID, nil
}
