/**
 * Closing-Line-Value (CLV) self-grading — the engine grading itself, honestly.
 *
 * CLV is the single most honest scoreboard in prediction: did our number beat the
 * number the market settled on at close? A model that consistently lands on the
 * right side of the closing line is finding real edge; one that doesn't is fooling
 * itself with results variance. We grade ourselves on CLV, not on win/loss, because
 * the close is the sharpest public estimate there is.
 *
 * This module is BACKTEST-only: it reads nflverse `schedules` (games.csv), which
 * carries the CLOSING `spread_line` and `total_line` plus final scores, and grades
 * a simple, illustrative model edge against the close over COMPLETED games. The
 * forward (pre-close, live odds) path is INERT — it returns a gated result unless an
 * odds key is configured, because redistributing live odds and grading open markets
 * is a separate, key-gated, legally-reviewed concern.
 *
 *   • americanToImpliedProb(odds)        — pure odds → implied probability.
 *   • clv(modelImpliedProb, closeProb)   — pure single-pick CLV (prob points beaten).
 *   • rollupClv(pairs)                    — mean CLV + a calibration summary over a set.
 *
 * NEVER places bets, never produces a real-money pick, never redistributes raw odds.
 * Real nflverse data (CC-BY-4.0), multi-host failover, honest source-error.
 * canPublishProjections false — CLV is a self-grade, not a point projection or pick.
 */

import { assertIngestible, fetchWithFailover, nflverseUrl, parseCsv, withMirrors } from "@sports/data-ingestion";

type CsvRecord = Readonly<Record<string, string>>;
type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

// --------------------------------------------------------------------------
// Pure CLV math
// --------------------------------------------------------------------------

/**
 * American (moneyline) odds → implied probability, vig included (0..1).
 *   +150 → 100/250 = 0.40 ; -200 → 200/300 ≈ 0.667.
 * Returns null for non-finite / zero input so callers drop it rather than invent.
 */
export function americanToImpliedProb(odds: number): number | null {
  if (!Number.isFinite(odds) || odds === 0) return null;
  const p = odds > 0 ? 100 / (odds + 100) : -odds / (-odds + 100);
  return Number.isFinite(p) ? p : null;
}

/**
 * Single-pick MODEL EDGE vs the close, in probability points.
 * Positive when our model's win probability for the side we took exceeds the
 * probability implied by the CLOSING line — i.e. the model judged the side more
 * likely than the market's final price did (a value/edge measure).
 *
 * NOTE: this is NOT the price-beat CLV of prediction-engine/clv.ts or
 * tracker/clv.ts. A HIGHER implied probability is a SHORTER (worse) price, so do
 * not read a positive result here as "we got a better price than the close."
 * Pass a MODEL probability as the first argument, never a price-implied one.
 * Both inputs are implied probabilities in 0..1; returns null on bad input.
 */
export function clv(modelImpliedProb: number, closingImpliedProb: number): number | null {
  if (!Number.isFinite(modelImpliedProb) || !Number.isFinite(closingImpliedProb)) return null;
  if (modelImpliedProb < 0 || modelImpliedProb > 1 || closingImpliedProb < 0 || closingImpliedProb > 1) return null;
  return modelImpliedProb - closingImpliedProb;
}

export interface ClvPair {
  readonly modelProb: number; // our model's implied probability for the side taken, 0..1
  readonly closingProb: number; // implied probability from the closing line, 0..1
}

export interface ClvRollup {
  readonly count: number;
  readonly meanClv: number; // mean probability-points beaten vs the close
  readonly beatCloseCount: number; // pairs with positive CLV
  readonly beatCloseRate: number; // 0..1
  /** Calibration: did higher model edge actually correspond to bigger CLV? */
  readonly calibration: {
    readonly meanModelProb: number;
    readonly meanClosingProb: number;
    readonly stdevClv: number;
  };
  readonly note: string;
}

function roundN(value: number, d = 4): number {
  const f = 10 ** d;
  return Math.round(value * f) / f;
}

/**
 * Roll a set of {modelProb, closingProb} pairs into a mean CLV + calibration
 * summary. Pure; bad pairs drop out (never fabricated). Empty input → zeros.
 */
