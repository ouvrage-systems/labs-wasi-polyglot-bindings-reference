import { call } from './_generated/loader.js';

export async function add(a, b) {
  return call('Add', a, b);
}
