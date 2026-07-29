/**
 * Real-data wiring for the walk-forward taxonomy harness (WS5, context-only).
 *
 * `runWalkForwardTaxonomy` (walk-forward-taxonomy.ts) has no production call
 * site of its own — it is a pure aggregator waiting on rows. This module is
 * the FIRST real, in-repo data source wired to it: `historical-replay.ts`,
 * which turns a real nflverse `schedules` row (games.csv — Lee Sharpe's
 * nfldata, CC-BY-4.0) into a genuinely settled historical pick via the
 * FROZEN scorer (`scoreGame`, unchanged) and the real final score, under the
 * same no-lookahead discipline historical-replay.ts already enforces
 * (pre-game features and post-game settlement facts are structurally
 * disjoint; see that file's header).
 *
 * CONTEXT-ONLY, BY DESIGN. `WalkForwardTaxonomyRow` carries four fields:
 * `context` (required) and `covered` / `width` / `residual` (optional —
 * `runWalkForwardTaxonomy` never invents them when absent). This adapter
 * fills `context` honestly from real pre-game facts (home/away, spread- or
 * moneyline-implied favorite, side-specific rest days) and leaves
 * `covered`/`width`/`residual` UNSET. Those three fields describe a
 * CALIBRATED PREDICTION INTERVAL's coverage/width for the row — that is a
 * PAV/IVAP/CVAP/selective-gate output (see selective-gate.ts's
 * `FiredDecision.width`), which requires >= MIN_STRATUM_CALIBRATION (100)
 * real settled rows per Mondrian stratum before the gate will even compute
 * an interval. No in-repo fixture or dataset currently supplies that at the
 * volume needed to honestly claim a MEASURED width/coverage here. Wiring
 * that requires a real replay source (HEOS) that is founder-gated behind PR
 * #226 as of this writing — see docs/ops/WORK_PLAN_2026-07-28_VISION_ALIGNED.md,
 * WS5/WS6/WS1. Rather than fabricate plausible-looking coverage/width
 * numbers, this module ships the honest partial wiring (context only) plus a
 * clearly-labelled SYNTHETIC fixture (see the accompanying test file's
 * `syntheticReplayRows`) that exercises the harness's full alerting surface
 * without ever being presented as measured.
 *
 * A row whose favorite-ness or rest days cannot be determined WITHOUT
 * inventing (e.g. a true pick'em with no moneyline, or a schedule row
 * missing rest data) is dropped rather than defaulted — same "never invent"
 * discipline as `contextFromLevel1Category` in walk-forward-taxonomy.ts.
 *
 * Pure functions. No I/O, no DB, no network — the caller supplies already
 * -fetched `RawScheduleRow[]` (e.g. from a nflverse `schedules` CSV parsed by
 * `@sports/data-ingestion`'s nflverse-source.ts). No writes anywhere.
 */

import type { RawScheduleRow, PreGameFeatures, SettledHistoricalPick } from "../historical-replay.js";
import { assemblePreGameFeatures, replayAndSettleGame } from "../historical-replay.js";
import { selectionIsHomeSide } from "../settlement.js";
import type { SportsGameContext } from "../conformal/sports-taxonomy.js";
import type { WalkForwardTaxonomyRow } from "./walk-forward-taxonomy.js";

/**
 * Determine favorite/underdog for the SIDE THAT WAS PICKED, from real
 * pre-game lines only. Prefers the HOME-perspective spread line (the primary
 * signal historical-replay itself scores against); falls back to the
 * moneyline sign only when no spread exists. Returns null — never a guess —
 * when neither line honestly distinguishes a favorite (a pick'em spread of
 * 0, or absent/equal moneylines).
 */
