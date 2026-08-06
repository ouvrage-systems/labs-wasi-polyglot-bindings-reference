# 🔬 Insights & Engineering Discoveries (`lib_maths`)

This document records the system behaviors, compiler analyses, and toolchain constraints discovered during benchmarks in this laboratory.

---

## Discovery 1: The Loop Inhalation Paradox (`ComputeSequence`)

### 🔍 Observation
When running `ComputeSequence` driven by a JavaScript loop (`N Calls WASM`), execution time increases linearly $O(N)$ with the number of calls. However, when executing the same workload entirely inside WASM (`WASM Internal`), the execution time drops to a constant **~0.15 ms**, regardless of whether the iteration count is $10^3$ or $10^7$.

### 🔬 Bytecode Investigation
By dumping the compiled WASM binary structure via `wasm-tools print`:
```bash
wasm-tools print bindings/build/v0/tiny/my_lib_maths.wasm
```
We inspected the disassembled bytecode for `ComputeSequence`:
```wat
(func $ComputeSequence (;53;) (param i64 i64 i64) (result i64)
    local.get 2
    i64.const 0
    local.get 2
    i64.const 0
    i64.gt_s
    select
    local.get 1
    i64.mul
    local.get 0
    i64.add
)
```

### 💡 Resolution
The compiler (LLVM's Scalar Evolution pass) analyzed the loop invariants and determined that the iterative accumulation loop could be mathematically resolved into a single closed-form multiplication and addition. 

The entire loop was optimized away at compile time, reducing runtime complexity from $O(N)$ iterations to $O(1)$ constant time. This highlights the difference between interpreted languages (or boundary-heavy iterations) and compile-time optimized WASM memory spaces.

---

## Discovery 2: The FFI Goroutine Closure Panic (`ConcurrentCountPrimes`)

### 🔍 Observation
Compiling our code with TinyGo's `-scheduler=asyncify` includes the coroutine engine in the WASM space. However, invoking `ConcurrentCountPrimes` from JavaScript triggers a runtime panic:
```text
Uncaught (in promise) RuntimeError: unreachable
    at main.runtime.runtimePanicAt
    at main.runtime.nilPanic
    at main.ConcurrentCountPrimes
```

### 🔬 Bytecode Investigation & Go Runtime Source Analysis
Tracing the Go AST compile targets and comparing different Goroutine closures:
1. **`go func() {}()` (Bare)**: Succeeded without error. No variable capture, no memory allocation.
2. **`go func() { results <- count }()` (Closure)**: Panicked. The Goroutine captures a channel variable from the parent frame, requiring the TinyGo Garbage Collector to allocate a closure context on the heap.

Analyzing the TinyGo compiler GC allocation functions in `src/internal/task/task_asyncify.go`:
```go
func Current() *Task {
    return currentTask
}
```

### 💡 Resolution
Host FFI calls entering WASM via the C-ABI `//export` boundary execute on the guest stack outside the active Go task loop. Consequently, `task.Current()` evaluates to `nil`. 

When the GC tries to allocate the closure structure on the heap, it attempts to read the flags of `task.Current()`, causing a null-pointer dereference (`nilPanic`) and triggering `unreachable`. 

This confirms that under WebAssembly v0, guest-level concurrency via exported FFI boundaries is blocked by toolchain architecture when closures are used. Concurrency in `v2` (WASI Preview 2) can instead leverage native thread support and Canonical ABI component calls.

---

**Previous Step**: [Mathematical Tests](2-tests.md)
