/**
 * DORMANT / LAB-ONLY test helper. A tiny deterministic PRNG (mulberry32) so
 * the Monte-Carlo simulations are reproducible: a fixed seed gives the same
 * stream every run, making the empirical false-positive-rate check honest and
 * non-flaky rather than dependent on Math.random.
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function next(): number {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Draw one Bernoulli(p) as 0/1 from a uniform generator. */
export function bernoulli(rng: () => number, p: number): 0 | 1 {
  return rng() < p ? 1 : 0;
}
