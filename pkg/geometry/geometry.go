package geometry

import (
	"math"
)

type Point struct {
	X float64
	Y float64
}

type Rectangle struct {
	Min Point
	Max Point
}

type Circle struct {
	Center Point
	Radius float64
}

type Triangle struct {
	A Point
	B Point
	C Point
}

// Distance calculates the Euclidean distance between two points.
func Distance(a, b Point) float64 {
	return math.Sqrt(math.Pow(b.X-a.X, 2) + math.Pow(b.Y-a.Y, 2))
}

// AreaRectangle calculates the area of a rectangle.
func AreaRectangle(r Rectangle) float64 {
	width := math.Abs(r.Max.X - r.Min.X)
	height := math.Abs(r.Max.Y - r.Min.Y)
	return width * height
}

// AreaCircle calculates the area of a circle.
func AreaCircle(c Circle) float64 {
	return math.Pi * math.Pow(c.Radius, 2)
}

// AreaTriangle calculates the area of a triangle using the coordinate geometry formula.
func AreaTriangle(t Triangle) float64 {
	return 0.5 * math.Abs(t.A.X*(t.B.Y-t.C.Y)+t.B.X*(t.C.Y-t.A.Y)+t.C.X*(t.A.Y-t.B.Y))
}
