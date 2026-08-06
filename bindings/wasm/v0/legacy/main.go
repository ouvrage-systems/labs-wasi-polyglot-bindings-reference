package main

import (
	"syscall/js"

	"gitlab.com/ouvrage-systems/labs/wasi-polyglot-bindings-reference/pkg/maths"
)

func add(this js.Value, args []js.Value) any {
	a := int64(args[0].Int())
	b := int64(args[1].Int())
	return maths.Add(a, b)
}

func computeSequence(this js.Value, args []js.Value) any {
	u0 := int64(args[0].Int())
	b := int64(args[1].Int())
	n := int64(args[2].Int())
	return maths.ComputeSequence(u0, b, n)
}

func isPrime(this js.Value, args []js.Value) any {
	n := int64(args[0].Int())
	return maths.IsPrime(n)
}

func countPrimes(this js.Value, args []js.Value) any {
	limit := int64(args[0].Int())
	return maths.CountPrimes(limit)
}

func concurrentCountPrimes(this js.Value, args []js.Value) any {
	limit := int64(args[0].Int())
	workers := args[1].Int()
	return maths.ConcurrentCountPrimes(limit, workers)
}

func findLastPrime(this js.Value, args []js.Value) any {
	limit := int64(args[0].Int())
	return maths.FindLastPrime(limit)
}

func fibonacci(this js.Value, args []js.Value) any {
	n := int64(args[0].Int())
	return maths.Fibonacci(n)
}

func fibonacciRecursive(this js.Value, args []js.Value) any {
	n := int64(args[0].Int())
	return maths.FibonacciRecursive(n)
}

func main() {
	// Register Go functions in global JS scope
	js.Global().Set("goAdd", js.FuncOf(add))
	js.Global().Set("goComputeSequence", js.FuncOf(computeSequence))
	js.Global().Set("goIsPrime", js.FuncOf(isPrime))
	js.Global().Set("goCountPrimes", js.FuncOf(countPrimes))
	js.Global().Set("goConcurrentCountPrimes", js.FuncOf(concurrentCountPrimes))
	js.Global().Set("goFindLastPrime", js.FuncOf(findLastPrime))
	js.Global().Set("goFibonacci", js.FuncOf(fibonacci))
	js.Global().Set("goFibonacciRecursive", js.FuncOf(fibonacciRecursive))

	// Keep main Go goroutine and scheduler active
	select {}
}
