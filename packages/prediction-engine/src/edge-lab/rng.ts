/**
 * Seeded deterministic PRNG (mulberry32) — every edge-lab randomized
 * procedure (placebo scrambles, permutation nulls) must be reproducible
 * from a stated seed, or its result cannot be independently recomputed
 * (handoff §2 P2: the record must be re-computable by anyone).
 */

export type Rng = () => number;

/** mulberry32 — small, fast, good-enough statistical quality for resampling. */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher-Yates shuffle (returns a new array). */
export function shuffled<T>(items: readonly T[], rng: Rng): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = out[i]!;
    out[i] = out[j]!;
    out[j] = tmp;
  }
  return out;
}

/** Uniform draw from [minMs, maxMs] as an ISO instant. */
export function uniformInstant(minMs: number, maxMs: number, rng: Rng): string {
  if (!(maxMs >= minMs)) throw new RangeError("uniformInstant: maxMs < minMs");
  return new Date(Math.floor(minMs + rng() * (maxMs - minMs))).toISOString();
}
