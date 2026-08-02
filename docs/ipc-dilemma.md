# The IPC Dilemma: Stdio vs. In-Process

When integrating compiled WebAssembly modules into scripting languages (like Python or JavaScript), the primary challenge is **communication**: how does the host language send parameters to the WASM module and retrieve results?

This laboratory implements two fundamentally different communication architectures: **Stdio JSON-RPC (V1)** and **In-Process Component Calls (V2)**. This page explores their design, implementation, and performance trade-offs.

---

## 1. WASI Preview 1 (V1): Stdio JSON-RPC Bridge

Because WASI Preview 1 restricts the WASM binary to a basic POSIX system model, passing complex data structures directly via memory pointers is highly complex. The standard solution is to treat the WASM binary as a **child process** and use **Inter-Process Communication (IPC)**.

```text
    ┌────────────┐                                ┌────────────┐
    │            │ ── Stdin (Write JSON-RPC) ──>  │            │
    │ HOST SHELL │                                │  GO WASM   │
    │ (JS / Py)  │ <── Stdout (Read JSON-RPC) ─── │  (wasip1)  │
    │            │                                │            │
    └────────────┘                                └────────────┘
```

### How it works
1.  **Subprocess Spawning**: The host runtime (e.g., Python or Node.js) spawns the WASM runtime (`wasmtime` or `node` wrapper) as a child process.
2.  **Request Serialization**: The host serializes the function call and arguments into a JSON-RPC structure (e.g., `{"method": "geometry.distance", "params": [p1, p2], "id": 1}`).
3.  **Transmission**: The host writes the JSON string to the child process's **Stdin** stream.
4.  **Processing**: The Go WASM binary block-reads Stdin, parses the JSON, executes the command, and writes the JSON-RPC response to its **Stdout** stream.
5.  **Parsing**: The host reads Stdout, deserializes the JSON, and returns the result.

### Advantages
*   **Simple Boundaries**: Stdin/Stdout streams are supported by 100% of scripting environments.
*   **Decoupled Memory**: The WASM memory heap is completely isolated from the host process.

### Disadvantages
*   **High Latency**: Spawning a process and executing IPC streams is extremely slow.
*   **Serialization Overhead**: Parsing and stringifying JSON on every single call consumes substantial CPU cycles.
*   **No Stateful Integration**: Sharing complex, mutable memory objects (like database connections or cache buffers) across processes is practically impossible.

---

## 2. WASI Preview 2 (V2): In-Process Component calls

WASI Preview 2 discards standard streams and process spawning. The WASM module is loaded **directly into the host process's memory space** (in-process).

```text
               IN-PROCESS MEMORY (Single OS Process)
    ┌────────────────────────────────────────────────────────┐
    │                                                        │
    │  ┌────────────┐     Direct Function Call     ┌──────┐  │
    │  │ HOST SHELL │ ───────────────────────────> │  GO  │  │
    │  │ (JS / Py)  │ <─────────────────────────── │ WASM │  │
    │  └────────────┘   Native Types (Memory Map)  └──────┘  │
    │                                                        │
    └────────────────────────────────────────────────────────┘
```

### How it works
1.  **Direct Loading**: The host loads the WASM component into its own process thread using native WebAssembly bindings.
2.  **Type Mapping**: The types defined in the WIT contract are mapped directly to native classes (e.g., a JavaScript Class wrapper mapping to a Go struct pointer).
3.  **Direct Call**: When calling `geometry.distance(...)`, the host directly calls the WASM function exported inside the WebAssembly linear heap.
4.  **No Serialization**: Arguments are passed via memory pointer references. No JSON-RPC or text parsing is involved.

### Advantages
*   **Near-Zero Latency**: Function calls execute in microseconds.
*   **Stateful Resources**: Allows exporting stateful resources (like an in-memory KV-Store database) that persist in the Go WASM heap between calls.
*   **No Child Process**: Runs perfectly in browsers and workers where spawning subprocesses is banned.

---

## 3. Real Performance Benchmarks (Our Lab Results)