function favoriteForSelection(
  isHomeSelection: boolean,
  spreadLine: number | null,
  homeMoneyline: number | null,
  awayMoneyline: number | null,
): boolean | null {
  if (spreadLine !== null && spreadLine !== 0) {
    const homeIsFavorite = spreadLine < 0; // HOME-perspective: negative = home favored
    return isHomeSelection ? homeIsFavorite : !homeIsFavorite;
  }
  if (homeMoneyline !== null && awayMoneyline !== null && homeMoneyline !== awayMoneyline) {
    const homeIsFavorite = homeMoneyline < awayMoneyline; // more negative American price = favorite
    return isHomeSelection ? homeIsFavorite : !homeIsFavorite;
  }
  return null;
}

/** Rest days for the picked side only — never averaged or invented across sides. */
function restDaysForSelection(
  isHomeSelection: boolean,
  restHome: number | null,
  restAway: number | null,
): number | null {
  return isHomeSelection ? restHome : restAway;
}

/**
 * Build the real `SportsGameContext` for one picked side of a real, already
 * -settled game, or null when the pre-game lines do not honestly support one
 * (see module doc — never defaulted).
 */
export function realGameContextFromPreGame(
  features: PreGameFeatures,
  isHomeSelection: boolean,
): SportsGameContext | null {
  const isFavorite = favoriteForSelection(
    isHomeSelection,
    features.spreadLine,
    features.homeMoneyline,
    features.awayMoneyline,
  );
  const restDays = restDaysForSelection(isHomeSelection, features.restHome, features.restAway);
  if (isFavorite === null || restDays === null) return null;
  return { isHome: isHomeSelection, isFavorite, restDays };
}

/**
 * Convert one real, already-settled historical pick into a
 * `WalkForwardTaxonomyRow`. `covered`/`width`/`residual` are intentionally
 * omitted (see module doc) — this is real context, not a real interval.
 * Returns null when the pick has no team side to attach a Mondrian
 * home/favorite context to (a TOTAL pick's selection is "OVER"/"UNDER", not
 * a team — `selectionIsHomeSide` would silently read that as "away", which
 * is not honest; historical-replay.ts's own CLV grading makes the same
 * SPREAD/MONEYLINE-only distinction, see `gradeHistoricalClv`), or when the
 * pick's context cannot be honestly derived from the available lines
 * (dropped, never fabricated).
 */
export function settledHistoricalPickToTaxonomyRow(
  pick: SettledHistoricalPick,
  features: PreGameFeatures,
): WalkForwardTaxonomyRow | null {
  if (pick.pickType !== "SPREAD" && pick.pickType !== "MONEYLINE") return null;
  const isHomeSelection = selectionIsHomeSide(pick.selection, features.homeTeam, features.awayTeam);
  const context = realGameContextFromPreGame(features, isHomeSelection);
  if (!context) return null;
  return {
    rowId: pick.idempotencyKey,
    context,
  };
}

/**
 * Real, end-to-end wiring: real nflverse `schedules` rows in -> real settled
 * picks (via the unchanged `replayAndSettleGame`) -> real
 * `WalkForwardTaxonomyRow[]` context, ready for `runWalkForwardTaxonomy`.
 *
 * A row with no settleable final score (unplayed/missing in the archive)
 * contributes nothing, matching `replayAndSettleGame`'s own contract. Games
 * whose lines cannot support an honest favorite/rest determination are
 * silently dropped at the per-pick level (see
 * `settledHistoricalPickToTaxonomyRow`) rather than emitted with invented
 * fields.
 */
export function nflverseScheduleRowsToTaxonomyRows(
  rows: readonly RawScheduleRow[],
): readonly WalkForwardTaxonomyRow[] {
  const out: WalkForwardTaxonomyRow[] = [];
  for (const row of rows) {
    const settled = replayAndSettleGame(row);
    if (settled.length === 0) continue; // unplayed / unscored — nothing to settle, nothing invented
    const preGameOnly: RawScheduleRow = { ...row, homeScore: null, awayScore: null, result: null };
    const features = assemblePreGameFeatures(preGameOnly);
    for (const pick of settled) {
      const taxonomyRow = settledHistoricalPickToTaxonomyRow(pick, features);
      if (taxonomyRow) out.push(taxonomyRow);
    }
  }
  return out;
}
