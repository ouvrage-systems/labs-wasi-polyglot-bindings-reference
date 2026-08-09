import { BaseLoader } from './base_loader.js';

// Loader for TinyGo WASI Preview 2 Component targets (v0.2-tiny)
export class V02TinyLoader extends BaseLoader {
  constructor(binaryName, scheduler, hostAdapter) {
    super(binaryName, hostAdapter);
    this.scheduler = scheduler;
  }

  async instantiateModule() {
    console.log(`[V02TinyLoader] Starting instantiation for scheduler: ${this.scheduler}`);
    const t0 = (typeof performance !== 'undefined') ? performance.now() : 0;
    
    // Dynamically import the transpiled component ES module based on scheduler (none, asyncify, or stdgo)
    const componentUrl = new URL(`../_generated/standalone/v0.2/${this.scheduler}/my_lib_maths_component.js`, import.meta.url);
    console.log(`[V02TinyLoader] Importing ES module: ${componentUrl.href}`);
    const component = await import(componentUrl.href);
    console.log(`[V02TinyLoader] ES module imported successfully! keys:`, Object.keys(component));
    if (component.$init) {
      console.log(`[V02TinyLoader] Awaiting $init promise...`);
      await component.$init;
      console.log(`[V02TinyLoader] $init promise resolved!`);
    }
    
    const t1 = (typeof performance !== 'undefined') ? performance.now() : 0;
    const fetchDuration = t1 - t0;

    // Get size statistics from the core compiled WASM binary
    const coreWasmUrl = new URL(`../_generated/standalone/v0.2/${this.scheduler}/my_lib_maths_component.core.wasm`, import.meta.url);
    const bytes = await this.hostAdapter.readBytes(coreWasmUrl);
    const byteSize = bytes.byteLength;

    // Standard Go components do not have .maths namespace because WIT metadata is not embedded; fallback to component directly
    const exports = component;

    return {
      exports,
      byteSize,
      fetchDuration,
      compileDuration: 0 // Managed internally by jco loader
    };
  }
}
