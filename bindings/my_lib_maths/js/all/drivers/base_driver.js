// Abstract class for all drivers defining standard metrics forwarding and result normalizations
export class BaseDriver {
  constructor(name, id) {
    this.name = name;
    this.id = id;
  }

  // Cast BigInts back to standard JS Numbers for user metrics visualization
  normalizeResult(val) {
    if (typeof val === 'bigint') {
      return Number(val);
    }
    return val;
  }

  // Metrics fallbacks overridden by sub-drivers
  getByteSize() { return 0; }
  getFetchDuration() { return 0; }
  getCompileDuration() { return 0; }
}
