const loader = require('./_generated/loader');

class Point {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  async distanceTo(other) {
    return loader.call("geometry.distance", { a: this, b: other });
  }
}

class Rectangle {
  constructor(min, max) {
    this.min = min;
    this.max = max;
  }

  async area() {
    return loader.call("geometry.area_rectangle", { r: this });
  }
}

class Circle {
  constructor(center, radius) {
    this.center = center;
    this.radius = radius;
  }

  async area() {
    return loader.call("geometry.area_circle", { c: this });
  }
}

class Triangle {
  constructor(a, b, c) {
    this.a = a;
    this.b = b;
    this.c = c;
  }

  async area() {
    return loader.call("geometry.area_triangle", { t: this });
  }
}

module.exports = { Point, Rectangle, Circle, Triangle };
