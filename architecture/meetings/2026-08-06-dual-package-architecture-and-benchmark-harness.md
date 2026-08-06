# Architecture Meeting Notes - August 6, 2026

**Topic**: Dual-Package Strategy (`my_lib_maths` vs `my_lib`) & Multi-Language Benchmark Harness Design

---

## 1. Context & Objectives

* **Participants**: We (User & Antigravity AI)
* **Date**: August 6, 2026
* **Project**: WASI & Polyglot WebAssembly Reference Benchmark Lab (`v0-tiny`, `v0-legacy`, `v1-posix`, `v2-component-model`)

---

## 2. Rationale for Dual-Package Architecture

Currently, the domain codebase in `pkg/` contains four distinct sub-packages:
* `pkg/maths`: Scalar 64-bit integer workloads (`int64`, trial division primes, Fibonacci, arithmetic sequences).
* `pkg/geometry`: Structs and 2D math (`Point`, distance calculations).
* `pkg/text`: String allocations and memory pointer operations (`ReverseString`, `FormatMessage`).
* `pkg/store`: In-memory state and Go map structures (`KVStore`).

### The Architectural Problem
Bundling all domain packages into a single monolithic WebAssembly binary (`my_lib.wasm`) pollutes binary size and biases pure scalar execution benchmarks (especially when comparing WASI Preview 2 WIT Component Model interfaces).

### The Solution: Dual-Package Separation
We establish a clean, two-tier package hierarchy across all target versions (`v0`, `v1`, `v2`) and languages (JavaScript, Python):

1. **`my_lib_maths` (The Common Benchmark Denominator)**:
   * **Scope**: Exclusively `pkg/maths`.
   * **Purpose**: Serves as the pure 64-bit scalar benchmark denominator across all runtimes (`v0-tiny`, `v0-legacy`, `v1`, `v2`). Used to generate performance radar charts, FFI boundary latency comparisons, heap allocation tracking, and cold vs cached instantiation metrics.

2. **`my_lib` (The Polyglot Multi-Package Reference)**:
   * **Scope**: Full multi-package integration (`maths`, `geometry`, `text`, `store`).
   * **Purpose**: Demonstrates real-world polyglot binding generation, complex WIT component interfaces (`record`, `variant`, `list<u8>`, `string`), resource handles, and mutable KVStore state management.

---

## 3. Host Architecture & Shared Runners

To eliminate code duplication between browser Studio pages (`index.html`), Node.js CLI scripts (`tools/benchmark-wasm.mjs`), and Python CLI tools (`cmd/omaths-bench`), we establish dedicated domain modules and runner harnesses:

```text
wasi-polyglot-bindings-reference/
├── bindings/
│   ├── js/
│   │   └── pkg/
│   │       ├── maths.js           # Pure JavaScript domain workloads
│   │       └── runner_maths.js    # Generic JS Cached/Cold benchmark harness
│   │
│   └── py/
│       └── pkg/
│           ├── maths.py           # Pure Python / NumPy / Numba workloads
│           └── runner_maths.py    # Generic Python Cached/Cold benchmark harness
```

### Module Naming Strategy
* **`runner_maths.js` / `runner_maths.py`**: Specifically handles mathematical workloads.
* **Extensibility**: Leaves room for future specialized harnesses (`runner_store.js`, `runner_text.js`) to benchmark object lifecycle overhead, LLVM destructors (`__wasm_call_dtors`), and memory allocators independently.

---

## 4. Summary of Planned Target Hierarchy

```text
bindings/
├── js/
│   ├── pkg/ (maths.js, runner_maths.js)
│   ├── v0/
│   │   ├── tiny/ (my_lib_maths, my_lib)
│   │   └── legacy/ (my_lib_maths, my_lib)
│   ├── v1/ (my_lib_maths, my_lib)
│   └── v2/ (my_lib_maths, my_lib)
│
└── py/
    ├── pkg/ (maths.py, runner_maths.py)
    ├── v1/ (my_lib_maths, my_lib)
    └── v2/ (my_lib_maths, my_lib)
```

---

**Status**: Approved & Recorded  
**Location**: `architecture/meetings/2026-08-06-dual-package-architecture-and-benchmark-harness.md`
