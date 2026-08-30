/**
 * SimHash — random-hyperplane (Charikar 2002) angular-similarity signatures with
 * multi-probe querying. R&D, dark, NOT wired into live scoring — the
 * approximate-nearest-neighbor primitive for future "closest historical comp /
 * games like this one" surfaces. Extracted from the 2026-07-02 ZK/ML dump
 * (see handoff/claude/overnight-2026-07-01/ZK-ML-DUMP-EXTRACTION-LEDGER.md,
 * Cluster B).
 *
 * WHY THIS EXISTS (the gap it fills):
 *   Any "games like this one" surface needs sub-linear candidate retrieval over a
 *   growing historical feature store. Exact cosine scan is O(n·d) per query;
 *   SimHash compresses each vector to a `bits`-wide bit signature whose Hamming
 *   distance is an unbiased probe of the ANGLE between vectors:
 *   P(bit differs) = theta/pi exactly, per hyperplane (Goemans–Williamson lemma).
 *   Multi-probe querying (Lv et al. 2007, adapted to SimHash) recovers recall
 *   WITHOUT the classic LSH cost of many hash tables: instead of L tables we probe
 *   the neighbor buckets reached by flipping the LEAST-CONFIDENT bits first —
 *   the bits whose projections landed nearest their hyperplane, ranked by inverse
 *   projection magnitude. That heuristic is training-free: a small |projection|
 *   signals a high posterior probability that a true neighbor sits on the other
 *   side of that hyperplane. Be precise about the ranking key, though — it is
 *   |h_i·v| scaled by 1/||v|| (a per-signature constant that does not affect
 *   order), NOT the exact geometric margin |h_i·v|/(||h_i||·||v||): the per-
 *   hyperplane 1/||h_i|| factor is omitted, so the flip order equals the true
 *   distance-to-hyperplane rank only under equal-norm hyperplanes. With i.i.d.
 *   Gaussian normals ||h_i||² ~ chi-squared(dim) (relative SD ≈ sqrt(2/dim)), so
 *   the order carries a mild bias toward higher-norm hyperplanes. Harmless here —
 *   candidates are always re-ranked by true cosine downstream — leaving the probe
 *   order a well-motivated proxy rather than the exact posterior rank.
 *
 * Signature representation: bigint, capped at MAX_BITS = 64. bigint keeps the
 * signature EXACT at any width (no float53 truncation, no signed-int32 coercion
 * from `|`/`^` on numbers); the 64 cap is chosen because (a) the estimator's
 * standard error already shrinks as sqrt(p(1-p)/bits) — at 64 bits it is ≈ 0.06
 * on the differing-bit fraction, plenty for candidate retrieval that is always
 * re-ranked by true cosine downstream, and (b) wider signatures make buckets
 * uselessly sparse for indexing while pair-probe generation grows O(bits²).
 *
 * All deterministic: hyperplanes are seeded Gaussians (Box–Muller over mulberry32
 * uniforms, u=0 guarded). No Math.random, no Date.now, no I/O. Pure functions;
 * refused/degenerate input returns null — never throws on data.
 */

const MAX_BITS = 64;

/** Deterministic PRNG (mulberry32) — matches the package's other seeded modules. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function round(value: number, digits = 6): number {
  const s = 10 ** digits;
  return Math.round(value * s) / s;
}

/**
 * One standard Gaussian via Box–Muller. mulberry32 yields uniforms in [0, 1);
 * u = 0 would send Math.log to -Infinity, so it is floored to the smallest
 * positive double (deterministic, measure-zero perturbation).
 */
