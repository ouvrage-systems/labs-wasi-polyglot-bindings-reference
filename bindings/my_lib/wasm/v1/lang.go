package main

import (
	"encoding/json"
	"gitlab.com/ouvrage-systems/labs/wasi-polyglot-bindings-reference/pkg/text"
	"gitlab.com/ouvrage-systems/labs/wasi-polyglot-bindings-reference/tools/wasi1rpc"
)

// Register lang handlers on the RPC router
func registerLang(r *wasi1rpc.Router) {
	r.Register("lang.format", func(params json.RawMessage) (any, error) {
		var args struct {
			Name string `json:"name"`
		}
		if err := json.Unmarshal(params, &args); err != nil {
			return nil, err
		}
		return text.FormatMessage(args.Name), nil
	})

	r.Register("lang.reverse", func(params json.RawMessage) (any, error) {
		var args struct {
			S string `json:"s"`
		}
		if err := json.Unmarshal(params, &args); err != nil {
			return nil, err
		}
		return text.ReverseString(args.S), nil
	})
}
