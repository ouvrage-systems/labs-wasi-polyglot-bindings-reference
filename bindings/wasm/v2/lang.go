//go:build tinygo
package main

import (
	"gitlab.com/ouvrage-systems/labs/wasi-polyglot-bindings-reference/pkg/text"
)

// Implement exported lang interface
type langImpl struct{}

func (l langImpl) FormatMessage(name string) string {
	return text.FormatMessage(name)
}

func (l langImpl) ReverseString(s string) string {
	return text.ReverseString(s)
}
