from ._generated import loader

def format_message(name: str) -> str:
    """Formats a greeting name using native WASI Preview 2 WIT function calls."""
    return loader.call("ouvrage:lab-wasi-demo/lang", "format-message", name)

def reverse_string(s: str) -> str:
    """Reverses a string using native WASI Preview 2 WIT function calls."""
    return loader.call("ouvrage:lab-wasi-demo/lang", "reverse-string", s)
