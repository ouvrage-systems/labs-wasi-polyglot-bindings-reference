# WASI Preview 2 (Component Model) Python Bindings Demonstration
**Path:** `/architecture/labs/wasm-hello-world-binding/bindings/py/v2/`

---

## 1. Overview
This directory demonstrates the target **WASI Preview 2 (Component Model)** execution model. Functions are defined statically in a WIT (WebAssembly Interface Type) contract. The host calling code invokes them natively through WebAssembly stack values, avoiding the performance overhead of JSON serialization, disk I/O, and sub-process execution.

---

## 2. File Layout

```text
v2/
  ├── pyproject.toml       <-- Python packaging configuration (uv compatible)
  ├── README.md            <-- This documentation
  ├── demo_user.py         <-- End-user Python code calling math/lang functions
  └── my_lib/
       ├── __init__.py     <-- Clean API facade
       ├── math.py         <-- Math submodule calling native WIT math exports
       ├── lang.py         <-- Lang submodule calling native WIT lang exports
       └── _generated/
            ├── loader.py  <-- Mutualized WASI Preview 2 Component Linker
            └── my_lib_component.wasm <-- Target WebAssembly Component (to compile)
```

---

## 3. How to Build (Next Step)

To build the true WASI Preview 2 component, the build environment requires:
*   `wit-bindgen` (CLI tool)
*   `wasm-tools` (CLI tool)
*   `wasi_snapshot_preview1.wasm` (Preview 1 to Preview 2 adapter)

Once the toolchain is installed, the compilation workflow is:

1.  **Generate Go WIT bindings:**
    ```bash
    wit-bindgen go ./bindings/wit/world.wit --out-dir ./bindings/wasm/gen
    ```
2.  **Compile Go code to WASI Preview 1:**
    ```bash
    GOOS=wasip1 GOARCH=wasm go build -o ./bindings/wasm/my_lib_raw.wasm ./bindings/wasm
    ```
3.  **Translate to WASI Preview 2 Component:**
    ```bash
    wasm-tools component new ./bindings/wasm/my_lib_raw.wasm \
      --adapt ./wasi_snapshot_preview1.wasm \
      -o ./bindings/py/v2/my_lib/_generated/my_lib_component.wasm
    ```

---

## 4. How to Run

Run the user demo using **`uv`**:
```bash
uv run --project architecture/labs/wasm-hello-world-binding/bindings/py/v2 python3 architecture/labs/wasm-hello-world-binding/bindings/py/v2/demo_user.py
```
