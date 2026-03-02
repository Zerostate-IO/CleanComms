package rigctld

import (
	"fmt"
	"strconv"
	"strings"
)

// Command builders for rigctld protocol.
// All commands are terminated with a newline character.

// BuildSetFreq builds the set frequency command.
// Format: \set_freq <hz>
func BuildSetFreq(hz int) string {
	return fmt.Sprintf("\\set_freq %d\n", hz)
}

// BuildGetFreq builds the get frequency command.
// Format: \get_freq
func BuildGetFreq() string {
	return "\\get_freq\n"
}

// BuildSetMode builds the set mode command.
// Format: \set_mode <mode> <passband>
// passband 0 means use default passband for the mode.
func BuildSetMode(mode string, passband int) string {
	return fmt.Sprintf("\\set_mode %s %d\n", mode, passband)
}

// BuildGetMode builds the get mode command.
// Format: \get_mode
func BuildGetMode() string {
	return "\\get_mode\n"
}

// BuildSetPTT builds the set PTT command.
// Format: \set_ptt <state>
// state: 0 = RX (off), 1 = TX (on)
func BuildSetPTT(tx bool) string {
	state := 0
	if tx {
		state = 1
	}
	return fmt.Sprintf("\\set_ptt %d\n", state)
}

// BuildGetPTT builds the get PTT command.
// Format: \get_ptt
func BuildGetPTT() string {
	return "\\get_ptt\n"
}

// BuildChkVFO builds the check VFO command.
// Format: \chk_vfo
func BuildChkVFO() string {
	return "\\chk_vfo\n"
}

// BuildPing builds a simple command to test connectivity.
// Uses chk_vfo as it's a lightweight operation.
func BuildPing() string {
	return BuildChkVFO()
}

// Response parsers for rigctld protocol.

// ParseFreqResponse parses a frequency response.
// Expected format: "<frequency_hz>" (single line with just the number)
// or "Frequency: <hz>\n" (some rigctld versions)
func ParseFreqResponse(response string) (int, error) {
	response = strings.TrimSpace(response)

	// Check for error response
	if strings.HasPrefix(response, "RPRT ") {
		code, msg, err := ParseErrorCode(response)
		if err != nil {
			return 0, err
		}
		return 0, NewCommandError("get_freq", code, msg)
	}

	// Try to parse as plain number
	hz, err := strconv.Atoi(response)
	if err != nil {
		// Try parsing "Frequency: NNNN" format
		if strings.HasPrefix(response, "Frequency: ") {
			freqStr := strings.TrimPrefix(response, "Frequency: ")
			hz, err = strconv.Atoi(strings.TrimSpace(freqStr))
			if err != nil {
				return 0, fmt.Errorf("%w: cannot parse frequency %q", ErrMalformedResponse, response)
			}
			return hz, nil
		}
		return 0, fmt.Errorf("%w: cannot parse frequency %q", ErrMalformedResponse, response)
	}

	return hz, nil
}

// ModePassband represents a mode and its passband width.
type ModePassband struct {
	Mode     string
	Passband int
}

// ParseModeResponse parses a mode response.
// Expected format: "<mode>\n<passband>" (two lines)
// Example: "USB\n2400"
func ParseModeResponse(response string) (ModePassband, error) {
	response = strings.TrimSpace(response)

	// Check for error response
	if strings.HasPrefix(response, "RPRT ") {
		code, msg, err := ParseErrorCode(response)
		if err != nil {
			return ModePassband{}, err
		}
		return ModePassband{}, NewCommandError("get_mode", code, msg)
	}

	// Split into lines
	lines := strings.Split(response, "\n")
	if len(lines) < 1 {
		return ModePassband{}, fmt.Errorf("%w: empty mode response", ErrMalformedResponse)
	}

	mode := strings.TrimSpace(lines[0])
	if mode == "" {
		return ModePassband{}, fmt.Errorf("%w: empty mode", ErrMalformedResponse)
	}

	// Passband is optional
	passband := 0
	if len(lines) >= 2 {
		pb, err := strconv.Atoi(strings.TrimSpace(lines[1]))
		if err == nil {
			passband = pb
		}
	}

	return ModePassband{Mode: mode, Passband: passband}, nil
}

// ParsePTTResponse parses a PTT state response.
// Expected format: "<state>" where 0=RX, 1=TX
func ParsePTTResponse(response string) (bool, error) {
	response = strings.TrimSpace(response)

	// Check for error response
	if strings.HasPrefix(response, "RPRT ") {
		code, msg, err := ParseErrorCode(response)
		if err != nil {
			return false, err
		}
		return false, NewCommandError("get_ptt", code, msg)
	}

	state, err := strconv.Atoi(response)
	if err != nil {
		return false, fmt.Errorf("%w: cannot parse PTT state %q", ErrMalformedResponse, response)
	}

	return state == 1, nil
}

// ParseChkVFOResponse parses a chk_vfo response.
// Expected format: "CHKVFO <n>" where n is 0 or 1, or "0" or "1"
func ParseChkVFOResponse(response string) error {
	response = strings.TrimSpace(response)

	// Check for error response
	if strings.HasPrefix(response, "RPRT ") {
		code, msg, err := ParseErrorCode(response)
		if err != nil {
			return err
		}
		if code != ErrCodeOK {
			return NewCommandError("chk_vfo", code, msg)
		}
	}

	// Any non-error response indicates success
	return nil
}

// ParseSimpleResponse parses a simple RPRT response for set commands.
// Returns nil on success (RPRT 0) or an error on failure.
func ParseSimpleResponse(command string, response string) error {
	response = strings.TrimSpace(response)

	code, msg, err := ParseErrorCode(response)
	if err != nil {
		return err
	}

	if code == ErrCodeOK {
		return nil
	}

	return NewCommandError(command, code, msg)
}
