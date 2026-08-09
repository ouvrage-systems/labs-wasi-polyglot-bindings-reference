#!/usr/bin/env node
import './polyfill.mjs';
import { getMathsImplementation } from '../bindings/my_lib_maths/js/all/driver_manager.js';
import { NodeAdapter } from '../bindings/my_lib_maths/js/all/adapters/node_adapter.js';
import { initMatrix, runWorkload, getToolchainName, parseSeed, getFunctionName, getModeName, getModeDesc, getInputDescriptor, estimateComplexity } from '../bindings/my_lib_maths/js/all/lab_matrix.js';

// Initialize the matrix with Node adapter at CLI startup
await initMatrix(new NodeAdapter());

function measureMetricsStart() {
  if (global.gc) global.gc();
  return {
    time: performance.now(),
    cpu: process.cpuUsage(),
    mem: process.memoryUsage()
  };
}

function measureMetricsEnd(start) {
  const endTime = performance.now();
  const endCpu = process.cpuUsage(start.cpu);
  const endMem = process.memoryUsage();
  return {
    totalTimeMs: Number((endTime - start.time).toFixed(3)),
    cpuUserMs: Number((endCpu.user / 1000).toFixed(3)),
    cpuSystemMs: Number((endCpu.system / 1000).toFixed(3)),
    heapDeltaMb: Number(((endMem.heapUsed - start.mem.heapUsed) / (1024 * 1024)).toFixed(3)),
    rssMb: Number((endMem.rss / (1024 * 1024)).toFixed(2))
  };
}

// Unified runner execution forwarding FFI runs to lab_matrix.js
async function runDriverBenchmark(toolchain, limit) {
  const driver = getMathsImplementation(toolchain);
  await driver.init();

  const m0 = measureMetricsStart();
  // Execute FindLastPrime (Function C, Mode 1 for WASM, Mode 2 for Native JS)
  const mode = toolchain === 'H' ? '2' : '1';
  const metrics = await runWorkload(driver, 'C', mode, { c: limit });
  const m0End = measureMetricsEnd(m0);

  if (metrics.status.startsWith('Error')) {
    throw new Error(metrics.status);
  }

  return {
    id: driver.id,
    name: getToolchainName(toolchain),
    sizeKb: Math.round(driver.getByteSize() / 1024),
    timeMs: m0End.totalTimeMs,
    cpuUserMs: m0End.cpuUserMs,
    heapDeltaMb: m0End.heapDeltaMb,
    result: String(metrics.result)
  };
}

