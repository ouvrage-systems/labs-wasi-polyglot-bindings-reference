//go:build noscheduler
// +build noscheduler

package main

//export ConcurrentCountPrimes
func ConcurrentCountPrimes(limit int64, numWorkers int32) int64 {
	return -1
}
