# Design Notes: 2026-08-08 — WASM CLI Execution & Persistent Bash Symbiosis

## Metadata
* **Date**: August 8, 2026
* **Participants**: `@gpineda` (Lead Architect & Systems Engineer), `@Antigravity` (AI Coding Assistant)
* **Status**: Decided & Documented
* **Location / Repository**: `github.com/ouvrage-systems/labs/wasi-polyglot-bindings-reference`

---

## 1. Context & Core Objectives

Having stabilized the polyglot bindings for JavaScript, Python, and Node.js using in-process WebAssembly engines and out-of-process subprocess workers, we turned our focus to native system scripting. Specifically: how can a standard UNIX Bash script execute mathematical workloads from `my_lib_maths` in a sandbox, without invoking heavy runtimes (like Python or Node.js)?

Executing WASM from a CLI environment presents a fundamental lifecycle challenge:
*   Launching the WebAssembly virtual machine (`wasmtime` or `wasmer`) for every calculation incurs a significant **start-up / compilation overhead (Cold Start)**.
*   For high-frequency calculations or loops, this overhead is prohibitive, causing severe latency and CPU fork-spawning bottlenecks.

The objective of this design session was to establish a high-performance **Bash-to-WASM Symbiosis** that achieves in-process speeds for persistent execution, and to design a visionary microservice orchestrator framework named **`owasm` (Ouvrage WASM)**.

---

## 2. CLI Execution Paradigms

We explored and validated two distinct execution models for WebAssembly modules inside standard UNIX shells:

```text
  [One-Shot execution]   ──> wasmtime run --invoke <func> (Cold Start)
                                 │──> Useful for simple, isolated numeric commands
                                 
  [Persistent IPC Flow]   ──> Stdin/Stdout Named Pipes (exec FDs)
                                 │──> Single Wasmtime daemon-less process (reused)
```

### 2.1 One-Shot Execution (`--invoke`)
*   **Mechanism**: We call `wasmtime run --invoke <func> <binary.wasm> [args...]` directly.
*   **Characteristics**: Wasmtime starts, compiles the module, executes the specific exported function, outputs the result to standard output, and exits.
*   **Limitations**: High initialization overhead per call. Restricted to WebAssembly MVP numerical inputs/outputs (cannot handle complex serialization formats without manual memory management).

### 2.2 Persistent Execution (Named Pipes & FIFOs)
*   **Mechanism**: To bypass cold starts, we spawn a single background Wasmtime instance connected to UNIX named pipes (`mkfifo`).
*   **The File Descriptor Lock**: Normally, writing a single line to a pipe sends an `EOF` at command completion, which terminates Wasmtime. We solved this by using the Bash `exec` command to open persistent file descriptors (FDs) connected to the pipes.
*   **Flow**:
    1.  Bash writes a JSON-RPC request to FD 3 (pointing to the input pipe).
    2.  Wasmtime (running in the background) reads from stdin and executes the function in-process.
    3.  Wasmtime writes the JSON-RPC response to stdout (pointing to the output pipe).
    4.  Bash reads the response from FD 4.
    5.  The virtual machine remains hot and alive, enabling nanosecond execution speeds for all subsequent queries.

---

## 3. Visionary Orchestration: The `owasm` Blueprint

While named pipes provide high performance, managing descriptors manually is complex and error-prone. We designed a microservice containerization and orchestration runtime called **`owasm` (Ouvrage WASM)**.

`owasm` acts as the **"Podman of WebAssembly"**, packaging, securing, and composing WebAssembly microservices across backends, CLI tools, and browsers.

```text
  +--------------------------------------------------------------+
  |                        .owasm Image                          |
  |  [ manifest.json ]  <-- Declares VFS mounts & socket rules   |
  |  [ binary.wasm ]    <-- Signed WASI component                |
  +--------------------------------------------------------------+
                                │
                                ▼  owasm run
  +--------------------------------------------------------------+
  |                       owasm-core                             |
  |  - Enforces Sandbox Rules                                    |
  |  - Binds owasm-firewall (wasi:sockets interception)          |
  |  - Links owasm-gateway (in-process to external gRPC bridge)  |
  +--------------------------------------------------------------+
```

### 3.1 Core Ecosystem Architectural Layers

1.  **Container Format (`.owasm`)**: Enriches raw WASM binaries with a signed `manifest.json` declaring security capabilities (outbound network endpoints, read-only filesystem preopens, and WIT dependency imports).
2.  **Runtime Engine (`owasm-core`)**: A daemon-less engine that instantiates containers, configures sandboxes dynamically, and hooks virtual system drivers (firewalls, gateways).
3.  **Virtual Firewalls & Gateways**:
    *   `owasm-firewall`: Hooks into `wasi:sockets` to audit and restrict socket connections at the VM boundary.
    *   `owasm-gateway`: A proxy translating in-process WIT interface calls into secure external network requests (like HTTPS or gRPC), allowing isolated components to securely access corporate ERP services.
4.  **Universal Cross-Runtime**:
    *   **Backend**: Mounts local filesystem folders and native network interfaces.
    *   **Browser**: Virtualizes the VFS over IndexedDB/OPFS and virtualizes network sockets over WebSockets/WebTransport, executing the exact same `.owasm` container image inside the browser tab with zero code changes.

---
*Design document recorded by `@Antigravity` in partnership with `@gpineda`.*
