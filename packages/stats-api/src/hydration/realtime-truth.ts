/**
 * GSE-specific real-time truth — dual-asOf hybrid join + plane budgets.
 *
 * The honest edge is never "live vibes". It is:
 *   e = p(featureAsOf) − q(quoteAsOf)
 * with both timestamps PIT-valid, both planes within budget, and a measured
 * consistency window between the two clocks.
 *
 * LAW:
 *  - Refuse-default if either plane missing/stale/invalid
 *  - Dynamic market freshness tightens near kickoff (mirrors data-ingestion)
 *  - featureAsOf and quoteAsOf must both be ≤ decisionAsOf
 *  - |quoteAsOf − featureAsOf| ≤ consistencyBudget (no silent time-travel join)
 *  - LIVE_BOARD / SSE is projection only — never the truth source
 */

import {
  parseAsOfMs,
  type PitClock,
  systemClock,
  type PitResult,
} from "../pit-validate.js";
import { maxAgeForCadence, isFresh } from "./orchestrator.js";
import type { CadenceClass } from "./strategies.js";

export type TruthPlane =
  | "markets"
  | "weather"
  | "box_advanced"
  | "edge_gate"
  | "optical"
  | "cockpit_ui";

export interface PlaneSpec {
  readonly plane: TruthPlane;
  readonly realtimeMeaning: string;
  readonly cadence: CadenceClass;
  readonly strategies: readonly string[];
  readonly maxAgeMs: number;
  readonly isSourceOfTruth: boolean;
  readonly publicDefault: boolean;
  readonly notes: string;
}

/** Canonical GSE plane table — improved vs the sketch. */
export const GSE_TRUTH_PLANES: readonly PlaneSpec[] = [
  {
    plane: "markets",
    realtimeMeaning: "Minutes; tighter near kickoff (dynamic freshness)",
    cadence: "few_minutes",
    strategies: ["cron_delta", "hybrid_hot_cold"],
    maxAgeMs: maxAgeForCadence("few_minutes"),
    isSourceOfTruth: true,
    publicDefault: false, // pro/elite surfaces
    notes:
      "q at quoteAsOf. Dynamic schedule: ≤3h→2h max age, ≤8h→4h, ≤24h→8h, else 12h (clamped).",
  },
  {
    plane: "weather",
    realtimeMeaning: "15–30m game environment",
    cadence: "few_minutes",
    strategies: ["ttl_cache_poll", "read_repair"],
    maxAgeMs: 30 * 60_000,
    isSourceOfTruth: true,
    publicDefault: true,
    notes: "Open-Meteo free path; lat,lon entity.",
  },
  {
    plane: "box_advanced",
    realtimeMeaning: "Post-slate / weekly — not in-play fantasy",
    cadence: "daily",
    strategies: ["batch_snapshot", "write_through"],
    maxAgeMs: maxAgeForCadence("daily"),
    isSourceOfTruth: true,
    publicDefault: true,
    notes: "Cold plane. Never poll pbp on request path.",
  },
  {
    plane: "edge_gate",
    realtimeMeaning: "On settle / selective-gate event (write_through)",
    cadence: "hourly",
    strategies: ["write_through", "feast_materialize"],
    maxAgeMs: maxAgeForCadence("hourly"),
    isSourceOfTruth: true,
    publicDefault: false,
    notes: "p and gate flags; substantiation required before public performance claims.",
  },
  {
    plane: "optical",
    realtimeMeaning: "Eval only until ship criteria",
    cadence: "on_demand",
    strategies: ["batch_snapshot"],
    maxAgeMs: Number.POSITIVE_INFINITY,
    isSourceOfTruth: false,
    publicDefault: false,
    notes: "DARK. Harness floors first. No commercial live path.",
  },
  {
    plane: "cockpit_ui",
    realtimeMeaning: "Stream of SoR deltas — projection only",
    cadence: "sub_minute",
    strategies: ["sse_stream"],
    maxAgeMs: 5_000,
    isSourceOfTruth: false,
    publicDefault: false,
    notes: "LIVE_BOARD founder-gated. SSE must never author numbers.",
  },
];

