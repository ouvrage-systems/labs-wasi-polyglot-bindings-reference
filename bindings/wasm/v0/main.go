package main

//export Add
func Add(a, b int32) int32 {
	return a + b
}

func main() {
	// Standalone Go WASM target requires a main function but it remains inactive.
}
