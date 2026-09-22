
export function brierLoss(p: number, y: number): number {
  const pc = Math.min(Math.max(p, 0), 1);
  return (pc - y) * (pc - y);
}

function ensembleBrier(memberPreds: ReadonlyArray<readonly number[]>, y: readonly number[]): number {
  if (memberPreds.length === 0) return Infinity;
  let total = 0;
  for (let i = 0; i < y.length; i++) {
    let mean = 0;
    for (const m of memberPreds) mean += m[i] ?? 0;
    mean /= memberPreds.length;
    total += brierLoss(mean, y[i] ?? 0);
  }
  return total / Math.max(y.length, 1);
}

/**
 * Greedy complementarity selection: repeatedly add the config that most reduces the
 * mean-ensemble's OOF Brier. Returns selected config indices in selection order.
 */
export function greedyComplementarity(
  oofPredictions: ReadonlyArray<readonly number[]>,
  y: readonly number[],
  k: number,
): number[] {
  const m = oofPredictions.length;
  if (m === 0 || k <= 0) return [];
  const selected: number[] = [];
  const remaining = new Set(Array.from({ length: m }, (_, i) => i));
  while (selected.length < Math.min(k, m) && remaining.size > 0) {
    let best = -1;
    let bestLoss = Infinity;
    for (const j of remaining) {
      const members = [...selected.map((s) => oofPredictions[s] ?? []), oofPredictions[j] ?? []];
      const loss = ensembleBrier(members, y);
      if (loss < bestLoss) {
        bestLoss = loss;
        best = j;
      }
    }
    if (best < 0) break;
    selected.push(best);
    remaining.delete(best);
  }
  return selected;
}
