/**
 * One Button Machine for Automating Feature Engineering in Relational Databases
 *
 * arXiv:1706.00327 · lane:auto_feature_eng · owner:Hermes
 *
 * Improvement (IMPROVEMENT-LEDGER.jsonl):
 * Build 'GSE-OneBM' as the relational discovery layer (DuckDB/pandas, no Spark): entity graph
 * games -> plays (one-to-many), games -> drives, plays -> players (many-to-many via
 * participation), games -> odds snapshots (timestamped), teams -> games; main table = game rows
 * with target (cover/total) and cutoff timestamp = kickoff enforced in code; forward-only path
 * enumeration MaxDepth 2; type modules (play multiset -> EPA avg/var/max/min/success
 * rate/explosive rate; timestamped odds -> line-movement recent(k)/volatility; categorical ->
 * label distributions); selection = dedup + Chi-square vs target + drift quarantine (regime-risk
 * list, not deletion); output versioned feature definitions with (path, type, transform, cutoff)
 * provenance.
 *
 * ACCEPTANCE GATE: ADOPT the relational discovery layer iff (a) 2024 held-out log-loss improves by >= 0.003 over
 * baseline, AND (b) the leakage audit passes 100% -- every generated feature recomputed from a
 * kickoff-cutoff replay matches its stored value exactly on a 500-game sample, AND (c) the drift-
 * quarantine list is non-empty and reviewed.
 *
 * Ingest role: schemas (entity graph, path enumeration, cutoff audit, drift quarantine).
 * Live data: NO. Runs offline on nflverse aggregates / stored snapshots.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "1706.00327" as const;
export const LANE = "auto_feature_eng" as const;

/** Numeric acceptance gate, verbatim from the ledger (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `ADOPT the relational discovery layer iff (a) 2024 held-out log-loss improves by >= 0.003 over
 * baseline, AND (b) the leakage audit passes 100% -- every generated feature recomputed from a
 * kickoff-cutoff replay matches its stored value exactly on a 500-game sample, AND (c) the drift-
 * quarantine list is non-empty and reviewed.`;

export const CONFIG = {
  enabled: false,
  maxDepth: 2,
  cutoff: "kickoff",
  leakageAuditSample: 500,
  logLossGainThreshold: 0.003,
} as const;

export interface EntityEdge {
  readonly from: string;
  readonly to: string;
  readonly cardinality: "one-to-many" | "many-to-many";
}

/** Entity graph: games -> plays, games -> drives, plays -> players, games -> odds, teams -> games. */
export const ENTITY_GRAPH: readonly EntityEdge[] = [
  { from: "games", to: "plays", cardinality: "one-to-many" },
  { from: "games", to: "drives", cardinality: "one-to-many" },
  { from: "plays", to: "players", cardinality: "many-to-many" },
  { from: "games", to: "odds_snapshots", cardinality: "one-to-many" },
  { from: "teams", to: "games", cardinality: "one-to-many" },
];

/** Forward-only path enumeration up to maxDepth (no backward leakage paths). */
export function enumeratePaths(maxDepth = 2): string[][] {
  const adj = new Map<string, string[]>();
  for (const e of ENTITY_GRAPH) {
    const l = adj.get(e.from) ?? [];
    l.push(e.to);
    adj.set(e.from, l);
  }
  const paths: string[][] = [["games"]];
  const frontier: string[][] = [["games"]];
  for (let d = 0; d < maxDepth; d++) {
    const next: string[][] = [];
    for (const p of frontier) {
      const last = p[p.length - 1] ?? "";
      for (const t of adj.get(last) ?? []) {
        if (p.includes(t)) continue;
        const np = [...p, t];
        paths.push(np);
        next.push(np);
      }
    }
    frontier.splice(0, frontier.length, ...next);
  }
  return paths;
}

export interface FeatureDefinition {
  readonly path: readonly string[];
  readonly type: string;
  readonly transform: string;
  readonly cutoff: string;
}

export function isFeatureDefinition(x: unknown): x is FeatureDefinition {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  return (
    Array.isArray(o["path"]) && (o["path"] as unknown[]).every((p) => typeof p === "string") &&
    typeof o["type"] === "string" &&
    typeof o["transform"] === "string" &&
    typeof o["cutoff"] === "string"
  );
}

/**
 * Leakage audit (gate b): recompute every feature from a kickoff-cutoff replay
 * and require exact match on the sample. Returns the failing indices.
 */
export function cutoffAudit(stored: readonly number[], recomputed: readonly number[]): number[] {
  const failing: number[] = [];
  const n = Math.max(stored.length, recomputed.length);
  for (let i = 0; i < n; i++) {
    if (!Object.is(stored[i], recomputed[i])) failing.push(i);
  }
  return failing;
}

/** Drift quarantine: regime-risk list (review, never silent deletion). */
export function driftQuarantine(
  features: readonly FeatureDefinition[],
  driftScores: ReadonlyMap<string, number>,
  threshold: number,
): Array<{ feature: FeatureDefinition; drift: number }> {
  const out: Array<{ feature: FeatureDefinition; drift: number }> = [];
  for (const f of features) {
    const key = [...f.path, f.transform].join("/");
    const d = driftScores.get(key) ?? 0;
    if (d >= threshold) out.push({ feature: f, drift: d });
  }
  return out;
}
