/**
 * C2 offline strength-feature bake-off (cat:C2).
 *
 * Compare candidate STRENGTH FEATURES on identical settled rows before swapping
 * learners (2405.10247 / 2408.08331). Measurement only — no production rating
 * swap, no MODEL_VERSION change, no gate flips.
 *
 * Features:
 *   current — baseline model / ranking probability already on the row
 *   elo     — logistic map of Elo rating differential
 *   btl     — Bradley–Terry logistic map of latent strength differential
 *   pi      — pi-rating style exponential smoothing differential → logistic
 *   market  — market fair probability (benchmark, not a rating feature)
 */

export type StrengthFeatureKind = "current" | "elo" | "btl" | "pi" | "market";

export type OfflineStrengthRow = {
  readonly sport: string;
  /** Baseline / current model probability for the taken side [0,1]. */
  readonly pCurrent: number;
  /** Market fair probability [0,1]. */
  readonly pMarket: number;
  /** Elo differential (home − away) in Elo points; typical scale ~400. */
  readonly eloDiff: number;
  /** Latent BTL strength differential (log-odds units). */
  readonly btlDiff: number;
  /** Pi-rating differential (same spirit as Elo, often smaller scale). */
  readonly piDiff: number;
  readonly y: 0 | 1;
};

export type StrengthScoreSummary = {
  readonly feature: StrengthFeatureKind;
  readonly n: number;
  readonly brier: number | null;
  readonly logLoss: number | null;
  readonly meanAbsError: number | null;
  /** MAE(feature) − MAE(market); negative means closer to outcomes than market. */
  readonly maeDeltaVsMarket: number | null;
  /** MAE(feature) − MAE(current); negative means closer than current baseline. */
  readonly maeDeltaVsCurrent: number | null;
};

export type OfflineStrengthBakeoffResult = {
  readonly n: number;
  readonly byFeature: readonly StrengthScoreSummary[];
  readonly bySport: readonly {
    readonly sport: string;
    readonly n: number;
    readonly byFeature: readonly StrengthScoreSummary[];
  }[];
  readonly notes: readonly string[];
};

function clampP(p: number): number {
  return Math.min(1 - 1e-6, Math.max(1e-6, p));
}

/** Logistic map: p = 1 / (1 + exp(−diff / scale)). */
export function logisticFromDiff(diff: number, scale: number): number {
  if (!Number.isFinite(diff) || !Number.isFinite(scale) || scale === 0) return 0.5;
  return clampP(1 / (1 + Math.exp(-diff / scale)));
}

/** Classic Elo win probability from rating differential (scale 400). */
export function eloWinProb(eloDiff: number): number {
  return logisticFromDiff(eloDiff, 400 / Math.LN10);
}

export function btlWinProb(btlDiff: number): number {
  return logisticFromDiff(btlDiff, 1);
}

/** Pi-rating differentials are often smaller; use Elo-like 400/ln(10) default. */
export function piWinProb(piDiff: number): number {
  return logisticFromDiff(piDiff, 400 / Math.LN10);
}

function brierOf(rows: readonly { p: number; y: 0 | 1 }[]): number | null {
  if (rows.length === 0) return null;
  let s = 0;
  for (const r of rows) s += (clampP(r.p) - r.y) ** 2;
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

function extract(
  rows: readonly OfflineStrengthRow[],
  kind: StrengthFeatureKind,
): { p: number; y: 0 | 1 }[] {
  const out: { p: number; y: 0 | 1 }[] = [];
  for (const r of rows) {
    let p: number;
    switch (kind) {
      case "current":
        p = r.pCurrent;
        break;
      case "market":
        p = r.pMarket;
        break;
      case "elo":
        p = eloWinProb(r.eloDiff);
        break;
      case "btl":
        p = btlWinProb(r.btlDiff);
        break;
      case "pi":
        p = piWinProb(r.piDiff);
        break;
    }
    if (typeof p === "number" && Number.isFinite(p) && (r.y === 0 || r.y === 1)) {
      out.push({ p, y: r.y });
    }
  }
  return out;
}

const FEATURES: StrengthFeatureKind[] = ["current", "elo", "btl", "pi", "market"];

function summarize(
  feature: StrengthFeatureKind,
  pairs: readonly { p: number; y: 0 | 1 }[],
  marketMae: number | null,
  currentMae: number | null,
): StrengthScoreSummary {
  const mae = maeOf(pairs);
  return {
    feature,
    n: pairs.length,
    brier: brierOf(pairs),
    logLoss: logLossOf(pairs),
    meanAbsError: mae,
    maeDeltaVsMarket: mae != null && marketMae != null ? mae - marketMae : null,
    maeDeltaVsCurrent:
      mae != null && currentMae != null && feature !== "current" ? mae - currentMae : null,
  };
}

function summarizeAll(rows: readonly OfflineStrengthRow[]): StrengthScoreSummary[] {
  const marketMae = maeOf(extract(rows, "market"));
  const currentMae = maeOf(extract(rows, "current"));
  return FEATURES.map((f) => summarize(f, extract(rows, f), marketMae, currentMae));
}

/** Run offline strength-feature bake-off. Empty → n 0, null metrics. */
export function runOfflineStrengthFeatureBakeoff(
  rows: readonly OfflineStrengthRow[],
): OfflineStrengthBakeoffResult {
  const byFeature = summarizeAll(rows);
  const sports = [...new Set(rows.map((r) => r.sport))].sort();
  const bySport = sports.map((sport) => {
    const slice = rows.filter((r) => r.sport === sport);
    return { sport, n: slice.length, byFeature: summarizeAll(slice) };
  });
  return {
    n: rows.length,
    byFeature,
    bySport,
    notes: [
      "Offline / measurement only — no production rating swap, no gate reads.",
      "Fix MAE by baking better strength features before swapping XGBoost/NN (2408.08331).",
      "Negative maeDeltaVsMarket / maeDeltaVsCurrent means the feature is closer to outcomes.",
      "Do not wire a winner into live scoring without founder OK.",
    ],
  };
}

/** Tiny golden fixture for CI without a live DB. */
export const OFFLINE_STRENGTH_BAKEOFF_FIXTURE: readonly OfflineStrengthRow[] = [
  {
    sport: "americanfootball_nfl",
    pCurrent: 0.58,
    pMarket: 0.55,
    eloDiff: 80,
    btlDiff: 0.35,
    piDiff: 70,
    y: 1,
  },
  {
    sport: "americanfootball_nfl",
    pCurrent: 0.42,
    pMarket: 0.48,
    eloDiff: -40,
    btlDiff: -0.2,
    piDiff: -30,
    y: 0,
  },
  {
    sport: "baseball_mlb",
    pCurrent: 0.51,
    pMarket: 0.5,
    eloDiff: 10,
    btlDiff: 0.05,
    piDiff: 8,
    y: 1,
  },
  {
    sport: "baseball_mlb",
    pCurrent: 0.49,
    pMarket: 0.52,
    eloDiff: -15,
    btlDiff: -0.08,
    piDiff: -12,
    y: 0,
  },
  {
    sport: "soccer_usa_mls",
    pCurrent: 0.4,
    pMarket: 0.38,
    eloDiff: -60,
    btlDiff: -0.25,
    piDiff: -55,
    y: 0,
  },
  {
    sport: "soccer_usa_mls",
    pCurrent: 0.35,
    pMarket: 0.4,
    eloDiff: -90,
    btlDiff: -0.4,
    piDiff: -85,
    y: 1,
  },
];
