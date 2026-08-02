package main

import (
	"gitlab.com/ouvrage-systems/labs/wasi-polyglot-bindings-reference/tools/wasi1rpc"
)

func main() {
	// Initialize Ouvrage WASI V1 Application Framework
	app := wasi1rpc.NewApp()

	// Register all module handlers on the router
	registerGeometry(app.Router)
	registerLang(app.Router)
	registerStore(app.Router)

	// Run the blocking stdin-to-stdout event loop
	app.Run()
}
