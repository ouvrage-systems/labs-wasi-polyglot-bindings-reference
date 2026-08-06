//go:build tinygo
package main

import (
	"gitlab.com/ouvrage-systems/labs/wasi-polyglot-bindings-reference/bindings/my_lib/wasm/gen"
	"gitlab.com/ouvrage-systems/labs/wasi-polyglot-bindings-reference/pkg/geometry"
)

// Helper conversion functions for WIT types to pkg/geometry types
func toPoint(p wasi_polyglot_reference.ExportsOuvrageLabWasiDemoGeometryPoint) geometry.Point {
	return geometry.Point{X: p.X, Y: p.Y}
}

func toRectangle(r wasi_polyglot_reference.ExportsOuvrageLabWasiDemoGeometryRectangle) geometry.Rectangle {
	return geometry.Rectangle{
		Min: toPoint(r.Min),
		Max: toPoint(r.Max),
	}
}

func toCircle(c wasi_polyglot_reference.ExportsOuvrageLabWasiDemoGeometryCircle) geometry.Circle {
	return geometry.Circle{
		Center: toPoint(c.Center),
		Radius: c.Radius,
	}
}

func toTriangle(t wasi_polyglot_reference.ExportsOuvrageLabWasiDemoGeometryTriangle) geometry.Triangle {
	return geometry.Triangle{
		A: toPoint(t.A),
		B: toPoint(t.B),
		C: toPoint(t.C),
	}
}

// Implement exported geometry interface
type geometryImpl struct{}

func (g geometryImpl) Distance(a, b wasi_polyglot_reference.ExportsOuvrageLabWasiDemoGeometryPoint) float64 {
	return geometry.Distance(toPoint(a), toPoint(b))
}

func (g geometryImpl) AreaRectangle(r wasi_polyglot_reference.ExportsOuvrageLabWasiDemoGeometryRectangle) float64 {
	return geometry.AreaRectangle(toRectangle(r))
}

func (g geometryImpl) AreaCircle(c wasi_polyglot_reference.ExportsOuvrageLabWasiDemoGeometryCircle) float64 {
	return geometry.AreaCircle(toCircle(c))
}

func (g geometryImpl) AreaTriangle(t wasi_polyglot_reference.ExportsOuvrageLabWasiDemoGeometryTriangle) float64 {
	return geometry.AreaTriangle(toTriangle(t))
}
