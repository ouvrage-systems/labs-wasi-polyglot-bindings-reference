from ._generated import loader

class KVStore:
    def __init__(self):
        """Instantiates a simulated key-value store for Preview 1 (using Python state)."""
        self._data = {}

    def set(self, key: str, value: str) -> None:
        """Stores a key-value pair, calling WASM for processing."""
        loader.call("store.set", {"key": key, "value": value})
        self._data[key] = value

    def get(self, key: str) -> str | None:
        """Retrieves a value, calling WASM for processing."""
        loader.call("store.get", {"key": key})
        return self._data.get(key)

    def delete(self, key: str) -> bool:
        """Deletes a key, calling WASM for processing."""
        loader.call("store.delete", {"key": key})
        if key in self._data:
            del self._data[key]
            return True
        return False
