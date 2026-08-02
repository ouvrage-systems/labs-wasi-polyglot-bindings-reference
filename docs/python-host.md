# Python Host Integration

This page details how to load and execute compiled WebAssembly modules inside CPython, comparing the legacy WASI Preview 1 subprocess runner (V1) and the native WASI Preview 2 Component loader (V2).

---

## 1. Directory Structure

Our Python packages are structured under `bindings/py/` to demonstrate modular library design:

```text
bindings/py/
  ├── v1/
  │    ├── pyproject.toml              # Dependencies (pytest, uv)
  │    └── my_lib/
  │         ├── index.py               # Public API facade (V1)
  │         └── _generated/
  │              ├── loader.py         # Subprocess JSON-RPC executor
  │              └── my_lib.wasm       # Compiled V1 wasip1 binary
  │
  └── v2/
       ├── pyproject.toml              # Dependencies (pytest, wasmtime, uv)
       └── my_lib/
            ├── index.py               # Public API facade wrapping WASM types
            ├── geometry.py            # Rich Point/Rectangle class wrappers
            ├── store.py               # Stateful KVStore resource wrapper
            └── _generated/
                 └── my_lib_component.wasm # Compiled V2 Component binary
```

---

## 2. WASI Preview 1 (V1) - Subprocess JSON-RPC

In V1, Python executes the WASM binary by spawning a subprocess running the compiled binary under the `wasmtime` CLI. 

The loader [`my_lib/_generated/loader.py`](file:///home/gpineda/Documents/ouvrage/labs/wasi-polyglot-bindings-reference/bindings/py/v1/my_lib/_generated/loader.py) handles the interaction:
```python
import subprocess
import json

def call_wasm(method: str, params: list):
    # Spawn wasmtime running the wasip1 binary
    proc = subprocess.Popen(
        ["wasmtime", "my_lib.wasm"],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True
    )
    # Write JSON-RPC payload to stdin
    payload = json.dumps({"method": method, "params": params})
    stdout, stderr = proc.communicate(input=payload)
    
    # Parse output response
    response = json.loads(stdout)
    return response["result"]
```
*Disadvantage*: Every call spawns a process, parsing strings, making it extremely slow.

---

## 3. WASI Preview 2 (V2) - In-Process Wasmtime Loader

In V2, Python loads the component directly into the python process thread using the `wasmtime` library. 

### A. Dynamic Component Loading
The loader [`bindings/py/v2/my_lib/_generated/loader.py`](file:///home/gpineda/Documents/ouvrage/labs/wasi-polyglot-bindings-reference/bindings/py/v2/my_lib/_generated/loader.py) boots the WASM engine in memory:
```python
from wasmtime import Engine, Store, Linker, Component

engine = Engine()
linker = Linker(engine)

# Load the compiled component
component = Component.from_file(engine, "my_lib_component.wasm")
store = Store(engine)

# Instantiate the component inside Python's process
instance = linker.instantiate(store, component)
```

### B. Mapping WIT Types to Python OOP Class wrappers
Because `wasmtime` translates WIT records and resources to raw dictionary entries and index pointers, our public facade wraps them into clean Python classes to preserve static type checking and auto-completion.

For example, [`my_lib/geometry.py`](file:///home/gpineda/Documents/ouvrage/labs/wasi-polyglot-bindings-reference/bindings/py/v2/my_lib/geometry.py) implements Point geometry:
```python
from my_lib._generated import loader

class Point:
    def __init__(self, x: float, y: float):
        self.x = x
        self.y = y

    async def distance_to(self, other: 'Point') -> float:
        # Calls the in-memory WASM function directly
        return loader.geometry.distance(
            loader.store, 
            {"x": self.x, "y": self.y}, 
            {"x": other.x, "y": other.y}
        )
```

And [`my_lib/store.py`](file:///home/gpineda/Documents/ouvrage/labs/wasi-polyglot-bindings-reference/bindings/py/v2/my_lib/store.py) wraps the stateful KV-Store resource:
```python
from my_lib._generated import loader

class KVStore:
    def __init__(self):
        # Instantiate a new stateful KVStore resource in Go heap
        self._handle = loader.store_exports.KvStore(loader.store)

    async def set(self, key: str, value: str) -> None:
        self._handle.set(loader.store, key, value)

    async def get(self, key: str) -> str:
        return self._handle.get(loader.store, key)
```

---

## 4. Execution & Testing

We manage dependencies and virtual environments in python using `uv` (compiled Rust-based package manager).

To execute the unit tests for Python V1 (JSON-RPC) or V2 (Component):
```bash
# Run Preview 1 tests
make run-py-v1

# Run Preview 2 tests
make run-py-v2
```
The V2 component tests run in **~0.13 seconds** compared to **~0.54 seconds** for the V1 subprocess suite.
