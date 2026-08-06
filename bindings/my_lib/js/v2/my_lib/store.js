import { store } from './_generated/my_lib_component.js';

export class KVStore {
  constructor() {
    this._impl = new store.KvStore();
  }

  async set(key, value) {
    this._impl.set(key, value);
  }

  async get(key) {
    return this._impl.get(key);
  }

  async delete(key) {
    return this._impl.delete(key);
  }
}
