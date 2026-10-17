import { createHash, randomBytes } from 'node:crypto';

/** Restricted canonical JSON profile. Only JSON values and safe integer numbers. */
export function canonical(value: unknown): string {
  if (value === null || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'string') {
    // Restrict to well-formed Unicode (no isolated surrogate code units).
    if (!value.isWellFormed()) throw new Error('INVALID_UNICODE');
    return JSON.stringify(value);
  }
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value) || Object.is(value, -0)) throw new Error('INVALID_NUMBER');
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    if (Object.keys(value).length !== value.length) throw new Error('SPARSE_ARRAY');
    return `[${value.map(canonical).join(',')}]`;
  }
  if (typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    const object = value as Record<string, unknown>;
    const keys = Object.keys(object).sort();
    if (keys.some(key => !/^[\x20-\x7e]+$/.test(key))) throw new Error('NON_ASCII_KEY');
    return `{${keys.map(key => `${JSON.stringify(key)}:${canonical(object[key])}`).join(',')}}`;
  }
  throw new Error('NON_JSON_VALUE');
}

export function hash(domain: string, value: unknown): string {
  return createHash('sha256').update(domain).update('\0').update(canonical(value), 'utf8').digest('hex');
}
export function randomHex(): string { return randomBytes(32).toString('hex'); }
