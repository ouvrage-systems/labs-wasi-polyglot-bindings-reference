import { BaseAdapter } from './base_adapter.js';

// Web Worker-specific Host Adapter implementing Fetch and real-time WASI stdout/stderr streaming
export class WorkerAdapter extends BaseAdapter {
  constructor() {
    super('Web Worker Host', 'worker');
  }

  // Fetch binary bytes over HTTP network inside worker context
  async readBytes(url) {
    const response = await fetch(url);
    return response.arrayBuffer();
  }

  // Return mock WASI bindings with streaming stdout/stderr
  getWasiImports(wasmModule, binaryName) {
    let activeMemory = null;
    const imports = {
      wasi_snapshot_preview1: {
        proc_exit: (code) => {
          self.postMessage({ type: 'stdout', text: `\n[Exit Code: ${code}]\n` });
        },
        fd_write: (fd, iovs, iovs_len, nwritten) => {
          if (!activeMemory) return 0;
          
          // Read the iovec structure from Wasm memory
          const view = new DataView(activeMemory.buffer);
          let total = 0;
          let text = '';
          
          for (let i = 0; i < iovs_len; i++) {
            const ptr = view.getUint32(iovs + i * 8, true);
            const len = view.getUint32(iovs + i * 8 + 4, true);
            const buf = new Uint8Array(activeMemory.buffer, ptr, len);
            text += new TextDecoder().decode(buf);
            total += len;
          }
          
          view.setUint32(nwritten, total, true);
          
          // Stream output to the main GUI thread in real-time
          self.postMessage({
            type: fd === 1 ? 'stdout' : 'stderr',
            text
          });
          
          return 0;
        },
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
      setMemory: (mem) => {
        activeMemory = mem;
      }
    };
    return imports;
  }
}
