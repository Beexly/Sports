/**
 * QB consensus — the engine reasoning across INDEPENDENT estimators.
 *
 * Two genuinely independent public views of quarterback quality:
 *   • ESPN Total QBR (via nflverse espn_data) — results/EPA-weighted.
 *   • Next Gen Stats CPOE (NFL tracking) — pure accuracy over expectation.
 * They come from different providers with different player-id spaces, so we join
 * on a normalized name. Each metric is converted to a within-pool percentile,
 * then combined into a consensus — and, crucially, we SURFACE DISAGREEMENT
 * rather than averaging it into false precision (the same doctrine as the Human
 * Performance layer). A QB who is top-tier by QBR but middling by CPOE is a
 * "results over accuracy" signal worth a second look, not a clean number.
 *
 * Read-only, derived analysis — not a betting pick. canPublishPicks stays false.
 */

import { loadNflverseQbr, type QbrRow } from "@/lib/nflverse/qbr";
import { loadNflverseNextGenStats, type NgsPassingLine } from "@/lib/nflverse/next-gen-stats";

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export type Divergence =
  | "aligned"
  | "results-over-accuracy"
  | "accuracy-over-results"
  | "single-source";

export interface QbConsensusRow {
  readonly name: string;
  readonly team: string;
  readonly qbr: number | null;
  readonly cpoe: number | null;
  readonly qbrPct: number | null; // 0-100 percentile within the QBR pool
  readonly cpoePct: number | null; // 0-100 percentile within the CPOE pool
  readonly consensus: number; // 0-100 (mean of available percentiles)
  readonly agreement: number | null; // 0-1; null when single-source
  readonly divergence: Divergence;
  readonly note: string;
}

export interface QbConsensus {
  readonly generatedAt: string;
  readonly status: "live" | "partial" | "source-error";
  readonly season: number;
  readonly sources: { readonly qbr: boolean; readonly ngs: boolean };
  readonly rows: readonly QbConsensusRow[];
  readonly canPublishPicks: false;
  readonly note: string;
  readonly error: string | null;
}

const TOP_N = 24;
const DIVERGENCE_THRESHOLD = 20; // percentile points

