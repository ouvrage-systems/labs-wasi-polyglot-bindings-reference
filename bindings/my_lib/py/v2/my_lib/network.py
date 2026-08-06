from my_lib._generated import loader
from componentize_py_types import Err

def fetch_and_format(url: str) -> str:
    """
    Fetches the content from a URL via host delegation and formats it in Go WASM.
    """
    res = loader.call("ouvrage:lab-wasi-demo/network", "fetch-and-format", url)
    if res.tag == "err":
        raise Exception(res.payload)
    return res.payload