export function planeSpec(plane: TruthPlane): PlaneSpec {
  const p = GSE_TRUTH_PLANES.find((x) => x.plane === plane);
  if (!p) throw new Error(`unknown plane ${plane}`);
  return p;
}

// ── Dynamic market freshness (pure mirror of data-ingestion schedule) ─────

const HOUR = 3_600_000;

/**
 * Time-to-kickoff market freshness budget. Pure; clamp to fixedCeilingMs.
 * Matches packages/data-ingestion freshness-schedule dynamic ladder.
 */
export function marketFreshnessBudgetMs(
  commenceTimeMs: number,
  nowMs: number,
  fixedCeilingMs: number = 12 * HOUR,
): number {
  const hoursToStart = (commenceTimeMs - nowMs) / HOUR;
  let scheduled: number;
  if (hoursToStart <= 3) scheduled = 2 * HOUR;
  else if (hoursToStart <= 8) scheduled = 4 * HOUR;
  else if (hoursToStart <= 24) scheduled = 8 * HOUR;
  else scheduled = 12 * HOUR;
  return Math.min(scheduled, fixedCeilingMs);
}

export function isMarketQuoteFresh(input: {
  quoteAsOf: string;
  now?: string;
  commenceTime?: string;
  fixedCeilingMs?: number;
}): { fresh: boolean; ageMs: number; budgetMs: number } {
  const q = parseAsOfMs(input.quoteAsOf);
  const now = parseAsOfMs(input.now ?? new Date().toISOString());
  if (!q.ok || !now.ok) {
    return { fresh: false, ageMs: Number.POSITIVE_INFINITY, budgetMs: 0 };
  }
  let budget = input.fixedCeilingMs ?? 12 * HOUR;
  if (input.commenceTime) {
    const c = parseAsOfMs(input.commenceTime);
    if (c.ok) {
      budget = marketFreshnessBudgetMs(c.asOfMs, now.asOfMs, budget);
    }
  }
  const ageMs = Math.max(0, now.asOfMs - q.asOfMs);
  return { fresh: ageMs <= budget, ageMs, budgetMs: budget };
}

// ── Dual-asOf hybrid edge ─────────────────────────────────────────────────

/** Default: features and quotes must be within 15 minutes of each other. */
export const DEFAULT_CONSISTENCY_BUDGET_MS = 15 * 60_000;

export interface DualAsOfEdgeInput {
  /** Model / feature probability (calibrated p). */
  readonly p: number;
  /** No-vig market probability q. */
  readonly q: number;
  /** When features were frozen. */
  readonly featureAsOf: string;
  /** When market quote was observed. */
  readonly quoteAsOf: string;
  /** Decision instant (both planes must be ≤ this). */
  readonly decisionAsOf: string;
  /** Optional kickoff for dynamic market budget. */
  readonly commenceTime?: string;
  /** Max |quote − feature| skew. */
  readonly consistencyBudgetMs?: number;
  readonly clock?: PitClock;
  /** Wall clock for market freshness (defaults to decisionAsOf). */
  readonly now?: string;
}

export type EdgeRefuseCode =
  | "invalid_p"
  | "invalid_q"
  | "feature_asof"
  | "quote_asof"
  | "decision_asof"
  | "feature_after_decision"
  | "quote_after_decision"
  | "consistency_window"
  | "quote_stale"
  | "feature_stale";

export type DualAsOfEdgeResult =
  | {
      ok: true;
      edge: number;
      p: number;
      q: number;
      featureAsOf: string;
      quoteAsOf: string;
      decisionAsOf: string;
      consistencyGapMs: number;
      marketAgeMs: number;
      marketBudgetMs: number;
      formula: "e = p(featureAsOf) - q(quoteAsOf)";
    }
  | {
      ok: false;
      code: EdgeRefuseCode;
      error: string;
    };

