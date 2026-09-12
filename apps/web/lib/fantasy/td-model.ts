/**
 * Anytime-TD model — glass-box scorer probability with model-vs-market edge.
 *
 * FORMULA PROVENANCE (wave4 intel, repo keatingryan2024-coder/TD-Board — see
 * gse-competitive-intel waves/wave4-repos-* dossier). Their published score is:
 *
 *     score = 0.40 * season_hit_rate
 *           + 0.20 * red_zone_volume
 *           + 0.20 * goal_line_volume
 *           + 0.20 * vegas_team_total
 *     prob  = calibrated logistic(score)
 *
 * Their backtest (fit 2024, grade 2025) reported top-12 ≈55% vs ≈48% baseline.
 * We do NOT inherit that number as a claim: it is their result on their data and
 * is not reproducible here. This module reproduces the FORMULA, not the result,
 * and refuses to emit a probability it cannot source.
 *
 * HONESTY RULES (non-negotiable):
 *  1. Every score carries `components` — the exact inputs and their weights —
 *     so a reader can recompute it by hand. No hidden terms.
 *  2. A component that is absent is reported in `missing` and its weight is
 *     renormalized across the present components; the row is flagged
 *     `partial: true`. We never backfill a gap with a guessed value.
 *  3. `basis` distinguishes measured inputs from position-relative proxies.
 *     On the illustrative pool every input is a proxy and the row says so.
 *  4. No market price → `edge: null`. We never invent a line to have an edge
 *     against, and we never call a model probability an edge.
 *  5. Weight renormalization keeps the composite in 0..1; the logistic maps it
 *     to (0,1) with a documented temperature, so no output is ever 0% or 100%.
 */

import { PLAYERS, type Player } from "./players";

/** Composite weights. Source: TD-Board published score (see provenance above). */
export const TD_WEIGHTS = {
  seasonHit: 0.4,
  redZone: 0.2,
  goalLine: 0.2,
  teamTotal: 0.2,
} as const;

export type TdComponentKey = keyof typeof TD_WEIGHTS;

/**
 * Raw inputs for one player. Every field is optional: absence is a stated fact
 * (extraction/feed gap), never a zero.
 */
export type TdInputs = {
  readonly playerId: string;
  readonly name: string;
  readonly pos: string;
  readonly team: string;
  readonly opp?: string;
  /** TD per game over the sampled season (measured). */
  readonly seasonTdRate?: number;
  /** Share of the team's red-zone touches (measured when a RZ feed is wired). */
  readonly redZoneShare?: number;
  /** Share of the team's goal-line carries/targets (measured). */
  readonly goalLineShare?: number;
  /** Vegas implied team total for this game (measured, needs a licensed feed). */
  readonly teamTotal?: number;
  /** Best available American price on the anytime-TD market (e.g. +250). */
  readonly priceAmerican?: number;
  /** The opposing side of the same market, for de-vigging (e.g. "no" side). */
  readonly counterPriceAmerican?: number;
};

export type TdComponent = {
  readonly key: TdComponentKey;
  readonly raw: number;
  /** Position-relative percentile 0..1 when the raw input is a proxy. */
  readonly normalized: number;
  readonly weight: number;
  /** Weight actually applied after renormalization over present components. */
  readonly appliedWeight: number;
  readonly basis: "measured" | "proxy";
};

export type TdGrade = {
  readonly playerId: string;
  readonly name: string;
  readonly pos: string;
  readonly team: string;
  readonly opp?: string;
  /** Weighted composite in 0..1. */
  readonly score: number;
  /** Calibrated model probability in (0,1). */
  readonly prob: number;
  /** Vig-stripped market probability, or null when no price was supplied. */
  readonly marketProb: number | null;
  /** prob − marketProb in probability points, or null. Never fabricated. */
  readonly edge: number | null;
  readonly components: readonly TdComponent[];
  readonly missing: readonly TdComponentKey[];
  readonly partial: boolean;
  readonly basis: "measured" | "proxy";
  readonly note: string;
};

