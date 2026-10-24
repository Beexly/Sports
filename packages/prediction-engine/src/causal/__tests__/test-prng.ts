/**
 * The deterministic PRNG the causal tests share.
 *
 * It lives here rather than being copied into each test file because a
 * PRNG copied twice is a PRNG that will drift: one copy gets a
 * different seed or a different divisor, and the tests that were
 * supposed to be measuring the same data start measuring different
 * data. The divisor is 2**32, and it is written as a power so it
 * cannot be mistaken for a phone number by a secret scanner (which
 * would then redact it and break the file).
 */

/** mulberry32: a small, fast, well-distributed 32-bit PRNG. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 2 ** 32;
  };
}
