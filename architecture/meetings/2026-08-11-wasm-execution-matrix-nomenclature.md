# Design Notes: 2026-08-11 — Unified Execution Matrix, Run Seed Nomenclature & In-Process FFI vs. Out-of-Process IPC

## Metadata
* **Date**: August 11, 2026
* **Participants**: `@gpineda` (Lead Architect & Systems Engineer), `@Antigravity` (AI Coding Assistant)
* **Status**: Decided & Documented
* **Location / Repository**: `github.com/ouvrage-systems/labs/wasi-polyglot-bindings-reference`

---

## 1. Context & Core Objectives

Having successfully established the Bash-to-WASM persistent Named Pipes (FIFO) symbiosis, we faced the challenge of unifies metrology benchmarking across multiple host environments (Web Browser, Node.js, Python, Bash) and multiple underlying execution engines (in-process FFI, Wasmtime CLI, Node.js CLI, etc.).

A naive approach would encode the execution engine directly inside the static build `toolchain` matrix. However, this creates a severe architectural conflict: the toolchain code must designate *how the binary was compiled* (immutable artifact signature), whereas the execution engine is a *dynamic runtime configuration* decided by the host script.

Furthermore, we must distinguish between different execution boundaries, specifically the massive difference between in-process bindings (such as `wasmtime-py`) and out-of-process CLI runners (such as `wasmtime-cli`), as they represent entirely different physical performance profiles.

The objective of this design session was to:
1.  Analyze and document the architectural differences and performance profiles of `wasmtime-py` (in-process FFI) versus `wasmtime-cli` (out-of-process subprocess IPC).
2.  Establish a clear separation of concerns between Build-Time (Toolchain) and Run-Time (Execution Context) dimensions.
3.  Design a recursively composable, dot-separated **Execution Channel Chain** notation to model nested subprocess wrappers.
4.  Synthesize a highly compact, prefix-based **Unified Run Seed Grammar** that supports floating-point parameters without separator collision.

---

## 2. In-Process FFI (`wasmtime-py`) vs. Out-of-Process IPC (`wasmtime-cli`)

A major point of discussion was the technical distinction between calling a WebAssembly module through programmatic bindings in memory versus spawning the CLI engine as a separate system process.

```text
  [ Subprocess IPC (wasmtime-cli) ]
  ┌──────────────────┐                     ┌──────────────────┐
  │  PROCESS PYTHON  │ ──(Pipe/JSON-RPC)─> │ PROCESS WASMTIME │ ──> Exec WASM
  └──────────────────┘                     └──────────────────┘
  Boundary: Separate process/address spaces. Requires JSON bytes serialization & pipe I/O.

  [ In-Process FFI (wasmtime-py) ]
  ┌────────────────────────────────────────────────────────┐
  │                     PROCESS PYTHON                     │
  │  [ Python Code ] ──(FFI Call)──> [ WASM VM in RAM ]    │
  └────────────────────────────────────────────────────────┘
  Boundary: Shared process space. Direct C-API memory calls on libwasmtime.so heap.
```

### 2.1 Architectural Differences

*   **`wasmtime-cli`**:
    *   **Nature**: A standalone compiled native executable binary (written in Rust).
    *   **Isolation**: Runs in its own separate operating system process. The host script and the WASM engine have disjoint memory spaces.
    *   **Communication**: Requires Inter-Process Communication (IPC). Arguments must be serialized (e.g., into a JSON-RPC envelope string), written to the input stream (`stdin` or Named Pipe), read by Wasmtime, parsed in Go/Rust, executed, and the result must be serialized and written back to the output stream (`stdout`).
    *   **Callbacks**: The guest WASM module cannot invoke host-side Python functions easily, as there is no shared memory or call stack.
*   **`wasmtime-py`**:
    *   **Nature**: A Python library that binds to `libwasmtime.so` (the compiled dynamic C library of Wasmtime) using Python's foreign function interface (FFI) capabilities.
    *   **Isolation**: The WASM virtual machine runs *directly inside the Python process heap*.
    *   **Communication**: Direct memory access. Primitive numeric parameters (like `i32` or `f64`) are passed directly via CPU registers and the call stack. There is zero serialization or copying overhead.
    *   **Callbacks**: The guest WASM module can call back into native Python functions registered as imports during instantiation.

### 2.2 Metrology & Performance Implications

