import os
import tempfile
import json
import wasmtime

# Resolve the absolute path of the embedded my_lib.wasm binary packaged inside _generated/
_CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
_WASM_PATH = os.path.join(_CURRENT_DIR, "my_lib.wasm")

# ==============================================================================
# MUTUALIZED ENGINE INITIALIZATION (Executed once at module import)
# ==============================================================================
if not os.path.exists(_WASM_PATH):
    raise FileNotFoundError(f"Embedded WASM engine not found at {_WASM_PATH}")

_ENGINE = wasmtime.Engine()
_MODULE = wasmtime.Module.from_file(_ENGINE, _WASM_PATH)

def call(method: str, params: dict) -> any:
    """
    Executes a specific JSON-RPC method on the mutualized Go WASM compiler engine.
    """
    store = wasmtime.Store(_ENGINE)

    stdin_fd, stdin_path = tempfile.mkstemp()
    stdout_fd, stdout_path = tempfile.mkstemp()

    try:
        # 1. Format JSON-RPC envelope
        req = {
            "method": method,
            "params": params
        }
        with os.fdopen(stdin_fd, 'w') as f:
            json.dump(req, f)

        # 2. Configure WASI Stdin/Stdout pipes
        wasi = wasmtime.WasiConfig()
        wasi.stdin_file = stdin_path
        wasi.stdout_file = stdout_path
        wasi.inherit_stderr()
        store.set_wasi(wasi)

        # 3. Instantiate the WASM module
        linker = wasmtime.Linker(_ENGINE)
        linker.define_wasi()
        instance = linker.instantiate(store, _MODULE)

        # 4. Invoke the WASI entrypoint
        try:
            start_func = instance.exports(store).get("_start")
            if start_func:
                start_func(store)
        except wasmtime.ExitTrap as e:
            if e.code != 0:
                raise RuntimeError(f"WASM exited with non-zero code {e.code}")

        # 5. Read output response
        with open(stdout_path, 'r') as f:
            stdout_data = f.read()

        resp = json.loads(stdout_data.strip())
        if resp.get("error"):
            raise RuntimeError(f"WASM execution error: {resp['error']}")

        return resp.get("result")

    finally:
        try:
            os.close(stdout_fd)
        except OSError:
            pass
        if os.path.exists(stdin_path):
            os.unlink(stdin_path)
        if os.path.exists(stdout_path):
            os.unlink(stdout_path)
