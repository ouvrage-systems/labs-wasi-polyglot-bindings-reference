# Meeting Notes: 2026-08-02 — WASI Toolchain Decoupling & IPC Abstraction

## Metadata
* **Date**: August 2, 2026
* **Participants**: `@gpineda` (Lead Architect & Systems Engineer), `@Antigravity` (AI Coding Assistant)
* **Status**: Decided, Documented & Implemented
* **Location / Repository**: `gitlab.com/ouvrage-systems/labs/wasi-polyglot-bindings-reference`

---

## 1. Executive Summary & Context

To support the expansion of the Ouvrage systems galaxy (e.g. preparing `ouvrage-kern-go` for WebAssembly compilation), we officially migrated this repository from a single-file proof-of-concept into a decoupled, clean library lab.

During this session, we:
1. Decoupled the WIT specifications from a single monolithic file into clean, package-scoped files.
2. Refactored the Go V2 component module to compile from a split package layout.
3. Extracted the WASI V1 JSON-RPC standard I/O pipeline into a generic, shareable framework called `wasi1rpc`.
4. Designed and implemented `bootstrap-wasi.sh`, a granular dependency manager that caches versions locally and exposes them using clean active symlinks.

---

## 2. Decoupling the WIT Contracts and Go V2 Components

### 2.1 Multi-File WIT Packages
Instead of grouping all interface specifications under a monolithic `world.wit` file, we separated the contracts under [`bindings/wit/`](file:///home/gpineda/Documents/ouvrage/labs/wasi-polyglot-bindings-reference/bindings/wit/):
*   `geometry.wit` (interface geometry)
*   `store.wit` (interface store)
*   `lang.wit` (interface lang)
*   `network.wit` (interface network & host-http)
*   `world.wit` (world wasi-polyglot-reference exporting all of the above)

**Tooling Integration**: We discovered that both `wit-bindgen` and `wasm-tools component embed` natively support directory parsing. We updated the Makefile to compile the directory `$(WIT_DIR)` (e.g. `bindings/wit`) instead of a single file.

### 2.2 Split Package Main in Go (V2)
TinyGo requires a single `package main` target for reactor builds. Rather than writing all bindings in a single file, we split the target directory [`bindings/wasm/v2/`](file:///home/gpineda/Documents/ouvrage/labs/wasi-polyglot-bindings-reference/bindings/wasm/v2/):
*   `main.go`: Registry file registering WIT exports via `init()`.
*   `geometry.go`, `store.go`, `lang.go`, `network.go`: Isolated files implementing the corresponding domain mappings.

---

## 3. Abstraction of WASI V1 IPC: The `wasi1rpc` Framework

### 3.1 The Reflection Dilemma in TinyGo
To automate the mapping of JSON-RPC commands to Go structs, dynamic reflection (e.g. `reflect` package) was considered. However, we audited this option and rejected it due to TinyGo's aggressive tree-shaking model:
*   Dynamic reflection triggers the inclusion of massive dead-code tables.
*   The WASM binary size would bloat instantly from 600 KB to several megabytes, violating Ouvrage's lightweight embedding constraints.
*   **Resolution**: We opted for AOT static code mappings instead of runtime reflection.

### 3.2 The Generic Router (`tools/wasi1rpc`)
We extracted the standard input/output loop and json-rpc protocol envelope processing into a reusable internal module at [`tools/wasi1rpc/`](file:///home/gpineda/Documents/ouvrage/labs/wasi-polyglot-bindings-reference/tools/wasi1rpc/):
*   `router.go`: Implements a generic route dispatcher.
*   `app.go`: Handles the standard input scanner loop, JSON parsing, error wrapping, and standard output printing.

The WASI V1 bootstrap code in the reference lab was simplified to a clean registration hook:
```go
package main

import (
	"gitlab.com/ouvrage-systems/labs/wasi-polyglot-bindings-reference/tools/wasi1rpc"
)

func main() {
	app := wasi1rpc.NewApp()
	app.Register("geometry.distance", handleDistance)
	app.Run()
}
```

---

## 4. Platform Engineering: The Granular Toolchain Manager

To prevent version fragmentation and duplication of raw curl commands across Ouvrage Systems repositories, we designed a specialized shell bootstrap tool:

### 4.1 Granular Installer ([`tools/bootstrap-wasi.sh`](../../tools/bootstrap-wasi.sh))
The script detects the host OS and architecture (supporting Linux, macOS, x86_64, and arm64) and parses command-line flags to retrieve only the required tools (e.g. `--tinygo`, `--wit-bindgen`, `--node`, or `--all`). It supports version overrides via arguments (e.g., `--wit-bindgen 0.23.0`).

### 4.2 Symlink Package Cache Layout
To avoid directory clutter in `./bin/`, the bootstrapper:
1.  Extracts release archives into a structured, versioned directory: `bin/packages/<tool>/<version>`.
2.  Creates active symbolic links at the root of `bin/` pointing to the cached versions:
    *   `bin/tinygo` -> `./packages/tinygo/0.41.1`
    *   `bin/node` -> `./packages/node/22.12.0`
    *   `bin/wit-bindgen` -> `./packages/wit-bindgen/0.24.0/wit-bindgen`

This design offers zero runtime overhead, local repository isolation, and clean version switching.

---

## 5. Incidents and Resolutions

*   **Concurrent Task Collisions**: During testing of the bootstrap script, concurrent asynchronous task runners in the background ran `make clean` simultaneously, deleting directories mid-extraction.
    *   *Resolution*: Restructured test sequences to run synchronously, ensuring file system lock integrity.
*   **GitHub Mirror Workflow Permissions**: Pushing the documentation updates to the GitHub mirror failed because the Personal Access Token (PAT) used by the mirror push did not have the `workflow` write permission required to modify `.github/workflows/docs.yml`.
    *   *Resolution*: Recommended checking the `workflow` scope in GitHub PAT settings or switching the remote URL to SSH key authentication.

---

## 6. Day 0 Design Stance & Partnership Reflection

This session represents the translation of high-level systems design into a concrete engineering pipeline. The collaborative effort between systems engineer `@gpineda` and AI coding assistant `@Antigravity` was characterized by:
*   A rigorous $A^*$ pathfinding approach (seeking global optimization and modular reuse).
*   Active trade-off auditing (rejecting reflection bloat, avoiding dynamic Bash POO complexity in favor of functional declarative scripting).
*   Dogfooding preparation (ensuring that the toolchain bootstrapper can be curled directly by `ouvrage-kern-go` in production).

---
*Meeting recorded by `@Antigravity` in partnership with `@gpineda`.*
