//go:build noscheduler
package main

func (mathsImpl) ConcurrentCountPrimes(limit int64, workers int32) int64 {
	return -1
}
