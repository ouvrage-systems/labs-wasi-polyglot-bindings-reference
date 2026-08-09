import { BaseAdapter } from './base_adapter.js';

// Browser-specific Host Adapter implementing Fetch and custom mock WASI sandboxing
export class BrowserAdapter extends BaseAdapter {
  constructor() {
    super('Web Browser Host', 'browser');
  }

  // Fetch binary bytes over HTTP network
  async readBytes(url) {
    const response = await fetch(url);
    if (!response.ok) {
      const urlStr = url.toString();
      const lastSlash = urlStr.lastIndexOf('/');
      const logUrl = urlStr.substring(0, lastSlash + 1) + 'build.log';
      const logResponse = await fetch(logUrl);
      if (logResponse.ok) {
        const logContent = await logResponse.text();
        throw new Error(`TinyGo compilation failed static analysis:\n${logContent.trim()}`);
      }
      throw new Error(`Failed to fetch WASM binary: ${response.statusText}`);
    }
    return response.arrayBuffer();
  }

  // Return browser mock WASI bindings
  getWasiImports(wasmModule, binaryName) {
    let activeMemory = null;
    const imports = {
      wasi_snapshot_preview1: {
        proc_exit: (code) => {
          const err = new Error(`wasi_exit:${code}`);
          err.wasiExitCode = code;
          throw err;
        },
        fd_write: (fd, iovs, iovs_len, nwritten) => 0,
        random_get: (buf, buf_len) => {
          if (activeMemory) {
            const array = new Uint8Array(activeMemory.buffer, buf, buf_len);
            if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
              crypto.getRandomValues(array);
            }
          }
          return 0;
        },
        sched_yield: () => 0,
        poll_oneoff: (inPtr, outPtr, nsubscriptions, nevents) => 0,
        clock_time_get: (id, precision, timePtr) => 0,
        args_sizes_get: (argcPtr, argvBufSizePtr) => 0,
        args_get: (argvPtr, argvBufPtr) => 0,
        environ_sizes_get: (envCountPtr, envBufSizePtr) => 0,
        environ_get: (environPtr, environBufPtr) => 0
      },
      // Custom binding helper allowing the loader to inject memory post-instantiation
      setMemory: (mem) => {
        activeMemory = mem;
      }
    };
    return imports;
  }

  // Start reactor runtime context inside browser mock WASI environment
  start(instance, imports) {
    try {
      if (instance.exports._initialize) {
        instance.exports._initialize();
      } else if (instance.exports._start) {
        instance.exports._start();
      }
    } catch (e) {
      if (e.wasiExitCode !== 0) {
        throw e;
      }
    }
  }
}
