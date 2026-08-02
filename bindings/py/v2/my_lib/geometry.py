from ._generated.wit_world.exports.geometry import (
    Point as GenPoint,
    Rectangle as GenRectangle,
    Circle as GenCircle,
    Triangle as GenTriangle,
)

# ==============================================================================
# User-Facing Domain Classes (Subclassing Gen Classes to add rich methods)
# ==============================================================================
class Point(GenPoint):
    def distance_to(self, other: 'Point') -> float:
        """Calculates the Euclidean distance from this point to another point."""
        from . import geometry
        return geometry.distance(self, other)

class Rectangle(GenRectangle):
    def area(self) -> float:
        """Calculates the area of this rectangle."""
        from . import geometry
        return geometry.area_rectangle(self)

class Circle(GenCircle):
    def area(self) -> float:
        """Calculates the area of this circle."""
        from . import geometry
        return geometry.area_circle(self)

class Triangle(GenTriangle):
    def area(self) -> float:
        """Calculates the area of this triangle."""
        from . import geometry
        return geometry.area_triangle(self)

# ==============================================================================
# Procedural Loader Callers (Communicating directly with WASM)
# ==============================================================================
def distance(a: GenPoint, b: GenPoint) -> float:
    """Calculates the Euclidean distance between two points via WASM."""
    from ._generated import loader
    return loader.call("ouvrage:lab-wasi-demo/geometry", "distance", a, b)

def area_rectangle(r: GenRectangle) -> float:
    """Calculates the area of a rectangle via WASM."""
    from ._generated import loader
    return loader.call("ouvrage:lab-wasi-demo/geometry", "area-rectangle", r)

def area_circle(c: GenCircle) -> float:
    """Calculates the area of a circle via WASM."""
    from ._generated import loader
    return loader.call("ouvrage:lab-wasi-demo/geometry", "area-circle", c)

def area_triangle(t: GenTriangle) -> float:
    """Calculates the area of a triangle via WASM."""
    from ._generated import loader
    return loader.call("ouvrage:lab-wasi-demo/geometry", "area-triangle", t)
