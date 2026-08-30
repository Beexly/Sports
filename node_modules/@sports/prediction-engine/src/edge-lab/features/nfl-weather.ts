/**
 * NFL game-environment weather features (leak-free, as-of-store rails).
 *
 * Weather is a real edge for OUTDOOR games — wind kills the passing and kicking
 * game, precipitation and cold suppress scoring — so it is a natural candidate
 * for the total/side models. This module turns a game's PRE-KICKOFF weather
 * FORECAST into edge-lab features on the exact same rails as
 * `schedule-features.ts`, so it inherits the leak-free guarantee and is admitted
 * (or honestly rejected) only through the §5 trials registry — never bolted onto
 * live scoring.
 *
 * HONESTY-CRITICAL — the two things that make a weather feature leak-free:
 *   1. The value must be a FORECAST that was knowable BEFORE the decision cutoff,
 *      never the observed game-time weather (which is only known during/after the
 *      game — using it would be textbook lookahead). Each forecast therefore
 *      carries its own `forecastIssuedAt`; a forecast issued AFTER the decision
 *      cutoff is DROPPED (`skipped.leakyForecast`), not silently used.
 *   2. Every feature is stamped `observedAt = forecastIssuedAt`, and the
 *      AsOfFeatureStore re-checks the cutoff at serve time, so a mis-stamped
 *      row is caught by the store's audit rather than leaking.
 *
 * Data-rights: the weather source is the caller's concern (the loader). The
 * NWS feed (api.weather.gov) is US-government public domain — unambiguously
 * clean for commercial use, no key; Open-Meteo is CC-BY-4.0 for internal
 * modeling with attribution (hosted free tier is non-commercial — self-host or
 * license for production). This module consumes an already-cleared forecast; it
 * performs no I/O of its own.
 *
 * Pure module. No I/O, no clock — the loader supplies forecasts + timestamps.
 */

import { AsOfFeatureStore } from "../asof-store.js";
import { proportionalDevig } from "../devig.js";
import type { GameRow } from "../game-row.js";
import type { EvalRow } from "../placebo.js";

export const WEATHER_FEATURE_KEYS = [
  "wx:wind_mph",
  "wx:precip_prob",
  "wx:temp_f",
  "wx:is_dome",
  "wx:total_suppression",
] as const;

/** Decision cutoff: features frozen this long before kickoff (mirrors schedule-features). */
const DECISION_LEAD_MS = 60 * 60_000;
/** Assumed game duration when stamping "this result is now knowable". */
const GAME_DURATION_MS = 4 * 3_600_000;

/**
 * A pre-kickoff weather forecast for one game, as the loader captured it.
 * For domed/retractable-closed venues, `isDome` is true and the outdoor fields
 * may be null — weather is neutralized. For outdoor venues, all three of
 * windMph/precipProbPct/tempF must be present or the game is skipped
 * (honest denominator — no fabricated neutral weather for a real open-air game).
 */
export interface GameWeatherForecast {
  /** ISO-8601 UTC instant the forecast was ISSUED (must be ≤ the decision cutoff). */
  readonly forecastIssuedAt: string;
  readonly isDome: boolean;
  readonly windMph: number | null;
  readonly precipProbPct: number | null;
  readonly tempF: number | null;
}

export interface WeatherFeatureResult {
  readonly rows: EvalRow[];
  readonly skipped: {
    readonly noScores: number;
    readonly tie: number;
    readonly noOdds: number;
    readonly noWeather: number;
    /** Forecast issued at/after the decision cutoff — dropped to avoid lookahead. */
    readonly leakyForecast: number;
  };
}

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

/**
 * Bounded [0,1] heuristic "scoring-suppression" prior. Wind dominates (it kills
 * the deep passing + kicking game); precip and cold add. This is a documented
 * PRIOR, not a fitted edge — the trials registry decides whether it carries any.
 * Domes → 0 (climate-controlled).
 */
