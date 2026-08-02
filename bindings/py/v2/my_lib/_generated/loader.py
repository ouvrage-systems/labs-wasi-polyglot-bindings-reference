import os
import sys
import wasmtime
from wasmtime import Engine, Store
from wasmtime.component import Component, Linker

_CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))

# Add the generated folder to python path so submodules can resolve componentize_py_types
if _CURRENT_DIR not in sys.path:
    sys.path.insert(0, _CURRENT_DIR)

_WASM_PATH = os.path.join(_CURRENT_DIR, "my_lib_component.wasm")

# Note: The component must be compiled using 'make build' before executing.
_ENGINE = None
_LINKER = None
_COMPONENT = None

def _lazy_init():
    global _ENGINE, _LINKER, _COMPONENT
    if _ENGINE is not None:
        return
        
    if not os.path.exists(_WASM_PATH):
        raise FileNotFoundError(
            f"Component binary not found at {_WASM_PATH}.\n"
            "Run 'make build' to compile the WASM Component first."
        )
        
    _ENGINE = Engine()
    _LINKER = Linker(_ENGINE)
    _LINKER.add_wasip2()
    
    # 1. Implement host-http imported capability
    from wasmtime.component import Variant
    import urllib.request
    
    def fetch_url(store, url: str):
        try:
            # Perform native Python HTTP request
            req = urllib.request.Request(
                url,
                headers={'User-Agent': 'WASI Polyglot Reference'}
            )
            with urllib.request.urlopen(req, timeout=5) as response:
                return Variant('ok', response.read().decode('utf-8'))
        except Exception as e:
            return Variant('err', str(e))
            
    # 2. Bind the capability to the linker root
    host_http = _LINKER.root().add_instance("ouvrage:lab-wasi-demo/host-http")
    host_http.add_func("fetch-url", fetch_url)
    
    _COMPONENT = Component.from_file(_ENGINE, _WASM_PATH)

def call(interface_name: str, method_name: str, *args) -> any:
    """
    Calls a WIT function inside an exported interface natively in-process.
    """
    _lazy_init()
    store = Store(_ENGINE)
    instance = _LINKER.instantiate(store, _COMPONENT)
    
    # 1. Retrieve the exported interface instance (e.g., 'ouvrage:lab-wasi-demo/geometry')
    interface_idx = instance.get_export_index(store, interface_name)
    if interface_idx is None:
        raise ValueError(f"Interface '{interface_name}' not exported by component")
        
    # 2. Retrieve the nested function within that interface instance (e.g., 'add')
    method_idx = instance.get_export_index(store, method_name, instance=interface_idx)
    if method_idx is None:
        raise ValueError(f"Method '{method_name}' not found inside interface '{interface_name}'")
        
    # 3. Retrieve the executable function handle
    func = instance.get_func(store, method_idx)
    if func is None:
        raise ValueError(f"Export '{method_name}' is not a function")
        
    # 4. Invoke the function directly (values passed via WASM stack registers)
    return func(store, *args)

def get_linker_and_component():
    """
    Exposes raw engine, linker and component for advanced stateful resource calls.
    """
    _lazy_init()
    return _ENGINE, _LINKER, _COMPONENT
