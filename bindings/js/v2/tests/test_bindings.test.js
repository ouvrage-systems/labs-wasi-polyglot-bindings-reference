import assert from 'assert';
import test from 'node:test';
import path from 'path';
import { fileURLToPath } from 'url';
import { geometry, KVStore, lang, network } from '../my_lib/index.js';

test('geometry.distance', async () => {
  const p1 = new geometry.Point(0, 0);
  const p2 = new geometry.Point(3, 4);
  const dist = await p1.distanceTo(p2);
  assert.strictEqual(dist, 5);
});

test('geometry.area_rectangle', async () => {
  const rect = new geometry.Rectangle(
    new geometry.Point(1, 1),
    new geometry.Point(5, 4)
  );
  const area = await rect.area();
  assert.strictEqual(area, 12);
});

test('geometry.area_circle', async () => {
  const circle = new geometry.Circle(new geometry.Point(0, 0), 2.5);
  const area = await circle.area();
  assert.strictEqual(Math.round(area * 100) / 100, 19.63);
});

test('geometry.area_triangle', async () => {
  const tri = new geometry.Triangle(
    new geometry.Point(0, 0),
    new geometry.Point(4, 0),
    new geometry.Point(0, 3)
  );
  const area = await tri.area();
  assert.strictEqual(area, 6);
});

test('kv_store', async () => {
  const db = new KVStore();
  await db.set("token", "xyz-789");
  assert.strictEqual(await db.get("token"), "xyz-789");
  assert.strictEqual(await db.get("missing_key"), undefined);
  
  assert.strictEqual(await db.delete("token"), true);
  assert.strictEqual(await db.get("token"), undefined);
  assert.strictEqual(await db.delete("token"), false);
});

test('lang.formatMessage', async () => {
  const msg = await lang.formatMessage("gpineda");
  assert.strictEqual(msg, "Hello, gpineda from our generic WASM library!");
});

test('lang.reverseString', async () => {
  const rev = await lang.reverseString("ouvrage");
  assert.strictEqual(rev, "egarvuo");
});

test('network.fetchAndFormat', async () => {
  const __filename = fileURLToPath(import.meta.url);
  const fileUrl = `file://${__filename}`;
  const result = await network.fetchAndFormat(fileUrl);
  assert.ok(result.startsWith("Go WASM Component formatted: "));
  assert.ok(result.includes("network.fetchAndFormat"));
});
