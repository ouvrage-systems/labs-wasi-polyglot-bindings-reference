package main

import (
	"encoding/json"
	"gitlab.com/ouvrage-systems/labs/wasi-polyglot-bindings-reference/pkg/geometry"
	"gitlab.com/ouvrage-systems/labs/wasi-polyglot-bindings-reference/tools/wasi1rpc"
)

// Register geometry handlers on the RPC router
func registerGeometry(r *wasi1rpc.Router) {
	r.Register("geometry.distance", func(params json.RawMessage) (any, error) {
		var args struct {
			A geometry.Point `json:"a"`
			B geometry.Point `json:"b"`
		}
		if err := json.Unmarshal(params, &args); err != nil {
			return nil, err
		}
		return geometry.Distance(args.A, args.B), nil
	})

	r.Register("geometry.area_rectangle", func(params json.RawMessage) (any, error) {
		var args struct {
			R geometry.Rectangle `json:"r"`
		}
		if err := json.Unmarshal(params, &args); err != nil {
			return nil, err
		}
		return geometry.AreaRectangle(args.R), nil
	})

	r.Register("geometry.area_circle", func(params json.RawMessage) (any, error) {
		var args struct {
			C geometry.Circle `json:"c"`
		}
		if err := json.Unmarshal(params, &args); err != nil {
			return nil, err
		}
		return geometry.AreaCircle(args.C), nil
	})

	r.Register("geometry.area_triangle", func(params json.RawMessage) (any, error) {
		var args struct {
			T geometry.Triangle `json:"t"`
		}
		if err := json.Unmarshal(params, &args); err != nil {
			return nil, err
		}
		return geometry.AreaTriangle(args.T), nil
	})
}
