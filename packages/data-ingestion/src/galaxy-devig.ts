/**
 * Galaxy Sports API de-vig — the same formula the Galaxy odds feed uses:
 *   p_i = (1/O_i) / sum_j(1/O_j)   where O is decimal odds from American.
 *
 * Pure. Never invents a missing price: an outcome without a price is left out
 * of the normalisation, and fewer than two priced outcomes yields no fair
 * probabilities at all (a one-sided quote has no complement to normalise
 * against).
 */

export function americanToDecimal(american: number): number | null {
  if (!Number.isFinite(american) || american === 0) return null;
  if (american > 0) return 1 + american / 100;
  return 1 + 100 / Math.abs(american);
}

export function deVigFairProbs(
  outcomes: ReadonlyArray<{ name: string; price?: number }>,
): Record<string, number> {
  const valid: { name: string; inv: number }[] = [];
  for (const o of outcomes) {
    if (o.price == null) continue;
    const dec = americanToDecimal(o.price);
    if (dec == null || dec <= 0) continue;
    valid.push({ name: o.name, inv: 1 / dec });
  }
  if (valid.length < 2) return {};
  const tot = valid.reduce((s, v) => s + v.inv, 0);
  if (tot <= 0) return {};
  const out: Record<string, number> = {};
  for (const v of valid) out[v.name] = Math.round((v.inv / tot) * 10000) / 10000;
  return out;
}
