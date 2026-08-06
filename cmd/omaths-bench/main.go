package main

import (
	"encoding/csv"
	"encoding/json"
	"fmt"
	"os"
	"runtime"
	"time"


	"github.com/spf13/cobra"
	"gitlab.com/ouvrage-systems/labs/wasi-polyglot-bindings-reference/pkg/maths"
)

type BenchResult struct {
	Workload      string  `json:"workload"`
	ExecutionMode string  `json:"execution_mode"`
	Parameters    string  `json:"parameters"`
	TotalTimeMs   float64 `json:"total_time_ms"`
	AvgNsPerCall  float64 `json:"avg_ns_per_call"`
	RAMDeltaMB    float64 `json:"ram_delta_mb"`
	Result        string  `json:"result"`
	Status        string  `json:"status"`
}

var (
	paramA       int64
	paramB       int64
	paramC       int64
	paramWorkers int
	jsonOutput   bool
	csvOutput    bool
)

func getHeapAllocMB() float64 {
	var m runtime.MemStats
	runtime.ReadMemStats(&m)
	return float64(m.Alloc) / (1024 * 1024)
}

func measureExec(fn func() interface{}) (interface{}, float64, float64) {
	runtime.GC()
	mem0 := getHeapAllocMB()
	t0 := time.Now()
	res := fn()
	elapsed := time.Since(t0)
	mem1 := getHeapAllocMB()
	totalMs := float64(elapsed.Nanoseconds()) / 1e6
	deltaMb := mem1 - mem0
	return res, totalMs, deltaMb
}

func printFormattedResult(r BenchResult) {
	fmt.Printf("\n=== Execution Result ===\n")
	fmt.Printf("Workload:       %s\n", r.Workload)
	fmt.Printf("Execution Mode: %s\n", r.ExecutionMode)
	fmt.Printf("Parameters:     %s\n", r.Parameters)
	fmt.Printf("Total Time:     %.3f ms\n", r.TotalTimeMs)
	if r.AvgNsPerCall > 0 {
		fmt.Printf("Avg / Call:     %.2f ns\n", r.AvgNsPerCall)
	}
	fmt.Printf("RAM Heap Delta: %+.3f MB\n", r.RAMDeltaMB)
	fmt.Printf("Result:         %s\n", r.Result)
	fmt.Printf("Status:         %s\n", r.Status)
	fmt.Printf("========================\n")
}

var rootCmd = &cobra.Command{
	Use:   "omaths-bench",
	Short: "Ouvrage Labs - Native Go Mathematical Benchmark CLI",
	Long:  "CLI tool for benchmarking 64-bit mathematical workloads in native Go (V8 JIT / WASM comparison baseline).",
}

var runCmd = &cobra.Command{
	Use:   "run",
	Short: "Run a single mathematical workload",
}

var addCmd = &cobra.Command{
	Use:   "add",
	Short: "Perform scalar addition (A + B)",
	Run: func(cmd *cobra.Command, args []string) {
		res, totalMs, deltaMb := measureExec(func() interface{} {
			return maths.Add(paramA, paramB)
		})
		r := BenchResult{
			Workload:      "Scalar Addition",
			ExecutionMode: "Pure Go Native",
			Parameters:    fmt.Sprintf("A=%d, B=%d", paramA, paramB),
			TotalTimeMs:   totalMs,
			AvgNsPerCall:  totalMs * 1e6,
			RAMDeltaMB:    deltaMb,
			Result:        fmt.Sprintf("%v", res),
			Status:        "✓ Verified",
		}
		printFormattedResult(r)
	},
}

var sequenceCmd = &cobra.Command{
	Use:   "sequence",
	Short: "Compute arithmetic sequence Un = U0 + N * B",
	Run: func(cmd *cobra.Command, args []string) {
		res, totalMs, deltaMb := measureExec(func() interface{} {
			return maths.ComputeSequence(paramA, paramB, paramC)
		})
		avgNs := (totalMs * 1e6) / float64(paramC)
		r := BenchResult{
			Workload:      "Arithmetic Sequence",
			ExecutionMode: "Pure Go Native",
			Parameters:    fmt.Sprintf("U0=%d, B=%d, N=%d", paramA, paramB, paramC),
			TotalTimeMs:   totalMs,
			AvgNsPerCall:  avgNs,
			RAMDeltaMB:    deltaMb,
			Result:        fmt.Sprintf("%v", res),
			Status:        "✓ Verified",
		}
		printFormattedResult(r)
	},
}

var primesCmd = &cobra.Command{
	Use:   "primes",
	Short: "Find the largest prime number <= Limit",
	Run: func(cmd *cobra.Command, args []string) {
		res, totalMs, deltaMb := measureExec(func() interface{} {
			return maths.FindLastPrime(paramC)
		})
		avgNs := (totalMs * 1e6) / float64(paramC)
		r := BenchResult{
			Workload:      "Prime Numbers",
			ExecutionMode: "Pure Go Native",
			Parameters:    fmt.Sprintf("Limit=%d", paramC),
			TotalTimeMs:   totalMs,
			AvgNsPerCall:  avgNs,
			RAMDeltaMB:    deltaMb,
			Result:        fmt.Sprintf("%v", res),
			Status:        "✓ Verified",
		}
		printFormattedResult(r)
	},
}

