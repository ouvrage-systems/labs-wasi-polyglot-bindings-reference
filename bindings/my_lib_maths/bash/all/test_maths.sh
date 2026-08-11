#!/usr/bin/env bash
# 📂 bindings/my_lib_maths/bash/all/test_maths.sh
# Test script to validate Bash library bindings for my_lib_maths.

set -euo pipefail

# Ensure we run from workspace root to resolve paths correctly
cd "$(dirname "$0")/../../../../"

LIB_PATH="./bindings/my_lib_maths/bash/all/lib_maths.sh"

echo "=== Testing Bash Bindings for my_lib_maths ==="
echo "Loading library: $LIB_PATH"

if [ ! -f "$LIB_PATH" ]; then
  echo "ERROR: Library not found at $LIB_PATH" >&2
  exit 1
fi

# Import library
source "$LIB_PATH"

echo "Initializing maths library sandbox..."
maths_init

# Test simple math addition
echo -n "Test 1: Addition (10 + 20) -> "
res=$(maths_add 10 20)
echo "$res"
if [ "$res" != "30" ]; then echo "FAIL" >&2; exit 1; fi

# Test sequence calculation
echo -n "Test 2: ComputeSequence (U0=10, d=2, Iterations=1000) -> "
res=$(maths_compute_sequence 10 2 1000)
echo "$res"
if [ "$res" != "2010" ]; then echo "FAIL" >&2; exit 1; fi

# Test Fibonacci iterative
echo -n "Test 3: Fibonacci (Term 40) -> "
res=$(maths_fibonacci 40)
echo "$res"
if [ "$res" != "102334155" ]; then echo "FAIL" >&2; exit 1; fi

# Test Fibonacci recursive
echo -n "Test 4: Fibonacci Recursive (Term 15) -> "
res=$(maths_fibonacci_recursive 15)
echo "$res"
if [ "$res" != "610" ]; then echo "FAIL" >&2; exit 1; fi

# Benchmark comparison: Cold start vs Persistent Loop
echo ""
echo "=== Benchmarking: Cold Start vs Persistent Execution ==="

# 1. Cold Start Benchmark (Launching wasmtime 50 times)
echo "Running 50 calls via Cold Launch (wasmtime run --invoke)..."
start_cold=$(date +%s%3N)
for i in {1..50}; do
  ./bin/wasmtime run --invoke Add ./bindings/my_lib_maths/build/v0/tiny/v0/export/none/my_lib_maths.wasm 10 "$i" >/dev/null
done
end_cold=$(date +%s%3N)
duration_cold=$((end_cold - start_cold))
echo "Cold Start Duration: ${duration_cold}ms (~$((duration_cold / 50))ms per call)"

# 2. Persistent Named Pipes Benchmark (Reusing same instance 50 times)
echo "Running 50 calls via Persistent Pipes..."
start_persist=$(date +%s%3N)
for i in {1..50}; do
  maths_add 10 "$i" >/dev/null
done
end_persist=$(date +%s%3N)
duration_persist=$((end_persist - start_persist))

# Safeguard against division by zero for extremely fast execution
if [ "$duration_persist" -eq 0 ]; then
  duration_persist=1
fi

echo "Persistent Pipes Duration: ${duration_persist}ms (~$((duration_persist / 50))ms per call)"

# Calculate acceleration
ratio=$(echo "scale=2; $duration_cold / $duration_persist" | bc -l)
echo "--------------------------------------------------------"
echo "Performance Acceleration Factor: ${ratio}x faster!"
echo "--------------------------------------------------------"

echo "Tearing down maths library sandbox..."
maths_close
echo "Done!"
