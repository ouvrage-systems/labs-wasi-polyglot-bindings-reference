# Documentation: WASI Polyglot Reference Lab — Metrology Framework Internals

This document details the software design, patterns, and internals of the polymorphic metrology framework implemented in [`bindings/my_lib_maths/js/all/`](file:///home/gpineda/Documents/ouvrage/labs/wasi-polyglot-bindings-reference/bindings/my_lib_maths/js/all/).

---

## 1. Architectural Philosophy: The Polymorphic Shift

Originally, benchmark scripts for WebAssembly and WASI runtimes were separated into segmented version folders (e.g., `js/v0/`, `js/v0.1/`). This coupled versioning led to severe code duplication—each folder repeated the same front-end layouts, charts, and IPC event loops.

To solve this, we unified all benchmarks into a single, cohesive engine. By separating **platform I/O**, **compiler wrappers**, and **execution modes** into polymorphic classes, we built an extensible framework where WASM target differences are resolved as dynamic properties at runtime.

---

## 2. Layered Architecture Overview

The framework separates concerns in a four-tier vertical stack, ensuring that the benchmark orchestrator never binds directly to browser or operating system APIs:

```text
  ┌─────────────────────────────────────────────────────────────────────────┐
  │                         Execution & Entrypoints                         │
  │              Browser (index.html)   │   Node.js (benchmark-all.mjs)     │
  └─────────────────────────────┬─────────────────────────────┬─────────────┘
                                │                             │
                                ▼                             ▼
  ┌─────────────────────────────────────────────────────────────────────────┐
  │                       Unified Orchestrator Runner                       │
  │                              lab_matrix.js                              │
  │                                                                         │
  │       ┌──────────────────────────────┼──────────────────────────────┐   │
  │       │ (Mode 2)                     │ (Mode 3 & 4)                 │   │
  │       ▼                              ▼                              │   │
  │  ┌──────────────┐            ┌──────────────┐                       │   │
  │  │ PureJsDriver │            │  [ jswasm ]  │                       │   │
  │  │  (Host JS)   │            │ (Hybrid JS)  │                       │   │
  │  └──────────────┘            └──────┬───────┘                       │   │
  │                                     │                               │   │
  │                                     │ Delegates to                  │   │
  │                                     ▼                               ▼   │
  │                              ┌──────────────┐ (Mode 1)                  │
  │                              │  WasmDriver  │ ◄─────────────────────────┘
  │                              └──────┬───────┘                           │
  │                                     ▼                                   │
  │                              ┌──────────────┐                           │
  │                              │ WASM Loaders │                           │
  │                              └──────┬───────┘                           │
  └─────────────────────────────────────┼───────────────────────────────────┘
                                        ▼
  ┌─────────────────────────────────────────────────────────────────────────┐
  │                            Platform Adapters                            │
  │       BrowserAdapter (fetch)    │    NodeAdapter (fs/hrtime)            │
  └─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Core Component Design Patterns

### 3.1 Host Abstraction (Platform Adapter Pattern)
All platform-specific dependencies (such as file reads and clocks) are abstracted by the `HostAdapter` interface. The orchestrator queries this interface exclusively:
*   **`BrowserAdapter`**: Runs in the browser. Reads binaries using standard HTTP `fetch` streams and records timing via `window.performance.now()`.
*   **`NodeAdapter`**: Runs in Node.js. Reads binaries using `fs.promises` from the local file system and records timing via `process.hrtime` and `perf_hooks`.

### 3.2 Dynamic Compiler Wrappers (Strategy & Factory Pattern)
WebAssembly module instantiation is toolchain-dependent (e.g., standard Go requires injection of `wasm_exec.js` globals; TinyGo has no WASI imports in V0 MVP but requires standard WASI polyfills in V0.1). 
*   **`BaseLoader`**: The interface declaring `instantiate(binary, imports)`.
*   **`driver_manager.js`**: Resolves loaders dynamically based on the `"loader"` attribute declared by targets in `nomenclature.json` (e.g. `v0-tiny`, `v0-legacy`, `v0.1-wasi`). It builds the runtime sandboxes on-the-fly and injects the corresponding loader strategy.

### 3.3 Sandbox Isolation (Driver Pattern)
Execution sandboxes are modeled as classes implementing the `BaseDriver` contract:
*   **`PureJsDriver`**: Executes reference algorithms natively on the V8 engine without WASM overhead.
*   **`WasmDriver`**: Wraps the compiled WebAssembly instance and exposes exports safely.

### 3.4 Hybrid Execution Engine (`jswasm`)
For workloads driven by JS loops but using WASM for primitive math (Mode 3 & 4), the orchestrator imports workloads from `maths_jswasm.js`. 
Rather than executing a driver directly, these workloads run in host JS and accept a `WasmDriver` passed as a **sub-driver** parameter. This avoids duplicating thread management or complex scheduler logic inside the Go WASM guest.

---

## 4. Metrology & Verification Pipeline

During a workload run, the orchestrator (`lab_matrix.js`) follows a strict execution pipeline:

```text
  [Start Run] ➔ Resolve Driver ➔ Run Workload ➔ JIT Correctness Verify ➔ Record Metrics ➔ [End Run]
```

1.  **JIT Correctness Check**: Prior to storing any timing results, the orchestrator extracts the `"verify"` Javascript reference pointer (e.g. `jsComputeSequence`) from `nomenclature.json`. It runs the same inputs on the reference V8 engine and asserts that the sandboxed output matches the reference. 
    *   *Rationale*: This prevents miscompiled binaries or memory-corrupted loops from reporting false speed improvements.
2.  **Telemetry Collection**: The net elapsed duration is recorded via the `HostAdapter` clock, and the FFI transition latency (Avg FFI in nanoseconds) is computed relative to the iteration count.

---

## 5. Cross-Platform Seed Engine

The framework implements portable seed serialization based on the `URLSearchParams` standard, enabling developers to reproduce test scenarios identically across Web and CLI runtimes.

*   **`generateSeed(...)`**: Converts execution parameters into a shareable string:
    `toolchain=A&op=B&mode=3&a=10&b=2&c=10000`
*   **`parseSeed(...)`**: Parses a seed string back into structured objects.

### 5.1 Browser Studio Integration
*   The dashboard updates the URL address bar hash dynamically in real-time (`#toolchain=A&op=B...`) using `history.replaceState` to avoid polluting browser history navigation.
*   The history table provides a **Load** action (restores variables to inputs) and a **Copy** action (copies absolute URL link with a temporary green "Copied!" feedback micro-animation).

### 5.2 Node.js CLI Integration
The CLI runner `benchmark-all.mjs` intercepts seeds passed as the first argument, compiles the specific target, and prints a metrology report. An optional second argument specifies a repetitions count, which executes a loop to print aggregated min/max/average statistics:
```bash
# Run the specific seed workload repeated 5 times to gather statistical averages
node tools/benchmark-all.mjs "toolchain=A&op=B&mode=3&a=10&b=2&c=10000" 5
```

---

## 6. Extending the Framework

Because the framework is entirely data-driven, adding support for new WASM runtimes (e.g., WASI V2 Component Model) does not require duplicate folders or UI scripts:
1.  Add the compile-time binary build to the `nomenclature.json` targets with a `"loader": "v2-tiny"` tag.
2.  Write a `V2TinyLoader` extending `BaseLoader` to handle WIT-transpiled components imports.
3.  Register the new loader in `driver_manager.js`.

The new target will automatically populate in the GUI and CLI, benefiting instantly from all metrology controls, JIT assertions, and seed reproduction logic.
