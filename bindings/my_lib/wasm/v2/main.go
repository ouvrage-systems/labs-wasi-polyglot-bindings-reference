//go:build tinygo
package main

import (
	"gitlab.com/ouvrage-systems/labs/wasi-polyglot-bindings-reference/bindings/my_lib/wasm/gen"
)

func init() {
	// Register the WIT exports for TinyGo compilation
	wasi_polyglot_reference.SetExportsOuvrageLabWasiDemoGeometry(geometryImpl{})
	wasi_polyglot_reference.SetExportsOuvrageLabWasiDemoStore(storeImpl{})
	wasi_polyglot_reference.SetExportsOuvrageLabWasiDemoLang(langImpl{})
	wasi_polyglot_reference.SetExportsOuvrageLabWasiDemoNetwork(networkImpl{})
}

func main() {
	// Dummy main function required by TinyGo compiler
}
