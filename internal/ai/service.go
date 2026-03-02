// Package ai provides AI service interfaces for signal classification.
// This is a V2 feature that is disabled by default.
package ai

import (
	"context"
)

// AIService defines the interface for AI-based signal classification.
// Implementations should be safe for concurrent use.
type AIService interface {
	// ClassifySignal performs classification on the provided signal data.
	// It returns a ClassificationResult or an error if classification fails.
	// The context can be used to cancel the operation.
	ClassifySignal(ctx context.Context, req *ClassifySignalRequest) (*ClassifySignalResponse, error)

	// IsHealthy returns true if the AI service is operational.
	IsHealthy() bool

	// IsEnabled returns true if the AI service is configured and enabled.
	IsEnabled() bool
}

// SignalType represents the type of a detected signal.
type SignalType string

const (
	// SignalTypeUnknown indicates the signal type could not be determined.
	SignalTypeUnknown SignalType = "unknown"
	// SignalTypeVoice indicates a voice signal.
	SignalTypeVoice SignalType = "voice"
	// SignalTypeCW indicates continuous wave (Morse code).
	SignalTypeCW SignalType = "cw"
	// SignalTypeDigital indicates a digital mode signal.
	SignalTypeDigital SignalType = "digital"
	// SignalTypeNoise indicates noise or no signal present.
	SignalTypeNoise SignalType = "noise"
)

// ConfidenceLevel represents confidence thresholds for classification.
type ConfidenceLevel string

const (
	// ConfidenceLow indicates low confidence in classification.
	ConfidenceLow ConfidenceLevel = "low"
	// ConfidenceMedium indicates medium confidence in classification.
	ConfidenceMedium ConfidenceLevel = "medium"
	// ConfidenceHigh indicates high confidence in classification.
	ConfidenceHigh ConfidenceLevel = "high"
)

// ServiceHealth represents the health status of the AI service.
type ServiceHealth struct {
	OK          bool   `json:"ok"`
	Message     string `json:"message,omitempty"`
	ModelLoaded bool   `json:"model_loaded"`
}
