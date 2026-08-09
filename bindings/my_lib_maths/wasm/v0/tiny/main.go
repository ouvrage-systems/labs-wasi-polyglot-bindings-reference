package main

import (
	"gitlab.com/ouvrage-systems/labs/wasi-polyglot-bindings-reference/pkg/maths"
)

//export Add
func Add(a, b int64) int64 {
	return maths.Add(a, b)
}

//export ComputeSequence
func ComputeSequence(u0, b, n int64) int64 {
	return maths.ComputeSequence(u0, b, n)
}

//export IsPrime
func IsPrime(n int64) bool {
	return maths.IsPrime(n)
}

//export CountPrimes
func CountPrimes(limit, start int64) int64 {
	return maths.CountPrimes(limit, start)
}

//export FindLastPrime
func FindLastPrime(limit int64) int64 {
	return maths.FindLastPrime(limit)
}

//export Fibonacci
func Fibonacci(n int64) int64 {
	return maths.Fibonacci(n)
}

//export FibonacciRecursive
func FibonacciRecursive(n int64) int64 {
	return maths.FibonacciRecursive(n)
}

func main() {
	// Standalone Go WASM target requires a main function but it remains inactive.
}
