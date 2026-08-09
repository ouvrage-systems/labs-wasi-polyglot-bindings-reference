# Meeting Notes - August 9, 2026: Refactoring Plan and Unified Taxonomy for Python Extension

## 1. Context & Objectives
To prepare the codebase for the integration of the Python host bindings (sprint scheduled for tomorrow), we designed a clean, future-proof directory structure. This refactoring plan aims to unify the physical layout of source files, compiled binaries, transpiled modules, and host adapters across all language runtimes (JS and Python).

---

## 2. Unified 5-Dimensional Directory Taxonomy
We approved a clean, multi-dimensional physical path layout for all compiled Wasm outputs:

```text
build/<host_wasi_version>/<toolchain>/<guest_wasi_version>/<entrypoint_pattern>/<scheduler>/
```

### A. Dimensions Definitions
1.  **`<host_wasi_version>`**: The target execution environment. `v0` (WASM MVP), `v0.1` (WASI Preview 1), `v0.2` (WASI Preview 2 Component Model).
2.  **`<toolchain>`**: The compiler used. `tiny` (TinyGo), `stdgo` (Standard Go).
3.  **`<guest_wasi_version>`**: The guest compiler target specification. `v0` (WASM 1.0 MVP), `v0.1` (WASI Preview 1), `v0.2` (WASI Preview 2 Component).
4.  **`<entrypoint_pattern>`**:
    *   **`export`** (FFI Direct Exports): The module behaves as a library. The host calls functions directly by jumped memory address exports.
    *   **`jssyscall`** (JS Syscall Exports): Standard Go's `syscall/js` target on WASM MVP (v0), where functions are dynamically registered into the global JS window object at startup.
    *   **`cli`** (One-Shot Command): The module behaves as a command-line utility. It reads arguments at startup from the host CLI context, runs `main()`, writes to `stdout` once, and exits.
    *   **`jsonrpc`** (Persistent JSON-RPC Stream): The module behaves as a resident process. Its `main()` loop remains active, reading structured JSON-RPC commands continuously from `stdin` and replying via `stdout`.
5.  **`<scheduler>`**: `none` (no scheduler / sequential), `asyncify` (TinyGo Stack rewriting), or `native` (standard runtime scheduler).

---

## 3. Symmetric Directory Mirrors
To maximize readability and prevent complex custom symlink management verbiage in build files, we established a **perfect mirror layout** across all code layers:

1.  **`wasm/` (Sources)**: E.g., `wasm/v0/stdgo/v0/jssyscall/main.go`
2.  **`build/` (Binaries)**: E.g., `build/v0/stdgo/v0/jssyscall/my_lib_maths.wasm`
3.  **`js/all/_generated/jco/` (Transpiles)**: E.g., `js/all/_generated/jco/v0.2/tiny/v0.1/export/none/...`
4.  **`js/all/_generated/standalone/` (Bundles)**: E.g., `js/all/_generated/standalone/v0.2/tiny/v0.1/export/none/...`
5.  **`py/_generated/` (Python mirror)**: E.g., `py/_generated/v0.2/tiny/v0.1/export/none/...` (populated using python bindings generation tools like `componentize-py` or `wasmtime`).

### The Single Symlink Pattern
To avoid maintaining multiple separate links inside `_generated/` (which clutter clean scripts), the build system generates a single top-level symlink pointing to the build directory:
```bash
ln -sf ../../build bindings/my_lib_maths/js/all/_generated/build
```
This allows loaders in `js/all/` (and similarly for Python loaders in `py/`) to dynamically resolve target binaries using the exact taxonomy subpaths (e.g. `_generated/build/v0.2/tiny/v0.1/export/none/my_lib_maths.wasm`).

---

## 4. Target Mapping Grid
Applying this structure gives a perfectly symmetric folder architecture for all 11 matrix targets:

*   **Target A** (TinyGo none v0) ➔ `build/v0/tiny/v0/export/none/`
*   **Target B** (TinyGo asyncify v0) ➔ `build/v0/tiny/v0/export/asyncify/`
*   **Target C** (Standard Go v0) ➔ `build/v0/stdgo/v0/jssyscall/native/`
*   **Target D** (TinyGo none v0.1) ➔ `build/v0.1/tiny/v0.1/export/none/`
*   **Target E** (TinyGo asyncify v0.1) ➔ `build/v0.1/tiny/v0.1/export/asyncify/`
*   **Target I** (Standard Go FFI v0.1) ➔ `build/v0.1/stdgo/v0.1/export/native/`
*   **Target F** (Standard Go RPC v0.1) ➔ `build/v0.1/stdgo/v0.1/jsonrpc/native/`
*   **Target G** (TinyGo none v0.2 adapted) ➔ `build/v0.2/tiny/v0.1/export/none/`
*   **Target J** (TinyGo asyncify v0.2 adapted) ➔ `build/v0.2/tiny/v0.1/export/asyncify/`
*   **Target K** (Standard Go v0.2 adapted) ➔ `build/v0.2/stdgo/v0.1/export/native/`
*   **Target L** (Proposed TinyGo RPC adapted) ➔ `build/v0.2/tiny/v0.1/jsonrpc/asyncify/`
*   **Target M** (Proposed TinyGo native v0.2) ➔ `build/v0.2/tiny/v0.2/export/none/`

---

**Status**: Approved & Recorded  
**Location**: `architecture/meetings/2026-08-09-refactoring-plan-and-unified-taxonomy-for-python-extension.md`
