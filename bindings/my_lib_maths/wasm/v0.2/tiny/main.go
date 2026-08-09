//go:build tinygo
package main

import (
	"gitlab.com/ouvrage-systems/labs/wasi-polyglot-bindings-reference/bindings/my_lib_maths/wasm/v0.2/tiny/gen"
	"gitlab.com/ouvrage-systems/labs/wasi-polyglot-bindings-reference/pkg/maths"
)

type mathsImpl struct{}

func (mathsImpl) Add(a int64, b int64) int64 {
	return maths.Add(a, b)
}

func (mathsImpl) ComputeSequence(u0 int64, b int64, n int64) int64 {
	return maths.ComputeSequence(u0, b, n)
}

func (mathsImpl) IsPrime(n int64) bool {
	return maths.IsPrime(n)
}

func (mathsImpl) CountPrimes(limit int64, start int64) int64 {
	return maths.CountPrimes(limit, start)
}

func (mathsImpl) FindLastPrime(limit int64) int64 {
	return maths.FindLastPrime(limit)
}

func (mathsImpl) Fibonacci(n int64) int64 {
	return maths.Fibonacci(n)
}

func (mathsImpl) FibonacciRecursive(n int64) int64 {
	return maths.FibonacciRecursive(n)
}

func init() {
	wasi_maths_reference.SetWasiMathsReference(mathsImpl{})
}

func main() {
	// Dummy main function required by TinyGo compiler
}
