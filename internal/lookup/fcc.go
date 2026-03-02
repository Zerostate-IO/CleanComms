package lookup

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

const (
	fccBaseURL = "https://data.fcc.gov/api/license-viewer-api/api/jsonp/licensedetail"
	fccTimeout = 10 * time.Second
)

// FCCProvider implements Provider using the FCC ULS API.
// This provider only supports US callsigns.
type FCCProvider struct {
	client *http.Client
}

// fccLicenseDetail represents the FCC API response structure.
type fccLicenseDetail struct {
	Status   string `json:"status"`
	RowCount int    `json:"rowCount"`
	Licenses []struct {
		Callsign       string `json:"callsign"`
		Name           string `json:"name"`
		Line1          string `json:"line1"`
		Line2          string `json:"line2"`
		City           string `json:"city"`
		State          string `json:"state"`
		Zip            string `json:"zip"`
		Country        string `json:"country"`
		LicenseClass   string `json:"operatorClass"`
		LicenseStatus  string `json:"status"`
		ExpirationDate string `json:"expirationDate"`
	} `json:"Licenses"`
}

// fccErrorResponse represents an FCC API error.
type fccErrorResponse struct {
	Status  string `json:"status"`
	Message string `json:"message"`
}

// NewFCCProvider creates a new FCC provider.
func NewFCCProvider() *FCCProvider {
	return &FCCProvider{
		client: &http.Client{
			Timeout: fccTimeout,
		},
	}
}

// Name returns the provider name.
func (f *FCCProvider) Name() string {
	return "fcc"
}

// Supports returns true only for US callsigns.
func (f *FCCProvider) Supports(callsign string) bool {
	return isUSCallsign(strings.ToUpper(strings.TrimSpace(callsign)))
}

// Lookup performs a callsign lookup via FCC ULS.
func (f *FCCProvider) Lookup(ctx context.Context, callsign string) (*CallsignInfo, error) {
	callsign = strings.ToUpper(strings.TrimSpace(callsign))

	if !f.Supports(callsign) {
		return nil, ErrNotSupported
	}

	// Build query URL
	u, err := url.Parse(fccBaseURL)
	if err != nil {
		return nil, fmt.Errorf("failed to parse URL: %w", err)
	}
	q := u.Query()
	q.Set("callsign", callsign)
	q.Set("format", "json")
	u.RawQuery = q.Encode()

	// Make request
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u.String(), nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	// FCC API requires a specific user agent
	req.Header.Set("User-Agent", "CleanComms/1.0")
	req.Header.Set("Accept", "application/json")

	resp, err := f.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("%w: %v", ErrProviderDown, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("%w: HTTP %d", ErrProviderDown, resp.StatusCode)
	}

	// Read and parse response
	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	// Strip JSONP callback wrapper if present
	jsonData := string(data)
	if strings.HasPrefix(jsonData, "(") && strings.HasSuffix(jsonData, ")") {
		jsonData = strings.TrimPrefix(jsonData, "(")
		jsonData = strings.TrimSuffix(jsonData, ")")
	}

	var result fccLicenseDetail
	if err := json.Unmarshal([]byte(jsonData), &result); err != nil {
		return nil, fmt.Errorf("failed to parse JSON: %w", err)
	}

	// Check for errors
	if result.Status == "ERROR" || result.RowCount == 0 || len(result.Licenses) == 0 {
		return nil, ErrNotFound
	}

	// Get first matching license
	license := result.Licenses[0]

	// Check if license is active
	if license.LicenseStatus != "" && !strings.EqualFold(license.LicenseStatus, "active") {
		return nil, ErrNotFound
	}

	// Build address from lines
	address := license.Line1
	if license.Line2 != "" {
		if address != "" {
			address += ", " + license.Line2
		} else {
			address = license.Line2
		}
	}

	// Parse expiration date
	var expires time.Time
	if license.ExpirationDate != "" {
		// FCC dates are typically in MM/DD/YYYY format
		expires, _ = time.Parse("01/02/2006", license.ExpirationDate)
	}

	return &CallsignInfo{
		Callsign:     license.Callsign,
		Name:         license.Name,
		Address:      address,
		City:         license.City,
		State:        license.State,
		PostalCode:   license.Zip,
		Country:      "United States",
		Grid:         "", // FCC doesn't provide grid locator
		LicenseClass: license.LicenseClass,
		Expires:      expires,
		Source:       "fcc",
		FetchedAt:    time.Now(),
	}, nil
}