async function main() {
  const arg = process.argv[2] || '';
  
  if (arg.includes('toolchain=') || arg.includes('op=')) {
    const repeats = parseInt(process.argv[3], 10) || 1;
    console.log(`🚀 Running Seed Workload: ${arg}`);
    if (repeats > 1) {
      console.log(`🔁 Repeating scenario ${repeats} times...\n`);
    } else {
      console.log(`\n`);
    }

    const { toolchain, op, mode, inputs } = parseSeed(arg);
    console.log(`Parsed Configuration:`);
    console.log(`  Target:       ${getToolchainName(toolchain)} [${toolchain}]`);
    console.log(`  Function:     ${getFunctionName(op)} [${op}]`);
    console.log(`  Mode:         ${getModeName(mode)} [${mode}] (${getModeDesc(mode)})`);
    console.log(`  Parameters:`);
    const desc = getInputDescriptor(op);
    if (!desc.disableA) console.log(`    - ${desc.labelA} (a): ${inputs.a}`);
    if (!desc.disableB) console.log(`    - ${desc.labelB} (b): ${inputs.b}`);
    if (!desc.disableC) console.log(`    - ${desc.labelC} (c): ${inputs.c}`);
    const estimation = estimateComplexity(op, inputs);
    if (estimation) {
      console.log(`  Complexity Projection:`);
      console.log(`    - ${estimation.label}: ${estimation.formatted}`);
      if (estimation.warning) {
        console.log(`    ${estimation.warning}`);
      }
      console.log(``);
    }
    console.log(`-----------------------------------------------\n`);

    const driver = getMathsImplementation(toolchain);
    await driver.init();

    const runs = [];
    for (let i = 1; i <= repeats; i++) {
      const startLocalTime = new Date().toLocaleTimeString();
      console.log(`[${startLocalTime}] Starting Run #${i}...`);
      const m0 = measureMetricsStart();
      const metrics = await runWorkload(driver, op, mode, inputs);
      const m0End = measureMetricsEnd(m0);

      if (metrics.status.startsWith('Error')) {
        console.error(`Run #${i} failed: ${metrics.status}`);
        process.exit(1);
      }

      runs.push({
        run: i,
        timeMs: m0End.totalTimeMs,
        cpuUserMs: m0End.cpuUserMs,
        avgNs: parseInt(metrics.avgNs, 10) || 0,
        result: metrics.result,
        status: metrics.status
      });

      if (repeats > 1) {
        console.log(`Run #${i}: Duration = ${m0End.totalTimeMs} ms, CPU = ${m0End.cpuUserMs} ms, Avg FFI = ${metrics.avgNs}, Result = ${metrics.result}`);
      }
    }

    if (repeats === 1) {
      const run = runs[0];
      console.log(`Metrics Result:`);
      console.log(`-----------------------------------------------`);
      console.log(`Nomenclature Tag: T${toolchain}-L1-F${op}-M${mode}`);
      console.log(`Target:           ${getToolchainName(toolchain)}`);
      console.log(`Function:         ${op}`);
      console.log(`Mode:             ${mode}`);
      console.log(`Result:           ${run.result}`);
      console.log(`Status:           ${run.status}`);
      console.log(`Size:             ${Math.round(driver.getByteSize() / 1024)} KB`);
      console.log(`Duration:         ${run.timeMs} ms`);
      console.log(`CPU User:         ${run.cpuUserMs} ms`);
      console.log(`Avg (FFI):        ${run.avgNs ? run.avgNs + ' ns' : 'N/A'}`);
      console.log(`-----------------------------------------------`);
    } else {
      const times = runs.map(r => r.timeMs);
      const cpus = runs.map(r => r.cpuUserMs);
      const ffis = runs.map(r => r.avgNs).filter(v => v > 0);

      const sum = arr => arr.reduce((a, b) => a + b, 0);
      const avg = arr => arr.length ? Number((sum(arr) / arr.length).toFixed(3)) : 0;
      const min = arr => arr.length ? Math.min(...arr) : 0;
      const max = arr => arr.length ? Math.max(...arr) : 0;

      console.log(`\nAggregated Statistics over ${repeats} runs:`);
      console.log(`-----------------------------------------------`);
      console.log(`Nomenclature Tag: T${toolchain}-L1-F${op}-M${mode}`);
      console.log(`Target:           ${getToolchainName(toolchain)}`);
      console.log(`Size:             ${Math.round(driver.getByteSize() / 1024)} KB`);
      console.log(`Duration (ms):    Min = ${min(times)}, Max = ${max(times)}, Avg = ${avg(times)}`);
      console.log(`CPU User (ms):    Min = ${min(cpus)}, Max = ${max(cpus)}, Avg = ${avg(cpus)}`);
      if (ffis.length) {
        console.log(`Avg FFI (ns):     Min = ${min(ffis)}, Max = ${max(ffis)}, Avg = ${avg(ffis).toFixed(0)}`);
      }
      console.log(`-----------------------------------------------`);
    }
    return;
  }

  const limit = parseInt(arg, 10) || 50000;
  console.log(`🚀 Running Unified Drivers Benchmark (FindLastPrime Limit = ${limit.toLocaleString()})...\n`);

  // Target toolchain letters aligned to the new A-H nomenclature
  const targets = ['H', 'A', 'B', 'C', 'D', 'E', 'F', 'I', 'G', 'J'];
  const results = [];

  for (const target of targets) {
    const targetName = getToolchainName(target);
    try {
      const res = await runDriverBenchmark(target, limit);
      results.push(res);
    } catch (e) {
      results.push({
        id: target,
        name: `${targetName} (Failed)`,
        sizeKb: 0,
        timeMs: 'Error',
        cpuUserMs: 0,
        heapDeltaMb: 0,
        result: e.message
      });
    }
  }

  console.table(results);
}

main();
