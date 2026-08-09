# Architecture Meeting Notes - August 8, 2026

**Topic**: WASI v0.2 Components: Toolchain Limits, Browser Packaging, and Standard Go Reactor Prototyping

---

## 1. Context & Scope

* **Participants**: We (User & Antigravity AI)
* **Date**: August 8, 2026
* **Scope**: WASI Preview 2 (v0.2) Component architecture for Go targets (both TinyGo and standard Go compilers).
* **Goal**: Document the constraints of modern Go toolchains regarding WASI v0.2 components, our browser packaging strategy to avoid host-level importmap dependencies, and our journey in prototyping a standard Go `wasip2` reactor component.

---

## 2. WASI v0.2 & Current Go Compiler Limitations

Standard Go (Go 1.24/1.25) does **not** natively support building WASI Preview 2 components.
* There is no native `GOOS=wasip2` target (only `GOOS=wasip1` which produces legacy WASI Preview 1 binaries).
* Consequently, standard Go cannot natively consume or output WIT (`.wit`) defined interfaces.
* To compile WASI v0.2 components, developers are forced to:
  1. Use **TinyGo**, which provides native WIT-binding generation via `wit-bindgen` and compilation into v0.2 components via `wasm-tools component new`.
  2. Or **adapt standard Go** WASI Preview 1 binaries by translating them using `wasi_snapshot_preview1.reactor.wasm` adapters.

---

## 3. Transpilation with `jco` & Browser Packaging (Importmaps Workaround)

