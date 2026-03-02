package ai

import (
	"time"
)

// Contract versioning for V2 signal classification API.
// These constants should be incremented when breaking changes are made.
const (
	// APIVersionV2 is the version string for V2 API.
	APIVersionV2 = "v2"
	// ContractVersion is the current contract version number.
	ContractVersion = 1
)

// ClassifySignalRequest represents a V2 signal classification request.
// This is the input contract for the AI classification service.
type ClassifySignalRequest struct {
	// Version is the contract version for compatibility checking.
	Version int `json:"version"`

	// RequestID is a unique identifier for tracking this request.
	RequestID string `json:"request_id"`

	// Frequency is the center frequency in Hz.
	Frequency int64 `json:"frequency"`

	// Mode is the current operating mode (e.g., "USB", "LSB", "CW").
	Mode string `json:"mode"`

	// Bandwidth is the signal bandwidth in Hz.
	Bandwidth int `json:"bandwidth"`

	// SampleRate is the audio sample rate in Hz.
	SampleRate int `json:"sample_rate"`

	// AudioData is the raw audio samples (16-bit PCM).
	// This field may be large; consider streaming for production use.
	AudioData []byte `json:"audio_data,omitempty"`

	// AudioDataURL is an optional URL to fetch audio data from.
	// If provided, AudioData may be empty.
	AudioDataURL string `json:"audio_data_url,omitempty"`

	// Timestamp is when the sample was captured.
	Timestamp time.Time `json:"timestamp"`

	// Metadata contains optional additional context.
	Metadata map[string]string `json:"metadata,omitempty"`
}

// ClassifySignalResponse represents a V2 signal classification response.
// This is the output contract for the AI classification service.
type ClassifySignalResponse struct {
	// Version is the contract version for compatibility checking.
	Version int `json:"version"`

	// RequestID matches the request for correlation.
	RequestID string `json:"request_id"`

	// SignalType is the detected signal type.
	SignalType SignalType `json:"signal_type"`

	// Confidence is the classification confidence (0.0 to 1.0).
	Confidence float64 `json:"confidence"`

	// ConfidenceLevel is the categorical confidence level.
	ConfidenceLevel ConfidenceLevel `json:"confidence_level"`

	// DetectedMode is the specific mode detected (e.g., "FT8", "PSK31").
	DetectedMode string `json:"detected_mode,omitempty"`

	// ProcessingTimeMs is the time taken for classification in milliseconds.
	ProcessingTimeMs int64 `json:"processing_time_ms"`

	// ModelVersion is the version of the ML model used.
	ModelVersion string `json:"model_version"`

	// Timestamp is when classification completed.
	Timestamp time.Time `json:"timestamp"`

	// AdditionalInfo contains optional extra details.
	AdditionalInfo map[string]interface{} `json:"additional_info,omitempty"`
}

// ClassificationJob represents a queued classification job.
// This is used internally by the async queue.
type ClassificationJob struct {
	// ID is the unique job identifier.
	ID string `json:"id"`

	// Request is the original classification request.
	Request *ClassifySignalRequest `json:"request"`

	// Status is the current job status.
	Status JobStatus `json:"status"`

	// Result is the classification result (populated on completion).
	Result *ClassifySignalResponse `json:"result,omitempty"`

	// Error is the error message if the job failed.
	Error string `json:"error,omitempty"`

	// CreatedAt is when the job was created.
	CreatedAt time.Time `json:"created_at"`

	// StartedAt is when processing began.
	StartedAt time.Time `json:"started_at,omitempty"`

	// CompletedAt is when processing finished.
	CompletedAt time.Time `json:"completed_at,omitempty"`

	// KillSwitch if true, indicates the job should be cancelled.
	KillSwitch bool `json:"kill_switch"`
}

// JobStatus represents the status of a classification job.
type JobStatus string

const (
	// JobStatusPending indicates the job is waiting to be processed.
	JobStatusPending JobStatus = "pending"
	// JobStatusRunning indicates the job is currently being processed.
	JobStatusRunning JobStatus = "running"
	// JobStatusCompleted indicates the job finished successfully.
	JobStatusCompleted JobStatus = "completed"
	// JobStatusFailed indicates the job failed with an error.
	JobStatusFailed JobStatus = "failed"
	// JobStatusCancelled indicates the job was cancelled via kill switch.
	JobStatusCancelled JobStatus = "cancelled"
	// JobStatusTimeout indicates the job exceeded its timeout.
	JobStatusTimeout JobStatus = "timeout"
)

// QueueStats represents statistics about the inference queue.
type QueueStats struct {
	// PendingJobs is the number of jobs waiting to be processed.
	PendingJobs int `json:"pending_jobs"`

	// RunningJobs is the number of jobs currently processing.
	RunningJobs int `json:"running_jobs"`

	// CompletedJobs is the total number of completed jobs.
	CompletedJobs int64 `json:"completed_jobs"`

	// FailedJobs is the total number of failed jobs.
	FailedJobs int64 `json:"failed_jobs"`

	// AverageProcessingTimeMs is the average processing time.
	AverageProcessingTimeMs float64 `json:"average_processing_time_ms"`

	// QueueDepth is the current queue depth.
	QueueDepth int `json:"queue_depth"`
}
