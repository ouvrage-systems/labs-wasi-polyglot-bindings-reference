package main

import (
	"fmt"

	"gitlab.com/ouvrage-systems/labs/wasi-polyglot-bindings-reference/pkg/geometry"
	"gitlab.com/ouvrage-systems/labs/wasi-polyglot-bindings-reference/pkg/store"
	"gitlab.com/ouvrage-systems/labs/wasi-polyglot-bindings-reference/pkg/text"
)

func main() {
	fmt.Println("Running Native Go CLI (WASI Polyglot Reference)...")
	
	// 1. Test Geometry calculations
	p1 := geometry.Point{X: 0, Y: 0}
	p2 := geometry.Point{X: 3, Y: 4}
	dist := geometry.Distance(p1, p2)
	
	// 2. Test In-Memory KV Store
	db := store.NewKVStore()
	db.Set("session_id", "xyz-789")
	val, ok := db.Get("session_id")
	
	// 3. Test Text operations
	greeting := text.FormatMessage("Developer")
	reversed := text.ReverseString("architecture")
	
	fmt.Println("\n--- Local Execution Output ---")
	fmt.Printf("Distance( (0,0), (3,4) ) = %.2f (expected 5.00)\n", dist)
	fmt.Printf("KV Store Get('session_id') = %s (ok=%t, expected xyz-789)\n", val, ok)
	
	db.Delete("session_id")
	_, okAfterDelete := db.Get("session_id")
	fmt.Printf("KV Store Get after Delete  = (ok=%t, expected false)\n", okAfterDelete)
	
	fmt.Printf("Format message = %s\n", greeting)
	fmt.Printf("Reverse str    = %s\n", reversed)
	fmt.Println("------------------------------")
}
