//go:build !noscheduler
// +build !noscheduler

package main

import (
	"gitlab.com/ouvrage-systems/labs/wasi-polyglot-bindings-reference/pkg/maths"
)

//export ConcurrentCountPrimes
func ConcurrentCountPrimes(limit int64, numWorkers int32) int64 {
	return maths.ConcurrentCountPrimes(limit, int(numWorkers))
}
