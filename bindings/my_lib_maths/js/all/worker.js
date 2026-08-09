import { initMatrix, runWorkload, verifyResult } from './lab_matrix.js';
import { getMathsImplementation } from './driver_manager.js';
import { WorkerAdapter } from './adapters/worker_adapter.js';

let initialized = false;

self.onmessage = async (e) => {
  const { type, toolchain, op, mode, inputs, result } = e.data;

  // Handle verify request from UI thread (verification run on worker to keep UI fluid)
  if (type === 'verify') {
    try {
      if (!initialized) {
        await initMatrix(new WorkerAdapter());
        initialized = true;
      }
      const status = await verifyResult(op, inputs, result);
      self.postMessage({ type: 'verify_done', status });
    } catch (err) {
      self.postMessage({ type: 'verify_done', status: 'FAILED' });
    }
    return;
  }

  try {
    // Avoid top-level await to maximize browser compatibility in module Web Workers
    if (!initialized) {
      await initMatrix(new WorkerAdapter());
      initialized = true;
    }

    const driver = getMathsImplementation(toolchain);
    
    // Resolve sizing and compiled statistics on driver init
    await driver.init();
    
    let size = 0;
    let fetchMs = 0;
    let compileMs = 0;
    if (toolchain !== 'H') {
      try {
        size = driver.getByteSize();
        fetchMs = driver.getFetchDuration();
        compileMs = driver.getCompileDuration();
      } catch (err) {}
    }

    self.postMessage({
      type: 'init_done',
      meta: { size, fetchMs, compileMs }
    });

    // Run workload
    const metrics = await runWorkload(
      driver,
      op,
      mode,
      inputs
    );

    self.postMessage({
      type: 'run_done',
      metrics
    });

  } catch (err) {
    self.postMessage({
      type: 'error',
      error: err.message
    });
  }
};
