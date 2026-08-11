#!/usr/bin/env bash
# 📂 bindings/my_lib_maths/bash/all/lib_maths.sh
# Production-ready Bash library wrapper for my_lib_maths running under Wasmtime.
# Implements persistent, high-performance in-memory instance reuse via Named Pipes.

# Prevent multiple inclusions
if [ -n "${_LIB_MATHS_SH_INCLUDED:-}" ]; then
  return 0
fi
_LIB_MATHS_SH_INCLUDED=1

# Global state variables
_MATHS_WASMTIME_PID=""
_MATHS_FIFO_IN=""
_MATHS_FIFO_OUT=""
_MATHS_FIFO_DIR=""
_MATHS_ID_COUNTER=0

# Default path to wasmtime and WASM binary
MATHS_WASMTIME_BIN="${MATHS_WASMTIME_BIN:-./bin/wasmtime}"
MATHS_WASM_FILE="${MATHS_WASM_FILE:-./bindings/my_lib_maths/build/v0.1/tiny/v0.1/jsonrpc/asyncify/my_lib_maths.wasm}"

# Internal helper: Parse JSON-RPC result from response
_maths_parse_result() {
  local json="$1"
  # Try fast native regex parsing first to avoid subshell fork overhead of jq
  if [[ "$json" =~ \"error\":\"([^\"]+)\" ]]; then
    echo "ERROR: ${BASH_REMATCH[1]}" >&2
    return 1
  elif [[ "$json" =~ \"result\":([0-9.-]+) ]]; then
    echo "${BASH_REMATCH[1]}"
  elif [[ "$json" =~ \"result\":\"([^\"]+)\" ]]; then
    echo "${BASH_REMATCH[1]}"
  elif command -v jq >/dev/null 2>&1; then
    # Fallback to jq for more complex json structures
    local err
    err=$(jq -r '.error // empty' <<< "$json")
    if [ -n "$err" ]; then
      echo "ERROR: $err" >&2
      return 1
    fi
    jq -r '.result' <<< "$json"
  else
    echo "ERROR: Failed to parse JSON-RPC response: $json" >&2
    return 1
  fi
}

# Internal helper: Send RPC request and read response
_maths_call_rpc() {
  local method="$1"
  local params="$2"
  
  if [ -z "${_MATHS_WASMTIME_PID:-}" ] || ! kill -0 "$_MATHS_WASMTIME_PID" 2>/dev/null; then
    echo "ERROR: maths library is not initialized. Call maths_init first." >&2
    return 1
  fi
  
  _MATHS_ID_COUNTER=$((_MATHS_ID_COUNTER + 1))
  
  # Write request to the input pipe (FD 3)
  echo "{\"method\":\"$method\",\"params\":$params,\"id\":$_MATHS_ID_COUNTER}" >&3
  
  # Read single response line from the output pipe (FD 4)
  local response
  if ! read -r response <&4; then
    echo "ERROR: Failed to read response from WASM process" >&2
    return 1
  fi
  
  _maths_parse_result "$response"
}

# Initialize the persistent Wasmtime process
maths_init() {
  # Verify binary path
  if [ ! -f "$MATHS_WASM_FILE" ]; then
    echo "ERROR: WASM binary not found at $MATHS_WASM_FILE" >&2
    return 1
  fi
  
  # Verify wasmtime path
  if ! command -v "$MATHS_WASMTIME_BIN" >/dev/null 2>&1; then
    echo "ERROR: wasmtime CLI not found at $MATHS_WASMTIME_BIN" >&2
    return 1
  fi
  
  # Setup Named Pipes
  _MATHS_FIFO_DIR=$(mktemp -d -t wasm_maths_XXXXXX)
  _MATHS_FIFO_IN="$_MATHS_FIFO_DIR/in_pipe"
  _MATHS_FIFO_OUT="$_MATHS_FIFO_DIR/out_pipe"
  
  mkfifo "$_MATHS_FIFO_IN"
  mkfifo "$_MATHS_FIFO_OUT"
  
  # Launch Wasmtime in background redirected to the named pipes
  "$MATHS_WASMTIME_BIN" run "$MATHS_WASM_FILE" < "$_MATHS_FIFO_IN" > "$_MATHS_FIFO_OUT" 2>/dev/null &
  _MATHS_WASMTIME_PID=$!
  
  # Open persistent file descriptors: FD 3 (write-in), FD 4 (read-out)
  exec 3> "$_MATHS_FIFO_IN"
  exec 4< "$_MATHS_FIFO_OUT"
  
  return 0
}

# Graceful termination and cleanup
maths_close() {
  # Close descriptors to send EOF to background process
  exec 3>&-
  exec 4<&-
  
  if [ -n "${_MATHS_WASMTIME_PID:-}" ] && kill -0 "$_MATHS_WASMTIME_PID" 2>/dev/null; then
    wait "$_MATHS_WASMTIME_PID" 2>/dev/null || true
  fi
  
  # Cleanup temp directory
  if [ -d "${_MATHS_FIFO_DIR:-}" ]; then
    rm -rf "$_MATHS_FIFO_DIR"
  fi
  
  _MATHS_WASMTIME_PID=""
  _MATHS_FIFO_IN=""
  _MATHS_FIFO_OUT=""
  _MATHS_FIFO_DIR=""
  _MATHS_ID_COUNTER=0
}

# -----------------------------------------------------------------------------
# Public Math Functions
# -----------------------------------------------------------------------------

# Add two numbers: maths_add <operand_a> <operand_b>
maths_add() {
  local a="${1:-0}"
  local b="${2:-0}"
  _maths_call_rpc "maths.add" "{\"a\":$a,\"b\":$b}"
}

# Compute sequence: maths_compute_sequence <initial_u0> <difference_d> <iterations_c>
maths_compute_sequence() {
  local u0="${1:-0}"
  local d="${2:-0}"
  local c="${3:-1}"
  _maths_call_rpc "maths.computeSequence" "{\"u0\":$u0,\"b\":$d,\"n\":$c}"
}

# Find the last prime number <= limit
maths_find_last_prime() {
  local limit="${1:-0}"
  _maths_call_rpc "maths.findLastPrime" "{\"limit\":$limit}"
}

# Count primes concurrently: maths_concurrent_count_primes <workers_k> <limit_c>
maths_concurrent_count_primes() {
  local workers="${1:-1}"
  local limit="${2:-1}"
  _maths_call_rpc "maths.concurrentCountPrimes" "{\"workers\":$workers,\"limit\":$limit}"
}

# Compute Fibonacci term (iterative)
maths_fibonacci() {
  local term="${1:-0}"
  _maths_call_rpc "maths.fibonacci" "{\"n\":$term}"
}

# Compute Fibonacci term (recursive)
maths_fibonacci_recursive() {
  local term="${1:-0}"
  _maths_call_rpc "maths.fibonacciRecursive" "{\"n\":$term}"
}
