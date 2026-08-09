// Base class for Host Adapters, defining the platform I/O and WASI imports contract
export class BaseAdapter {
  constructor(name, id) {
    this.name = name;
    this.id = id;
  }

  // Retrieve WASM binary bytes (fetch vs readFileSync)
  async readBytes(url) {
    throw new Error(`readBytes() not implemented in adapter ${this.id}`);
  }

  // Get platform-specific WASI import bindings (Mock WASI vs Node WASI)
  getWasiImports(wasmModule, binaryName) {
    throw new Error(`getWasiImports() not implemented in adapter ${this.id}`);
  }

  // Start the runtime context (Node.js WASI start vs browser no-op)
  start(instance) {
    // Default: no-op (reactors can run directly on exports in browser)
  }
}
