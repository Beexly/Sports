
/** Q-index: actual upsets / expected upsets. */
export function qIndex(actualUpsets: number, expectedUpsets: number): number {
  if (!(expectedUpsets > 0)) throw new Error("q-index-parity: expectedUpsets must be positive");
  if (!(actualUpsets >= 0)) throw new Error("q-index-parity: actualUpsets must be nonnegative");
  return actualUpsets / expectedUpsets;
}

export type ParityRegime = "chalk" | "neutral" | "chaos";

/** Classify the parity regime from q. */
export function parityRegime(q: number, band = 0.3): ParityRegime {
  if (q > 1 + band) return "chaos";
  if (q < 1 - band) return "chalk";
  return "neutral";
}

/** Rolling q-index over weekly (actual, expected) upset pairs. */
export function rollingQIndex(
  weekly: ReadonlyArray<readonly [actual: number, expected: number]>,
  window: number,
): number[] {
  if (!(window >= 1)) throw new Error("q-index-parity: window >= 1 required");
  return weekly.map((_, i) => {
    const slice = weekly.slice(Math.max(0, i - window + 1), i + 1);
    const a = slice.reduce((s, w) => s + w[0], 0);
    const e = slice.reduce((s, w) => s + w[1], 0);
    return e > 0 ? a / e : 1;
  });
}
