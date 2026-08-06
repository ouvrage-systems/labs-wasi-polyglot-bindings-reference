import wasmtime
from ._generated import loader

class KVStore:
    def __init__(self):
        """Instantiates a stateful in-memory Go key-value store inside WASM heap memory."""
        # 1. Retrieve raw linker, engine and component
        engine, linker, component = loader.get_linker_and_component()
        
        # 2. Instantiate a dedicated store for this KVStore instance lifecycle
        self._store = wasmtime.Store(engine)
        self._instance = linker.instantiate(self._store, component)
        
        # 3. Retrieve the interface and function indices
        interface_idx = self._instance.get_export_index(self._store, 'ouvrage:lab-wasi-demo/store')
        if interface_idx is None:
            raise ValueError("Store interface not found in component exports")
            
        ctor_idx = self._instance.get_export_index(self._store, '[constructor]kv-store', instance=interface_idx)
        set_idx = self._instance.get_export_index(self._store, '[method]kv-store.set', instance=interface_idx)
        get_idx = self._instance.get_export_index(self._store, '[method]kv-store.get', instance=interface_idx)
        del_idx = self._instance.get_export_index(self._store, '[method]kv-store.delete', instance=interface_idx)
        
        # 4. Resolve the executables
        self._ctor_func = self._instance.get_func(self._store, ctor_idx)
        self._set_func = self._instance.get_func(self._store, set_idx)
        self._get_func = self._instance.get_func(self._store, get_idx)
        self._del_func = self._instance.get_func(self._store, del_idx)
        
        # 5. Instantiate the native Go store inside WASM heap memory
        self._handle = self._ctor_func(self._store)

    def set(self, key: str, value: str) -> None:
        """Stores a key-value pair inside WASM linear memory."""
        self._set_func(self._store, self._handle, key, value)

    def get(self, key: str) -> str | None:
        """Retrieves a value by key from WASM linear memory."""
        return self._get_func(self._store, self._handle, key)

    def delete(self, key: str) -> bool:
        """Deletes a key from WASM memory and returns True if it existed."""
        return self._del_func(self._store, self._handle, key)