function gaussianFrom(rand: () => number): number {
  let u = rand();
  if (u <= 0) u = Number.MIN_VALUE;
  const v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// ============================================================
// Model — seeded Gaussian hyperplanes
// ============================================================

export interface SimhashModel {
  /** Input vector dimensionality. */
  readonly dim: number;
  /** Signature width in bits (1..MAX_BITS). */
  readonly bits: number;
  /** The mulberry32 seed the hyperplanes were drawn from. */
  readonly seed: number;
  /** `bits` rows of `dim` i.i.d. standard Gaussians — the hyperplane normals. */
  readonly hyperplanes: readonly (readonly number[])[];
}

export interface SimhashSignature {
  /** Signature width (copied from the model, for self-describing distance math). */
  readonly bits: number;
  /** The bit signature: bit i is 1 iff the projection onto hyperplane i is ≥ 0. */
  readonly sig: bigint;
  /**
   * Per-bit projection magnitudes |h_i · v| / ||v|| — scale-invariant in `v` (the
   * 1/||v|| factor is constant across bits within one signature, so it does not
   * change probe ordering). This is PROPORTIONAL to, not equal to, the true
   * distance from unit v to hyperplane i, which is |h_i · v| / (||h_i|| · ||v||);
   * the per-hyperplane 1/||h_i|| factor is intentionally omitted, so ranking by
   * this value matches the exact margin rank only when all hyperplane normals
   * share a norm. Small magnitude = low-confidence bit = flip it FIRST when
   * multi-probing.
   */
  readonly magnitudes: readonly number[];
}

/**
 * Build a SimHash model: `bits` seeded Gaussian hyperplane normals in R^dim.
 * Gaussian (not e.g. Rademacher) normals make each hyperplane direction uniform
 * on the sphere, which is what the theta/pi collision law requires.
 *
 * Returns null when dim < 1, bits < 1, bits > MAX_BITS (=64), any argument is
 * non-integer, or seed is not finite.
 */
export function buildSimhashModel(dim: number, bits: number, seed: number): SimhashModel | null {
  if (!Number.isInteger(dim) || dim < 1) return null;
  if (!Number.isInteger(bits) || bits < 1 || bits > MAX_BITS) return null;
  if (!Number.isFinite(seed)) return null;
  const rand = mulberry32(seed);
  const hyperplanes: number[][] = [];
  for (let b = 0; b < bits; b++) {
    const row = new Array<number>(dim);
    for (let d = 0; d < dim; d++) row[d] = gaussianFrom(rand);
    hyperplanes.push(row);
  }
  return { dim, bits, seed, hyperplanes };
}

// ============================================================
// Signatures
// ============================================================

/**
 * Compute the bit signature of `vector` under `model`, plus per-bit projection
 * magnitudes (the multi-probe priorities). An exactly-zero projection is a
 * measure-zero tie and deterministically maps to bit = 1 (>= 0 rule).
 *
 * Returns null on dim mismatch, any non-finite entry, or a zero vector (a zero
 * vector has no direction, so angular similarity is undefined for it).
 */
export function signature(model: SimhashModel, vector: readonly number[]): SimhashSignature | null {
  if (vector.length !== model.dim) return null;
  let normSq = 0;
  for (const x of vector) {
    if (!Number.isFinite(x)) return null;
    normSq += x * x;
  }
  // Reject zero vector AND overflow: finite entries can still overflow normSq to
  // Infinity (e.g. 1e200^2), which would silently make magnitudes NaN
  // (|dot|/Infinity). Self-audit finding — return null, not a garbage signature.
  if (!Number.isFinite(normSq) || normSq === 0) return null;
  const norm = Math.sqrt(normSq);
  let sig = 0n;
  const magnitudes = new Array<number>(model.bits);
  for (let b = 0; b < model.bits; b++) {
    const h = model.hyperplanes[b]!;
    let dot = 0;
    for (let d = 0; d < model.dim; d++) dot += h[d]! * vector[d]!;
    if (dot >= 0) sig |= 1n << BigInt(b);
    magnitudes[b] = Math.abs(dot) / norm;
  }
  return { bits: model.bits, sig, magnitudes };
}

/** Popcount for bigints up to MAX_BITS wide (Kernighan clear-lowest-set loop). */
function popcount(x: bigint): number {
  let v = x;
  let n = 0;
  while (v > 0n) {
    v &= v - 1n;
    n += 1;
  }
  return n;
}

/**
 * Hamming distance between two signatures. Returns null when the widths differ
 * (distances across incompatible models are meaningless, not zero).
 */
export function hammingDistance(sigA: SimhashSignature, sigB: SimhashSignature): number | null {
  if (sigA.bits !== sigB.bits) return null;
  return popcount(sigA.sig ^ sigB.sig);
}

/**
 * The standard SimHash cosine ESTIMATE: cos(pi · hamming / bits). Since each bit
 * differs independently with probability theta/pi, hamming/bits is an unbiased
 * estimate of theta/pi and this back-transform estimates cos(theta). It is an
 * ESTIMATE — its variance shrinks in `bits` (SE of the differing fraction is
 * sqrt(p(1-p)/bits), ≈ 0.06 at 64 bits) — so downstream comp surfaces must
 * re-rank retrieved candidates by TRUE cosine, never present this number as
 * exact similarity. Returns null when either signature's width does not match
 * the model's.
 */
export function estimatedCosine(
  model: SimhashModel,
  sigA: SimhashSignature,
  sigB: SimhashSignature,
): number | null {
  if (sigA.bits !== model.bits || sigB.bits !== model.bits) return null;
  const h = hammingDistance(sigA, sigB);
  if (h === null) return null;
  return round(Math.cos((Math.PI * h) / model.bits), 6);
}

// ============================================================
// Multi-probe sequence — inverse projection-magnitude priority
// ============================================================

/**
 * Generate up to `maxProbes` probe signatures ordered by INVERSE projection
 * magnitude priority: flip the least-confident bits first. Sequence = all single
 * flips (ascending |projection|), then all pair flips (ascending combined
 * |projection| sum). This is the dump's inverse-magnitude heuristic —
 * training-free and well-motivated: a small |projection| signals a high
 * probability that a true neighbor lies on the other side of hyperplane i.
 * The priority is |h_i·v|/||v|| (see SimhashSignature.magnitudes), which is
 * proportional to the exact distance-to-hyperplane margin only under equal-norm
 * hyperplanes — a deliberate, behavior-preserving approximation, since retrieved
 * candidates are re-ranked by true cosine afterward.
 *
 * The unflipped original signature is NOT included (callers query their own
 * bucket separately). Returns null when maxProbes is negative/non-integer or
 * the signature is inconsistent (magnitudes length ≠ bits).
 */
export function multiProbeSignatures(sig: SimhashSignature, maxProbes: number): bigint[] | null {
  if (!Number.isInteger(maxProbes) || maxProbes < 0) return null;
  if (sig.magnitudes.length !== sig.bits) return null;
  if (maxProbes === 0) return [];
  const bits = sig.bits;
  // Single flips: bit index, priority = |projection| (ascending; tie → lower index).
  const singles: Array<{ priority: number; i: number }> = [];
  for (let i = 0; i < bits; i++) singles.push({ priority: sig.magnitudes[i]!, i });
  singles.sort((a, b) => a.priority - b.priority || a.i - b.i);
  // Pair flips: priority = combined |projection| sum (ascending; tie → lexicographic).
  const pairs: Array<{ priority: number; i: number; j: number }> = [];
  for (let i = 0; i < bits; i++) {
    for (let j = i + 1; j < bits; j++) {
      pairs.push({ priority: sig.magnitudes[i]! + sig.magnitudes[j]!, i, j });
    }
  }
  pairs.sort((a, b) => a.priority - b.priority || a.i - b.i || a.j - b.j);
  const probes: bigint[] = [];
  for (const s of singles) {
    if (probes.length >= maxProbes) return probes;
    probes.push(sig.sig ^ (1n << BigInt(s.i)));
  }
  for (const p of pairs) {
    if (probes.length >= maxProbes) return probes;
    probes.push(sig.sig ^ (1n << BigInt(p.i)) ^ (1n << BigInt(p.j)));
  }
  return probes;
}

// ============================================================
// Bucket index
// ============================================================

export interface SimhashIndex {
  readonly model: SimhashModel;
  /** Signature-value (base-10 bigint string) → ascending corpus indices. */
  readonly buckets: ReadonlyMap<string, readonly number[]>;
  /** Per-corpus-vector signatures, aligned with the input `vectors` order. */
  readonly signatures: readonly SimhashSignature[];
  /** Number of indexed vectors. */
  readonly size: number;
}

/**
 * Build a bucket index over `vectors`. An empty corpus yields a valid empty
 * index (queries return []). Returns null when ANY vector is refused by
 * `signature` (wrong dim / non-finite / zero) — a comp index silently missing
 * rows would be a trust-surface lie, so bad data refuses the whole build.
 */
export function buildSimhashIndex(
  model: SimhashModel,
  vectors: readonly (readonly number[])[],
): SimhashIndex | null {
  const buckets = new Map<string, number[]>();
  const signatures: SimhashSignature[] = [];
  for (let i = 0; i < vectors.length; i++) {
    const sig = signature(model, vectors[i]!);
    if (sig === null) return null;
    signatures.push(sig);
    const key = sig.sig.toString();
    const bucket = buckets.get(key);
    if (bucket) bucket.push(i);
    else buckets.set(key, [i]);
  }
  return { model, buckets, signatures, size: vectors.length };
}

export interface SimhashQueryOptions {
  /** Number of multi-probe buckets to visit beyond the query's own (default 0). */
  readonly probes?: number;
}

/**
 * Query the index: candidates are the union of the query's own bucket and the
 * buckets reached by the first `probes` multi-probe signatures. Returns
 * ascending, de-duplicated corpus indices — candidate RETRIEVAL only; callers
 * re-rank by true cosine. The query vector itself is never in the result unless
 * it genuinely exists in the indexed data. Returns null on a refused query
 * vector or invalid probes option.
 */
export function querySimhashIndex(
  index: SimhashIndex,
  vector: readonly number[],
  options: SimhashQueryOptions = {},
): number[] | null {
  const probes = options.probes ?? 0;
  const sig = signature(index.model, vector);
  if (sig === null) return null;
  const probeSigs = multiProbeSignatures(sig, probes);
  if (probeSigs === null) return null;
  const candidates = new Set<number>();
  const visit = (key: string): void => {
    const bucket = index.buckets.get(key);
    if (bucket) for (const idx of bucket) candidates.add(idx);
  };
  visit(sig.sig.toString());
  for (const p of probeSigs) visit(p.toString());
  return [...candidates].sort((a, b) => a - b);
}
