from ._generated import loader

def format_message(name: str) -> str:
    """Formats a greeting name using the Go WASM backend (Preview 1 JSON-RPC)."""
    return loader.call("lang.format", {"name": name})

def reverse_string(s: str) -> str:
    """Reverses a string using the Go WASM backend (Preview 1 JSON-RPC)."""
    return loader.call("lang.reverse", {"s": s})
