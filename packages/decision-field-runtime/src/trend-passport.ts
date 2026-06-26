/**
 * TREND PASSPORTS + TREND TRIALS — Scores24's trend tips, put on trial.
 *
 * Scores24 shows "X in 8 of last 9 games." GSE asks the questions that make a trend honest: how big is
 * the sample, how many filters were stacked to find it, does it overlap other trends (so it is not
 * independent evidence), is it even pre-match knowable, and — the hard rule — a trend ALONE can support
 * WATCH but never a public action. Fixture-only, no scraped/derived third-party content.
 *
 * Pure + deterministic. Spec: docs/product/TREND_PASSPORTS.md.
 */

import type { MaxPermittedStrength } from "./decision-state-stat-contract.js";

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";
export type TrendResult = "WIN" | "LOSS" | "PUSH" | "VOID" | "UNKNOWN";
export type TrendProcessGrade = "GOOD_PROCESS" | "THIN_EVIDENCE" | "OVERFIT_TREND" | "NO_MARKET_LINE" | "NO_ODDS" | "CORRELATED_DOUBLE_COUNT";

export interface TrendInput {
  readonly trendId: string;
  readonly sport: string;
  readonly eventId: string;
  readonly market: string;
  readonly claim: string; // plain-language, no certainty language
  readonly sampleScope: string; // e.g. "last 9 Tampa Bay games"
  readonly sampleSize: number;
  readonly hitCount: number;
  readonly homeAwayFilter?: "HOME" | "AWAY" | null;
  readonly tournamentFilter?: string | null;
  readonly opponentFilter?: string | null;
  readonly timeWindow?: string | null;
  readonly marketLine?: number | null;
  readonly oddsAtPublish?: number | null;
  readonly sourceRefs?: readonly string[];
  readonly knownAtPreMatch: boolean;
}

export interface TrendPassport {
  readonly trendId: string;
  readonly sport: string;
  readonly eventId: string;
  readonly market: string;
  readonly claim: string;
  readonly sampleScope: string;
  readonly sampleSize: number;
  readonly hitCount: number;
  readonly missCount: number;
  readonly hitRate: number;
  readonly homeAwayFilter: "HOME" | "AWAY" | null;
  readonly tournamentFilter: string | null;
  readonly opponentFilter: string | null;
  readonly timeWindow: string | null;
  readonly marketLine: number | null;
  readonly oddsAtPublish: number | null;
  readonly sourceRefs: readonly string[];
  readonly knownAt: string;
  readonly fragilityScore: number; // 0 (robust) .. 1 (fragile)
  readonly overfitRisk: RiskLevel;
  readonly pHackingRisk: RiskLevel;
  readonly correlatedTrends: readonly string[];
  readonly opposingTrends: readonly string[];
  readonly decisionUse: string;
  readonly publicSafe: boolean;
  readonly authorityCeiling: MaxPermittedStrength; // a trend alone caps at WATCH (INFO_ONLY w/o a line)
  readonly weakness: string;
  readonly whatWouldInvalidate: string;
  readonly fixtureWatermarked: true;
}

function activeFilterCount(i: TrendInput): number {
  return [i.homeAwayFilter, i.tournamentFilter, i.opponentFilter, i.timeWindow].filter((x) => x != null).length;
}

