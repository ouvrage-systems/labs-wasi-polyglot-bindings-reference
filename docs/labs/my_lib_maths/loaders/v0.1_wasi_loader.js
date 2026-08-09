import { BaseLoader } from './base_loader.js';

// Loader for TinyGo WASI Preview 1 targets (v0.1)
export class V01WasiLoader extends BaseLoader {
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
    
    // Get WASI imports (Node system WASI or browser mock WASI)
    const imports = this.hostAdapter.getWasiImports(wasmModule, this.binaryName);
    const instance = await WebAssembly.instantiate(wasmModule, imports);
    const t3 = (typeof performance !== 'undefined') ? performance.now() : 0;
    const compileDuration = t3 - t2;

    // Bind memory reference to the imports context if needed
    if (imports.setMemory) {
      imports.setMemory(instance.exports.memory);
    }

    // Start WASI reactor/CLI entry point lifecycle on the host platform
    try {
      this.hostAdapter.start(instance, imports);
    } catch (e) {
      const isCleanExit = e.message?.includes('wasi_exit:0') || e.wasiExitCode === 0;
      if (!isCleanExit) {
        throw e;
      }
    }

    return {
      exports: instance.exports,
      byteSize: bytes.byteLength,
      fetchDuration,
      compileDuration
    };
  }
}
