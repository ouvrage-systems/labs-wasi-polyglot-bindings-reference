from dataclasses import dataclass, asdict
from ._generated import loader

@dataclass
class Point:
    x: float
    y: float

    def distance_to(self, other: 'Point') -> float:
        """Calculates the Euclidean distance from this point to another point."""
        from . import geometry
        return geometry.distance(self, other)

@dataclass
class Rectangle:
    min: Point
    max: Point

    def area(self) -> float:
        """Calculates the area of this rectangle."""
        from . import geometry
        return geometry.area_rectangle(self)

@dataclass
class Circle:
    center: Point
    radius: float

    def area(self) -> float:
        """Calculates the area of this circle."""
        from . import geometry
        return geometry.area_circle(self)

@dataclass
class Triangle:
    a: Point
    b: Point
    c: Point

    def area(self) -> float:
        """Calculates the area of this triangle."""
        from . import geometry
        return geometry.area_triangle(self)

# ==============================================================================
# Procedural Callers (JSON-RPC)
# ==============================================================================
def distance(a: Point, b: Point) -> float:
    """Calculates the Euclidean distance between two points via WASM JSON-RPC."""
    return loader.call("geometry.distance", {"a": asdict(a), "b": asdict(b)})

def area_rectangle(r: Rectangle) -> float:
    """Calculates the area of a rectangle via WASM JSON-RPC."""
    return loader.call("geometry.area_rectangle", {"r": asdict(r)})

def area_circle(c: Circle) -> float:
    """Calculates the area of a circle via WASM JSON-RPC."""
    return loader.call("geometry.area_circle", {"c": asdict(c)})

def area_triangle(t: Triangle) -> float:
    """Calculates the area of a triangle via WASM JSON-RPC."""
    return loader.call("geometry.area_triangle", {"t": asdict(t)})
