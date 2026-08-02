// Import directly from the local NPM package!
import { geometry, KVStore, lang } from 'my-lib-v2';

async function run() {
  try {
    // 1. Call geometry OOP math
    const p1 = new geometry.Point(0, 0);
    const p2 = new geometry.Point(3, 4);
    const dist = await p1.distanceTo(p2);

    const rect = new geometry.Rectangle(p1, new geometry.Point(5, 4));
    const area = await rect.area();

    // 2. Stateful KVStore persisted in WASM heap
    const db = new KVStore();
    await db.set("developer", "gpineda-vite");
    const user = await db.get("developer");

    // 3. String functions
    const msg = await lang.formatMessage(user);

    document.getElementById('output').innerHTML = `
        <ul class="result-list">
            <li><strong>p1.distanceTo(p2) :</strong> ${dist} (expected: 5)</li>
            <li><strong>rect.area() :</strong> ${area} (expected: 20)</li>
            <li><strong>KVStore.get('developer') :</strong> ${user}</li>
            <li><strong>lang.formatMessage(...) :</strong> ${msg}</li>
        </ul>
    `;
  } catch (err) {
    document.getElementById('output').innerHTML = `<span style="color: red;">Error: ${err.message}</span>`;
    console.error(err);
  }
}

run();
