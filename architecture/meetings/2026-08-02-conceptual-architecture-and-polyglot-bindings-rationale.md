# Design Notes: 2026-08-02 — Conceptual Architecture & Polyglot Bindings Rationale

## Metadata
* **Date**: August 2, 2026
* **Participants**: `@gpineda` (Lead Architect & Systems Engineer), `@Antigravity` (AI Coding Assistant)
* **Status**: Decided & Documented
* **Location / Repository**: `gitlab.com/ouvrage-systems/labs/wasi-polyglot-bindings-reference`

---

## 1. Context & Core Objectives

Originally initialized inside the `architecture/labs/` directory of the [`ouvrage-kern-go`](file:///home/gpineda/Documents/ouvrage/ouvrage-kern-go) repository, this WASI Polyglot Bindings Reference Lab was officially extracted into its own dedicated workspace. While the kernel project will retain its own concrete bindings, isolating the lab into a distinct repository allows for the broad exploration, auditing, and documentation of general WebAssembly/WASI toolchains and runtime options. The standards and techniques consolidated here (such as modular WIT packaging and components translation) extend far beyond the scope of a single kernel project and serve as a universal blueprint for the entire Ouvrage Systems ecosystem.

WebAssembly (WASM) has evolved from a browser-only runtime into a universal, sandboxed infrastructure engine. However, the ecosystem remains fragmented across different evolutionary versions:
1.  **WASM V0 (MVP)**: Browser-bound, stateless sandboxing.
2.  **WASI V1 (wasip1)**: POSIX-like system interface, but lacking structured type boundaries.
3.  **WASI V2 (wasip2)**: Component Model, introducing WebAssembly Interface Types (WIT).

The objective of this Reference Lab is to serve as a **practical, production-ready blueprint** for Ouvrage Systems. It demonstrates how a single, core Go codebase (`pkg/`) can be compiled and cleanly packaged into native client-side and server-side bindings for Python, Node.js, and the Web browser.

---

## 2. Evolution of the Boundary: V0 vs. V1 vs. V2

This lab models the three major paradigms of WebAssembly boundaries:

```text
  [V0: Stateless Sandbox]   ──> Compiles to WASM MVP (no OS access)
                                 │──> Used for pure client-side math (browser math)
                                 
  [V1: Stream IPC POSIX]     ──> Stdin/Stdout pipes (wasip1 boundary)
                                 │──> Structured via custom JSON-RPC (wasi1rpc framework)
                                 
  [V2: Typed Components]    ──> Declared interfaces via WIT (wasip2 boundary)
                                 │──> Native polyglot binding exports (Node.js, Python)
```

### 2.1 WASM V0: The Pure Sandbox
*   **Definition**: WebAssembly MVP. The compiled module has no access to host environment APIs (no files, no network sockets, no clock, no standard input/output).
*   **The Use Case**: Stateless, high-performance mathematical or parsing libraries executing directly in browser clients.
*   **Implementation in Lab**: Compiles [`pkg/geometry`](file:///home/gpineda/Documents/ouvrage/labs/wasi-polyglot-bindings-reference/pkg/geometry/) to WASM MVP via TinyGo (`-target=wasm`) and calls it inside browser ESM/Vite scripts.

### 2.2 WASI V1: Standard I/O IPC
*   **Definition**: POSIX-like systems access (`wasip1`). The binary can read files, check clocks, and write to standard output. However, it lacks complex structured typing at the boundary—everything must cross the boundary as raw bytes.
*   **The Use Case**: Subprocess microservices executing in sandboxed environments.
*   **The IPC Dilemma**: To pass complex data structures (like geometry points, records, and errors), we must serialize them. 
*   **Implementation in Lab**: We established a standard input/output event loop. The host launches the WASM binary as a subprocess and communicates via JSON-RPC payloads sent to `os.Stdin` and read from `os.Stdout` (abstracted by the `wasi1rpc` router framework).

### 2.3 WASI V2: The Component Model
*   **Definition**: The WebAssembly Component Model (`wasip2`). Introduces **WebAssembly Interface Types (WIT)**.
*   **The Paradigm Shift**: No more custom serialization frameworks, no more stdin/stdout pipes, and no more subprocess overhead. The host and guest WASM component share a standardized, typed memory contract.
*   **Implementation in Lab**: The interface contracts are declared declaratively in WIT. The Go guest implements the interface. The toolchain compiles the binary and transpiles it (using `jco` for JavaScript or `componentize-py` for Python) into native modules.
*   **Polymorphic State**: Allows stateful resource objects (e.g. `resource kv-store`) to reside inside the guest heap while the host holds a lightweight reference handle.

---

## 3. Decoupled Directory Structure for Real-World Projects

To prevent dependency leakage and keep the repository clean, we designed a strict hierarchical layout:

```text
  wasi-polyglot-bindings-reference/
  ├── pkg/                       <-- Core Domain Logic (100% pure Go, no WASM coupling)
  │   ├── geometry/
  │   └── store/
  ├── bindings/
  │   ├── wit/                   <-- Declarative WIT interface specifications
  │   ├── wasm/                  <-- WASM guests (v0 targets, v1 JSON-RPC, v2 Component)
  │   ├── py/                    <-- Python Host Packages (wrapping V1 and V2)
  │   ├── node/                  <-- Node.js V1 Host Package
  │   └── js/                    <-- Web JS V2 Component and V0 Samples
  └── tools/
      ├── wasi1rpc/              <-- Reusable generic JSON-RPC framework for V1
      └── bootstrap-wasi.sh      <-- Granular, versioned Platform Toolchain Manager
```

### 3.1 Domain Logic Isolation (`pkg/`)
All business logic resides in standard Go packages (`pkg/`). They have no imports pointing to WebAssembly runtimes or WIT-generated bindings. They can be tested locally using standard `go test` and compiled to standard Linux/macOS targets.

### 3.2 Guest Layer Isolation (`bindings/wasm/`)
The WASM adapters reside inside `bindings/wasm/`. They act as adapters: they translate standard WIT/JSON structures into domain models and delegate calculations to `pkg/`.

### 3.3 Host Packaging (`bindings/<lang>/`)
The languages bindings (`py`, `js`, `node`) are laid out as standard, publishable packages (`package.json`, `pyproject.toml`). They encapsulate the runtime instantiation code (e.g., launching standard python subprocesses for V1 or loading Wasmtime component runners for V2) so the end developer interacts with a native language API.

---
*Design document recorded by `@Antigravity` in partnership with `@gpineda`.*
