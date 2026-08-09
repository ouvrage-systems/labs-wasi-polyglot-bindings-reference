package maths

// Add adds two 64-bit integers.
func Add(a, b int64) int64 {
	return a + b
}

// ComputeSequence computes an arithmetic sequence Un = U0 + n * b using 64-bit integers.
// Demonstrates LLVM scalar loop vectorization / constant reduction.
func ComputeSequence(u0, b, n int64) int64 {
	curr := u0
	for i := int64(0); i < n; i++ {
		curr = Add(curr, b)
	}
	return curr
}

// IsPrime tests if a 64-bit integer is prime using trial division.
func IsPrime(n int64) bool {
	if n <= 1 {
		return false
	}
	if n <= 3 {
		return true
	}
	if n%2 == 0 || n%3 == 0 {
		return false
	}
	for i := int64(5); i*i <= n; i += 6 {
		if n%i == 0 || n%(i+2) == 0 {
			return false
		}
	}
	return true
}

// CountPrimes counts prime numbers up to limit starting from start.
// Demonstrates CPU-intensive raw WASM execution speed.
func CountPrimes(limit int64, start int64) int64 {
	if start < 2 {
		start = 2
	}
	count := int64(0)
	for i := start; i <= limit; i++ {
		if IsPrime(i) {
			count++
		}
	}
	return count
}

// ConcurrentCountPrimes counts prime numbers up to limit using goroutines and channels.
func ConcurrentCountPrimes(limit int64, numWorkers int) int64 {
	if limit < 2 {
		return 0
	}
	if numWorkers <= 1 {
		return CountPrimes(limit, 2)
	}

	results := make(chan int64, numWorkers)
	chunkSize := (limit - 1) / int64(numWorkers)

	for w := 0; w < numWorkers; w++ {
		start := int64(2) + int64(w)*chunkSize
		end := start + chunkSize - 1
		if w == numWorkers-1 {
			end = limit
		}

		go func(s, e int64) {
			var count int64
			for i := s; i <= e; i++ {
				if IsPrime(i) {
					count++
				}
			}
			results <- count
		}(start, end)
	}

	var total int64
	for w := 0; w < numWorkers; w++ {
		total += <-results
	}
	return total
}

// FindLastPrime iterates up to limit and returns the largest prime number found <= limit.
func FindLastPrime(limit int64) int64 {
	last := int64(0)
	for i := int64(2); i <= limit; i++ {
		if IsPrime(i) {
			last = i
		}
	}
	return last
}

// Fibonacci computes the n-th Fibonacci number iteratively.
func Fibonacci(n int64) int64 {
	if n <= 0 {
		return 0
	}
	if n == 1 {
		return 1
	}
	a, b := int64(0), int64(1)
	for i := int64(2); i <= n; i++ {
		a, b = b, a+b
	}
	return b
}

// FibonacciRecursive computes the n-th Fibonacci number recursively (CPU stack frame intensive).
func FibonacciRecursive(n int64) int64 {
	if n <= 0 {
		return 0
	}
	if n == 1 {
		return 1
	}
	return FibonacciRecursive(n-1) + FibonacciRecursive(n-2)
}