/** Small samples are fragile; more filters on a small sample is overfitting. Deterministic. */
export function buildTrendPassport(i: TrendInput, allTrends: readonly TrendInput[] = []): TrendPassport {
  const n = Math.max(0, Math.floor(i.sampleSize));
  const hits = Math.max(0, Math.min(n, Math.floor(i.hitCount)));
  const miss = n - hits;
  const hitRate = n === 0 ? 0 : Math.round((hits / n) * 1000) / 1000;
  const fragility = Math.round((1 / (1 + n / 8)) * 100) / 100; // n=9→0.47, n=11→0.42, n=50→0.14
  const filters = activeFilterCount(i);
  const overfitRisk: RiskLevel = filters >= 2 && n < 12 ? "HIGH" : filters >= 1 && n < 15 ? "MEDIUM" : "LOW";
  const pHackingRisk: RiskLevel = filters >= 2 ? "HIGH" : filters >= 1 && fragility > 0.4 ? "MEDIUM" : "LOW";

  // correlated = another trend on the same sport+event+market or same team scope (NOT independent evidence)
  const correlated = allTrends
    .filter((t) => t.trendId !== i.trendId && t.sport === i.sport && (t.market === i.market || sameTeamScope(t.sampleScope, i.sampleScope)))
    .map((t) => t.trendId);

  // Authority rule: a trend alone caps at WATCH; with no market line it cannot even price → INFO_ONLY.
  const authorityCeiling: MaxPermittedStrength = i.marketLine == null ? "INFO_ONLY" : "WATCH";

  return {
    trendId: i.trendId,
    sport: i.sport,
    eventId: i.eventId,
    market: i.market,
    claim: i.claim,
    sampleScope: i.sampleScope,
    sampleSize: n,
    hitCount: hits,
    missCount: miss,
    hitRate,
    homeAwayFilter: i.homeAwayFilter ?? null,
    tournamentFilter: i.tournamentFilter ?? null,
    opponentFilter: i.opponentFilter ?? null,
    timeWindow: i.timeWindow ?? null,
    marketLine: i.marketLine ?? null,
    oddsAtPublish: i.oddsAtPublish ?? null,
    sourceRefs: i.sourceRefs ?? [],
    knownAt: i.knownAtPreMatch ? "pre-match (knowable)" : "post-hoc (NOT pre-match knowable)",
    fragilityScore: fragility,
    overfitRisk,
    pHackingRisk,
    correlatedTrends: correlated,
    opposingTrends: [],
    decisionUse:
      authorityCeiling === "INFO_ONLY"
        ? "Context only — no market line, so it cannot price or drive an action."
        : "Can put a market on the WATCH list; never a public action on its own.",
    publicSafe: true,
    authorityCeiling,
    weakness:
      `Sample of ${n} (${filters} filter${filters === 1 ? "" : "s"}). ` +
      (overfitRisk === "HIGH" ? "High overfit risk — filters were stacked on a small sample. " : "") +
      (correlated.length ? `Overlaps ${correlated.length} other trend(s) — not independent evidence. ` : "") +
      "A streak is not a forecast.",
    whatWouldInvalidate:
      "A larger independent sample regressing toward the market-implied rate; the line moving to absorb the edge; or a context change (opponent/venue/personnel) the scope didn't control for.",
    fixtureWatermarked: true,
  };
}

const SCOPE_STOPWORDS = new Set(["games", "game", "recent", "season", "matches", "match", "results"]);
function sameTeamScope(a: string, b: string): boolean {
  // shared-team detection on the scope strings — require a meaningful token (>=6 chars, non-stopword)
  const tokens = (s: string) => s.toLowerCase().split(/\s+/).filter((w) => w.length >= 6 && !SCOPE_STOPWORDS.has(w));
  const ta = new Set(tokens(a));
  return tokens(b).some((w) => ta.has(w));
}

// ───────────────────────── Trend Trial (process separated from outcome) ─────────────────────────
export interface TrendTrial {
  readonly trendId: string;
  readonly predictionId: string;
  readonly result: TrendResult;
  readonly processGrade: TrendProcessGrade;
  readonly outcomeGrade: "DESERVED" | "LUCKY" | "UNLUCKY" | "NEUTRAL";
  readonly lineSensitivity: string;
  readonly priceSensitivity: string;
  readonly autopsy: string;
  readonly memoryWrite: string;
  readonly fixtureWatermarked: true;
}