function finiteProb(x: number): boolean {
  return typeof x === "number" && Number.isFinite(x) && x >= 0 && x <= 1;
}

/**
 * Hybrid join: honest edge with dual-asOf PIT + freshness + consistency.
 * Refuse-default on any violation — never return a fake edge.
 */
export function computeDualAsOfEdge(input: DualAsOfEdgeInput): DualAsOfEdgeResult {
  if (!finiteProb(input.p)) {
    return { ok: false, code: "invalid_p", error: "p must be finite probability in [0,1]" };
  }
  if (!finiteProb(input.q)) {
    return { ok: false, code: "invalid_q", error: "q must be finite probability in [0,1]" };
  }

  const feature = parseAsOfMs(input.featureAsOf);
  if (!feature.ok) {
    return { ok: false, code: "feature_asof", error: feature.error };
  }
  const quote = parseAsOfMs(input.quoteAsOf);
  if (!quote.ok) {
    return { ok: false, code: "quote_asof", error: quote.error };
  }
  const decision = parseAsOfMs(input.decisionAsOf);
  if (!decision.ok) {
    return { ok: false, code: "decision_asof", error: decision.error };
  }

  if (feature.asOfMs > decision.asOfMs) {
    return {
      ok: false,
      code: "feature_after_decision",
      error: "featureAsOf must be ≤ decisionAsOf (no post-decision features)",
    };
  }
  if (quote.asOfMs > decision.asOfMs) {
    return {
      ok: false,
      code: "quote_after_decision",
      error: "quoteAsOf must be ≤ decisionAsOf (no post-decision quotes)",
    };
  }

  const consistencyBudget = input.consistencyBudgetMs ?? DEFAULT_CONSISTENCY_BUDGET_MS;
  const gap = Math.abs(quote.asOfMs - feature.asOfMs);
  if (gap > consistencyBudget) {
    return {
      ok: false,
      code: "consistency_window",
      error: `|quoteAsOf − featureAsOf| = ${gap}ms exceeds budget ${consistencyBudget}ms`,
    };
  }

  // Feature plane: cold stats can be older; still require some bound for "edge fire"
  const featureFresh = isFresh(
    feature.asOfIso,
    decision.asOfIso,
    maxAgeForCadence("daily"),
  );
  if (!featureFresh.fresh) {
    return {
      ok: false,
      code: "feature_stale",
      error: `feature age ${featureFresh.ageMs}ms exceeds daily budget`,
    };
  }

  const mkt = isMarketQuoteFresh({
    quoteAsOf: quote.asOfIso,
    now: input.now ?? decision.asOfIso,
    commenceTime: input.commenceTime,
  });
  if (!mkt.fresh) {
    return {
      ok: false,
      code: "quote_stale",
      error: `quote age ${mkt.ageMs}ms exceeds market budget ${mkt.budgetMs}ms`,
    };
  }

  const edge = input.p - input.q;
  return {
    ok: true,
    edge,
    p: input.p,
    q: input.q,
    featureAsOf: feature.asOfIso,
    quoteAsOf: quote.asOfIso,
    decisionAsOf: decision.asOfIso,
    consistencyGapMs: gap,
    marketAgeMs: mkt.ageMs,
    marketBudgetMs: mkt.budgetMs,
    formula: "e = p(featureAsOf) - q(quoteAsOf)",
  };
}

// ── Topology quality score (measurement > narrative) ──────────────────────

export interface TopologyHealthInput {
  readonly planes: Partial<
    Record<
      TruthPlane,
      {
        lastAsOf: string | null;
        rowsAvailable: number;
        errorRate: number; // 0..1
      }
    >
  >;
  readonly now: string;
  readonly liveBoardEnabled: boolean;
}

