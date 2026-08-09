package main

import (
	"gitlab.com/ouvrage-systems/labs/wasi-polyglot-bindings-reference/pkg/maths"
)

//go:wasmexport add
func Add(a, b int64) int64 {
	return maths.Add(a, b)
}

//go:wasmexport compute-sequence
func ComputeSequence(u0, b, n int64) int64 {
	return maths.ComputeSequence(u0, b, n)
}

//go:wasmexport is-prime
func IsPrime(n int64) bool {
	return maths.IsPrime(n)
}

//go:wasmexport count-primes
func CountPrimes(limit, start int64) int64 {
	return maths.CountPrimes(limit, start)
}

//go:wasmexport concurrent-count-primes
func ConcurrentCountPrimes(limit int64, numWorkers int32) int64 {
	return maths.ConcurrentCountPrimes(limit, int(numWorkers))
}

//go:wasmexport find-last-prime
func FindLastPrime(limit int64) int64 {
	return maths.FindLastPrime(limit)
}

//go:wasmexport fibonacci
func Fibonacci(n int64) int64 {
	return maths.Fibonacci(n)
}

//go:wasmexport fibonacci-recursive
func FibonacciRecursive(n int64) int64 {
	return maths.FibonacciRecursive(n)
}

func main() {}
