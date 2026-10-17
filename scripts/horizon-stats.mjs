import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const QUANTILES = Object.freeze({ p50: 0.5, p95: 0.95, p99: 0.99 });
const CONFIDENCE_LEVEL = 0.95;
const TAIL_LIMIT = (1 - CONFIDENCE_LEVEL) / 2;

/** Compensated summation, used only for bounded finite operands. */
function compensatedSum(values) {
  let total = 0;
  let correction = 0;
  for (const value of values) {
    const adjusted = value - correction;
    const next = total + adjusted;
    correction = next - total - adjusted;
    total = next;
  }
  return total;
}

/**
 * Binomial(n, p) probabilities without factorials, overflow, or subtraction
 * of a CDF from 1 in a small tail. Start at a mode and recurse outwards;
 * relative weights are <= 1, then normalize their compensated sum.
 * These are double-precision numerical probabilities, not certified bounds.
 */
function binomialProbabilities(n, p) {
  const weights = new Float64Array(n + 1);
  const mode = Math.min(n, Math.floor((n + 1) * p));
  weights[mode] = 1;
  for (let k = mode; k > 0; k -= 1) {
    weights[k - 1] = weights[k] * (k / (n - k + 1)) * ((1 - p) / p);
  }
  for (let k = mode; k < n; k += 1) {
    weights[k + 1] = weights[k] * ((n - k) / (k + 1)) * (p / (1 - p));
  }
  const total = compensatedSum(weights);
  for (let k = 0; k <= n; k += 1) weights[k] /= total;
  return weights;
}

/**
 * Distribution-free order-statistic interval, conditional on IID sampling.
 * Let q_p = inf{x : F(x) >= p}, B ~ Binomial(n,p), X_(0)=-Infinity,
 * X_(n+1)=+Infinity. Choose largest L with P(B<L)<=alpha/2 and smallest U
 * with P(B>=U)<=alpha/2. Then [X_(L), X_(U)] covers q_p with probability
 * at least 1-alpha. For continuous distributions, the omitted tails are
 * exact binomial probabilities; for atoms/ties the interval is conservative.
 * Neither IID nor population representativeness can be established here.
 */
function quantileInterval(sorted, p) {
  const n = sorted.length;
  const probabilities = binomialProbabilities(n, p);
  let lowerRank = 0;
  let upperRank = n + 1;
  let lowerTail = 0;
  let upperTail = 0;
  for (let k = 0; k <= n; k += 1) {
    const next = lowerTail + probabilities[k];
    if (next > TAIL_LIMIT) break;
    lowerTail = next;
    lowerRank = k + 1;
  }
  for (let k = n; k >= 0; k -= 1) {
    const next = upperTail + probabilities[k];
    if (next > TAIL_LIMIT) break;
    upperTail = next;
    upperRank = k;
  }
  const lowerUnbounded = lowerRank === 0;
  const upperUnbounded = upperRank === n + 1;
  return {
    probability: p,
    confidence_level: CONFIDENCE_LEVEL,
    lower: lowerUnbounded ? null : sorted[lowerRank - 1],
    upper: upperUnbounded ? null : sorted[upperRank - 1],
    lower_rank: lowerRank,
    upper_rank: upperRank,
    lower_unbounded: lowerUnbounded,
    upper_unbounded: upperUnbounded,
    finite_interval: !lowerUnbounded && !upperUnbounded,
    insufficient_samples_for_two_finite_bounds: lowerUnbounded || upperUnbounded,
    omitted_binomial_tails: { lower: lowerTail, upper: upperTail },
    coverage_lower_bound_if_iid: 1 - lowerTail - upperTail,
  };
}

/**
 * Summarize a non-empty array of finite numbers, without mutating it.
 * Units are inherited unchanged from samples. No outliers are removed.
 * p50/p95/p99 use nearest rank, X_(ceil(p*n)); p50 is not the interpolated
 * even-N median. Non-finite CI endpoints are explicit null + flags in JSON.
 * Confidence statements REQUIRE IID samples; these metadata do not assert
 * that benchmark observations meet this assumption or describe a service.
 *
 * @param {number[]} samples
 */
export function summary(samples) {
  if (!Array.isArray(samples)) throw new TypeError("samples must be an array");
  if (samples.length === 0) throw new RangeError("samples must not be empty");
  for (const sample of samples) {
    if (typeof sample !== "number" || !Number.isFinite(sample)) {
      throw new TypeError("every sample must be a finite number");
    }
  }
  const sorted = samples.map((sample) => (Object.is(sample, -0) ? 0 : sample));
  sorted.sort((a, b) => a - b);
  const n = sorted.length;
  const min = sorted[0];
  const max = sorted[n - 1];
  const scale = Math.max(Math.abs(min), Math.abs(max));
  // Scaling prevents overflow of a sum of individually finite measurements.
  const mean = scale === 0 ? 0 :
    (compensatedSum(sorted.map((value) => value / scale)) / n) * scale;
  const quantiles = {};
  const intervals = {};
  for (const [name, p] of Object.entries(QUANTILES)) {
    quantiles[name] = sorted[Math.ceil(p * n) - 1];
    intervals[name] = quantileInterval(sorted, p);
  }
  return {
    n,
    min,
    max,
    mean,
    ...quantiles,
    quantile_convention: "nearest-rank: sorted[ceil(p * n) - 1], one-based rank ceil(p*n)",
    confidence_method: "distribution-free binomial order-statistic interval, equal tail caps",
    confidence_assumptions: {
      requires_iid: true,
      iid_verified: false,
      population_representativeness_verified: false,
      ties: "conservative coverage for population quantile inf{x:F(x)>=p}",
      arithmetic: "IEEE-754 double recurrence; not certified numerical bounds",
      interpretation: "conditional on IID; not a service SLA or a maximum-latency bound",
      null_endpoints: "lower null means -Infinity; upper null means +Infinity",
    },
    confidence_intervals: intervals,
  };
}

async function runCli() {
  if (process.argv.length !== 3) {
    throw new Error("Usage: node scripts/horizon-stats.mjs <raw.json>; JSON array or {samples:[numbers]}");
  }
  const raw = JSON.parse(await readFile(process.argv[2], "utf8"));
  const samples = Array.isArray(raw) ? raw : raw?.samples;
  process.stdout.write(`${JSON.stringify(summary(samples), null, 2)}\n`);
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try {
    await runCli();
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : "Statistics failed"}\n`);
    process.exitCode = 1;
  }
}