export function totalSuppressionIndex(f: {
  isDome: boolean;
  windMph: number;
  precipProbPct: number;
  tempF: number;
}): number {
  if (f.isDome) return 0;
  const windFactor = clamp01(f.windMph / 25); // 25+ mph ≈ max wind impact
  const precipFactor = clamp01(f.precipProbPct / 100);
  const coldFactor = f.tempF <= 20 ? 1 : f.tempF >= 50 ? 0 : (50 - f.tempF) / 30;
  return clamp01(0.6 * windFactor + 0.25 * precipFactor + 0.15 * coldFactor);
}

/**
 * Build leak-free weather EvalRows. Mirrors `buildScheduleFeatureRows`: ingest
 * each feature with its honest knowable-at instant, then serve the decision
 * vector back through the store's as-of read path so the enforcement machinery
 * is actually exercised.
 */
export function buildWeatherFeatureRows(
  games: readonly GameRow[],
  weatherByGame: ReadonlyMap<string, GameWeatherForecast>,
  store: AsOfFeatureStore,
): WeatherFeatureResult {
  const rows: EvalRow[] = [];
  const skipped = { noScores: 0, tie: 0, noOdds: 0, noWeather: 0, leakyForecast: 0 };

  for (const g of games) {
    if (g.homeScore === null || g.awayScore === null) {
      skipped.noScores += 1;
      continue;
    }
    if (g.homeScore === g.awayScore) {
      skipped.tie += 1;
      continue;
    }
    const { moneylineHomeDecimal: mh, moneylineAwayDecimal: ma } = g.closing;
    if (mh === null || ma === null) {
      skipped.noOdds += 1;
      continue;
    }
    const devig = proportionalDevig([mh, ma]);
    const q = devig?.[0];
    if (q === undefined || !(q > 0.01 && q < 0.99)) {
      skipped.noOdds += 1;
      continue;
    }

    const wx = weatherByGame.get(g.gameId);
    if (!wx) {
      skipped.noWeather += 1;
      continue;
    }

    const startMs = Date.parse(g.startTime);
    const decisionMs = startMs - DECISION_LEAD_MS;
    const issuedMs = Date.parse(wx.forecastIssuedAt);

    // LEAK GATE: the forecast must have been knowable strictly before the
    // decision cutoff. A forecast issued at/after it is lookahead — drop it.
    if (!Number.isFinite(issuedMs) || issuedMs > decisionMs) {
      skipped.leakyForecast += 1;
      continue;
    }

    // Resolve the numeric feature values. Domes neutralize the outdoor fields;
    // outdoor games require all three or they are skipped (no fabricated neutral).
    let windMph: number;
    let precipProbPct: number;
    let tempF: number;
    if (wx.isDome) {
      windMph = 0;
      precipProbPct = 0;
      tempF = 70; // controlled indoor baseline
    } else if (wx.windMph !== null && wx.precipProbPct !== null && wx.tempF !== null) {
      windMph = wx.windMph;
      precipProbPct = wx.precipProbPct;
      tempF = wx.tempF;
    } else {
      skipped.noWeather += 1;
      continue;
    }

    const suppression = totalSuppressionIndex({ isDome: wx.isDome, windMph, precipProbPct, tempF });
    const observedAt = new Date(issuedMs).toISOString();
    const ingest = (featureKey: string, value: number): void =>
      store.ingest({ entityId: g.gameId, featureKey, value, observedAt, source: "nfl-weather" });

    ingest("wx:wind_mph", windMph);
    ingest("wx:precip_prob", precipProbPct);
    ingest("wx:temp_f", tempF);
    ingest("wx:is_dome", wx.isDome ? 1 : 0);
    ingest("wx:total_suppression", suppression);

    const decisionAt = new Date(decisionMs).toISOString();
    rows.push({
      id: g.gameId,
      decisionAt,
      eventEndAt: new Date(startMs + GAME_DURATION_MS).toISOString(),
      features: store.vector(g.gameId, WEATHER_FEATURE_KEYS, decisionAt),
      y: g.homeScore > g.awayScore ? 1 : 0,
      qClose: q,
    });
  }

  return { rows, skipped };
}