export interface TopologyHealth {
  readonly score: number; // 0..100
  readonly planeScores: Record<string, number>;
  readonly blockers: string[];
  /** Markets + box planes healthy enough to *consider* fire — not authorization. */
  readonly topologyReady: boolean;
  /**
   * Product-ready for edge fire. Requires topologyReady AND liveBoardEnabled.
   * LIVE_BOARD off ⇒ always false (founder gate).
   */
  readonly readyForEdgeFire: boolean;
}

export function scoreTopologyHealth(input: TopologyHealthInput): TopologyHealth {
  const blockers: string[] = [];
  const planeScores: Record<string, number> = {};
  let weightSum = 0;
  let acc = 0;

  const weights: Record<TruthPlane, number> = {
    markets: 30,
    box_advanced: 25,
    edge_gate: 20,
    weather: 10,
    optical: 5,
    cockpit_ui: 10,
  };

  for (const spec of GSE_TRUTH_PLANES) {
    const w = weights[spec.plane];
    weightSum += w;
    const st = input.planes[spec.plane];

    // Optical DARK and LIVE_BOARD-off cockpit are correct absences — not failures.
    if (spec.plane === "optical") {
      planeScores[spec.plane] = 100;
      acc += 100 * w;
      continue;
    }
    if (spec.plane === "cockpit_ui" && !input.liveBoardEnabled) {
      planeScores[spec.plane] = 90;
      acc += 90 * w;
      continue;
    }

    if (!st || !st.lastAsOf) {
      planeScores[spec.plane] = 0;
      if (spec.isSourceOfTruth) {
        blockers.push(`${spec.plane}: no data`);
      }
      continue;
    }
    const fresh = isFresh(st.lastAsOf, input.now, spec.maxAgeMs);
    let s = 100;
    if (!fresh.fresh) {
      s -= 50;
      if (spec.isSourceOfTruth) blockers.push(`${spec.plane}: stale`);
    }
    if (st.rowsAvailable <= 0) {
      s -= 40;
      blockers.push(`${spec.plane}: empty`);
    }
    s -= Math.min(40, st.errorRate * 100);
    const planeScore = Math.max(0, Math.min(100, s));
    planeScores[spec.plane] = planeScore;
    acc += planeScore * w;
  }

  const score = weightSum > 0 ? Math.round(acc / weightSum) : 0;
  const topologyReady =
    (planeScores.markets ?? 0) >= 60 &&
    (planeScores.box_advanced ?? 0) >= 50 &&
    !blockers.some((b) => b.startsWith("markets:") || b.startsWith("box_advanced:"));
  // Law: never readyForEdgeFire while LIVE_BOARD off — topology alone is not fire authority.
  const readyForEdgeFire = topologyReady && input.liveBoardEnabled;
  if (topologyReady && !input.liveBoardEnabled) {
    blockers.push("live_board_off");
  }

  return { score, planeScores, blockers, topologyReady, readyForEdgeFire };
}

// ── Improved topology description (for API) ───────────────────────────────

export function describeRealtimeTopology() {
  return {
    law: [
      "e = p(featureAsOf) − q(quoteAsOf)",
      "both asOf ≤ decisionAsOf",
      "consistency window between planes",
      "dynamic market freshness near kickoff",
      "SSE/LIVE_BOARD is projection not SoR",
      "optical DARK until ship",
      "PIT validation on every asOf",
    ],
    planes: GSE_TRUTH_PLANES,
    flow: [
      "cron/webhook → Prisma SoR",
      "write_through → online memory (process/Redis)",
      "cold batch (box/advanced) + hot plane (odds)",
      "GET /values?asOf= with PIT select",
      "computeDualAsOfEdge at decision",
      "optional SSE fanout when LIVE_BOARD on",
    ],
    nextForce: [
      "PlayerGameStat → NflverseMemoryStore write_through cron (landed)",
      "refresh-odds → cron_delta runner",
      "session tier → value reads (landed)",
      "Redis online store when multi-instance",
    ],
    consistencyBudgetMs: DEFAULT_CONSISTENCY_BUDGET_MS,
  };
}
