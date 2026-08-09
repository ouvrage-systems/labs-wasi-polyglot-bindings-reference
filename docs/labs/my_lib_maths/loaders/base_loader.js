// Base class for WASM lifecycle loaders (handles metrics, caching, and stubbing the VM boot)
export class BaseLoader {
  constructor(binaryName, hostAdapter) {
    this.binaryName = binaryName;
    this.hostAdapter = hostAdapter;
    this.wasmByteSize = 0;
    this.wasmFetchDuration = 0;
    this.wasmCompileDuration = 0;
    this.cachedInstancePromise = null;
    this.exports = null;
  }

  // Get compiled instance exports (hot path)
  async getExports() {
    if (this.exports) return this.exports;
    if (this.cachedInstancePromise) return this.cachedInstancePromise;

    this.cachedInstancePromise = (async () => {
      const result = await this.instantiateModule();
      this.exports = result.exports;
      this.wasmByteSize = result.byteSize;
      this.wasmFetchDuration = result.fetchDuration;
      this.wasmCompileDuration = result.compileDuration;
      return result.exports;
    })();

    return this.cachedInstancePromise;
  }

  // Compile and return a fresh new instance (cold path)
  async instantiateCold() {
    const result = await this.instantiateModule();
    return result.exports;
  }

  // Base abstract instantiation routine (overridden by subclass)
  async instantiateModule() {
    throw new Error("instantiateModule() not implemented");
  }

  getByteSize() { return this.wasmByteSize; }
  getFetchDuration() { return this.wasmFetchDuration; }
  getCompileDuration() { return this.wasmCompileDuration; }
}
