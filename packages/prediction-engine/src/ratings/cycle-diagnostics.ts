/**
 * Intransitivity diagnostics for paired-comparison graphs.
 *
 * Build a directed dominance graph from head-to-head records: i -> j when
 * i's win rate against j exceeds 0.5 (with a minimum-games floor to cut
 * noise). Count directed 3-cycles (A>B>C>A, the rock-paper-scissors
 * signature) and report the cycle rate = 3-cycles / total team triples.
 * A high cycle rate flags lack-of-fit for transitive models (Bradley-Terry,
 * Elo). Simple directed cycles of length 4-5 are enumerated for narrative
 * interpretability ("A beats B beats C beats D beats A").
 *
 * Pure TypeScript, no I/O.
 *
 * Reference: arXiv:2406.11584 — Modeling cyclicality and intransitivity in
 * paired comparisons data.
 *
 * ACCEPTANCE GATE: deploy as a monitoring diagnostic; lack-of-fit flags at
 * p < 0.01 on walk-forward seasons.
 */

export interface HeadToHead {
  readonly a: string;
  readonly b: string;
  /** Wins for a vs b. */
  readonly winsA: number;
  /** Wins for b vs a. */
  readonly winsB: number;
}

/** Dominance adjacency: i -> j if i dominates j. */
export function dominanceGraph(
  records: readonly HeadToHead[],
  minGames = 1,
): Map<string, Set<string>> {
  const adj = new Map<string, Set<string>>();
  const add = (x: string, y: string) => {
    if (!adj.has(x)) adj.set(x, new Set());
    adj.get(x)!.add(y);
    if (!adj.has(y)) adj.set(y, new Set());
  };
  for (const r of records) {
    const n = r.winsA + r.winsB;
    if (n < minGames) continue;
    const rateA = r.winsA / Math.max(n, 1);
    if (rateA > 0.5) add(r.a, r.b);
    else if (rateA < 0.5) add(r.b, r.a);
    // exact 0.5 -> no edge (no dominance)
  }
  return adj;
}

/** Count directed 3-cycles (A>B>C>A) in the dominance graph. */
export function countThreeCycles(adj: Map<string, Set<string>>): number {
  const teams = [...adj.keys()];
  let cycles = 0;
  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      for (let k = j + 1; k < teams.length; k++) {
        const a = teams[i]!;
        const b = teams[j]!;
        const c = teams[k]!;
        const ab = adj.get(a)?.has(b) ?? false;
        const bc = adj.get(b)?.has(c) ?? false;
        const ca = adj.get(c)?.has(a) ?? false;
        const ba = adj.get(b)?.has(a) ?? false;
        const cb = adj.get(c)?.has(b) ?? false;
        const ac = adj.get(a)?.has(c) ?? false;
        if ((ab && bc && ca) || (ba && cb && ac)) cycles++;
      }
    }
  }
  return cycles;
}

/** Cycle rate: 3-cycles / total triples (0 when fewer than 3 teams). */
export function cycleRate(adj: Map<string, Set<string>>): number {
  const n = adj.size;
  if (n < 3) return 0;
  const triples = (n * (n - 1) * (n - 2)) / 6;
  return countThreeCycles(adj) / triples;
}

/**
 * Enumerate simple directed cycles of length 4..maxLen (DFS, dedup by rotation).
 * Returns cycles as team lists (without repeating the start at the end).
 */
export function longCycles(adj: Map<string, Set<string>>, maxLen = 5): string[][] {
  const teams = [...adj.keys()];
  const found = new Map<string, string[]>();
  const dfs = (start: string, cur: string, path: string[]) => {
    if (path.length > maxLen) return;
    for (const nxt of adj.get(cur) ?? []) {
      if (nxt === start && path.length >= 4) {
        const key = [...path].sort().join("|") + "#" + path.length;
        if (!found.has(key)) found.set(key, [...path]);
      } else if (!path.includes(nxt) && nxt > start) {
        dfs(start, nxt, [...path, nxt]);
      }
    }
  };
  for (const t of teams) dfs(t, t, [t]);
  return [...found.values()];
}
