import './wasm_exec.js';

let exportsPromise = null;
let wasmByteSize = 0;
let wasmFetchDuration = 0;
let wasmCompileDuration = 0;

async function initLegacyWasm() {
  if (exportsPromise) return exportsPromise;

  const wasmUrl = new URL('my_lib.wasm', import.meta.url);
  const t0 = (typeof performance !== 'undefined') ? performance.now() : 0;
  
  let bytes;
  if (typeof window !== 'undefined' || (wasmUrl.protocol !== 'file:' && typeof fetch === 'function')) {
    const response = await fetch(wasmUrl);
    bytes = await response.arrayBuffer();
  } else {
    const fs = await import('node:fs');
    bytes = fs.readFileSync(wasmUrl);
  }

  const t1 = (typeof performance !== 'undefined') ? performance.now() : 0;
  wasmFetchDuration = t1 - t0;
  wasmByteSize = bytes.byteLength;

  const go = new globalThis.Go();
  const t2 = (typeof performance !== 'undefined') ? performance.now() : 0;
  const result = await WebAssembly.instantiate(bytes, go.importObject);
  const t3 = (typeof performance !== 'undefined') ? performance.now() : 0;
  wasmCompileDuration = t3 - t2;

  go.run(result.instance);
  exportsPromise = Promise.resolve(globalThis);
  return exportsPromise;
}

export async function callLegacy(funcName, ...args) {
  await initLegacyWasm();
  if (typeof globalThis[funcName] !== 'function') {
    throw new Error(`Go Legacy function ${funcName} not found on globalThis`);
  }
  return globalThis[funcName](...args);
}

export async function getWasmByteSize() {
  await initLegacyWasm();
  return wasmByteSize;
}

export async function getWasmFetchDuration() {
  await initLegacyWasm();
  return wasmFetchDuration;
}

export async function getWasmCompileDuration() {
  await initLegacyWasm();
  return wasmCompileDuration;
}
