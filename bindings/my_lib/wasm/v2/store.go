//go:build tinygo
package main

import (
	"gitlab.com/ouvrage-systems/labs/wasi-polyglot-bindings-reference/bindings/my_lib/wasm/gen"
	"gitlab.com/ouvrage-systems/labs/wasi-polyglot-bindings-reference/pkg/store"
)

// Wrapper for the stateful store.KVStore resource
type myKvStore struct {
	impl *store.KVStore
}

func (s *myKvStore) MethodKvStoreSet(key, value string) {
	s.impl.Set(key, value)
}

func (s *myKvStore) MethodKvStoreGet(key string) wasi_polyglot_reference.Option[string] {
	val, ok := s.impl.Get(key)
	if !ok {
		return wasi_polyglot_reference.None[string]()
	}
	return wasi_polyglot_reference.Some[string](val)
}

func (s *myKvStore) MethodKvStoreDelete(key string) bool {
	return s.impl.Delete(key)
}

// Implement exported store interface
type storeImpl struct{}

func (s storeImpl) ConstructorKvStore() wasi_polyglot_reference.ExportsOuvrageLabWasiDemoStoreKvStore {
	return &myKvStore{impl: store.NewKVStore()}
}