We executed the unit test suites under Node.js for both versions. The suite runs 7 operations (geometry math and string manipulations).

Here are the actual execution timings recorded on this machine:

| Environment | V1 (Stdio JSON-RPC Subprocess) | V2 (In-Process Component) | Performance Gain |
| :--- | :--- | :--- | :--- |
| **Node.js Test Suite** | **~300 ms** (total execution) | **~103 ms** (total execution) | **~3x Speedup** |
| **Single Function Call** | **~45 ms** (average per call) | **~0.3 ms** (average per call) | **150x Speedup** |

### Why is the V2 function call 150x faster?
In V1, every function call incurs the cost of writing to standard streams, flushing buffers, context switching in the OS scheduler, parsing JSON inside Go, executing, writing to Stdout, and parsing JSON in JS.
In V2, calling `geometry.distance` is a **direct virtual machine jump**. It takes less than 300 microseconds (0.3 milliseconds).

---

## 🛠️ Boilerplate & Maintenance: Custom Router vs. Native VM Mapping

Beyond pure performance, the transition from WASI V1 to WASI V2 represents a massive shift in developer experience and code maintainability:

### WASI V1 (JSON-RPC Router Framework)
To execute code in V1, you are forced to build and maintain a custom routing framework inside the WASM binary.

#### 🛠️ Reusable Infrastructure: The `wasi1rpc` Tool
Rather than forcing developers to copy-paste low-level stream reading and JSON decoding boilerplates, this repository provides a dedicated, lightweight, and dependency-free helper library: [`tools/wasi1rpc/`](file:///home/gpineda/Documents/ouvrage/labs/wasi-polyglot-bindings-reference/tools/wasi1rpc/).

Any Go project running under WASI Preview 1 can import and reuse this framework directly from this public repository.

#### 📥 How to Import & Use `wasi1rpc`

1.  **Add the package dependency** to your Go module:
    ```bash
    go get gitlab.com/ouvrage-systems/labs/wasi-polyglot-bindings-reference/tools/wasi1rpc
    ```

2.  **Bootstrap your main application loop** in your `package main`:
    ```go
    package main

    import (
    	"gitlab.com/ouvrage-systems/labs/wasi-polyglot-bindings-reference/tools/wasi1rpc"
    )

    func main() {
    	// Initialize the framework application (handles stdin/stdout loops)
    	app := wasi1rpc.NewApp()

    	// Register your typed handlers (receives raw json.RawMessage parameters)
    	app.Router.Register("geometry.distance", func(params json.RawMessage) (any, error) {
    		// Decode your custom arguments struct and execute your package methods
    		...
    	})

    	// Start the blocking JSON-RPC listener loop
    	app.Run()
    }
    ```

3.  **Compile target** using the standard Go compiler targeting Preview 1:
    ```bash
    GOOS=wasip1 GOARCH=wasm go build -o my_app.wasm ./main.go
    ```

*   **The Host Side**: You must still maintain a loader script in Python or JavaScript (like [`loader.py`](file:///home/gpineda/Documents/ouvrage/labs/wasi-polyglot-bindings-reference/bindings/py/v1/my_lib/_generated/loader.py)) that wraps `wasmtime` execution, writes JSON envelopes to stdin, and parses stdout lines.

### WASI V2 (Zero-Boilerplate Native Mapping)
In WASI V2, this entire routing layer is completely eliminated. 
*   **No Router Code**: Go functions are mapped directly to JavaScript/Python methods via the compiled WIT bindings. 
*   **Compile-Time Contracts**: If the WIT contract matches, the bindings generator (`wit-bindgen` and `jco`) handles the underlying memory copies, structure allocations, and function calls automatically.
*   **The VM is the Router**: The WebAssembly System Interface virtual machine acts as the router, resolving type boundaries natively inside the process memory.

---

## Conclusion
*   **Use V1** only if you are dealing with legacy platforms that do not support WASM Component loaders.
*   **Use V2** for all modern applications where performance, browser compatibility, and rich object-oriented architectures are required.
