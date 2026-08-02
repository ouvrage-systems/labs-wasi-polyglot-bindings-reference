# WASM & WASI: The Big Picture

WebAssembly (WASM) has evolved from a browser-only speed booster to a universal, language-agnostic code execution format. To understand the architecture of this laboratory, it is essential to trace the historical timeline and the core motivations that drove the WebAssembly ecosystem to where it is today.

---

## 1. WebAssembly Core (2017) — Speeding Up the Browser

### The Motivation
In 2017, JavaScript was the only language capable of executing code inside web browsers. However, JS is a dynamic, interpreted language. Even with JIT (Just-In-Time) compilation, JS is poorly suited for compute-heavy tasks like 3D gaming, video editing, cryptography, or CAD software.

The goal of the WebAssembly Core MVP (Minimum Viable Product) was to bring **near-native execution speeds (C/C++, Rust, Go) to the browser** under a secure, standard runtime.

### The Architecture
*   **Minimal Virtual Machine**: WebAssembly is a low-level, binary instruction format for a stack-based virtual machine. It operates in a completely isolated, linear memory space (a simple contiguous array of bytes).
*   **The Sandbox**: By default, WASM has **zero** access to the host machine. It cannot interact with the DOM, make network requests, read files, or check the system clock.
*   **Imports/Exports**: The only way for WASM to perform actions is through an explicit handshake. The host (the browser's JS engine) imports functions into the WASM module (e.g., a function to write to a Canvas) and calls exported functions from the module (e.g., `Add(a, b)`).

### The Limitation
WASM Core is stateless and silent. It does not know what an Operating System is.

---

## 2. WASI Preview 1 (2019) — Reaching the Server

### The Motivation
Seeing the lightweight nature, rapid startup times, and solid sandboxing of WASM, server-side developers realized it could be an excellent alternative to heavy Docker containers for serverless functions, plugins, and edge computing.

However, server-side code *must* interact with the Operating System: it needs to print logs to the terminal, read config files, and listen on ports. Thus, the Bytecode Alliance created **WASI** (*WebAssembly System Interface*) to provide a standardized API between WASM and the host OS.

### The POSIX Architecture
*   WASI Preview 1 (`wasip1`) chose to **emulate Unix/POSIX system calls**.
*   It exposes standard imports like `fd_read` (read from a file or stdin), `fd_write` (write to stdout/console), and `path_open`.
*   A Go or Rust program compiled to `wasip1` behaves exactly like a native command-line binary running on Linux.

### The Limitations of Preview 1
1.  **Improper for Browsers**: The browser is not a Unix operating system. To run a `wasip1` binary in Chrome, the JavaScript host must simulate a Unix OS in memory (mapping file descriptors, intercepting stdin/stdout streams).
2.  **No High-Level Types (The Byte Nightmare)**: POSIX only understands raw bytes. If you want to call a function with complex parameters (like passing a struct or returning a string), you must manually encode/decode the structure into WASM's linear memory. This is highly tedious, error-prone, and compromises memory safety.

---

## 3. WASI Preview 2 & The Component Model (2024+) — Unification

### The Motivation
To build modular systems, developers need software components that can talk to each other using clean, high-level interfaces, rather than piping raw bytes over virtual Unix file descriptors. WASI Preview 2 (`wasip2`) solves this by moving away from POSIX emulation toward the **Component Model**.

### The Architecture
*   **WIT (WebAssembly Interface Types)**: Instead of calling low-level system imports, components declare their inputs and outputs using a contract file (`.wit`).
*   **High-Level Types**: WIT natively supports structures (`record`), choices (`variant`), lists, options, and **stateful objects** (`resource` with constructors and methods).
*   **Universal Binding Generation**: Toolchains like `wit-bindgen` and `jco` parse the WIT file and automatically generate clean bindings for the host. Mappings, memory allocations, and pointer manipulations are handled automatically.
*   **Decoupled Capabilities**: A component does not request "a file descriptor". It requests an interface (e.g., `import wasi:clocks`). 
    *   On the server, `wasmtime` routes this to the system clock.
    *   In the browser, JS routes this to `performance.now()`.
    *   No Unix emulation is required.

---

| Feature | WASM Core (2017) | WASI Preview 1 (2019) | WASI Preview 2 (2024+) |
| :--- | :--- | :--- | :--- |
| **Primary Environment** | Web Browsers | Server-Side Runtimes | Universal (Web, Server, Edge) |
| **System Abstraction** | None | POSIX (Unix System Calls) | Interface Types (WIT Contract) |
| **Data Types** | Integers / Floats only | Raw Bytes (Pointers) | Records, Variants, Lists, Resources |
| **Browser Compatibility** | Native | Via Unix Emulation shims | Native (via JS bindings & polyfills) |
| **Composition** | Hand-written JS glue | Unix Pipe redirection | Native Component Linking |
