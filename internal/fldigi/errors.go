// Package fldigi provides an XML-RPC client for communicating with fldigi.
package fldigi

import (
	"errors"
	"fmt"
)

// Sentinel errors for fldigi client operations.
var (
	ErrNotConnected    = errors.New("fldigi not connected")
	ErrTimeout         = errors.New("xmlrpc request timeout")
	ErrInvalidResponse = errors.New("invalid xmlrpc response")
	ErrUnsupportedMode = errors.New("unsupported modem mode")
	ErrTransmitFailed  = errors.New("failed to change transmit state")
)

// FaultError represents an XML-RPC fault response.
type FaultError struct {
	Code   int
	String string
}

func (e *FaultError) Error() string {
	return fmt.Sprintf("xmlrpc fault %d: %s", e.Code, e.String)
}

func (e *FaultError) Is(target error) bool {
	return target == ErrNotConnected
}

// ConnectionError wraps connection errors with address context.
type ConnectionError struct {
	Addr string
	Err  error
}

func (e *ConnectionError) Error() string {
	return fmt.Sprintf("connection error to %s: %v", e.Addr, e.Err)
}

func (e *ConnectionError) Unwrap() error {
	return e.Err
}