To run a WebAssembly component in JavaScript hosts, `jco transpile` converts the WASI v0.2 component into an ES module.
* **The Importmaps Issue**: The default transpiled JS references external WASI shims (e.g. `'wasi:cli/environment@0.2.0'`) and dependencies from `@bytecodealliance/preview2-shim`. In browser hosts, resolving these non-relative imports requires configuring complex `importmaps` in the HTML document.
* **The Web Worker Obstacle**: Browser Web Workers (used to offload heavy calculations from the main UI thread) do not support or inherit page-level `importmaps`, making it impossible to resolve the shims.
* **Our Standalone Bundling Solution**: We integrated an `esbuild` packaging step in the [`Makefile`](file:///home/gpineda/Documents/ouvrage/labs/wasi-polyglot-bindings-reference/Makefile#L202):
  ```bash
  esbuild my_lib_maths_component.js --bundle --format=esm --platform=browser --external:node:* --minify --outfile=standalone/v0.2/legacy/patched/my_lib_maths_component.js
  ```
  This resolves and inlines all `@bytecodealliance/preview2-shim` dependencies into a single, self-contained, standalone ES module. The resulting module runs out-of-the-box in Node.js, standard browsers, and Web Workers without needing any `importmaps`.

---

## 4. Our Journey: Prototyping a Standard Go `wasip2` Reactor Component

To run standard Go code containing goroutines inside a WASI v0.2 Component (acting as a prototype for what a future native Go `wasip2` compiler target will do), we designed and implemented a compilation, stubbing, and unwinding pipeline:

```text
[JS Host: V02TinyLoader]
       │
       ▼
[Instantiate JS Component]
       │
       ├─► Inject Custom Stubs (args_sizes_get, environ_sizes_get)
       │   (Direct WebAssembly Memory manipulation using DataView)
       │
       ▼
[Call exports1._start()] ──► [Go Runtime: runtime.main]
                                    │
                                    ▼
                             [Calls exit(0)] ──► [wasi_snapshot_preview1.proc_exit]
                                                                │
                                                                ▼
                                                     [Throws JS Exit Error]
                                                                │
       ┌────────────────────────────────────────────────────────┘
       ▼
[Catch wasi_exit:0] (Gracefully ignored; instance remains active in memory)
       │
       ▼
[Ready for FFI] ──► [Host calls add() / concurrentCountPrimes()]
```

### Step 1: Compilation as a WASI 0.1 Command
We compile the standard Go code located in [`wasm/v0.2/stdgo`](file:///home/gpineda/Documents/ouvrage/labs/wasi-polyglot-bindings-reference/bindings/my_lib_maths/wasm/v0.2/stdgo/main.go) without `-buildmode=c-shared`. Building as a standard command allows Go to correctly include the `_start` entry point, which is essential to initialize the scheduler and garbage collector.
We expose flat lowercase/kebab-case exports matching the root WIT world:
```go
//go:wasmexport add
func Add(a, b int64) int64 { return maths.Add(a, b) }
```

### Step 2: Componentization via Adapter
We embed the WIT metadata using `wasm-tools component embed` and translate the Preview 1 module to a Preview 2 component using `wasm-tools component new --adapt wasi_snapshot_preview1.reactor.wasm`.

### Step 3: Low-Level WASI Imports Stubbing
During the `_start` initialization phase, Go's runtime calls `args_sizes_get` and `environ_sizes_get`. Because the module is adapted as a reactor component, the WASI Preview 2 adapter throws an assertion failure when these are called.
We patched the transpiled JS file post-transpilation to replace these imports with inline stubs that write dummy values directly to WebAssembly memory using a `DataView`:
```javascript
args_get: (argvPtr, argvBufPtr) => 0,
args_sizes_get: (argcPtr, argvBufSizePtr) => {
  const view = new DataView(exports1.memory.buffer);
  view.setUint32(argcPtr, 0, true);
  view.setUint32(argvBufSizePtr, 0, true);
  return 0;
},
environ_get: (environPtr, environBufPtr) => 0,
environ_sizes_get: (envCountPtr, envBufSizePtr) => {
  const view = new DataView(exports1.memory.buffer);
  view.setUint32(envCountPtr, 0, true);
  view.setUint32(envBufSizePtr, 0, true);
  return 0;
}
```
This tells standard Go's runtime that the host has `0` arguments and `0` environment variables, successfully bypassing the adapter assertions.

### Step 4: Timing Go Runtime Initialization
To initialize Go's green-thread scheduler and memory allocators, `_start` must run. We patched the transpiled component JS to execute `exports1._start()` at the very end of the component's generator block, once all helper shims and imported tables are fully instantiated and wired.

### Step 5: Graceful Exit Code Unwinding
Standard Go's initialization sequence finishes by calling `exit(0)`.
* Normally, a no-op interception causes standard Go to hit a fallback CPU panic (`*x = 0`), while letting the call execute terminates Node/browser processes.
* **Our Solution**: We configured `proc_exit` in our adapters to throw a JavaScript error `wasi_exit:${code}`.
* Loaders catch this error during the `$init` phase. If the code is `0` (clean exit), it is ignored. This halts the Go execution thread right after initialization and before the nil-pointer trap is executed, leaving standard Go fully initialized and resident in memory for hot FFI calls.

---

## 5. Demystifying WASI v0.1 & v0.2 Compatibility Plumbings

During our development and debugging of the browser-side host runner, we clarified the exact role of the various WASI compatibility layers:

### A. The Core Concepts
1.  **`wasi_snapshot_preview1` (The Interface Contract)**: This is simply the specification name for the WASI v0.1 system API. It is a flat list of function signatures (e.g. `fd_write`, `random_get`, `sched_yield`). Compiled WASI v0.1 guest binaries (like Target I) declare imports from this module and cannot load unless the host provides a matching import object.
2.  **`wasi_snapshot_preview1.wasm` (The Build-Time Router)**: This file is a pre-compiled translation module. It is **never loaded at runtime** by the host. Instead, it is embedded inside the final component at build time. It acts as a router, translating legacy v0.1 guest calls (e.g. `fd_write`) into standard v0.2 Component imports (e.g. `wasi:cli/stdout.write`).
3.  **The Host Handler (The JS/Python Runtime)**: WebAssembly is a pure sandboxed environment. Neither the guest code nor the translation adapter can access physical machine resources directly. The final execution of system actions (like printing to a console or reading a virtual filesystem) must always be implemented in JavaScript (via shims) or Python on the host side.

### B. Why Do We Mock `wasi_snapshot_preview1` in Javascript?
*   **For WASI v0.2 (Targets G, J, K)**: We do **not** write mocks for `wasi_snapshot_preview1`. The embedded translation router maps v0.1 calls to v0.2 interfaces, which are resolved at runtime by the official `@bytecodealliance/preview2-shim` library bundled in our standalone package.
*   **For WASI v0.1 (Target I)**: Because Target I is a raw, un-adapted v0.1 module, it doesn't contain the translation router. It directly requests `"wasi_snapshot_preview1"` imports from the browser. To allow the browser to successfully compile and instantiate the module, we provide a **lightweight mock object** in [`worker_adapter.js`](file:///home/gpineda/Documents/ouvrage/labs/wasi-polyglot-bindings-reference/bindings/my_lib_maths/js/all/adapters/worker_adapter.js) that acts as a secure, fast, and local dummy router (e.g. mocking `sched_yield` or `poll_oneoff` to return success `0`).

---

**Status**: Approved & Recorded  
**Location**: `architecture/meetings/2026-08-08-labs-maths-wasi-0.2.md`