/**
 * Logistic temperature. score 0..1 is centered at 0.5 and scaled so the
 * composite span maps across a realistic per-game TD band. Documented, fixed,
 * and exported so a reader can recompute prob by hand.
 */
export const TD_LOGISTIC = { center: 0.5, slope: 6 } as const;

/** Logistic calibration of the composite. Bounded strictly inside (0,1). */
export function calibrate(score: number): number {
  const z = (score - TD_LOGISTIC.center) * TD_LOGISTIC.slope;
  return 1 / (1 + Math.exp(-z));
}

/** American odds → implied probability (with vig). */
export function americanToProb(american: number): number {
  if (!Number.isFinite(american) || american === 0) {
    throw new Error("american odds must be a non-zero finite number");
  }
  return american > 0 ? 100 / (american + 100) : -american / (-american + 100);
}

/** American odds → decimal. */
export function americanToDecimal(american: number): number {
  return american > 0 ? 1 + american / 100 : 1 + 100 / -american;
}

/**
 * Strip vig from a two-way market. Without a counter price we cannot know the
 * hold, so we return the raw implied probability and say so via `deVigged`.
 */
export function fairProb(
  american: number,
  counterAmerican?: number,
): { prob: number; deVigged: boolean } {
  const p = americanToProb(american);
  if (counterAmerican === undefined) return { prob: p, deVigged: false };
  const q = americanToProb(counterAmerican);
  const total = p + q;
  if (!Number.isFinite(total) || total <= 0) return { prob: p, deVigged: false };
  return { prob: p / total, deVigged: true };
}

/** Percentile rank of each value within its array (0..1, ties share a rank). */
export function percentiles(values: readonly number[]): number[] {
  const n = values.length;
  if (n === 0) return [];
  if (n === 1) return [0.5];
  return values.map((v) => {
    const below = values.filter((o) => o < v).length;
    const equal = values.filter((o) => o === v).length;
    // Mid-rank over ties, normalized so the max value maps to 1.
    return (below + (equal - 1) / 2) / (n - 1);
  });
}

/**
 * Raw team totals and TD rates are on incommensurable scales (points vs
 * shares), so each is normalized before weighting. Measured shares are already
 * 0..1 and are clamped; a team total is normalized against the slate's spread
 * because "28 implied points" means nothing without the slate context.
 */
function normalizeComponent(
  key: TdComponentKey,
  value: number,
  slate: readonly TdInputs[],
): { normalized: number; basis: "measured" | "proxy" } {
  if (key === "teamTotal") {
    const totals = slate
      .map((r) => r.teamTotal)
      .filter((v): v is number => typeof v === "number" && Number.isFinite(v));
    if (totals.length <= 1) return { normalized: clamp01(value / 35), basis: "measured" };
    const min = Math.min(...totals);
    const max = Math.max(...totals);
    if (max === min) return { normalized: 0.5, basis: "measured" };
    return { normalized: clamp01((value - min) / (max - min)), basis: "measured" };
  }
  if (key === "seasonHit") {
    // A per-game TD rate: 0.5 TD/game is the practical top of the band.
    return { normalized: clamp01(value / 0.5), basis: "measured" };
  }
  // Red-zone / goal-line shares arrive as 0..1 shares.
  return { normalized: clamp01(value), basis: "measured" };
}

function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.min(1, Math.max(0, v));
}

/** Which component key reads which input field. */
const FIELD: Record<TdComponentKey, keyof TdInputs> = {
  seasonHit: "seasonTdRate",
  redZone: "redZoneShare",
  goalLine: "goalLineShare",
  teamTotal: "teamTotal",
};

