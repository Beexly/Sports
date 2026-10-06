
export interface FidelityScore {
  readonly configId: string;
  /** Lower is better (e.g. wQL). */
  readonly score: number;
}

/** One halving rung: keep the top 1/eta configs by score (lower better). */
export function halvingPromote(scores: readonly FidelityScore[], eta: number): string[] {
  if (!(eta >= 2)) throw new Error("successive-halving: eta >= 2 required");
  if (scores.length === 0) return [];
  const ranked = [...scores].sort((a, b) => a.score - b.score);
  const keep = Math.max(1, Math.floor(ranked.length / eta));
  return ranked.slice(0, keep).map((s) => s.configId);
}

/** Rung sizes for the full schedule from nConfigs down to 1. */
export function halvingSchedule(nConfigs: number, eta: number): number[] {
  if (!(nConfigs >= 1) || !(eta >= 2)) throw new Error("successive-halving: bad schedule args");
  const sizes: number[] = [];
  let n = nConfigs;
  while (n > 1) {
    sizes.push(n);
    n = Math.max(1, Math.floor(n / eta));
  }
  sizes.push(1);
  return sizes;
}

export interface TraceEntry {
  readonly configId: string;
  readonly score: number;
}

/** Warm-start: seed the new season's search with the previous trace's top-k configs. */
export function warmStartConfigs(trace: readonly TraceEntry[], k: number): string[] {
  return [...trace].sort((a, b) => a.score - b.score).slice(0, Math.max(0, k)).map((t) => t.configId);
}

/** Within-2%-wQL check for the gate: |winner - halvingPick| / winner <= 0.02. */
export function withinTolerance(picked: number, best: number, tol = 0.02): boolean {
  if (!(best > 0)) throw new Error("successive-halving: best must be positive");
  return (picked - best) / best <= tol + 1e-12;
}