*   **Cold Start Latency**: `wasmtime-cli` incurs a heavy system startup penalty (~10-20ms per launch) as the OS allocates namespaces and process memory. `wasmtime-py` loads the shared library once, meaning VM instantiation takes less than 1ms.
*   **Loop Execution**: Running a loop of 50 calls over `wasmtime-cli` via shell subprocesses takes several hundred milliseconds due to process creation overhead (unless persistent Named Pipes are used, which still incur pipe copy overhead). Running the same 50 calls in-process via `wasmtime-py` takes less than 0.5ms (nanosecond scale) due to direct FFI register passing.

---

## 3. Separation of Concerns & Chained Execution Channels

We resolved the context-resolution conflict by dividing the metrology run parameters into a dynamic pipeline. 

### 3.1 Static Build Target (Toolchain)
Identifies the immutable compiled binary, tracking Sandbox (`p1`/`p2`), Compiler (`T`/`S`), Scheduler (`O`/`A`/`T`), and Entrypoint (`E`/`R`) settings. It is forged once.

### 3.2 Dynamic Execution Channel Chain (Channel)
Models the stack of process boundary crossings and VM engine wrappers. Using dot-notation (`.`), the chain is evaluated from left to right: from the outer benchmark driver down to the final WASM engine.

*   **`ffi`**: Direct in-process FFI call by the benchmark runner.
*   **`sp.wt`**: Spawns the Wasmtime CLI subprocess (e.g. from Python or Bash).
*   **`sp.nd`**: Spawns the Node.js CLI subprocess.
*   **`sp.py.ffi`**: Spawns a Python script subprocess, which then loads the WASM module in-process using `wasmtime-py` FFI.
*   **`sp.py.sp.py.ffi`**: An exotic nested wrapper stack where Bash spawns a Python subprocess, which spawns another Python subprocess, which finally executes the WASM via FFI.

By explicitly tracing this stack, we avoid logical contradictions (e.g., classifying a Bash-spawning-Python run as purely in-process FFI).

---

## 4. The Unified Run Seed Grammar

We designed a unified, compact run seed format for URL hashes, command-line arguments, and database index keys. It follows a strict prefix-based grammar where every segment starts with its single-letter identifier, separated by hyphens (`-`):

```text
T<toolchain>-M<mode>-C<channel>-F<func>-H<host>-P<params>
```

### 4.1 Dimension Encodings

| Prefix | Dimension | Format / Codes | Example |
| :--- | :--- | :--- | :--- |
| **`T`** | Toolchain | 6-segment dot-separated build target | `Tp1.T.p1.A.R.0` |
| **`M`** | Mode | Execution mode digit (corresponds to `nomenclature.json` modes) | `M1` (Pure WASM) |
| **`C`** | Channel | Dot-separated process boundary stack | `Csp.wt` |
| **`F`** | Function | 1-letter mathematical function code | `FA` (Add) |
| **`H`** | Host | Numeric host environment code (`1`=Browser, `2`=Node, `3`=Python, `4`=Bash) | `H3` |
| **`P`** | Parameters | Serialized colon-separated (`:`) values | `P10.5:20:0` |

### 4.2 Handling Floats and Separator Collision

*   **The Separator Dilemma**: In WebAssembly metrology, we must support floating-point arguments (e.g. `a=10.5`). If we use dots `.` to separate parameter values, it collides with the decimal point of floats and the structural dot separators of the toolchain (`Tp1.T...`) and channel (`Csp.wt`) blocks.
*   **The Solution**: We reserve `.` strictly for structural hierarchies and floating-point decimal points, and use the **colon (`:`)** to separate parameter values in the parameters block.
*   **Example**: `P10.5:20:0` maps to arguments `A=10.5`, `B=20`, and `C=0`.

### 4.3 Dynamic Parameter Signature Mapping

To keep the seed compact and prevent it from bloating with variable keys (`a=10&b=20`), the parameters block (`P10:20`) contains only ordered values. 

At runtime, the seed decoder uses the function identifier (from the `F` block, e.g. `FA`) to look up the function's parameter signature inside the single source of truth `nomenclature.json`:
1.  Extract `FA` ➔ maps to function `Add`.
2.  Query `nomenclature.json` ➔ `Add` signature is `["A", "B"]`.
3.  Zip the parameter values `[10, 20]` with the signature keys `["A", "B"]`.
4.  Reconstruct the named dictionary: `{"a": 10, "b": 20}`.

This allows the seed to remain extremely short and clean, while preserving the ability to dynamically decode raw values into concrete named variables for any function target in the workspace.

---
*Design document recorded by `@Antigravity` in partnership with `@gpineda`.*
