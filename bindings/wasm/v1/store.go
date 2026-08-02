package main

import (
	"encoding/json"
	"gitlab.com/ouvrage-systems/labs/wasi-polyglot-bindings-reference/tools/wasi1rpc"
)

// Volatile in-memory store for subprocess session
var globalStore = make(map[string]string)

// Register store handlers on the RPC router
func registerStore(r *wasi1rpc.Router) {
	r.Register("store.set", func(params json.RawMessage) (any, error) {
		var args struct {
			Key   string `json:"key"`
			Value string `json:"value"`
		}
		if err := json.Unmarshal(params, &args); err != nil {
			return nil, err
		}
		globalStore[args.Key] = args.Value
		return nil, nil
	})

	r.Register("store.get", func(params json.RawMessage) (any, error) {
		var args struct {
			Key string `json:"key"`
		}
		if err := json.Unmarshal(params, &args); err != nil {
			return nil, err
		}
		val, ok := globalStore[args.Key]
		if !ok {
			return nil, nil // Marshal to null in JSON
		}
		return val, nil
	})

	r.Register("store.delete", func(params json.RawMessage) (any, error) {
		var args struct {
			Key string `json:"key"`
		}
		if err := json.Unmarshal(params, &args); err != nil {
			return nil, err
		}
		_, ok := globalStore[args.Key]
		if ok {
			delete(globalStore, args.Key)
			return true, nil
		}
		return false, nil
	})
}