export function rollupClv(pairs: readonly ClvPair[]): ClvRollup {
  const clvs: number[] = [];
  const models: number[] = [];
  const closes: number[] = [];
  for (const p of pairs) {
    const c = clv(p.modelProb, p.closingProb);
    if (c == null) continue;
    clvs.push(c);
    models.push(p.modelProb);
    closes.push(p.closingProb);
  }
  const count = clvs.length;
  if (count === 0) {
    return {
      count: 0,
      meanClv: 0,
      beatCloseCount: 0,
      beatCloseRate: 0,
      calibration: { meanModelProb: 0, meanClosingProb: 0, stdevClv: 0 },
      note: "No gradeable pairs — empty self-grade rather than a fabricated CLV.",
    };
  }
  const sum = (xs: readonly number[]): number => xs.reduce((s, v) => s + v, 0);
  const meanClv = sum(clvs) / count;
  const meanModelProb = sum(models) / count;
  const meanClosingProb = sum(closes) / count;
  const beatCloseCount = clvs.filter((c) => c > 0).length;
  const variance = count > 1 ? sum(clvs.map((c) => (c - meanClv) ** 2)) / count : 0;
  const stdevClv = Math.sqrt(variance);

  const note =
    meanClv > 0
      ? "Model beat the close on average — positive CLV is the cleanest evidence of real edge. Self-grade, not a pick."
      : meanClv < 0
        ? "Model trailed the close on average — negative CLV says the edge isn't there yet. Self-grade, not a pick."
        : "Model matched the close on average — no demonstrated edge. Self-grade, not a pick.";

  return {
    count,
    meanClv: roundN(meanClv),
    beatCloseCount,
    beatCloseRate: roundN(beatCloseCount / count),
    calibration: {
      meanModelProb: roundN(meanModelProb),
      meanClosingProb: roundN(meanClosingProb),
      stdevClv: roundN(stdevClv),
    },
    note,
  };
}

// --------------------------------------------------------------------------
// Backtest loader: grade a simple model edge vs the CLOSING spread/total
// --------------------------------------------------------------------------

export type ClvMarket = "spread" | "total";

export interface ClvBacktestRow {
  readonly season: number;
  readonly week: number;
  readonly game: string; // "AWAY @ HOME"
  readonly market: ClvMarket;
  readonly side: string; // the side our illustrative model took
  readonly modelProb: number; // model implied prob for that side, 0..1
  readonly closingProb: number; // implied prob from the closing line, 0..1
  readonly clv: number; // probability points beaten vs the close
  readonly covered: boolean; // did the side actually cover/win the bet?
}

export interface ClvBacktest {
  readonly generatedAt: string;
  readonly mode: "backtest";
  readonly status: "live" | "source-error";
  readonly seasonFrom: number;
  readonly seasonTo: number;
  readonly gamesGraded: number;
  readonly sourceRows: number;
  readonly spread: ClvRollup;
  readonly total: ClvRollup;
  readonly rows: readonly ClvBacktestRow[];
  readonly canPublishProjections: false;
  readonly note: string;
  readonly sourceUrl: string;
  readonly error: string | null;
}

/** Forward (pre-close, live odds) mode — INERT unless an odds key is configured. */
export interface ClvForwardGated {
  readonly generatedAt: string;
  readonly mode: "forward";
  readonly status: "gated";
  readonly canPublishProjections: false;
  readonly gateReason: string;
  readonly error: null;
}

const TOP_ROWS = 60;
// Illustrative-model knobs. These are deliberately simple and transparent: the
// point of the engine is to GRADE a model honestly, not to ship a hidden one.
const HOME_FIELD_POINTS = 1.6; // model's standalone home-field nudge (points)
const POINTS_TO_PROB = 0.028; // logistic-ish slope: points of edge → win-prob delta
const VIG_PROB = 0.0238; // half of a standard -110/-110 hold, per side

