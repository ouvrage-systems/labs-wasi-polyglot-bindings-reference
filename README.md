# WASI Polyglot Bindings Reference Implementation
**Repository:** `wasi-polyglot-bindings-reference`

---

## 1. Overview
This repository serves as the **official reference implementation** for polyglot WebAssembly bindings (Python & Node.js) in the Ouvrage ecosystem. It demonstrates how to cross-compile a Go library to WebAssembly and execute it natively in-process inside host scripting environments using:

1.  **WASI Preview 1 (v1)**: Execution using standard streams (Stdin/Stdout redirection) and a multiplexed JSON-RPC dispatcher. Highly portable and zero-dependency, implemented for both **Python** and **Node.js**.
2.  **WASI Preview 2 (v2)**: High-performance execution using the **WASM Component Model**, defined via WIT (WebAssembly Interface Types) contracts. Arguments are passed natively through CPU registers/memory stack with zero I/O overhead. Implemented for **Python (CPython 3.12)**.

---

## 2. Directory Structure

```text
wasi-polyglot-bindings-reference/
  ├── Makefile                <-- Automation for setup, build and execution
  ├── go.mod                  <-- Standalone Go module configuration
  ├── README.md               <-- This documentation
  │
  ├── cmd/
  │    └── wasi-ref-cli/      <-- Native Go CLI runner (tests packages natively)
  │
  ├── pkg/
  │    ├── geometry/          <-- Math calculations on shapes (Point, Rectangle, etc.)
  │    ├── store/             <-- Stateful in-memory Key-Value store
  │    └── text/              <-- Pure text formatting functions
  │
  └── bindings/
       ├── wit/
       │    └── world.wit     <-- WIT API contract (ouvrage:lab-wasi-demo)
       │
       ├── wasm/
       │    ├── main.go       <-- Go entrypoint for WASI Preview 1 (JSON-RPC)
       │    ├── main_v2.go    <-- Go entrypoint for WASI Preview 2 WIT exports
       │    └── gen/          <-- Generated TinyGo bindings (compiled by TinyGo)
       │
       ├── py/
       │    ├── v1/           <-- Python WASI Preview 1 package (using pytest)
       │    └── v2/           <-- Python WASI Preview 2 Component package (using pytest)
       │
       └── node/
            └── v1/           <-- Node.js WASI Preview 1 package (using node --test)
```

---

## 3. Quick Start (Automation)

The repository provides a self-contained `Makefile` that automatically downloads version-pinned WebAssembly compiler tools (`tinygo`, `wit-bindgen`, `wasm-tools`) locally to `./bin/` to prevent polluting your global system packages.

### Step 1: Install local WASM Toolchain
```bash
make setup
```
*Downloads TinyGo, wasm-tools, wit-bindgen, and the WASI Preview 2 reactor adapter.*

### Step 2: Compile all WASM Binaries
```bash
make build
```
*Compiles the Go packages for both v1 and v2, embeds WIT metadata, and builds the WASM binaries inside both Python and Node.js package subdirectories.*

### Step 3: Run the Test Suites

#### 1. Python Preview 1 (JSON-RPC)
```bash
make run-py-v1
```
*Runs the Python Preview 1 pytest unit tests.*

#### 2. Python Preview 2 (Component Model)
```bash
make run-py-v2
```
*Runs the Python Preview 2 component model pytest unit tests.*

#### 3. Node.js Preview 1 (JSON-RPC)
```bash
make run-node-v1
```
*Runs the Node.js native unit tests using `node --test`.*

#### 4. Native Go CLI
```bash
GOWORK=off go run ./cmd/wasi-ref-cli
```
*Runs the packages natively on your CPU, proving the Go code executes cleanly without WASM.*
