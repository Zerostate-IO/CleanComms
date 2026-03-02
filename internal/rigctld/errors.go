// Package rigctld provides a TCP client for communicating with rigctld (Hamlib daemon).
package rigctld

import (
	"errors"
	"fmt"
	"strconv"
	"strings"
)

// Sentinel errors for common failure modes.
var (
	// ErrNotConnected indicates the client is not connected to rigctld.
	ErrNotConnected = errors.New("rigctld: not connected")

	// ErrConnectionRefused indicates the connection was refused (rigctld not running).
	ErrConnectionRefused = errors.New("rigctld: connection refused")

	// ErrTimeout indicates a connection or operation timed out.
	ErrTimeout = errors.New("rigctld: operation timed out")

	// ErrMalformedResponse indicates an unexpected or malformed response from rigctld.
	ErrMalformedResponse = errors.New("rigctld: malformed response")

	// ErrCommandFailed indicates rigctld returned an error code.
	ErrCommandFailed = errors.New("rigctld: command failed")

	// ErrUnsupported indicates the operation is not supported by the radio.
	ErrUnsupported = errors.New("rigctld: operation not supported")
)

// ErrorCode represents a rigctld error return code.
// rigctld returns "RPRT N" where N is 0 for success or negative for errors.
type ErrorCode int

// Standard rigctld error codes.
const (
	ErrCodeOK           ErrorCode = 0
	ErrCodeInvalid      ErrorCode = -1
	ErrCodeNotImpl      ErrorCode = -2
	ErrCodeInvalidP1    ErrorCode = -3
	ErrCodeInvalidP2    ErrorCode = -4
	ErrCodeInvalidP3    ErrorCode = -5
	ErrCodeInvalidP4    ErrorCode = -6
	ErrCodeInvalidP5    ErrorCode = -7
	ErrCodeInvalidP6    ErrorCode = -8
	ErrCodeInvalidP7    ErrorCode = -9
	ErrCodeInvalidP8    ErrorCode = -10
	ErrCodeInvalidP9    ErrorCode = -11
	ErrCodeInvalidP10   ErrorCode = -12
	ErrCodeInvalidP11   ErrorCode = -13
	ErrCodeInvalidP12   ErrorCode = -14
	ErrCodeInvalidP13   ErrorCode = -15
	ErrCodeInvalidP14   ErrorCode = -16
	ErrCodeInvalidP15   ErrorCode = -17
	ErrCodeInvalidP16   ErrorCode = -18
	ErrCodeInvalidP17   ErrorCode = -19
	ErrCodeInvalidP18   ErrorCode = -20
	ErrCodeInvalidP19   ErrorCode = -21
	ErrCodeInvalidP20   ErrorCode = -22
	ErrCodeInternal     ErrorCode = -23
	ErrCodeConflict     ErrorCode = -24
	ErrCodeTrxOpenFail  ErrorCode = -25
	ErrCodeTrxNotOpen   ErrorCode = -26
	ErrCodeTrxBusy      ErrorCode = -27
	ErrCodeTrxCloseFail ErrorCode = -28
	ErrCodeRigVFOFail   ErrorCode = -29
	ErrCodeRigMemFail   ErrorCode = -30
	ErrCodeSecurity     ErrorCode = -31
	ErrCodePower        ErrorCode = -32
	ErrCodeFault        ErrorCode = -33
)

// ErrorDescription returns a human-readable description of the error code.
func (c ErrorCode) ErrorDescription() string {
	switch c {
	case ErrCodeOK:
		return "success"
	case ErrCodeInvalid:
		return "invalid parameter"
	case ErrCodeNotImpl:
		return "not implemented"
	case ErrCodeInvalidP1, ErrCodeInvalidP2, ErrCodeInvalidP3, ErrCodeInvalidP4, ErrCodeInvalidP5:
		return "invalid parameter"
	case ErrCodeInvalidP6, ErrCodeInvalidP7, ErrCodeInvalidP8, ErrCodeInvalidP9, ErrCodeInvalidP10:
		return "invalid parameter"
	case ErrCodeInvalidP11, ErrCodeInvalidP12, ErrCodeInvalidP13, ErrCodeInvalidP14, ErrCodeInvalidP15:
		return "invalid parameter"
	case ErrCodeInvalidP16, ErrCodeInvalidP17, ErrCodeInvalidP18, ErrCodeInvalidP19, ErrCodeInvalidP20:
		return "invalid parameter"
	case ErrCodeInternal:
		return "internal error"
	case ErrCodeConflict:
		return "conflict with current state"
	case ErrCodeTrxOpenFail:
		return "failed to open transceiver"
	case ErrCodeTrxNotOpen:
		return "transceiver not open"
	case ErrCodeTrxBusy:
		return "transceiver busy"
	case ErrCodeTrxCloseFail:
		return "failed to close transceiver"
	case ErrCodeRigVFOFail:
		return "VFO operation failed"
	case ErrCodeRigMemFail:
		return "memory operation failed"
	case ErrCodeSecurity:
		return "security error"
	case ErrCodePower:
		return "power error"
	case ErrCodeFault:
		return "fault"
	default:
		return fmt.Sprintf("unknown error code %d", c)
	}
}

// CommandError wraps a rigctld error code with context.
type CommandError struct {
	Command   string
	ErrorCode ErrorCode
	Message   string
}

// Error implements the error interface.
func (e *CommandError) Error() string {
	if e.Message != "" {
		return fmt.Sprintf("rigctld: %s failed: %s", e.Command, e.Message)
	}
	return fmt.Sprintf("rigctld: %s failed: %s", e.Command, e.ErrorCode.ErrorDescription())
}

// Unwrap returns the underlying error for errors.Is/As.
func (e *CommandError) Unwrap() error {
	if e.ErrorCode != ErrCodeOK {
		return ErrCommandFailed
	}
	return nil
}

// ParseErrorCode parses a rigctld response to extract the error code.
// Expects responses in the format "RPRT N" where N is an integer.
// Returns the parsed error code and any remaining error message.
func ParseErrorCode(response string) (ErrorCode, string, error) {
	response = strings.TrimSpace(response)

	// Check for RPRT prefix
	if !strings.HasPrefix(response, "RPRT ") {
		return ErrCodeInvalid, "", ErrMalformedResponse
	}

	// Extract the code portion
	remainder := strings.TrimPrefix(response, "RPRT ")
	parts := strings.SplitN(remainder, " ", 2)

	codeStr := parts[0]
	code, err := strconv.Atoi(codeStr)
	if err != nil {
		return ErrCodeInvalid, "", fmt.Errorf("%w: invalid error code %q", ErrMalformedResponse, codeStr)
	}

	// Extract message if present
	var message string
	if len(parts) > 1 {
		message = parts[1]
	}

	return ErrorCode(code), message, nil
}

// IsConnectionError checks if the error is a connection-related error.
func IsConnectionError(err error) bool {
	return errors.Is(err, ErrNotConnected) ||
		errors.Is(err, ErrConnectionRefused) ||
		errors.Is(err, ErrTimeout)
}

// IsProtocolError checks if the error is a protocol-related error.
func IsProtocolError(err error) bool {
	return errors.Is(err, ErrMalformedResponse) ||
		errors.Is(err, ErrCommandFailed)
}

// NewCommandError creates a new CommandError from a command string and error code.
func NewCommandError(command string, code ErrorCode, message string) *CommandError {
	return &CommandError{
		Command:   command,
		ErrorCode: code,
		Message:   message,
	}
}
