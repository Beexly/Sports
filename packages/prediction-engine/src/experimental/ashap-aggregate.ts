
export interface GroupContribution {
  readonly group: number;
  readonly meanAbs: number;
  readonly meanSigned: number;
  readonly n: number;
}

/** Aggregate per-play SHAP rows into per-group (team-season / player-group) aSHAP. */
export function aggregateShap(
  shap: readonly (readonly number[])[],
  groupOf: readonly number[],
): GroupContribution[] {
  if (shap.length !== groupOf.length) throw new Error("ashap-aggregate: shap rows and group labels must align");
  const acc = new Map<number, { abs: number; signed: number; n: number }>();
  for (let i = 0; i < shap.length; i++) {
    const row = shap[i] ?? [];
    const g = groupOf[i] ?? 0;
    let entry = acc.get(g);
    if (!entry) {
      entry = { abs: 0, signed: 0, n: 0 };
      acc.set(g, entry);
    }
    for (const v of row) {
      entry.abs += Math.abs(v);
      entry.signed += v;
    }
    entry.n += 1;
  }
  return [...acc.entries()]
    .map(([group, e]) => ({
      group,
      meanAbs: e.n === 0 ? 0 : e.abs / e.n,
      meanSigned: e.n === 0 ? 0 : e.signed / e.n,
      n: e.n,
    }))
    .sort((a, b) => b.meanAbs - a.meanAbs);
}

/** Top-k feature indices by mean |SHAP| for one group (columns = features). */
export function topKFeatures(shap: readonly (readonly number[])[], k: number): number[] {
  const cols = shap.length === 0 ? 0 : (shap[0]?.length ?? 0);
  const means: number[] = new Array(cols).fill(0);
  for (const row of shap) for (let j = 0; j < cols; j++) means[j] = (means[j] ?? 0) + Math.abs(row[j] ?? 0);
  return means
    .map((m, j) => ({ m: shap.length === 0 ? 0 : m / shap.length, j }))
    .sort((a, b) => b.m - a.m)
    .slice(0, Math.max(0, k))
    .map((e) => e.j);
}

function sameSet(a: readonly number[], b: readonly number[]): boolean {
  if (a.length !== b.length) return false;
  const sb = new Set(b);
  return a.every((x) => sb.has(x));
}

/**
 * Stability gate: fraction of teams whose top-k feature set is unchanged in
 * >=80% of bootstraps. Adopt requires this >= 0.80 (fewer than 20% of teams change).
 */
export function ashapStability(topKPerTeamPerBootstrap: ReadonlyArray<ReadonlyArray<readonly number[]>>): number {
  if (topKPerTeamPerBootstrap.length === 0) return 1;
  let stable = 0;
  for (const boots of topKPerTeamPerBootstrap) {
    if (boots.length === 0) {
      stable += 1;
      continue;
    }
    const ref = boots[0] ?? [];
    const frac = boots.filter((b) => sameSet(b, ref)).length / boots.length;
    if (frac >= 0.8) stable += 1;
  }
  return stable / topKPerTeamPerBootstrap.length;
}
