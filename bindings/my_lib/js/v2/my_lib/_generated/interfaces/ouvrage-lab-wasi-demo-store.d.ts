/** @module Interface ouvrage:lab-wasi-demo/store **/

export class KvStore implements Disposable {
  constructor()
  set(key: string, value: string): void;
  get(key: string): string | undefined;
  'delete'(key: string): boolean;
  [Symbol.dispose](): void;
}
