# WASI Polyglot Bindings Reference Lab

Welcome to the official documentation for the **WASI Polyglot Bindings Reference Lab** (an Ouvrage Systems initiative). 

This repository serves as a hands-on reference laboratory exploring WebAssembly (WASM) and the WebAssembly System Interface (WASI). It demonstrates how to compile Go libraries into WebAssembly modules and execute them natively *in-process* inside host scripting environments like **Python** and **JavaScript** (Node.js & Web Browsers).

---

## 📖 Table of Contents

### 📂 Section 1: Foundations & Architecture
*   [**WASM & WASI: The Big Picture**](foundations.md)
    *   Learn the historical context: Web-only WASM Core (2017) $\rightarrow$ WASI Preview 1 Server POSIX (2019) $\rightarrow$ WASI Preview 2 Component Model (2024+).
*   [**The IPC Dilemma: Stdio vs. In-Process**](ipc-dilemma.md)
    *   Understand the performance and architectural trade-offs between JSON-RPC subprocess piping (V1) and memory-mapped native function exports (V2).

### 📂 Section 2: Laboratory Implementation
*   [**Go Core & The WIT Contract**](go-and-wit.md)
    *   Examine the internal Go library structure (`pkg/geometry`, `pkg/store`) and the WIT (WebAssembly Interface Types) contract declaring our methods and stateful resources.
*   [**Toolchain & Compilation Workflow**](toolchain-guide.md)
    *   A step-by-step guide to compiling targets using TinyGo, `wasm-tools`, `wit-bindgen`, and the reactor adapter.

### 📂 Section 3: Host Integrations
*   [**Python Host Integration**](python-host.md)
    *   How to load WASI modules under CPython, execute pytest suites, and ensure static type safety.
*   [**JavaScript Host Integration & Bundlers**](js-host.md)
    *   Running unit tests under Node.js, and configuring modern bundlers (**Vite** & **Webpack 5**) with fallbacks for browser-compatible shims.
*   [**WASI Networking & Sockets**](wasi-networking.md)
    *   Capabilities-based networking, opening raw TCP sockets, and executing outbound HTTP requests in Go.

### 📂 Section 4: Playground & Troubleshooting
*   [**Live WASI V2 Browser Demo**](live-demo.md)
    *   *The Masterstroke*: Run our actual compiled Go V2 WASI component live inside your browser, doing real-time OOP geometry calculations and interacting with a stateful KV-Store.
*   [**Developer Tips & Troubleshooting**](troubleshooting.md)
    *   Tricks of the trade: bypass browser MIME-type constraints locally, mock system hooks for standalone runtimes, and inspect memory heaps.