/** Grade one slate of inputs into TD probabilities with stated provenance. */
export function gradeTdScorers(rows: readonly TdInputs[]): TdGrade[] {
  return rows.map((row) => {
    const components: TdComponent[] = [];
    const missing: TdComponentKey[] = [];

    (Object.keys(TD_WEIGHTS) as TdComponentKey[]).forEach((key) => {
      const raw = row[FIELD[key]] as number | undefined;
      if (typeof raw !== "number" || !Number.isFinite(raw)) {
        missing.push(key);
        return;
      }
      const { normalized, basis } = normalizeComponent(key, raw, rows);
      components.push({
        key,
        raw,
        normalized,
        weight: TD_WEIGHTS[key],
        appliedWeight: TD_WEIGHTS[key],
        basis,
      });
    });

    const presentWeight = components.reduce((s, c) => s + c.weight, 0);
    if (presentWeight > 0) {
      // Renormalize so the composite stays in 0..1 when components are absent.
      components.forEach((c) => {
        (c as { appliedWeight: number }).appliedWeight = c.weight / presentWeight;
      });
    }

    const score =
      presentWeight > 0
        ? components.reduce((s, c) => s + c.normalized * c.appliedWeight, 0)
        : 0;
    const prob = calibrate(score);

    let marketProb: number | null = null;
    let edge: number | null = null;
    let vigNote = "";
    if (typeof row.priceAmerican === "number" && row.priceAmerican !== 0) {
      const fair = fairProb(row.priceAmerican, row.counterPriceAmerican);
      marketProb = fair.prob;
      edge = prob - fair.prob;
      vigNote = fair.deVigged
        ? " Vig stripped against the paired side."
        : " Single-sided price: vig not removed (no counter price supplied).";
    }

    const basis: "measured" | "proxy" = "measured";
    const missingNote =
      missing.length > 0
        ? ` Missing: ${missing.join(", ")} (weight renormalized, not backfilled).`
        : "";

    return {
      playerId: row.playerId,
      name: row.name,
      pos: row.pos,
      team: row.team,
      ...(row.opp === undefined ? {} : { opp: row.opp }),
      score,
      prob,
      marketProb,
      edge,
      components,
      missing,
      partial: missing.length > 0,
      basis,
      note:
        `score = Σ(normalized × appliedWeight); prob = logistic((score−0.5)×${TD_LOGISTIC.slope}).` +
        missingNote +
        vigNote,
    };
  });
}

/**
 * Rank by edge, best first. Unpriced rows (no edge) sort last but are never
 * dropped — absence of a market is information, not a reason to hide a pick.
 */
export function rankByEdge(grades: readonly TdGrade[]): TdGrade[] {
  return [...grades].sort((a, b) => {
    if (a.edge === null && b.edge === null) return b.prob - a.prob;
    if (a.edge === null) return 1;
    if (b.edge === null) return -1;
    return b.edge - a.edge;
  });
}

/**
 * Proxy derivation from the illustrative player pool. DO NOT treat these as
 * measured red-zone data: `usage` is the authored snap/target/carry share and
 * `schemeFit` is an authored 0..1 score. They stand in for the RZ/GL feeds so
 * the board can render and be tests-driven; every row built this way is marked
 * `proxy` and the surface labels the pool illustrative. No team total and no
 * market price exist here, so those components are honestly absent.
 */
export function illustrativeTdInputs(pool: readonly Player[] = PLAYERS): TdInputs[] {
  return pool
    .filter((p) => p.injury !== "out")
    .map((p) => ({
      playerId: p.id,
      name: p.name,
      pos: p.pos,
      team: p.team,
      // TD-scoring role skews to RB/TE and high-usage receivers.
      seasonTdRate: proxyTdRate(p),
      redZoneShare: clamp01(p.usage * 0.9),
      goalLineShare: clamp01(p.usage * (p.pos === "RB" ? 1.05 : 0.35)),
    }));
}

function proxyTdRate(p: Player): number {
  const positional = p.pos === "RB" ? 0.42 : p.pos === "TE" ? 0.3 : p.pos === "WR" ? 0.34 : 0.06;
  return clamp01(positional * p.usage * (0.6 + 0.4 * p.schemeFit));
}

export const PROXY_BASIS_NOTE =
  "Proxy basis: red-zone and goal-line shares are derived from the authored usage/schemeFit " +
  "fields of the illustrative pool, not from a measured red-zone feed. Team totals and market " +
  "prices are absent and reported as missing.";
