/** @module Interface ouvrage:lab-wasi-demo/geometry **/
export function distance(a: Point, b: Point): number;
export function areaRectangle(r: Rectangle): number;
export function areaCircle(c: Circle): number;
export function areaTriangle(t: Triangle): number;
export interface Point {
  x: number,
  y: number,
}
export interface Rectangle {
  min: Point,
  max: Point,
}
export interface Circle {
  center: Point,
  radius: number,
}
export interface Triangle {
  a: Point,
  b: Point,
  c: Point,
}
