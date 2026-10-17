import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { summary } from "../../scripts/horizon-stats.mjs";

function close(actual, expected, tolerance = 1e-12) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} differs from ${expected}`);
}

// Independent small-n oracle: compute integer binomial coefficients directly,
// then powers. This does not reuse the implementation's mode recurrence.
function binomial(n, p) {
  return Array.from({ length: n + 1 }, (_, k) => {
    let choose = 1;
    for (let i = 1; i <= k; i += 1) choose = choose * (n - i + 1) / i;
    return choose * p ** k * (1 - p) ** (n - k);
  });
}

test("nearest-rank summaries preserve input and use actual sample ranks", () => {
  const samples = [20, 1, 3, 2, 5, 4, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];
  const before = [...samples];
  const result = summary(samples);
  assert.deepEqual(samples, before);
  assert.deepEqual(
    [result.n, result.min, result.max, result.mean, result.p50, result.p95, result.p99],
    [20, 1, 20, 10.5, 10, 19, 20],
  );
  assert.match(result.quantile_convention, /ceil/);
  assert.equal(result.confidence_assumptions.iid_verified, false);
});

test("median CI for n=5 is unbounded; n=6 gives ranks 1 and 6", () => {
  const small = summary([1, 2, 3, 4, 5]).confidence_intervals.p50;
  assert.deepEqual([small.lower, small.upper, small.lower_rank, small.upper_rank], [null, null, 0, 6]);
  assert.equal(small.insufficient_samples_for_two_finite_bounds, true);
  const enough = summary([1, 2, 3, 4, 5, 6]).confidence_intervals.p50;
  assert.deepEqual([enough.lower, enough.upper, enough.lower_rank, enough.upper_rank], [1, 6, 1, 6]);
  assert.equal(enough.finite_interval, true);
  // Each omitted tail is (1/2)^6; achieved coverage is 1 - 2/64.
  close(enough.coverage_lower_bound_if_iid, 31 / 32);
});

test("n=10 median ranks 2 and 9 follow exact binomial tails", () => {
  const interval = summary(Array.from({ length: 10 }, (_, i) => i + 1)).confidence_intervals.p50;
  assert.deepEqual([interval.lower_rank, interval.upper_rank], [2, 9]);
  // P(B<2)=(C(10,0)+C(10,1))/2^10=11/1024; widening L to 3 fails 2.5%.
  close(interval.omitted_binomial_tails.lower, 11 / 1024);
  close(interval.omitted_binomial_tails.upper, 11 / 1024);
  close(interval.coverage_lower_bound_if_iid, 1 - 22 / 1024);
});

test("n=20 p95 has no finite upper bound; JSON preserves explicit flags", () => {
  const result = summary(Array.from({ length: 20 }, (_, i) => i + 1));
  const interval = result.confidence_intervals.p95;
  assert.deepEqual([interval.lower_rank, interval.upper_rank, interval.lower, interval.upper], [17, 21, 17, null]);
  assert.equal(interval.upper_unbounded, true);
  assert.equal(interval.finite_interval, false);
  assert.equal(interval.coverage_lower_bound_if_iid >= 0.95, true);
  const roundTrip = JSON.parse(JSON.stringify(result));
  assert.equal(roundTrip.confidence_intervals.p95.upper_unbounded, true);
  assert.equal(roundTrip.confidence_intervals.p95.upper, null);
});

test("n=500 p99 uses effective ranks 490 and 500, not an invented tail", () => {
  const result = summary(Array.from({ length: 500 }, (_, i) => i + 1));
  const interval = result.confidence_intervals.p99;
  assert.equal(result.p99, 495);
  assert.deepEqual([interval.lower_rank, interval.upper_rank, interval.lower, interval.upper], [490, 500, 490, 500]);
  assert.equal(interval.finite_interval, true);
  close(interval.omitted_binomial_tails.upper, 0.99 ** 500);
  // Including rank 499 in the right tail exceeds 2.5%.
  assert.ok(0.99 ** 500 + 500 * 0.01 * 0.99 ** 499 > 0.025);
});

test("ranks have <=2.5% tail loss and are maximally tight for each tail", () => {
  for (let n = 1; n <= 30; n += 1) {
    const result = summary(Array.from({ length: n }, (_, i) => i));
    for (const interval of Object.values(result.confidence_intervals)) {
      const probabilities = binomial(n, interval.probability);
      const sum = (from, to) => probabilities.slice(from, to).reduce((a, b) => a + b, 0);
      const left = sum(0, interval.lower_rank);
      const right = sum(interval.upper_rank, n + 1);
      assert.ok(left <= 0.025 + 1e-14);
      assert.ok(right <= 0.025 + 1e-14);
      if (interval.lower_rank < n) assert.ok(sum(0, interval.lower_rank + 1) > 0.025);
      if (interval.upper_rank > 0) assert.ok(sum(interval.upper_rank - 1, n + 1) > 0.025);
      close(interval.coverage_lower_bound_if_iid, 1 - left - right);
    }
  }
});

test("duplicate values do not justify finite endpoints at insufficient N", () => {
  const result = summary(Array(3).fill(7));
  assert.equal(result.mean, 7);
  assert.equal(result.p99, 7);
  assert.equal(result.confidence_intervals.p99.upper, null);
  assert.equal(result.confidence_intervals.p99.upper_unbounded, true);
  assert.match(result.confidence_assumptions.ties, /conservative/);
});

test("singleton and signed values retain units without declaring a nonnegative support", () => {
  const one = summary([-5]);
  assert.deepEqual([one.min, one.max, one.mean, one.p50, one.p95, one.p99], [-5, -5, -5, -5, -5, -5]);
  // At n=1, P(X_1 > q_0.99)=0.01 fits the 2.5% lower-tail cap:
  // a finite lower endpoint is valid although no finite upper endpoint is.
  assert.equal(one.confidence_intervals.p99.lower, -5);
  assert.equal(one.confidence_intervals.p99.lower_rank, 1);
  assert.equal(one.confidence_intervals.p99.upper, null);
  assert.equal(summary([-5, 0, 5]).mean, 0);
  assert.equal(Object.is(summary([-0, 0]).min, -0), false);
});

test("finite extreme samples do not overflow the mean", () => {
  assert.equal(summary([Number.MAX_VALUE, Number.MAX_VALUE]).mean, Number.MAX_VALUE);
  assert.equal(summary([-Number.MAX_VALUE, Number.MAX_VALUE]).mean, 0);
  assert.equal(summary([0, 0, 0]).mean, 0);
});

test("invalid and empty input is rejected, never silently filtered", () => {
  for (const input of [null, {}, "123", new Float64Array([1])]) {
    assert.throws(() => summary(input), TypeError);
  }
  assert.throws(() => summary([]), RangeError);
  for (const input of [[NaN], [Infinity], [-Infinity], [1, "2"], [undefined], Array(2)]) {
    assert.throws(() => summary(input), TypeError);
  }
});

test("CLI reads raw samples and exits nonzero on invalid observations", async () => {
  const dir = await mkdtemp(join(tmpdir(), "horizon-stats-test-"));
  const cli = fileURLToPath(new URL("../../scripts/horizon-stats.mjs", import.meta.url));
  try {
    const valid = join(dir, "valid.json");
    await writeFile(valid, JSON.stringify({ samples: [3, 1, 2] }));
    const completed = spawnSync(process.execPath, [cli, valid], { encoding: "utf8" });
    assert.equal(completed.status, 0, completed.stderr);
    assert.equal(JSON.parse(completed.stdout).p50, 2);
    const invalid = join(dir, "invalid.json");
    await writeFile(invalid, '{"samples":[1,null]}');
    const rejected = spawnSync(process.execPath, [cli, invalid], { encoding: "utf8" });
    assert.equal(rejected.status, 1);
    assert.equal(rejected.stdout, "");
    assert.match(rejected.stderr, /finite number/);
  } finally {
    // Resolve and check the exact task-owned path before recursive removal.
    assert.equal(dirname(resolve(dir)), resolve(tmpdir()));
    assert.match(basename(dir), /^horizon-stats-test-/);
    await rm(dir, { recursive: true });
  }
});
