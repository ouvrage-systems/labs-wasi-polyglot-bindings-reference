# WASI Preview 1 (JSON-RPC) Python Bindings Demonstration
**Path:** `/architecture/labs/wasm-hello-world-binding/bindings/py/v1/`

---

## 1. Overview
This directory demonstrates the **WASI Preview 1 Stdio/JSON-RPC pipeline** execution model. Because WASI Preview 1 has no native high-level types (like strings or records) and Go compiles to `wasip1`, this implementation multiplexes multiple submodules and function calls over standard streams (Stdin/Stdout redirection) using a lightweight JSON-RPC envelope.

---

## 2. File Layout

```text
v1/
  ├── pyproject.toml       <-- Python packaging configuration (uv compatible)
  ├── README.md            <-- This documentation
  ├── demo_user.py         <-- End-user Python code calling math/lang functions
  └── my_lib/
       ├── __init__.py     <-- Manually written clean API facade
       ├── math.py         <-- Math submodule calling loader with "math.add"
       ├── lang.py         <-- Lang submodule calling loader with "lang.reverse"
       └── _generated/
            ├── loader.py  <-- Mutualized WASM loader (Engine & Module compiled once)
            └── my_lib.wasm<-- Compiled WebAssembly WASI binary
```

---

## 3. How to Run

Ensure the WASM binary is compiled by running from the root of the lab:
```bash
GOOS=wasip1 GOARCH=wasm go build -o architecture/labs/wasm-hello-world-binding/bindings/py/v1/my_lib/_generated/my_lib.wasm architecture/labs/wasm-hello-world-binding/bindings/wasm/main.go
```

Then, run the user demo using **`uv`**:
```bash
uv run --project architecture/labs/wasm-hello-world-binding/bindings/py/v1 python3 architecture/labs/wasm-hello-world-binding/bindings/py/v1/demo_user.py
```
