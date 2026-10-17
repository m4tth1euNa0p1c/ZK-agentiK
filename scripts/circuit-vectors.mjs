/** Public synthetic test data. Deterministic values; never cryptographic randomness. */
import { createHash } from 'node:crypto';

export const RANGE = 1n << 32n;
export const U64_MAX = (1n << 64n) - 1n;
export const CAMPAIGN_SIZES = Object.freeze([128, 1024, 4096]);

export function parseU64(value) {
  if (typeof value !== 'string' || !/^(0|[1-9][0-9]{0,19})$/.test(value)) throw new Error('Noncanonical u64');
  const number = BigInt(value);
  if (number > U64_MAX) throw new Error('u64 overflow');
  return number;
}

export function relation(amount, cap) {
  const a = parseU64(amount); const c = parseU64(cap);
  // Deliberately use the equivalent interval formulation, not the prover's guards.
  return 1n <= a && a <= RANGE && a <= c && c <= a + RANGE - 1n;
}

export function validateVectors(vectors) {
  if (!Array.isArray(vectors) || vectors.length < 1 || vectors.length > 10000) throw new Error('Vector count');
  const ids = new Set();
  for (const row of vectors) {
    if (!row || Object.keys(row).sort().join(',') !== 'amount,cap,category,id'
      || typeof row.id !== 'string' || !/^[a-z0-9-]{1,64}$/.test(row.id)
      || typeof row.category !== 'string' || !/^[a-z0-9-]{1,64}$/.test(row.category)
      || ids.has(row.id)) throw new Error('Vector schema or duplicate id');
    ids.add(row.id); parseU64(row.amount); parseU64(row.cap);
  }
  return vectors;
}

export function generateVectors(count) {
  if (!CAMPAIGN_SIZES.includes(count)) throw new Error('Reviewed sizes: 128, 1024, 4096');
  const n = RANGE; const max = U64_MAX;
  const boundaries = [
    [0n, 0n], [0n, 1n], [1n, 0n], [1n, 1n], [1n, n], [1n, n + 1n],
    [n - 1n, n - 1n], [n - 1n, 2n * n - 2n], [n - 1n, 2n * n - 1n],
    [n, n - 1n], [n, n], [n, 2n * n - 1n], [n, 2n * n],
    [n + 1n, n + 1n], [max, max], [max, 0n], [1n, max], [n, max],
    [(1n << 53n) - 1n, (1n << 53n) - 1n], [1n << 53n, 1n << 53n],
    [(1n << 53n) + 1n, (1n << 53n) + 1n], [max - 1n, max],
    [125000n, 250000n], [7250000n, 9999999n], [n / 2n, n / 2n], [n / 2n, n + n / 2n - 1n],
    [2n, 1n], [2n, n + 1n], [2n, n + 2n], [n - 1n, n - 2n], [n, 0n], [max, 1n],
  ];
  const vectors = boundaries.map(([amount, cap], index) => ({ id: `boundary-${String(index).padStart(3, '0')}`,
    category: 'integer-boundary', amount: String(amount), cap: String(cap) }));
  for (let i = vectors.length; i < count; i++) {
    const digest = createHash('sha256').update(`horizon-circuit-vectors/v1/${i}`).digest();
    const a = BigInt(digest.readUInt32BE(0)) + 1n;
    const d = BigInt(digest.readUInt32BE(4));
    let amount = a; let cap = a + d; let category = 'in-range';
    if (i % 2 === 1) {
      switch (Math.floor(i / 2) % 5) {
        case 0: amount = 0n; cap = d; category = 'zero-amount'; break;
        case 1: amount = n + a; cap = amount + d; category = 'amount-overflow'; break;
        case 2: cap = a - 1n; category = 'cap-below-amount'; break;
        case 3: cap = a + n + d; category = 'difference-overflow'; break;
        case 4: amount = max - d; cap = max; category = 'u64-extreme'; break;
      }
    }
    vectors.push({ id: `sample-${String(i).padStart(5, '0')}`, category, amount: String(amount), cap: String(cap) });
  }
  return validateVectors(vectors);
}
