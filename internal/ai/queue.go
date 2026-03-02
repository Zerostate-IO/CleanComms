package ai

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"log/slog"
	"sync"
	"sync/atomic"
	"time"
)

// Queue errors.
var (
	ErrQueueFull        = errors.New("queue is full")
	ErrQueueDisabled    = errors.New("queue is disabled")
	ErrJobNotFound      = errors.New("job not found")
	ErrTimeout          = errors.New("operation timed out")
	ErrKillSwitchActive = errors.New("kill switch active")
)

// QueueConfig holds configuration for the inference queue.
type QueueConfig struct {
	// MaxQueueSize is the maximum number of pending jobs.
	MaxQueueSize int `yaml:"max_queue_size"`

	// MaxConcurrent is the maximum number of concurrent jobs.
	MaxConcurrent int `yaml:"max_concurrent"`

	// DefaultTimeout is the default job timeout.
	DefaultTimeout time.Duration `yaml:"default_timeout"`

	// Enabled controls whether the queue is active.
	Enabled bool `yaml:"enabled"`
}

// DefaultQueueConfig returns sensible defaults for queue configuration.
func DefaultQueueConfig() QueueConfig {
	return QueueConfig{
		MaxQueueSize:   100,
		MaxConcurrent:  4,
		DefaultTimeout: 30 * time.Second,
		Enabled:        false, // Disabled by default (V2 feature)
	}
}

// InferenceQueue manages async classification jobs.
// It provides timeout handling and kill switch functionality.
type InferenceQueue struct {
	config  QueueConfig
	service AIService
	logger  *slog.Logger

	mu      sync.RWMutex
	jobs    map[string]*ClassificationJob
	pending chan *ClassificationJob

	// Kill switch - when true, no new jobs are accepted and running jobs are cancelled.
	killSwitch atomic.Bool

	// Statistics
	completedCount atomic.Int64
	failedCount    atomic.Int64
	totalTimeMs    atomic.Int64

	// Lifecycle
	wg     sync.WaitGroup
	ctx    context.Context
	cancel context.CancelFunc
}

// NewInferenceQueue creates a new inference queue.
func NewInferenceQueue(config QueueConfig, service AIService, logger *slog.Logger) *InferenceQueue {
	ctx, cancel := context.WithCancel(context.Background())

	q := &InferenceQueue{
		config:  config,
		service: service,
		logger:  logger,
		jobs:    make(map[string]*ClassificationJob),
		pending: make(chan *ClassificationJob, config.MaxQueueSize),
		ctx:     ctx,
		cancel:  cancel,
	}

	// Start worker goroutines
	for i := 0; i < config.MaxConcurrent; i++ {
		q.wg.Add(1)
		go q.worker(i)
	}

	return q
}

// Enqueue adds a new classification job to the queue.
// Returns the job ID or an error if the queue is full or disabled.
func (q *InferenceQueue) Enqueue(req *ClassifySignalRequest) (string, error) {
	if !q.config.Enabled {
		return "", ErrQueueDisabled
	}

	if q.killSwitch.Load() {
		return "", ErrKillSwitchActive
	}

	jobID := generateJobID()
	if req.RequestID == "" {
		req.RequestID = jobID
	}

	job := &ClassificationJob{
		ID:        jobID,
		Request:   req,
		Status:    JobStatusPending,
		CreatedAt: time.Now(),
	}

	q.mu.Lock()
	q.jobs[jobID] = job
	q.mu.Unlock()

	select {
	case q.pending <- job:
		q.logger.Debug("job enqueued", "job_id", jobID, "queue_depth", len(q.pending))
		return jobID, nil
	default:
		q.mu.Lock()
		delete(q.jobs, jobID)
		q.mu.Unlock()
		return "", ErrQueueFull
	}
}

// GetJob retrieves a job by ID.
func (q *InferenceQueue) GetJob(jobID string) (*ClassificationJob, error) {
	q.mu.RLock()
	defer q.mu.RUnlock()

	job, ok := q.jobs[jobID]
	if !ok {
		return nil, ErrJobNotFound
	}
	return job, nil
}

// WaitForJob waits for a job to complete with timeout.
// Returns the completed job or an error if timeout exceeded.
func (q *InferenceQueue) WaitForJob(jobID string, timeout time.Duration) (*ClassificationJob, error) {
	if timeout <= 0 {
		timeout = q.config.DefaultTimeout
	}

	deadline := time.Now().Add(timeout)
	ticker := time.NewTicker(50 * time.Millisecond)
	defer ticker.Stop()

	for {
		job, err := q.GetJob(jobID)
		if err != nil {
			return nil, err
		}

		if job.Status == JobStatusCompleted || job.Status == JobStatusFailed ||
			job.Status == JobStatusCancelled || job.Status == JobStatusTimeout {
			return job, nil
		}

		if time.Now().After(deadline) {
			return nil, ErrTimeout
		}

		select {
		case <-ticker.C:
		case <-q.ctx.Done():
			return nil, q.ctx.Err()
		}
	}
}

