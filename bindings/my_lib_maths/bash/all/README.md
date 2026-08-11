# 🐚 Bash Bindings: `my_lib_maths`

High-performance, sandboxed mathematical bindings for standard Bash scripts, running under the `wasmtime` CLI. 

This package implements the **Persistent Instance FIFO Pattern**, running a single background Wasmtime virtual machine connected to named pipes. This completely bypasses the WebAssembly VM cold start startup overhead, enabling shell scripts to run mathematical algorithms at in-process memory speeds.

---

## 🚀 Quick Start

### 1. Import and Initialize the Library

Add the library to your Bash script, set up the paths if necessary, and call `maths_init` to boot the sandboxed virtual machine:

```bash
#!/usr/bin/env bash
set -euo pipefail

# 1. Load the library bindings
source ./bindings/my_lib_maths/bash/all/lib_maths.sh

# 2. Boot the VM (Starts background Wasmtime and opens FIFOs)
maths_init

# 3. Call mathematical functions
res_add=$(maths_add 15 25)
echo "Result: $res_add" # Output: 40

res_fib=$(maths_fibonacci 40)
echo "Fibonacci 40: $res_fib" # Output: 102334155

# 4. Clean up and close the sandbox before exiting
maths_close
```

---

## 📚 API Reference

All functions return their result directly via standard output (`stdout`), and output error logs to standard error (`stderr`).

| Function Signature | Description |
| :--- | :--- |
| **`maths_init`** | Boots the background Wasmtime engine and opens persistent file descriptors connected to named pipes. |
| **`maths_close`** | Closes file descriptors, stops the background process, and deletes temporary FIFO pipes. |
| **`maths_add a b`** | Returns $a + b$. |
| **`maths_compute_sequence U0 diff iterations`** | Computes the N-th term of an arithmetic sequence starting at $U_0$ with difference $d$. |
| **`maths_find_last_prime limit`** | Returns the largest prime number less than or equal to the limit. |
| **`maths_concurrent_count_primes workers limit`** | Counts primes up to the limit concurrently using $K$ workers. |
| **`maths_fibonacci n`** | Computes the N-th Fibonacci term iteratively. |
| **`maths_fibonacci_recursive n`** | Computes the N-th Fibonacci term recursively. |

---

## ⚡ Performance

By using persistent named pipes instead of creating new processes for every call, execution speed is accelerated by up to **20x to 50x**, bypassing Wasmtime initialization and compilation latency.

Run the test suite and benchmark suite to verify performance on your local system:
```bash
chmod +x ./bindings/my_lib_maths/bash/all/test_maths.sh
./bindings/my_lib_maths/bash/all/test_maths.sh
```
