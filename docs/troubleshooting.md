# Developer Tips & Troubleshooting

This page documents engineering tricks, workarounds, and common solutions compiled during the integration of WASI Preview 2 components into polyglot host scripting environments.

---

## 1. Local Server WASM MIME-Type Constraints

### The Problem
When testing web pages containing WebAssembly locally using simple servers (like VS Code Live Server or Python's default `http.server`), you may encounter the following browser console error:
```text
Uncaught (in promise) TypeError: Failed to execute 'compile' on 'WebAssembly': 
Incorrect response MIME type. Expected 'application/wasm', got 'text/plain'
```
This happens because the W3C spec forces `WebAssembly.instantiateStreaming` to validate that the HTTP header `Content-Type` is exactly `application/wasm`. If the server sends `text/plain` or `application/octet-stream`, compilation is blocked.

### The Solution: ArrayBuffer Fallback
To ensure standalone, bulletproof loading across misconfigured servers, write a fallback loader that falls back to `ArrayBuffer` compilation (which bypasses MIME-type validation):

```javascript
// Resolve WASM URL relative to the current loader script
const wasmUrl = new URL('my_lib.wasm', import.meta.url);

// 1. Attempt fastest standard-compliant streaming compilation
WebAssembly.instantiateStreaming(fetch(wasmUrl), importObject)
  .catch((err) => {
    console.warn("instantiateStreaming failed, falling back to ArrayBuffer:", err);
    
    // 2. Fall back to manual ArrayBuffer download, which skips MIME checks
    return fetch(wasmUrl)
      .then(response => response.arrayBuffer())
      .then(bytes => WebAssembly.instantiate(bytes, importObject));
  })
  .then(({ instance }) => {
    // Bind memory and exports
    const wasmMemory = instance.exports.memory;
    const exports = instance.exports;
  });
```

---

## 2. TinyGo Standalone Runtime System Hook Requirements

### The Problem
Even when compiling Go code with TinyGo targeting pure WebAssembly (`-target=wasm`) without any filesystem or system calls, the generated WASM binary will still require imports from a module named `wasi_snapshot_preview1`.
It specifically requires:

*   `random_get`: Used to feed entropy to seed key hash calculations for standard Go `maps`.
*   `fd_write`: Used to print runtime call stack logs in the event of a panic.
*   `proc_exit`: Used to stop the execution thread if a fatal panic occurs.

If you instantiate the binary in Chrome without passing these imports, loading throws a missing imports error.

### The Solution: Minimal Browser Mock
You do not need to download heavy WASI shim libraries to run simple modules. Pass a minimal mock environment object directly in the JavaScript imports structure:

```javascript
let wasmMemory;

const mockWasiEnv = {
  proc_exit: (code) => {
    console.warn(`WASM Go called exit with code: ${code}`);
  },
  fd_write: (fd, iovs, iovs_len, nwritten) => {
    return 0; // Return success (silence prints)
  },
  random_get: (buf, buf_len) => {
    // Fill Go's memory buffer with native browser Web Crypto entropy
    if (wasmMemory) {
      const array = new Uint8Array(wasmMemory.buffer, buf, buf_len);
      crypto.getRandomValues(array);
    }
    return 0; // Return success
  }
};

const importObject = {
  wasi_snapshot_preview1: mockWasiEnv
};

const { instance } = await WebAssembly.instantiate(wasmBytes, importObject);
wasmMemory = instance.exports.memory;
```

---

## 3. Webpack 5 Out-of-the-box Resolutions

If you are using Webpack 5 to compile your Web application incorporating WASI components, Webpack will throw errors because `@bytecodealliance/preview2-shim` references Node APIs.

Apply these configurations in `webpack.config.js`:
*   **Prevent bundling Node APIs**: Tell Webpack to ignore system modules inside browser target bundles by configuring `resolve.fallback`:
    ```javascript
    resolve: {
      fallback: {
        fs: false,
        os: false,
        path: false,
        crypto: false,
        stream: false
      }
    }
    ```
*   **Externalize Node Scheme Imports**: Prevent Webpack from compiling `node:` scheme prefixes by declaring them as external imports:
    ```javascript
    externals: {
      'node:fs/promises': 'module node:fs/promises',
      'node:fs': 'module node:fs'
    }
    ```

---

## 4. WASI Resource Memory Leaks

### The Problem
When you instantiate a `resource` in WIT (like our `KVStore` database), the actual stateful object is instantiated inside the Go WebAssembly linear memory heap. 

The Python or JavaScript garbage collector has no direct visibility into the WASM heap. If the host GC cleans up the JS/Python wrapper, the corresponding Go database struct inside WASM may remain allocated, causing a **memory leak** inside the WebAssembly instance.

### The Solution: Proper Destructuring
*   In **JavaScript** (`jco`): `jco` automatically links JS lifecycle checks to trigger WASM destructors when a resource object is garbage collected. However, to immediately release resources, call the destructor explicitly if supported by the binding wrapper.
*   In **Go**: The Go Component bindings registry holds resource references in a global map. When a destructor call is received from the host, ensure the Go runtime deletes the reference from its state registry to let the Go GC free the memory.
