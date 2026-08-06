# Architecture Meeting Notes - August 5, 2026

**Topic**: Deep Dive into TinyGo WASM `main.runtime.nilPanic` on FFI Goroutines with Closure Variable Capture

---

## 1. Context & Scope

* **Participants**: We (User & Antigravity AI)
* **Date**: August 5, 2026
* **Scope**: Polyglot WebAssembly & WASI Reference Benchmark Lab (`v0` WASM, `v1` WASI Preview 1, `v2` WASI Preview 2 WIT Components)

---

## 2. Key Findings & Diagnostic Experiments

During internal benchmarking of `ConcurrentCountPrimes` in `v0-tiny` (TinyGo `target=wasm`), calling exported functions (`//export`) containing `go func()` resulted in a runtime panic: `main.runtime.nilPanic`.

We conducted isolated CLI experiments using Node.js to uncover the exact compiler and runtime behavior:

### A. Static Compiler Analysis (`-scheduler=none`)
* Compiling with `-scheduler=none -tags noscheduler` produces an ultra-lightweight WASM binary (**~99 KB**).
* TinyGo performs AST static analysis during compilation. If a `go func()` statement is detected when `-scheduler=none` is set, the build fails at compile-time:
  ```text
  attempted to start a goroutine without a scheduler
  ```
* We introduced a dedicated stub file (`concurrent_stub.go`) with the `noscheduler` build tag to allow building the pure scalar 99 KB binary.

### B. Asyncify Scheduler Overhead (`-scheduler=asyncify`)
* Compiling with `-scheduler=asyncify` includes the coroutine scheduler and runs Binaryen's `wasm-opt --asyncify` pass, producing a **~133 KB** binary.
* The Asyncify overhead is only **~34 KB**, proving TinyGo's coroutine engine is extremely compact compared to Go Standard (`GOOS=js` ~2,100 KB).

### C. Root-Cause Analysis of FFI Closure Allocation (`nilPanic`)
Isolated Node.js experiments comparing closure variants revealed the exact root cause:
1. **Bare Goroutine (`go func() {}()`)**: Runs and completes without error because no variables are captured from the outer scope and no GC heap allocation occurs.
2. **Closure Goroutine (`go func() { results <- 42 }()`)**: Captures variables from the outer function scope. TinyGo allocates a closure context struct on the GC heap.

```text
[JavaScript Host] ──(FFI C-ABI Call)──► [my_lib.wasm: ConcurrentCountPrimes.command_export]
                                                       │
                                                       ▼
                                            Context: task.Current() == nil
                                                       │
                                                       ▼
                                            go func() { results <- ... }
                                                       │
                                                       ▼
                                            Allocates Closure Struct on GC Heap
                                                       │
                                                       ▼
                                            TinyGo GC checks task.Current().Flags
                                                       │
                                                       💥
                                            main.runtime.nilPanic (Null dereference)
```

* **C-ABI Entry Point**: Host calls to exported C-ABI wrappers (`command_export`) enter WASM memory outside of an active Go task frame (`task.Current() == nil`).
* **GC Heap Allocation**: When allocating closure structs, TinyGo's Garbage Collector checks `task.Current()`. Because `task.Current()` is `nil` during FFI execution, the GC dereferences `nil`, causing `main.runtime.nilPanic`.

---

## 3. Decisions & Action Items

1. **Single Source of Truth (`pkg/maths/maths.go`)**:
   * Keep `pkg/maths/maths.go` as pure, idiomatic Go using native goroutines and channels across all lab versions (`v0`, `v1`, `v2`). Do not modify domain code for toolchain quirks.

2. **Dual-Binary Strategy for `v0-tiny`**:
   * Maintain two target WASM binaries:
     * `my_lib.wasm` (99 KB): Default scalar binary compiled with `-scheduler=none -tags noscheduler`.
     * `my_lib_asyncify.wasm` (133 KB): Goroutine-enabled binary compiled with `-scheduler=asyncify`.

3. **Web Worker Architecture**:
   * Recommend multi-core browser parallelism in WASM v0 via JS Web Workers executing parallel WASM instances, rather than relying on single-threaded WASM green-threads.

---

**Status**: Approved & Recorded  
**Location**: `architecture/meetings/2026-08-05-tinygo-wasm-ffi-goroutine-nilpanic.md`
