# Design Notes: 2026-08-08 — WASI Polyglot Lab Refactoring & Metrology Framework Design

## Metadata
* **Date**: August 8, 2026
* **Participants**: `@gpineda` (Lead Architect & Systems Engineer), `@Antigravity` (AI Coding Assistant)
* **Status**: Decided & Documented
* **Location / Repository**: `gitlab.com/ouvrage-systems/labs/wasi-polyglot-bindings-reference`

---

## 1. Context & Core Objectives of the Refactoring

Initially, our metrology trials for WASM and WASI versions were segmented into isolated folders (e.g. `js/v0/`, `js/v0.1/`). This separate approach led to massive code duplication across environments (Node.js vs Browser), hardcoded driver selection, and static, fragile input parameters. 

To turn this benchmark from an amateur test bench into a production-grade systems audit framework, we consolidated everything into a unified directory: [`bindings/my_lib_maths/js/all/`](file:///home/gpineda/Documents/ouvrage/labs/wasi-polyglot-bindings-reference/bindings/my_lib_maths/js/all/).

The core objectives of this refactoring were:
1.  **Platform Portability**: Write 100% environment-agnostic orchestration logic that executes identically inside browser clients (Web Metrology Studio) and Node.js CLI runtimes.
2.  **Runtime Abstraction**: Decouple the WebAssembly sandbox loading details (MVP vs WASI, standard Go vs TinyGo) from the runner execution context.
3.  **Strict Correctness Verification**: Implement automated, JIT validation of all sandboxed outputs against host reference algorithms to prevent flawed builds from reporting fake performance metrics.
4.  **Workload Seed Reproduction**: Allow developers to share and run exact scenarios between browser panels and terminal CLI runs via lightweight query-strings.

---

## 2. Modular Architecture & Execution Layers

We designed a strict, layered hierarchy to separate concerns from the physical machine up to the execution runner:

```text
  ┌─────────────────────────────────────────────────────────────────────────┐
  │                         Execution & Entrypoints                         │
  │              Browser (index.html)   │   Node.js (benchmark-all.mjs)     │
  └─────────────────────────────┬─────────────────────────────┬─────────────┘
                                │                             │
                                ▼                             ▼
  ┌─────────────────────────────────────────────────────────────────────────┐
  │                       Unified Orchestrator Runner                       │
  │                              lab_matrix.js                              │
  │                                                                         │
  │       ┌──────────────────────────────┼──────────────────────────────┐   │
  │       │ (Mode 2)                     │ (Mode 3 & 4)                 │   │
  │       ▼                              ▼                              │   │
  │  ┌──────────────┐            ┌──────────────┐                       │   │
  │  │ PureJsDriver │            │  [ jswasm ]  │                       │   │
  │  │  (Host JS)   │            │ (Hybrid JS)  │                       │   │
  │  └──────────────┘            └──────┬───────┘                       │   │
  │                                     │                               │   │
  │                                     │ Delegates to                  │   │
  │                                     ▼                               ▼   │
  │                              ┌──────────────┐ (Mode 1)                  │
  │                              │  WasmDriver  │ ◄─────────────────────────┘
  │                              └──────┬───────┘                           │
  │                                     ▼                                   │
  │                              ┌──────────────┐                           │
  │                              │ WASM Loaders │                           │
  │                              └──────┬───────┘                           │
  └─────────────────────────────────────┼───────────────────────────────────┘
                                        ▼
  ┌─────────────────────────────────────────────────────────────────────────┐
  │                            Platform Adapters                            │
  │       BrowserAdapter (fetch)    │    NodeAdapter (fs/hrtime)            │
  └─────────────────────────────────────────────────────────────────────────┘
```

### 2.1 The Platform Adapters (`adapters/`)
All I/O operations (reading WASM bytes) and time measurements are decoupled. The runner queries the abstract `HostAdapter` interface. 
*   `BrowserAdapter` delegates to Web APIs (`fetch` and `performance.now()`).
*   `NodeAdapter` delegates to Node APIs (`fs.promises` and `process.hrtime`).

### 2.2 Execution Modes & Drivers Topologies
Runtimes are modeled as clean sandboxes conforming to the `BaseDriver` interface:
*   **PureJsDriver (Mode 2)**: Runs the 100% native Javascript implementation (`maths_native.js`) directly on the V8 engine without any WASM dependency. It is completely independent of the WebAssembly pipeline.
*   **WasmDriver (Mode 1)**: Injects the version-specific loader (`V0TinyLoader`, `V0LegacyLoader`, `V01WasiLoader`) to load, compile, and execute the compiled `.wasm` guest binary directly for single-call primitives.
*   **Hybrid Engine (Mode 3 & 4 - `jswasm`)**: Rather than executing a driver directly, the orchestrator (`lab_matrix.js`) imports the hybrid workloads from `maths_jswasm.js`. The outer control loop is driven in host JS, but it delegates its low-level math calculations to a nested **`WasmDriver` sub-driver** passed as an argument.

### 2.3 Web Worker Offloading Architecture (`worker.js`)
To prevent the browser UI thread from freezing during CPU-intensive benchmarks (which triggers the browser's "This page is not responding..." warning), we migrated all benchmark execution to a separate background thread using a **Web Worker** ([`worker.js`](file:///home/gpineda/Documents/ouvrage/labs/wasi-polyglot-bindings-reference/bindings/my_lib_maths/js/all/worker.js)).
*   **Non-Blocking UI Thread**: The browser main thread (`index.html`) is dedicated solely to handling user events, drawing SVG/Canvas charts, managing the history log, and updating URL hash seeds.
*   **Message-Driven Delegation**: When a benchmark run is initiated, the main thread serializes the run configuration and spawns/notifies the worker via `postMessage`.
*   **Encapsulated Worker Scope**: The worker imports the environment-agnostic `lab_matrix.js` orchestrator using ES modules. It runs the benchmark loops sequentially, performs the FFI calls, measures real-time performance indices, asserts JIT correctness validation, and passes the parsed result payload back to the host UI.
*   **Standalone Dependencies Requirement**: Since Web Workers do not inherit parent-page imports or support browser `importmaps` in some environments, resolving dependencies inside the worker was a key driver in our decision to bundle WASI v0.2 components into standalone ES modules (inlined shims) using `esbuild`.

---

## 3. Data-Driven Pipelines & Verification Contracts

To keep the pipeline extensible without code modifications, we made all configurations declarative:

```text
  [ nomenclature.json ]
        │──> "targets": defines compile-time loader configuration (no guessing rules)
        │──> "functions": defines variables signature and parameter defaults
        │──> "math": defines mathematical formulas, explanations, and maps (A, B, C)
        │──> "verify": reference function JS pointer to execute JIT correctness checks
```

*   **Dynamic Loader Factories**: `driver_manager.js` acts as a pure factory. It reads the `"loader"` attribute directly from the selected target configuration and instantiates the correct runner.
*   **JIT Reference Check**: Prior to recording any metrology result, `lab_matrix.js` dynamically pulls the `"verify"` javascript handler (e.g. `jsComputeSequence`), executes it against the same input parameters on the host V8 engine, and asserts correctness. If a WASM target fails the check, its status is flagged as `FAILED` or `Error` to prevent skewed results from polluting the report.

---

## 4. Cross-Platform Seed Reproduction Engine

We implemented a unified query-string format to share and run exact benchmarks between browser panels and terminal consoles:

```text
  ┌──────────────────┐                               ┌──────────────────┐
  │   Browser URL    │  ◄─────────────────────────►  │     Node CLI     │
  │  #toolchain=A... │       (Shareable Seed)        │  benchmark-all   │
  └──────────────────┘                               └──────────────────┘
```

*   **Shared Seed Helpers**: `lab_matrix.js` exports `generateSeed` and `parseSeed` built on the portable `URLSearchParams` standard.
*   **URL State Synchronization**: The browser dashboard updates its hash in real-time (`#toolchain=A&op=B&mode=3&a=10&b=2&c=10000`) using `history.replaceState` to prevent browser history pollution. 
*   **History Action Buttons**: Each history row includes a **Load** button to restore parameters in the UI, and a **Copy** button to write the absolute URL to the clipboard (decorated with a temporary green "Copied!" feedback micro-animation).
*   **CLI Seed Execution**: Developers can run exact seed scenarios in Node:
    ```bash
    node tools/benchmark-all.mjs "toolchain=A&op=B&mode=3&a=10&b=2&c=10000" 5
    ```
    This command parses the seed, executes the workload, loops it 5 times, and prints detailed run metrics alongside aggregated min/max/average statistics (global time, CPU usage, and FFI transition latences).

---

## 5. Architectural Rationale: Breaking Away from Segmented Legacy Bindings (`js/v0/` vs. `js/all/`)

Understanding the limits of our previous architecture highlights why this refactoring was critical for long-term project viability:

### 5.1 The Legacy Approach: Directory-Level Version Isolation (`js/v0/`)
In our initial implementation, support for a specific WebAssembly version was coupled directly with the folder path containing the target files:
*   **Massive Code Duplication**: Adding a new WASM execution mode (like `v0.1` WASI) required copying the entire HTML layout, CSS themes, chart controllers, file download handlers, and DOM inputs. 
*   **Rigid, Brittle Imports**: Factoring out shared helper logic across directories (e.g. `countPrimesConcurrent`) resulted in nested, fragile relative paths (like `../../v0/...`). This structure made the codebase prone to compile and import failures if files were moved.
*   **No Extensibility**: To test a new toolchain version, developers were forced to create a duplicate folder structure, repeating the overhead of managing UI scripts and CLI wrappers.

### 5.2 The New Paradigm: Polymorphic Execution
By consolidating into `js/all/`, we shifted from directory-level versioning to **object-oriented runtime polymorphism** :

```text
  [ Legacy: Segmented Folders ]           [ New: Polymorphic Core ]
  
  js/v0/   ──► HTML/CSS/JS (MVP)          js/all/ ──► Single HTML UI / CLI Core
  js/v0.1/ ──► HTML/CSS/JS (WASI)                   │──► Loaded via polymorphism:
  js/v2/   ──► HTML/CSS/JS (Future)                      • V0TinyLoader
                                                         • V01WasiLoader
                                                         • V2ComponentLoader (Future)
```

*   **Zero Duplication**: The UI and CLI remain singular, serving as a unified dashboard.
*   **Config-Driven Scaling**: Support for future iterations (like WASI `v2` Component Model) does not require creating a new folder or copying front-end code. It only requires writing a new class implementing the `BaseLoader` interface and registering it as a target in the `nomenclature.json` database.
*   **Maintainability**: Any improvement made to the UI controls, charts, or metrology metrics is automatically shared by all WASM target versions instantly, preventing codebase drift.

---

## 6. Outlook: Toward a Unified Ouvrage Metrology & Sandbox Framework

The architectural abstractions validated in this refactoring represent the architectural blueprints for a broader, general-purpose platform tool: **`ouvrage-labs`**.

```text
  ┌─────────────────────────────────────────────────────────────┐
  │                     ouvrage-labs-core                       │
  │   (Host Adapters, Driver Manager, Seed Serialization engine) │
  └──────────────────────────────┬──────────────────────────────┘
                                 │
             ┌───────────────────┴───────────────────┐
             ▼                                       ▼
  ┌─────────────────────┐                 ┌─────────────────────┐
  │   ouvrage-labs-js   │                 │   ouvrage-labs-py   │
  │ (Browser/Node runner)│                 │ (Python Host runner)│
  └─────────────────────┘                 └─────────────────────┘
```

*   **Python Portability (`ouvrage-labs-py`)**: The identical design patterns (Platform Adapters, Loaders, Sandbox Drivers, and URL-like query seed serialization) can be ported directly to Python. This will allow the same data-driven benchmark workflows to run natively on Python host runtimes (e.g. testing `componentize-py` boundaries).
*   **A Standalone Library Package (`@ouvrage/labs-core`)**: By completely stripping the mathematical workloads (domain code) out of the orchestrator, this metrology core can be packaged as a reusable library.
*   **Future Evaluations**: If Ouvrage Systems needs to audit a new domain (e.g. comparing cryptographic libraries or virtual file-system implementations), developers will not write a new lab from scratch. They will simply:
    1.  Declare a new config schema in `nomenclature.json` specifying the functions, defaults, and loaders.
    2.  Write their own test sandboxes.
    3.  Instantiate `ouvrage-labs-core`.
    
    This preserves 100% of the UI layout, history log storage, CSV/JSON metrology exports, dynamic formulas, JIT assertions, and command line seed capabilities out of the box.

---
*Design document recorded by `@Antigravity` in partnership with `@gpineda`*
