from my_lib.geometry import Point, Rectangle, Circle, Triangle
from my_lib.store import KVStore
from my_lib import lang
from my_lib import network
import os

def test_geometry_distance():
    p1 = Point(x=0.0, y=0.0)
    p2 = Point(x=3.0, y=4.0)
    assert p1.distance_to(p2) == 5.0

def test_geometry_area_rectangle():
    rect = Rectangle(
        min=Point(x=1.0, y=1.0),
        max=Point(x=5.0, y=4.0)
    )
    assert rect.area() == 12.0

def test_geometry_area_circle():
    circle = Circle(center=Point(x=0.0, y=0.0), radius=2.5)
    assert round(circle.area(), 2) == 19.63

def test_geometry_area_triangle():
    tri = Triangle(
        a=Point(x=0.0, y=0.0),
        b=Point(x=4.0, y=0.0),
        c=Point(x=0.0, y=3.0)
    )
    assert tri.area() == 6.0

def test_kv_store():
    db = KVStore()
    db.set("token", "xyz-789")
    assert db.get("token") == "xyz-789"
    assert db.get("missing_key") is None
    
    assert db.delete("token") is True
    assert db.get("token") is None
    assert db.delete("token") is False

def test_lang_format():
    assert lang.format_message("gpineda") == "Hello, gpineda from our generic WASM library!"

def test_lang_reverse():
    assert lang.reverse_string("ouvrage") == "egarvuo"

def test_network_fetch_and_format():
    test_file = os.path.abspath(__file__)
    file_url = f"file://{test_file}"
    result = network.fetch_and_format(file_url)
    assert result.startswith("Go WASM Component formatted: ")
    assert "test_network_fetch_and_format" in result
