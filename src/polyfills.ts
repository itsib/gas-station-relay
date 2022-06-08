import 'reflect-metadata';

/**
 * Define polyfill for Array.at method
 */
if (!Array.prototype.at) {
  Array.prototype.at = function<T>(index: number): T | undefined {
    index = Math.trunc(index) || 0;
    if (index < 0) {
      index += this.length;
    }
    if (index < 0 || index >= this.length) {
      return undefined;
    }
    return this[index];
  };
}
