import { BaseLoader } from './base_loader.js';

// Loader for TinyGo v0 standard/asyncify targets (requires mock WASI bindings)
export class V0TinyLoader extends BaseLoader {
  constructor(binaryName, hostAdapter) {
    super(binaryName, hostAdapter);
  }

  async instantiateModule() {
    const wasmUrl = new URL('../_generated/' + this.binaryName, import.meta.url);
    const t0 = (typeof performance !== 'undefined') ? performance.now() : 0;
    const bytes = await this.hostAdapter.readBytes(wasmUrl);
    const t1 = (typeof performance !== 'undefined') ? performance.now() : 0;
    const fetchDuration = t1 - t0;

    const t2 = (typeof performance !== 'undefined') ? performance.now() : 0;
    const wasmModule = await WebAssembly.compile(bytes);
    
    // Retrieve imports from our host adapter (injects Node WASI context or browser mock WASI)
    const imports = this.hostAdapter.getWasiImports(wasmModule, this.binaryName);
    const instance = await WebAssembly.instantiate(wasmModule, imports);
    const t3 = (typeof performance !== 'undefined') ? performance.now() : 0;
    const compileDuration = t3 - t2;

    // Bind instance memory export to the host imports context if supported
    if (imports.setMemory) {
      imports.setMemory(instance.exports.memory);
    }

    return {
      exports: instance.exports,
      byteSize: bytes.byteLength,
      fetchDuration,
      compileDuration
    };
  }
}
