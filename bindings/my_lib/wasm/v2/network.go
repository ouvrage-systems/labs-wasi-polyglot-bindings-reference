//go:build tinygo
package main

import (
	"gitlab.com/ouvrage-systems/labs/wasi-polyglot-bindings-reference/bindings/my_lib/wasm/gen"
)

// Implement exported network interface
type networkImpl struct{}

func (n networkImpl) FetchAndFormat(url string) wasi_polyglot_reference.Result[string, string] {
	// Call the imported host-http function (delegating networking task to the host)
	res := wasi_polyglot_reference.OuvrageLabWasiDemoHostHttpFetchUrl(url)
	if res.IsErr() {
		return wasi_polyglot_reference.Err[string, string]("Go WASM error fetching URL: " + res.UnwrapErr())
	}
	
	val := res.Unwrap()
	formatted := "Go WASM Component formatted: " + val
	return wasi_polyglot_reference.Ok[string, string](formatted)
}
