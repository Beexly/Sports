/**
 * C1 offline per-sport generative bake-off harness (cat:C1).
 *
 * Compares simple generative/logistic baselines vs market fair on identical
 * settled rows — OFFLINE / MEASUREMENT ONLY. Does not publish, does not flip
 * gates, does not change MODEL_VERSION.
 *
 * Anchors: iWinRNFL-style logistic spirit (1704.00197), Poisson vs ML lesson
 * (2408.08331), Lopez sport noise (1701.05976).
 *
 * Use with fixture JSON or identical-row inputs. No live board wiring.
 */

export type OfflineBakeoffRow = {
  readonly sport: string;
  /** Independent / generative model probability [0,1]. */
  readonly pModel: number;
  /** Market fair probability [0,1]. */
  readonly pMarket: number;
  /** Optional logistic baseline (e.g. iWinRNFL-style) [0,1]. */
  readonly pLogistic?: number | null;
  /** Optional Poisson/Skellam-mapped win prob [0,1]. */
  readonly pPoisson?: number | null;
  readonly y: 0 | 1;
};

export type ScoreKind = "model" | "market" | "logistic" | "poisson";

export type ScoreSummary = {
  readonly score: ScoreKind;
  readonly n: number;
  readonly brier: number | null;
  readonly logLoss: number | null;
  readonly meanAbsError: number | null;
};

export type OfflineBakeoffResult = {
  readonly n: number;
  readonly byScore: readonly ScoreSummary[];
  readonly bySport: readonly { readonly sport: string; readonly n: number; readonly byScore: readonly ScoreSummary[] }[];
  readonly notes: readonly string[];
};

function clampP(p: number): number {
  return Math.min(1 - 1e-6, Math.max(1e-6, p));
}

function brierOf(rows: readonly { p: number; y: 0 | 1 }[]): number | null {
  if (rows.length === 0) return null;
  let s = 0;
  for (const r of rows) {
    const p = clampP(r.p);
    s += (p - r.y) ** 2;
  }
  return s / rows.length;
}

function logLossOf(rows: readonly { p: number; y: 0 | 1 }[]): number | null {
  if (rows.length === 0) return null;
  let s = 0;
  for (const r of rows) {
    const p = clampP(r.p);
    s += r.y === 1 ? -Math.log(p) : -Math.log(1 - p);
  }
  return s / rows.length;
}

function maeOf(rows: readonly { p: number; y: 0 | 1 }[]): number | null {
  if (rows.length === 0) return null;
  let s = 0;
  for (const r of rows) s += Math.abs(clampP(r.p) - r.y);
  return s / rows.length;
}

function summarize(score: ScoreKind, pairs: readonly { p: number; y: 0 | 1 }[]): ScoreSummary {
  return {
    score,
    n: pairs.length,
    brier: brierOf(pairs),
    logLoss: logLossOf(pairs),
    meanAbsError: maeOf(pairs),
  };
}

function extract(
  rows: readonly OfflineBakeoffRow[],
  kind: ScoreKind,
): { p: number; y: 0 | 1 }[] {
  const out: { p: number; y: 0 | 1 }[] = [];
  for (const r of rows) {
    let p: number | null | undefined;
    switch (kind) {
      case "model":
        p = r.pModel;
        break;
      case "market":
        p = r.pMarket;
        break;
      case "logistic":
        p = r.pLogistic;
        break;
      case "poisson":
        p = r.pPoisson;
        break;
    }
    if (typeof p === "number" && Number.isFinite(p)) out.push({ p, y: r.y });
  }
  return out;
}

const KINDS: ScoreKind[] = ["model", "market", "logistic", "poisson"];

/** Run offline bake-off on fixture rows. Empty input → n 0, null metrics. */
export function runOfflineGenerativeBakeoff(rows: readonly OfflineBakeoffRow[]): OfflineBakeoffResult {
  const byScore = KINDS.map((k) => summarize(k, extract(rows, k)));
  const sports = [...new Set(rows.map((r) => r.sport))].sort();
  const bySport = sports.map((sport) => {
    const slice = rows.filter((r) => r.sport === sport);
    return {
      sport,
      n: slice.length,
      byScore: KINDS.map((k) => summarize(k, extract(slice, k))),
    };
  });
  return {
    n: rows.length,
    byScore,
    bySport,
    notes: [
      "Offline / measurement only — no publish path, no gate reads.",
      "Compare model vs market Brier on identical rows; sport slices expose Lopez-style noise differences.",
      "logistic / poisson columns are optional baselines; null n means that head was not supplied on the fixture.",
      "Feature/learner choice matters less than sport structure (2408.08331) — use this table before swapping estimators.",
    ],
  };
}

/** Tiny golden fixture for CI without a live DB. */
export const OFFLINE_BAKEOFF_FIXTURE: readonly OfflineBakeoffRow[] = [
  { sport: "americanfootball_nfl", pModel: 0.58, pMarket: 0.55, pLogistic: 0.57, pPoisson: 0.56, y: 1 },
  { sport: "americanfootball_nfl", pModel: 0.42, pMarket: 0.48, pLogistic: 0.44, pPoisson: 0.45, y: 0 },
  { sport: "baseball_mlb", pModel: 0.51, pMarket: 0.5, pLogistic: 0.505, pPoisson: 0.5, y: 1 },
  { sport: "baseball_mlb", pModel: 0.49, pMarket: 0.52, pLogistic: 0.5, pPoisson: 0.51, y: 0 },
  { sport: "soccer_usa_mls", pModel: 0.4, pMarket: 0.38, pLogistic: 0.39, pPoisson: 0.41, y: 0 },
  { sport: "soccer_usa_mls", pModel: 0.35, pMarket: 0.4, pLogistic: 0.36, pPoisson: 0.37, y: 1 },
];
