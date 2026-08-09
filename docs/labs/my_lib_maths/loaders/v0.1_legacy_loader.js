import { BaseLoader } from './base_loader.js';

// Loader for Standard Go WASI Preview 1 (wasip1) targets running in JSON-RPC IPC mode (v1)
export class V01LegacyLoader extends BaseLoader {
  constructor(binaryName, hostAdapter) {
    super(binaryName, hostAdapter);
  }

  async instantiateModule() {
    const wasmUrl = new URL('../_generated/' + this.binaryName, import.meta.url);
    
    // Browser does not support child process spawning
    const isNode = typeof process !== 'undefined' && process.versions && process.versions.node;
    if (!isNode) {
      throw new Error("WASI V1 JSON-RPC subprocess execution is not supported in the browser environment.");
    }

    // In Node.js, we resolve the absolute local file path of the WASM binary
    const binaryPath = wasmUrl.pathname;
    
    // Retrieve actual file stats dynamically for sizes badge
    let byteSize = 0;
    try {
      const fs = await import('node:fs');
      const stats = fs.statSync(binaryPath);
      byteSize = stats.size;
    } catch (e) {
      if (e.code === 'ENOENT') {
        const fs = await import('node:fs');
        const path = await import('node:path');
        const logPath = path.join(path.dirname(binaryPath), 'build.log');
        if (fs.existsSync(logPath)) {
          const logContent = fs.readFileSync(logPath, 'utf8').trim();
          throw new Error(`TinyGo compilation failed static analysis:\n${logContent}`);
        }
      }
      console.warn("Failed to read WASI V1 binary size:", e);
    }

    return {
      exports: { binaryPath },
      byteSize,
      fetchDuration: 0,
      compileDuration: 0
    };
  }
}