/** Normalize a player name for cross-source joins (strip case, suffixes, punctuation). */
export function normName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[.'`]/g, "")
    .replace(/\b(jr|sr|ii|iii|iv|v)\b/g, "")
    .replace(/[^a-z\s-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Midrank percentile (0-100) for each value within its own pool. Pure; tie-safe. */
export function percentileRanks(values: readonly number[]): number[] {
  const n = values.length;
  if (n === 0) return [];
  return values.map((v) => {
    let below = 0;
    let equal = 0;
    for (const x of values) {
      if (x < v) below += 1;
      else if (x === v) equal += 1;
    }
    return Math.round(((below + 0.5 * equal) / n) * 1000) / 10; // one decimal
  });
}

function divergenceFor(qbrPct: number | null, cpoePct: number | null): { divergence: Divergence; note: string } {
  if (qbrPct == null || cpoePct == null) {
    return { divergence: "single-source", note: "Only one estimator qualifies this QB, so read it as a single view, not a consensus." };
  }
  const diff = qbrPct - cpoePct;
  if (Math.abs(diff) <= DIVERGENCE_THRESHOLD) {
    return { divergence: "aligned", note: "Both independent views agree on the tier: higher confidence in the read." };
  }
  if (diff > 0) {
    return { divergence: "results-over-accuracy", note: "Produces more (QBR) than raw accuracy (CPOE) implies. Mobility, big plays, or situation are carrying value the accuracy view misses." };
  }
  return { divergence: "accuracy-over-results", note: "More accurate (CPOE) than results (QBR) show. A supporting-cast or finishing gap may be capping the output." };
}

/** Build the consensus rows from the two estimator pools. Pure. */
export function buildQbConsensus(qbr: readonly QbrRow[], ngs: readonly NgsPassingLine[]): QbConsensusRow[] {
  const qbrPcts = percentileRanks(qbr.map((r) => r.qbr));
  const cpoePcts = percentileRanks(ngs.map((r) => r.cpoe));

  const byName = new Map<string, { name: string; team: string; qbr: number | null; cpoe: number | null; qbrPct: number | null; cpoePct: number | null }>();

  qbr.forEach((r, i) => {
    const key = normName(r.name);
    byName.set(key, { name: r.name, team: r.team, qbr: r.qbr, cpoe: null, qbrPct: qbrPcts[i] ?? null, cpoePct: null });
  });
  ngs.forEach((r, i) => {
    const key = normName(r.playerName);
    const existing = byName.get(key);
    if (existing) {
      byName.set(key, { ...existing, cpoe: r.cpoe, cpoePct: cpoePcts[i] ?? null, team: existing.team || r.team });
    } else {
      byName.set(key, { name: r.playerName, team: r.team, qbr: null, cpoe: r.cpoe, qbrPct: null, cpoePct: cpoePcts[i] ?? null });
    }
  });

  const rows: QbConsensusRow[] = [];
  for (const v of byName.values()) {
    const pcts = [v.qbrPct, v.cpoePct].filter((p): p is number => p != null);
    if (pcts.length === 0) continue;
    const consensus = Math.round(pcts.reduce((s, p) => s + p, 0) / pcts.length);
    const agreement =
      v.qbrPct != null && v.cpoePct != null
        ? Math.round((1 - Math.abs(v.qbrPct - v.cpoePct) / 100) * 100) / 100
        : null;
    const { divergence, note } = divergenceFor(v.qbrPct, v.cpoePct);
    rows.push({ name: v.name, team: v.team, qbr: v.qbr, cpoe: v.cpoe, qbrPct: v.qbrPct, cpoePct: v.cpoePct, consensus, agreement, divergence, note });
  }

  // Best consensus first; full two-source reads rank ahead of single-source ties.
  rows.sort((a, b) => b.consensus - a.consensus || (b.agreement ?? -1) - (a.agreement ?? -1));
  return rows.slice(0, TOP_N);
}

export async function loadQbConsensus({
  timeoutMs = 15000,
  fetcher = fetch,
}: { timeoutMs?: number; fetcher?: FetchLike } = {}): Promise<QbConsensus> {
  const generatedAt = new Date().toISOString();
  const [qbrRes, ngsRes] = await Promise.all([
    loadNflverseQbr({ timeoutMs, fetcher }),
    loadNflverseNextGenStats({ timeoutMs, fetcher }),
  ]);

  const qbrOk = qbrRes.status === "live";
  const ngsOk = ngsRes.status === "live";

  if (!qbrOk && !ngsOk) {
    return {
      generatedAt,
      status: "source-error",
      season: 0,
      sources: { qbr: false, ngs: false },
      rows: [],
      canPublishPicks: false,
      note: "Neither QB estimator could load. The consensus shows an empty state instead of a fabricated ranking.",
      error: qbrRes.error ?? ngsRes.error ?? "UNKNOWN",
    };
  }

  const rows = buildQbConsensus(qbrOk ? qbrRes.leaders : [], ngsOk ? ngsRes.passing : []);
  const season = qbrOk ? qbrRes.season : ngsRes.season;

  return {
    generatedAt,
    status: qbrOk && ngsOk ? "live" : "partial",
    season,
    sources: { qbr: qbrOk, ngs: ngsOk },
    rows,
    canPublishPicks: false,
    note:
      qbrOk && ngsOk
        ? "Two independent QB-quality estimators (ESPN QBR + Next Gen CPOE) triangulated. Disagreement is surfaced, not averaged away. Context, not a pick."
        : `Only the ${qbrOk ? "QBR" : "CPOE"} estimator is live right now, so these are single-source reads, not a consensus.`,
    error: null,
  };
}
