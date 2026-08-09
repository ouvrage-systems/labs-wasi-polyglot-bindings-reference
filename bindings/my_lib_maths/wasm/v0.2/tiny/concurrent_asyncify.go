//go:build !noscheduler
package main

import (
	"gitlab.com/ouvrage-systems/labs/wasi-polyglot-bindings-reference/pkg/maths"
)

func (mathsImpl) ConcurrentCountPrimes(limit int64, workers int32) int64 {
	return maths.ConcurrentCountPrimes(limit, int(workers))
}