// ActivateKillSwitch stops all job processing.
// Running jobs are marked as cancelled, no new jobs are accepted.
func (q *InferenceQueue) ActivateKillSwitch() {
	q.killSwitch.Store(true)
	q.logger.Warn("kill switch activated")

	q.mu.Lock()
	for _, job := range q.jobs {
		if job.Status == JobStatusPending || job.Status == JobStatusRunning {
			job.Status = JobStatusCancelled
			job.CompletedAt = time.Now()
		}
	}
	q.mu.Unlock()
}

// DeactivateKillSwitch allows job processing to resume.
func (q *InferenceQueue) DeactivateKillSwitch() {
	q.killSwitch.Store(false)
	q.logger.Info("kill switch deactivated")
}

// IsKillSwitchActive returns true if the kill switch is active.
func (q *InferenceQueue) IsKillSwitchActive() bool {
	return q.killSwitch.Load()
}

// GetStats returns queue statistics.
func (q *InferenceQueue) GetStats() QueueStats {
	q.mu.RLock()
	defer q.mu.RUnlock()

	pending := 0
	running := 0
	for _, job := range q.jobs {
		switch job.Status {
		case JobStatusPending:
			pending++
		case JobStatusRunning:
			running++
		}
	}

	var avgTime float64
	completed := q.completedCount.Load()
	if completed > 0 {
		avgTime = float64(q.totalTimeMs.Load()) / float64(completed)
	}

	return QueueStats{
		PendingJobs:             pending,
		RunningJobs:             running,
		CompletedJobs:           completed,
		FailedJobs:              q.failedCount.Load(),
		AverageProcessingTimeMs: avgTime,
		QueueDepth:              len(q.pending),
	}
}

// Shutdown gracefully shuts down the queue.
func (q *InferenceQueue) Shutdown() {
	q.logger.Info("shutting down inference queue")
	q.cancel()
	q.wg.Wait()
}

// worker processes jobs from the queue.
func (q *InferenceQueue) worker(id int) {
	defer q.wg.Done()

	for {
		select {
		case <-q.ctx.Done():
			return
		case job := <-q.pending:
			if job == nil {
				continue
			}
			q.processJob(job)
		}
	}
}

// processJob processes a single classification job.
func (q *InferenceQueue) processJob(job *ClassificationJob) {
	// Check kill switch before processing
	if q.killSwitch.Load() {
		q.mu.Lock()
		job.Status = JobStatusCancelled
		job.CompletedAt = time.Now()
		q.mu.Unlock()
		return
	}

	// Mark as running
	q.mu.Lock()
	job.Status = JobStatusRunning
	job.StartedAt = time.Now()
	q.mu.Unlock()

	// Create context with timeout
	ctx, cancel := context.WithTimeout(q.ctx, q.config.DefaultTimeout)
	defer cancel()

	// Process the job
	start := time.Now()
	result, err := q.service.ClassifySignal(ctx, job.Request)
	elapsed := time.Since(start)

	q.mu.Lock()
	defer q.mu.Unlock()

	if q.killSwitch.Load() {
		job.Status = JobStatusCancelled
		job.CompletedAt = time.Now()
		return
	}

	if err != nil {
		if errors.Is(err, context.DeadlineExceeded) {
			job.Status = JobStatusTimeout
		} else {
			job.Status = JobStatusFailed
		}
		job.Error = err.Error()
		job.CompletedAt = time.Now()
		q.failedCount.Add(1)
		q.logger.Error("job failed", "job_id", job.ID, "error", err)
		return
	}

	job.Status = JobStatusCompleted
	job.Result = result
	job.CompletedAt = time.Now()
	q.completedCount.Add(1)
	q.totalTimeMs.Add(elapsed.Milliseconds())

	q.logger.Debug("job completed", "job_id", job.ID, "duration_ms", elapsed.Milliseconds())
}

// StubAIService is a stub implementation of AIService for testing.
type StubAIService struct {
	ClassifySignalFunc func(ctx context.Context, req *ClassifySignalRequest) (*ClassifySignalResponse, error)
	Healthy            bool
	Enabled            bool
}

func (s *StubAIService) ClassifySignal(ctx context.Context, req *ClassifySignalRequest) (*ClassifySignalResponse, error) {
	if s.ClassifySignalFunc != nil {
		return s.ClassifySignalFunc(ctx, req)
	}
	return &ClassifySignalResponse{
		Version:          ContractVersion,
		RequestID:        req.RequestID,
		SignalType:       SignalTypeDigital,
		Confidence:       0.85,
		ConfidenceLevel:  ConfidenceHigh,
		DetectedMode:     "FT8",
		ProcessingTimeMs: 150,
		ModelVersion:     "stub-v1",
		Timestamp:        time.Now(),
	}, nil
}

func (s *StubAIService) IsHealthy() bool {
	return s.Healthy
}

func (s *StubAIService) IsEnabled() bool {
	return s.Enabled
}

// Ensure stub implements interface.
var _ AIService = (*StubAIService)(nil)

// generateJobID creates a unique job identifier.
func generateJobID() string {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		// Fallback to timestamp-based ID if random fails
		return hex.EncodeToString([]byte(time.Now().Format("20060102150405.999999999")))
	}
	return hex.EncodeToString(b)
}

