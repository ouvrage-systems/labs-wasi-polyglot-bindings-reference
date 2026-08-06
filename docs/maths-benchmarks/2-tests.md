# 🧮 Step-by-Step Test Execution Guide

This document provides the step-by-step instructions to compile the binaries, launch the benchmarking CLI tools, and run the browser-based benchmark studios.

---

## Step 1: Compiling the WASM Binaries

To build the benchmark targets, execute the corresponding compilation rules in the repository root:

1. **Compile WASM v0 TinyGo Modules**:
   ```bash
   make build-wasm-v0-tiny
   ```
   *Creates the compiled binaries `my_lib_maths.wasm` (without scheduler) and `my_lib_maths_asyncify.wasm` (with Asyncify scheduler) under `bindings/build/v0/tiny/` and updates the symbol links in the JS folder.*

2. **Compile WASM v0 Legacy (Standard Go) Module**:
   ```bash
   make build-wasm-v0-legacy
   ```
   *Creates the compiled binary `my_lib_maths.wasm` under `bindings/build/v0/legacy/` and copies `wasm_exec.js` from the Go toolchain path.*

---

## Step 2: Running Native Go CLI Benchmarks

We can execute the mathematical workloads natively on the host platform using the compiled Go CLI tool:

1. **Run the entire suite of benchmarks**:
   ```bash
   GOWORK=off go run ./cmd/omaths-bench benchmark --limit 500000
   ```
   *Runs all five test workloads natively on the CPU and outputs a structured Markdown summary table containing durations, execution speed, and memory usage.*

2. **Run a single test workload**:
   ```bash
   GOWORK=off go run ./cmd/omaths-bench run sequence --n 500000 --a 15 --b 35
   ```
   *Runs a single target math function with custom parameters and verifies the mathematical output.*

---

## Step 3: Launching Web-Based Studios

To run the interactive benchmark studios in a browser environment:

1. **Start a local web server** at the root of the repository:
   ```bash
   python3 -m http.server 8000
   ```
2. **Open the TinyGo Studio**:
   * Navigate to `http://localhost:8000/bindings/js/v0/tiny/`
   * Select a target math function (e.g. `ComputeSequence` or `FibonacciRecursive`).
   * Choose the execution mode (e.g. `WASM Internal` or `N Calls WASM Cached`) and click **Execute Operation**.
3. **Open the Legacy Go Studio**:
   * Navigate to `http://localhost:8000/bindings/js/v0/legacy/`
   * Test the execution of parallel functions via Goroutines and track memory heap deltas.

---

## Step 4: Running Node.js Benchmark Scripts

To run the automated FFI performance script from the command line:

1. **Execute the Node.js benchmarks**:
   ```bash
   node ./tools/benchmark-wasm.mjs 500000
   ```
2. **Generate a performance trace profile**:
   ```bash
   node --cpuprof ./tools/benchmark-wasm.mjs 500000
   ```
   *Generates a `.cpuprofile` capture that can be loaded into Chrome DevTools Performance panel or Speedscope to inspect compilation and FFI cost visually.*

---

**Previous Step**: [Benchmark Execution Protocol](1-protocol.md)  
**Next Step**: [Insights & Engineering Discoveries](3-discoveries.md)