/** Grade a settled trend bet — process is graded from the passport, outcome from the result, separately. */
export function gradeTrendTrial(passport: TrendPassport, predictionId: string, result: TrendResult): TrendTrial {
  const processGrade: TrendProcessGrade =
    passport.marketLine == null
      ? "NO_MARKET_LINE"
      : passport.oddsAtPublish == null
        ? "NO_ODDS"
        : passport.correlatedTrends.length > 0
          ? "CORRELATED_DOUBLE_COUNT"
          : passport.overfitRisk === "HIGH"
            ? "OVERFIT_TREND"
            : passport.fragilityScore > 0.4
              ? "THIN_EVIDENCE"
              : "GOOD_PROCESS";
  // Outcome is independent of process: a win can come from a bad-process trend (lucky), and vice-versa.
  const outcomeGrade =
    result === "WIN" ? (processGrade === "GOOD_PROCESS" ? "DESERVED" : "LUCKY")
    : result === "LOSS" ? (processGrade === "GOOD_PROCESS" ? "UNLUCKY" : "NEUTRAL")
    : "NEUTRAL";
  return {
    trendId: passport.trendId,
    predictionId,
    result,
    processGrade,
    outcomeGrade,
    lineSensitivity: passport.marketLine == null ? "no line — undefined" : "result would flip near the line; small line moves matter",
    priceSensitivity: passport.oddsAtPublish == null ? "no price — cannot grade value" : "value depends on the price at publish vs close",
    autopsy:
      `Trend hit ${passport.hitCount}/${passport.sampleSize} (fragility ${passport.fragilityScore}). ` +
      `Process: ${processGrade}. Outcome: ${result}. The result does not change the process grade.`,
    memoryWrite: "Recorded to the Learning Ledger as a trend trial; one result moves no weight (needs a confirmed sample).",
    fixtureWatermarked: true,
  };
}

// ───────────────────────── Fixture trends (owner examples) ─────────────────────────
export const TREND_FIXTURES: readonly TrendInput[] = [
  { trendId: "t-rays-u95", sport: "baseball", eventId: "fixture-mlb-tb-kc-2026", market: "Total runs", claim: "Under 9.5 runs has hit recently in Tampa Bay games.", sampleScope: "last 9 Tampa Bay Rays games", sampleSize: 9, hitCount: 8, homeAwayFilter: null, marketLine: 9.5, oddsAtPublish: 1.9, knownAtPreMatch: true },
  { trendId: "t-royals-o75", sport: "baseball", eventId: "fixture-mlb-tb-kc-2026", market: "Total runs", claim: "Over 7.5 runs has hit recently in Kansas City games.", sampleScope: "last 9 Kansas City Royals games", sampleSize: 9, hitCount: 8, homeAwayFilter: null, marketLine: 7.5, oddsAtPublish: 1.85, knownAtPreMatch: true },
  { trendId: "t-ssk-u585", sport: "football", eventId: "fixture-cfl-ssk-tor-2026", market: "Total points", claim: "Under 58.5 points has hit recently in Saskatchewan games.", sampleScope: "last 11 Saskatchewan games", sampleSize: 11, hitCount: 10, marketLine: 58.5, oddsAtPublish: 1.9, knownAtPreMatch: true },
  { trendId: "t-ssk-1hwin", sport: "football", eventId: "fixture-cfl-ssk-tor-2026", market: "First half result", claim: "Saskatchewan has led at the half recently.", sampleScope: "last 8 Saskatchewan games", sampleSize: 8, hitCount: 7, homeAwayFilter: "HOME", opponentFilter: null, marketLine: null, oddsAtPublish: null, knownAtPreMatch: true },
  { trendId: "t-ger-win7", sport: "soccer", eventId: "fixture-soccer-ecu-ger-2026", market: "Match result", claim: "Germany has won recently.", sampleScope: "last 7 Germany games", sampleSize: 7, hitCount: 7, tournamentFilter: "mixed", marketLine: null, oddsAtPublish: 1.62, knownAtPreMatch: true },
  { trendId: "t-ecu-1hdraw", sport: "soccer", eventId: "fixture-soccer-ecu-ger-2026", market: "First half result", claim: "Ecuador has drawn at the half recently.", sampleScope: "last 7 Ecuador games", sampleSize: 7, hitCount: 6, marketLine: null, oddsAtPublish: null, knownAtPreMatch: true },
];

export function buildAllTrendPassports(): readonly TrendPassport[] {
  return TREND_FIXTURES.map((t) => buildTrendPassport(t, TREND_FIXTURES));
}