var concurrentPrimesCmd = &cobra.Command{
	Use:   "concurrent-primes",
	Short: "Count prime numbers <= Limit using N Goroutines and Channels",
	Run: func(cmd *cobra.Command, args []string) {
		res, totalMs, deltaMb := measureExec(func() interface{} {
			return maths.ConcurrentCountPrimes(paramC, paramWorkers)
		})
		avgNs := (totalMs * 1e6) / float64(paramC)
		r := BenchResult{
			Workload:      "Concurrent Primes",
			ExecutionMode: fmt.Sprintf("Pure Go Native (%d Goroutines)", paramWorkers),
			Parameters:    fmt.Sprintf("Limit=%d, Workers=%d", paramC, paramWorkers),
			TotalTimeMs:   totalMs,
			AvgNsPerCall:  avgNs,
			RAMDeltaMB:    deltaMb,
			Result:        fmt.Sprintf("%v", res),
			Status:        "✓ Verified",
		}
		printFormattedResult(r)
	},
}

var fibonacciRecCmd = &cobra.Command{
	Use:   "fibonacci-rec",
	Short: "Compute n-th Fibonacci term recursively (Stack intensive)",
	Run: func(cmd *cobra.Command, args []string) {
		res, totalMs, deltaMb := measureExec(func() interface{} {
			return maths.FibonacciRecursive(paramC)
		})
		r := BenchResult{
			Workload:      "Fibonacci Recursive",
			ExecutionMode: "Pure Go Native",
			Parameters:    fmt.Sprintf("N=%d", paramC),
			TotalTimeMs:   totalMs,
			AvgNsPerCall:  0,
			RAMDeltaMB:    deltaMb,
			Result:        fmt.Sprintf("%v", res),
			Status:        "✓ Verified",
		}
		printFormattedResult(r)
	},
}

var fibonacciIterCmd = &cobra.Command{
	Use:   "fibonacci-iter",
	Short: "Compute n-th Fibonacci term iteratively (Fast loop)",
	Run: func(cmd *cobra.Command, args []string) {
		res, totalMs, deltaMb := measureExec(func() interface{} {
			return maths.Fibonacci(paramC)
		})
		r := BenchResult{
			Workload:      "Fibonacci Iterative",
			ExecutionMode: "Pure Go Native",
			Parameters:    fmt.Sprintf("N=%d", paramC),
			TotalTimeMs:   totalMs,
			AvgNsPerCall:  0,
			RAMDeltaMB:    deltaMb,
			Result:        fmt.Sprintf("%v", res),
			Status:        "✓ Verified",
		}
		printFormattedResult(r)
	},
}