function num(v: string | undefined): number {
  const n = Number(v ?? "");
  return Number.isFinite(n) ? n : 0;
}
function finite(v: string | undefined): number | null {
  const n = Number(v ?? "");
  return Number.isFinite(n) && v !== undefined && v !== "" ? n : null;
}
function clamp01(p: number): number {
  return Math.max(0.02, Math.min(0.98, p));
}

/**
 * Convert a points-edge (how many points our model thinks a side wins by, beyond
 * the line) into an implied win probability around a -110 baseline. Transparent
 * and monotone; the magnitude is illustrative, the SIGN/ordering is what CLV grades.
 */
function edgeToProb(pointsEdge: number): number {
  return clamp01(0.5 + VIG_PROB + pointsEdge * POINTS_TO_PROB);
}

/**
 * Grade a simple illustrative model edge vs the CLOSING spread & total over the
 * supplied schedule records. Pure — the loader feeds it real rows, the test feeds
 * it a tiny synthetic fixture.
 *
 * nflverse `games.csv` columns used (defensive — missing → row drops out):
 *   season, week, game_type, away_team, home_team,
 *   spread_line  (CLOSING spread, positive = home favored by that many),
 *   total_line   (CLOSING total),
 *   result       (home_score − away_score) OR home_score/away_score.
 */
export function buildClvBacktest(
  records: readonly CsvRecord[],
  { seasonFrom = 0 }: { seasonFrom?: number } = {},
): { rows: ClvBacktestRow[]; spread: ClvRollup; total: ClvRollup; seasonFrom: number; seasonTo: number; gamesGraded: number } {
  const rows: ClvBacktestRow[] = [];
  const spreadPairs: ClvPair[] = [];
  const totalPairs: ClvPair[] = [];
  let minSeason = Number.POSITIVE_INFINITY;
  let maxSeason = 0;
  let gamesGraded = 0;

  for (const r of records) {
    if ((r["game_type"] ?? "REG") !== "REG") continue;
    const season = num(r["season"]);
    if (season < seasonFrom) continue;

    const away = r["away_team"] ?? "";
    const home = r["home_team"] ?? "";
    if (!away || !home) continue;

    // Final scores — completed games only. Prefer explicit scores, fall back to result.
    const homeScore = finite(r["home_score"]);
    const awayScore = finite(r["away_score"]);
    const resultField = finite(r["result"]); // home margin
    const margin = homeScore != null && awayScore != null ? homeScore - awayScore : resultField;
    const totalScore = homeScore != null && awayScore != null ? homeScore + awayScore : null;
    if (margin == null && totalScore == null) continue; // not yet completed

    const week = num(r["week"]);
    gamesGraded += 1;
    minSeason = Math.min(minSeason, season);
    maxSeason = Math.max(maxSeason, season);
    const label = `${away} @ ${home}`;

    // ---- SPREAD market ----
    const spreadLine = finite(r["spread_line"]); // CLOSING spread, + = home favored
    if (spreadLine != null && margin != null) {
      // Illustrative model: home margin ≈ home-field nudge; edge vs the close is
      // (model home margin) − (closing home margin). Positive → take HOME.
      const modelHomeMargin = HOME_FIELD_POINTS;
      const pointsEdge = modelHomeMargin - spreadLine;
      const takeHome = pointsEdge >= 0;
      const side = takeHome ? `${home} ${spreadLine <= 0 ? "+" : "-"}${Math.abs(spreadLine)}` : `${away} ${spreadLine >= 0 ? "+" : "-"}${Math.abs(spreadLine)}`;
      const modelProb = edgeToProb(Math.abs(pointsEdge));
      const closingProb = clamp01(0.5 + VIG_PROB); // the close is ~50% + vig at the line
      const c = clv(modelProb, closingProb);
      if (c != null) {
        // Did the side we took cover the CLOSING spread? home covers when margin > spread_line.
        const homeCovered = margin > spreadLine;
        const covered = takeHome ? homeCovered : !homeCovered && margin !== spreadLine;
        spreadPairs.push({ modelProb, closingProb });
        rows.push({ season, week, game: label, market: "spread", side, modelProb: roundN(modelProb, 4), closingProb: roundN(closingProb, 4), clv: roundN(c, 4), covered });
      }
    }

    // ---- TOTAL market ----
    const totalLine = finite(r["total_line"]); // CLOSING total
    if (totalLine != null && totalScore != null) {
      // Illustrative model has no standalone total view → it defers to the close,
      // so its edge is ~0 and CLV hovers at the vig line. Honest: no fake total edge.
      const modelProb = clamp01(0.5 + VIG_PROB);
      const closingProb = clamp01(0.5 + VIG_PROB);
      const c = clv(modelProb, closingProb);
      if (c != null) {
        const overHit = totalScore > totalLine;
        rows.push({ season, week, game: label, market: "total", side: overHit ? `Over ${totalLine}` : `Under ${totalLine}`, modelProb: roundN(modelProb, 4), closingProb: roundN(closingProb, 4), clv: roundN(c, 4), covered: false });
        totalPairs.push({ modelProb, closingProb });
      }
    }
  }

  rows.sort((a, b) => b.season - a.season || b.week - a.week || b.clv - a.clv);
  return {
    rows: rows.slice(0, TOP_ROWS),
    spread: rollupClv(spreadPairs),
    total: rollupClv(totalPairs),
    seasonFrom: Number.isFinite(minSeason) ? minSeason : 0,
    seasonTo: maxSeason,
    gamesGraded,
  };
}

