#!/usr/bin/env node

import { add, isPrime, countPrimes, findLastPrime, fibonacciRecursive, getWasmByteSize } from '../bindings/js/v0/tiny/my_lib/index.js';
import fs from 'node:fs';
import path from 'node:path';

function jsIsPrime(n) {
  if (n <= 1n) return false;
  if (n <= 3n) return true;
  if (n % 2n === 0n || n % 3n === 0n) return false;
  for (let i = 5n; i * i <= n; i += 6n) {
    if (n % i === 0n || n % (i + 2n) === 0n) return false;
  }
  return true;
}

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

async function runBenchmark(limit = 500000) {
  console.log(`🚀 Starting Polyglot WASM Benchmark with CPU & Memory Metrics (Limit = ${limit.toLocaleString()})...\n`);

  // 1. WASM Internal CountPrimes / FindLastPrime
  const m0 = measureMetricsStart();
  const wasmLastPrime = await findLastPrime(limit);
  const m0End = measureMetricsEnd(m0);

  // 2. Pure JS Prime Numbers
  const m1 = measureMetricsStart();
  let jsLastPrime = 0n;
  const bigLimit = BigInt(limit);
  for (let i = 2n; i <= bigLimit; i++) {
    if (jsIsPrime(i)) jsLastPrime = i;
  }
  const m1End = measureMetricsEnd(m1);

  // 3. Iterative JS-to-WASM FFI calls (IsPrime per integer, limited to 50,000)
  const ffiLimit = Math.min(limit, 50000);
  const m2 = measureMetricsStart();
  let ffiLastPrime = 0;
  for (let i = 2; i <= ffiLimit; i++) {
    if (await isPrime(i)) ffiLastPrime = i;
  }
  const m2End = measureMetricsEnd(m2);

  // 4. WASM Fibonacci Recursive N=35
  const m3 = measureMetricsStart();
  const wasmFib = await fibonacciRecursive(35);
  const m3End = measureMetricsEnd(m3);

  const byteSize = await getWasmByteSize();

  const report = {
    metadata: {
      timestamp: new Date().toISOString(),
      engine: 'Node.js ' + process.version,
      target: 'WASM v0 TinyGo (64-bit int64)',
      wasmByteSize: byteSize,
      limitRequested: limit
    },
    results: [
      {
        mode: 'WASM Internal (FindLastPrime)',
        limitTested: limit,
        totalTimeMs: m0End.totalTimeMs,
        cpuUserMs: m0End.cpuUserMs,
        cpuSystemMs: m0End.cpuSystemMs,
        heapDeltaMb: m0End.heapDeltaMb,
        rssMb: m0End.rssMb,
        result: String(wasmLastPrime)
      },
      {
        mode: 'Pure JS V8 JIT (FindLastPrime)',
        limitTested: limit,
        totalTimeMs: m1End.totalTimeMs,
        cpuUserMs: m1End.cpuUserMs,
        cpuSystemMs: m1End.cpuSystemMs,
        heapDeltaMb: m1End.heapDeltaMb,
        rssMb: m1End.rssMb,
        result: String(jsLastPrime)
      },
      {
        mode: 'Iterative JS-to-WASM FFI (Cached)',
        limitTested: ffiLimit,
        totalTimeMs: m2End.totalTimeMs,
        cpuUserMs: m2End.cpuUserMs,
        cpuSystemMs: m2End.cpuSystemMs,
        heapDeltaMb: m2End.heapDeltaMb,
        rssMb: m2End.rssMb,
        result: String(ffiLastPrime)
      },
      {
        mode: 'WASM Fibonacci Recursive (N=35)',
        limitTested: 35,
        totalTimeMs: m3End.totalTimeMs,
        cpuUserMs: m3End.cpuUserMs,
        cpuSystemMs: m3End.cpuSystemMs,
        heapDeltaMb: m3End.heapDeltaMb,
        rssMb: m3End.rssMb,
        result: String(wasmFib)
      }
    ]
  };

  console.table(report.results);

  // Save to JSON and CSV
  const outDir = path.resolve('bindings/build/reports');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const jsonPath = path.join(outDir, 'benchmark_results.json');
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));

  const csvLines = [
    'mode,limitTested,totalTimeMs,cpuUserMs,cpuSystemMs,heapDeltaMb,rssMb,result',
    ...report.results.map(r => `"${r.mode}",${r.limitTested},${r.totalTimeMs},${r.cpuUserMs},${r.cpuSystemMs},${r.heapDeltaMb},${r.rssMb},"${r.result}"`)
  ];
  const csvPath = path.join(outDir, 'benchmark_results.csv');
  fs.writeFileSync(csvPath, csvLines.join('\n'));

  console.log(`\n📊 Enriched Benchmark artifacts generated successfully:`);
  console.log(`   - JSON: ${jsonPath}`);
  console.log(`   - CSV:  ${csvPath}`);
}

const limitArg = process.argv[2] ? parseInt(process.argv[2], 10) : 500000;
runBenchmark(limitArg).catch(console.error);
