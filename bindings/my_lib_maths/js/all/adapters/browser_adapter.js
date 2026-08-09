import { BaseAdapter } from './base_adapter.js';

// Browser-specific Host Adapter implementing Fetch and custom mock WASI sandboxing
export class BrowserAdapter extends BaseAdapter {
  constructor() {
    super('Web Browser Host', 'browser');
  }

  // Fetch binary bytes over HTTP network
  async readBytes(url) {
    const response = await fetch(url);
    return response.arrayBuffer();
  }

  // Return browser mock WASI bindings
  getWasiImports(wasmModule, binaryName) {
    let activeMemory = null;
    const imports = {
      wasi_snapshot_preview1: {
        proc_exit: (code) => console.warn(`Browser WASI proc_exit called: ${code}`),
        fd_write: (fd, iovs, iovs_len, nwritten) => 0,
        random_get: (buf, buf_len) => {
          if (activeMemory) {
            const array = new Uint8Array(activeMemory.buffer, buf, buf_len);
            if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
              crypto.getRandomValues(array);
            }
          }
          return 0;
        }
      },
      // Custom binding helper allowing the loader to inject memory post-instantiation
      setMemory: (mem) => {
        activeMemory = mem;
      }
    };
    return imports;
  }
}
