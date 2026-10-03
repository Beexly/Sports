
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

/** Activation gains for SFF initialization. */
export function sffGain(activation: "relu" | "tanh" | "sigmoid" | "linear"): number {
  switch (activation) {
    case "relu":
      return Math.SQRT2;
    case "tanh":
    case "sigmoid":
    case "linear":
      return 1;
    default:
      throw new Error("sff-initializer: unknown activation");
  }
}

/** SFF scale: gain * sqrt(2 / (fanIn + fanOut)). */
export function sffScale(fanIn: number, fanOut: number, activation: "relu" | "tanh" | "sigmoid" | "linear" = "tanh"): number {
  if (!(fanIn >= 1 && fanOut >= 1)) throw new Error("sff-initializer: fanIn/fanOut >= 1 required");
  return sffGain(activation) * Math.sqrt(2 / (fanIn + fanOut));
}

/** Initialize a (fanOut x fanIn) matrix with uniform(-scale, scale), seeded. */
export function sffInitMatrix(fanIn: number, fanOut: number, seed = 12345, activation: "relu" | "tanh" | "sigmoid" | "linear" = "tanh"): number[][] {
  const scale = sffScale(fanIn, fanOut, activation);
  const rng = mulberry32(seed);
  return Array.from({ length: fanOut }, () =>
    Array.from({ length: fanIn }, () => (rng() * 2 - 1) * scale),
  );
}

/** Empirical variance of a flattened matrix (gate diagnostic). */
export function empiricalVariance(m: readonly (readonly number[])[]): number {
  const flat = m.flat();
  if (flat.length === 0) return 0;
  const mean = flat.reduce((s, v) => s + v, 0) / flat.length;
  return flat.reduce((s, v) => s + (v - mean) ** 2, 0) / flat.length;
}