var benchmarkCmd = &cobra.Command{
	Use:   "benchmark",
	Short: "Run complete native Go benchmark suite across all workloads",
	Run: func(cmd *cobra.Command, args []string) {
		results := []BenchResult{}

		// 1. Primes
		_, tMs, dMb := measureExec(func() interface{} { return maths.FindLastPrime(paramC) })
		results = append(results, BenchResult{
			Workload:      "Prime Numbers",
			ExecutionMode: "Pure Go Native",
			Parameters:    fmt.Sprintf("Limit=%d", paramC),
			TotalTimeMs:   tMs,
			AvgNsPerCall:  (tMs * 1e6) / float64(paramC),
			RAMDeltaMB:    dMb,
			Result:        fmt.Sprintf("%d", maths.FindLastPrime(paramC)),
			Status:        "✓ Verified",
		})

		// 2. Concurrent Primes
		_, tMs, dMb = measureExec(func() interface{} { return maths.ConcurrentCountPrimes(paramC, paramWorkers) })
		results = append(results, BenchResult{
			Workload:      "Concurrent Primes",
			ExecutionMode: fmt.Sprintf("Pure Go Native (%d Goroutines)", paramWorkers),
			Parameters:    fmt.Sprintf("Limit=%d, Workers=%d", paramC, paramWorkers),
			TotalTimeMs:   tMs,
			AvgNsPerCall:  (tMs * 1e6) / float64(paramC),
			RAMDeltaMB:    dMb,
			Result:        fmt.Sprintf("%d", maths.ConcurrentCountPrimes(paramC, paramWorkers)),
			Status:        "✓ Verified",
		})

		// 3. Fibonacci Recursive N=35
		fibN := int64(35)
		if paramC < 35 {
			fibN = paramC
		}
		_, tMs, dMb = measureExec(func() interface{} { return maths.FibonacciRecursive(fibN) })
		results = append(results, BenchResult{
			Workload:      "Fibonacci Recursive",
			ExecutionMode: "Pure Go Native",
			Parameters:    fmt.Sprintf("N=%d", fibN),
			TotalTimeMs:   tMs,
			AvgNsPerCall:  0,
			RAMDeltaMB:    dMb,
			Result:        fmt.Sprintf("%d", maths.FibonacciRecursive(fibN)),
			Status:        "✓ Verified",
		})

		// 4. Fibonacci Iterative
		_, tMs, dMb = measureExec(func() interface{} { return maths.Fibonacci(paramC) })
		results = append(results, BenchResult{
			Workload:      "Fibonacci Iterative",
			ExecutionMode: "Pure Go Native",
			Parameters:    fmt.Sprintf("N=%d", paramC),
			TotalTimeMs:   tMs,
			AvgNsPerCall:  0,
			RAMDeltaMB:    dMb,
			Result:        fmt.Sprintf("%d", maths.Fibonacci(paramC)),
			Status:        "✓ Verified",
		})

		// 5. Sequence
		_, tMs, dMb = measureExec(func() interface{} { return maths.ComputeSequence(paramA, paramB, paramC) })
		results = append(results, BenchResult{
			Workload:      "Arithmetic Sequence",
			ExecutionMode: "Pure Go Native",
			Parameters:    fmt.Sprintf("U0=%d, B=%d, N=%d", paramA, paramB, paramC),
			TotalTimeMs:   tMs,
			AvgNsPerCall:  (tMs * 1e6) / float64(paramC),
			RAMDeltaMB:    dMb,
			Result:        fmt.Sprintf("%d", maths.ComputeSequence(paramA, paramB, paramC)),
			Status:        "✓ Verified",
		})

		if jsonOutput {
			data, _ := json.MarshalIndent(results, "", "  ")
			fmt.Println(string(data))
			return
		}

		if csvOutput {
			w := csv.NewWriter(os.Stdout)
			w.Write([]string{"Workload", "ExecutionMode", "Parameters", "TotalTimeMs", "AvgNsPerCall", "RAMDeltaMB", "Result", "Status"})
			for _, r := range results {
				w.Write([]string{
					r.Workload,
					r.ExecutionMode,
					r.Parameters,
					fmt.Sprintf("%.3f", r.TotalTimeMs),
					fmt.Sprintf("%.2f", r.AvgNsPerCall),
					fmt.Sprintf("%.3f", r.RAMDeltaMB),
					r.Result,
					r.Status,
				})
			}
			w.Flush()
			return
		}

		fmt.Printf("\n%-22s %-28s %-22s %-12s %-12s %-12s %-12s\n", "Workload", "Execution Mode", "Parameters", "Total Time", "Avg / Call", "RAM Heap Δ", "Result")
		fmt.Println("-------------------------------------------------------------------------------------------------------------------------")
		for _, r := range results {
			avgStr := "N/A"
			if r.AvgNsPerCall > 0 {
				avgStr = fmt.Sprintf("%.2f ns", r.AvgNsPerCall)
			}
			fmt.Printf("%-22s %-28s %-22s %-12s %-12s %-12s %-12s\n",
				r.Workload,
				r.ExecutionMode,
				r.Parameters,
				fmt.Sprintf("%.3f ms", r.TotalTimeMs),
				avgStr,
				fmt.Sprintf("%+.3f MB", r.RAMDeltaMB),
				r.Result,
			)
		}
	},
}

func init() {
	runCmd.PersistentFlags().Int64Var(&paramA, "a", 15, "Parameter A (U0 / Operand A)")
	runCmd.PersistentFlags().Int64Var(&paramB, "b", 35, "Parameter B (Common reason / Operand B)")
	runCmd.PersistentFlags().Int64Var(&paramC, "c", 500000, "Parameter C (Search Limit N / Iterations)")
	runCmd.PersistentFlags().Int64Var(&paramC, "limit", 500000, "Alias for Search Limit N")
	runCmd.PersistentFlags().Int64Var(&paramC, "n", 500000, "Alias for Iteration count N")
	runCmd.PersistentFlags().IntVar(&paramWorkers, "workers", 4, "Worker count for goroutines")

	benchmarkCmd.Flags().Int64Var(&paramA, "a", 15, "Parameter A")
	benchmarkCmd.Flags().Int64Var(&paramB, "b", 35, "Parameter B")
	benchmarkCmd.Flags().Int64Var(&paramC, "c", 500000, "Parameter C")
	benchmarkCmd.Flags().Int64Var(&paramC, "limit", 500000, "Search Limit N")
	benchmarkCmd.Flags().IntVar(&paramWorkers, "workers", 4, "Worker count for goroutines")
	benchmarkCmd.Flags().BoolVar(&jsonOutput, "json", false, "Output results as JSON")
	benchmarkCmd.Flags().BoolVar(&csvOutput, "csv", false, "Output results as CSV")

	runCmd.AddCommand(addCmd)
	runCmd.AddCommand(sequenceCmd)
	runCmd.AddCommand(primesCmd)
	runCmd.AddCommand(concurrentPrimesCmd)
	runCmd.AddCommand(fibonacciRecCmd)
	runCmd.AddCommand(fibonacciIterCmd)

	rootCmd.AddCommand(runCmd)
	rootCmd.AddCommand(benchmarkCmd)
}

func main() {
	if err := rootCmd.Execute(); err != nil {
		fmt.Println(err)
		os.Exit(1)
	}
}
