# Architecture Meeting Notes - August 9, 2026

**Topic**: WASM/WASI Metrology Observations & Decoupled Architectural Design Lessons

---

## 1. Context & Scope

* **Participants**: We (User & Antigravity AI)
* **Date**: August 9, 2026
* **Scope**: Analysis of the completed 11-target metrology benchmark matrix and extraction of architectural guidelines for future WebAssembly systems.
* **Goal**: Document performance findings, compiler/runtime constraints, and formulate structured design recommendations for distributing Go-based WebAssembly libraries.

---

## 2. Metrology Matrix Observations

Based on our final benchmark runs (FindLastPrime Limit = 1,000 / ConcurrentCountPrimes Limit = 1,000,000), we drew the following systems-level conclusions:

### A. The Heavy Toll of IPC vs. In-Memory FFI
* **Target F** (Standard Go RPC Subprocess via `wasi_v0.1_rpc_driver.js`): **~233 ms**
* **Target I** (Standard Go Direct Exports): **~1.03 ms**
* **Target K** (Standard Go Component): **~1.40 ms**
* **Lesson**: Spawning WebAssembly runtimes as external OS subprocesses (Mode F) incurs massive setup costs (OS process fork, VM instantiation, stdin/stdout stream JSON serialization). Standard Go Components (Mode K) and Direct Exports (Mode I) run **hundreds of times faster** because they execute via synchronous, in-process C-ABI FFI calls.

### B. The Performance Overhead of Asyncify
* Instrumenting TinyGo modules with Binaryen's Asyncify (`-scheduler=asyncify`, Target J/B) introduces a minor file size increase (**+34 KB**) but adds execution latency for pure CPU-bound loops.
* **Lesson**: Asyncify continuously saves and restores stack states during loop execution, which degrades raw arithmetic performance compared to compiling with the `-scheduler=none` flag.

### C. Zero Runtime Overhead of WASI Preview 2 Components
* Once initialized, **Target K** (WASI v0.2 Component) and **Target I** (WASI v0.1 Preview 1) exhibit identical CPU execution speeds to **Target C** (WASM v0 MVP).
* **Lesson**: The Wasm Component Model and WASI translation layers introduce **zero runtime performance penalty**. All abstraction costs are paid once during module instantiation, making WASI v0.2 fully viable for performance-critical production systems.

---

## 3. Toolchain & Runtime Constraints

### TinyGo Compiler goroutine Limitations
* **The Issue**: Spawning goroutines (`go func()`) inside exported functions (`//export` or `//go:wasmexport`) under TinyGo results in a fatal nil pointer dereference (`panic: runtime error: nil pointer dereference`).
* **Root Cause**: TinyGo's C-ABI export wrappers do not establish a planifier task frame when entered from JavaScript. The code runs on the raw host thread. When the Go GC attempts to allocate a closure struct for the goroutine, it dereferences a null pointer when checking `task.Current()`.
* **Standard Go Contrast**: Standard Go wraps exported functions with stubs that explicitly enter the Go runtime, acquire a goroutine context (`g`), and run the code on that `g`, allowing concurrent FFI execution.

---

## 4. Architectural Lessons & Design Recommendations

To build highly portable, robust, and performant WebAssembly libraries in Go, we recommend a strict **decoupled systems architecture**:

```text
[ mon_projet/ ]
      │
      ├── pkg/core/          <── Pure logic, 100% synchronous (No goroutines/channels)
      │                          • Target: Tiny, compile-safe WASM (G, J, K)
      │
      ├── pkg/concurrent/    <── Wrapper for native Go executions
      │                          • Target: CLI / native Go backend
      │                          • Implements goroutines & channels calling pkg/core
      │
      └── bindings/wasm/     <── Direct WASM FFI bindings
                                 • Exposes pkg/core directly to the host
```

### Recommendation 1: Decouple Logic from Concurrency
* **Guidelines**: Keep the core business logic (`pkg/core`) completely synchronous and sequential (avoid `go func()` and channels). 
* **Rationale**: This guarantees that the core code can compile to ultra-lightweight WebAssembly (Target G, ~100 KB) and run safely on any host environment (browser, edge, embedded devices) without triggering compiler or runtime scheduler panics.

### Recommendation 2: Delegate Concurrency to the Host
* **Guidelines**: In browser environments, offload multi-threaded calculations to host-side **JavaScript Web Workers** (`worker.js`) running parallel instances of the lightweight `core` WASM binary, rather than relying on Go's internal scheduler.
* **Rationale**: This prevents blocking the browser's main UI thread, eliminates "Page Unresponsive" popups, and bypasses TinyGo's FFI task limitations.

### Recommendation 3: Match Toolchain to Execution Environment
* **TinyGo** is optimal for **Client-side & Edge** (browsers, plugins, workers). It generates compact binaries (~120 KB), features quick instantiation, and maintains a near-zero memory footprint.
* **Standard Go** is optimal for **Server-side & Cloud** (backend microservices, databases). It supports the entire Go standard library and is compiled as a command-level component where initialization costs and binary size (~1.6 MB) are not constraining factors.

---

## 5. Future Roadmap: Proposed Metrology Experiments

To further enrich our research matrix, we proposed two new experiments for the next development cycle:

### A. Experiment 1: The `DelayAdd` Primitive (Testing Asyncify implications)
* **Goal**: Highlight the physical differences between TinyGo's `-scheduler=none` and `-scheduler=asyncify`.
* **Concept**: Introduce a mathematical primitive containing a synchronous delay, such as `DelayAdd(a, b, delayMs)`.
* **Expected Result**: 
  * Compiling under `-scheduler=none` will either fail during compiler analysis or throw an immediate runtime panic because the binary has no planifier to put the execution stack to sleep.
  * Compiling under `-scheduler=asyncify` will succeed and cooperatively pause execution (yielding control back to the host browser thread) without blocking the UI thread.
* **Metrological Value**: Measure the raw execution and memory footprint overhead of Asyncify instrumentation when dealing with blocking operations compared to non-blocking mathematical loops.

### B. Experiment 2: The `tiny-cli` RPC Subprocess (Bypassing FFI goroutine limits)
* **Goal**: Run concurrent workloads in TinyGo by bypassing the FFI `nilPanic` compiler limitation.
* **Concept**: Instead of compiling TinyGo as a Reactor Component (Target J/G), compile it as a WASI Command CLI binary (`main()` entrypoint) under a new taxonomy folder **`build/v0.2/tiny-cli/`**.
* **Execution Strategy**: The JS host will communicate with it via JSON-RPC over `stdin/stdout` by spawning the TinyGo module as an OS subprocess (identical to the standard Go Target F setup).
* **Expected Result**: Because the code is executed from the initial `main()` stack, TinyGo's scheduler is fully initialized and operational. Spawning goroutines (`go func()`) inside `ConcurrentCountPrimes` will execute **successfully without any nil pointer dereferences**.
* **Metrological Value**: Direct comparison between Standard Go RPC Subprocess (Target F, **3073 KB**) and TinyGo RPC Subprocess (Target L, **~150 KB**). This will measure the delta startup overhead (Fork/Instantiation latency) of a lightweight TinyGo runtime versus a heavy standard Go runtime.

---

**Status**: Approved & Recorded  
**Location**: `architecture/meetings/2026-08-09-labs-maths-performance-observations-and-architectural-lessons.md`