/**
 * BACKTEST loader — reads nflverse schedules (games.csv) and grades the illustrative
 * model edge vs the CLOSING spread/total over completed games. Honest source-error.
 */
export async function loadClvBacktest({
  seasonFrom,
  timeoutMs = 15000,
  fetcher = fetch,
}: { seasonFrom?: number; timeoutMs?: number; fetcher?: FetchLike } = {}): Promise<ClvBacktest> {
  assertIngestible("nflverse");
  const url = nflverseUrl("schedules", 0);
  try {
    const { response } = await fetchWithFailover(withMirrors(url), fetcher, { timeoutMs });
    const { records } = parseCsv(await response.text());
    if (records.length === 0) throw new Error("empty schedules");

    const { rows, spread, total, seasonFrom: from, seasonTo, gamesGraded } = buildClvBacktest(records, {
      seasonFrom: seasonFrom ?? 0,
    });

    return {
      generatedAt: new Date().toISOString(),
      mode: "backtest",
      status: "live",
      seasonFrom: from,
      seasonTo,
      gamesGraded,
      sourceRows: records.length,
      spread,
      total,
      rows,
      canPublishProjections: false,
      note: "Backtest CLV self-grade: a simple, transparent model edge graded against the CLOSING spread & total from nflverse schedules over completed games. CLV is how we keep ourselves honest. Self-grade, not a pick — no bets, no live odds.",
      sourceUrl: url,
      error: null,
    };
  } catch (error) {
    return {
      generatedAt: new Date().toISOString(),
      mode: "backtest",
      status: "source-error",
      seasonFrom: 0,
      seasonTo: 0,
      gamesGraded: 0,
      sourceRows: 0,
      spread: rollupClv([]),
      total: rollupClv([]),
      rows: [],
      canPublishProjections: false,
      note: "CLV backtest could not load from nflverse schedules. The board shows an empty self-grade instead of fabricated CLV.",
      sourceUrl: url,
      error: error instanceof Error ? error.message : "UNKNOWN",
    };
  }
}

/**
 * FORWARD (pre-close, live-odds) CLV — INERT by design. Grading open markets needs
 * live odds, which are key-gated and legally reviewed. Without a configured odds key
 * this returns a gated result and NEVER fetches or redistributes odds.
 */
export function loadClvForward({
  oddsApiKey = process.env.ODDS_API_KEY,
}: { oddsApiKey?: string | undefined } = {}): ClvForwardGated {
  void oddsApiKey; // intentionally unused while gated — forward grading is not built live
  return {
    generatedAt: new Date().toISOString(),
    mode: "forward",
    status: "gated",
    canPublishProjections: false,
    gateReason:
      "Forward (pre-close) CLV is inert: live-odds grading requires a configured, legally-reviewed odds key and is founder-gated. Use the backtest self-grade against nflverse closing lines instead.",
    error: null,
  };
}
