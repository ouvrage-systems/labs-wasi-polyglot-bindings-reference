package main

import (
	"gitlab.com/ouvrage-systems/labs/wasi-polyglot-bindings-reference/pkg/maths"
)

//go:wasmexport Add
func Add(a, b int64) int64 {
	return maths.Add(a, b)
}

//go:wasmexport ComputeSequence
func ComputeSequence(u0, b, n int64) int64 {
	return maths.ComputeSequence(u0, b, n)
}

//go:wasmexport IsPrime
func IsPrime(n int64) bool {
	return maths.IsPrime(n)
}

//go:wasmexport CountPrimes
func CountPrimes(limit, start int64) int64 {
	return maths.CountPrimes(limit, start)
}

//go:wasmexport ConcurrentCountPrimes
func ConcurrentCountPrimes(limit int64, numWorkers int32) int64 {
	return maths.ConcurrentCountPrimes(limit, int(numWorkers))
}

//go:wasmexport FindLastPrime
func FindLastPrime(limit int64) int64 {
	return maths.FindLastPrime(limit)
}

//go:wasmexport Fibonacci
func Fibonacci(n int64) int64 {
	return maths.Fibonacci(n)
}

//go:wasmexport FibonacciRecursive
func FibonacciRecursive(n int64) int64 {
	return maths.FibonacciRecursive(n)
}

func main() {
	// Inactive main for direct exports library target
}
