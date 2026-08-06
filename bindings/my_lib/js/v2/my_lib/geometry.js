import { geometry } from './_generated/my_lib_component.js';

export class Point {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  async distanceTo(other) {
    return geometry.distance(this, other);
  }
}

export class Rectangle {
  constructor(min, max) {
    this.min = min;
    this.max = max;
  }

  async area() {
    return geometry.areaRectangle(this);
  }
}

export class Circle {
  constructor(center, radius) {
    this.center = center;
    this.radius = radius;
  }

  async area() {
    return geometry.areaCircle(this);
  }
}

export class Triangle {
  constructor(a, b, c) {
    this.a = a;
    this.b = b;
    this.c = c;
  }

  async area() {
    return geometry.areaTriangle(this);
  }
}
