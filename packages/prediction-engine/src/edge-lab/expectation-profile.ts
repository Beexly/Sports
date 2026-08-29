/**
 * Spread-anchored expectation profile — leak-safe game-level covariate.
 *
 * Ported from arXiv:2606.18805 (Richardson, Bickley, Chan, Torgler, Yasmin &
 * Pawlowski, "Emotional driving: Reference-dependent emotions and risky
 * driving behavior after sporting events"). Their reference-dependent-
 * preferences framing (Kőszegi–Rabin) decomposes a game outcome relative to
 * its PRE-GAME expectation — set by the closing point spread, never the
 * result itself — into profiles (their Table 1): a close game that resolves
 * as a loss carries suspense + negative valence; a lopsided game that
 * resolves the "wrong" way carries surprise. Their headline, load-bearing
 * correction to the naive "upset losses are dangerous" intuition: the robust
 * effect in their driving-speed and crash data is **predicted-CLOSE losses**
 * (+3 mph, crashes +505% vs predicted-close wins), while upset losses
 * "mainly oscillate around zero" — though that slice held only 5 games and
 * is underpowered, not refuted. See
 * docs/ops/edge/extraction/2026-08-26-group-sports-domain.md item 5 for the
 * full derivation.
 *
 * This module ports the STRUCTURE, not their driving-behavior finding: a
 * spread-anchored classification of "how did this game resolve relative to
 * what the market expected," exposed as a leak-safe covariate for a
 * PRIOR game — e.g. "this team is coming off a predicted-close loss." It
 * follows the exact leak-safety pattern already established in
 * `covariate-bus.ts` (`latestPriorRow` / `nextGameCovariate`): only strictly
 * prior games are eligible, and no history before kickoff returns `null`
 * (fail-closed, never imputed).
 *
 * HONEST PRIOR: WEAK. The source paper measures aggregate traffic speed and
 * crash counts near stadiums — fan behavior, not player performance or
 * betting-market flows. It says nothing about betting volume, line movement,
 * or any performance effect for the team or players involved in the prior
 * game. Treat this purely as an unvalidated E2 candidate: `priced:false`
 * until it clears walk-forward admission via the trials-registry, exactly
 * like every other covariate-bus candidate.
 *
 * Pure. No I/O. No Prisma.
 */

/** How a game resolved relative to its closing-spread expectation, for the team on this side of it. */
export type GameCloseness = "favored" | "close" | "underdog";

/**
 * The cross of pre-game expectation (from `GameCloseness`) with the actual
 * result — the paper's Table 1 profiles, generalized to all six
 * combinations. `close_loss` is the profile their driving/crash data links
 * to the robust effect; `upset_loss` and `upset_win` are the surprise
 * profiles their sample could not power cleanly (n=5 upset losses).
 */
export type ExpectationProfile =
  | "expected_win"
  | "close_win"
  | "upset_win"
  | "expected_loss"
  | "close_loss"
  | "upset_loss";

export interface TeamGameResult {
  readonly team: string;
  readonly season: number;
  /** Strictly ordered within a season — e.g. NFL/NBA week or game number. */
  readonly week: number;
  /**
   * This team's own closing point spread — standard sign convention:
   * negative = favored by that many points, positive = underdog by that
   * many points, matching the paper's NFL ±4 band (a −4 spread ≈ 63%
   * home-win probability per Card & Dahl 2011, cited in the source paper).
   */
  readonly closingSpreadForTeam: number;
  /**
   * "win" | "loss" | "draw" — not a bare `won: boolean`, so a drawn game
   * (soccer, or a rare NFL overtime tie) can be represented at all rather
   * than being forced into "loss." The source paper's own Table 1 profiles
   * are win/loss only (no draw dimension) — see `priorGameExpectationProfile`
   * for how a draw is handled: excluded from consideration, not silently
   * miscoded as a loss or invented a new, un-sourced profile category.
   */
  readonly result: "win" | "loss" | "draw";
}

/**
 * Classify a game's pre-game expectation from its closing spread alone.
 * `closeBandPoints` defaults to 4, the paper's NFL band (§3.2); NBA users
 * should pass the paper's asymmetric −6.75/+4.75 band via two calls if that
 * distinction is ever needed — this function takes one symmetric band
 * because GSE's first use case (NFL) is symmetric.
 */
export function classifyGameCloseness(closingSpreadForTeam: number, closeBandPoints = 4): GameCloseness {
  if (closingSpreadForTeam <= -closeBandPoints) return "favored";
  if (closingSpreadForTeam >= closeBandPoints) return "underdog";
  return "close";
}

const PROFILE_BY_CLOSENESS: Record<GameCloseness, { win: ExpectationProfile; loss: ExpectationProfile }> = {
  favored: { win: "expected_win", loss: "upset_loss" },
  close: { win: "close_win", loss: "close_loss" },
  underdog: { win: "upset_win", loss: "expected_loss" },
};

/** Cross a closeness classification with the actual result into the full six-way profile. */
export function classifyExpectationProfile(closeness: GameCloseness, won: boolean): ExpectationProfile {
  const profiles = PROFILE_BY_CLOSENESS[closeness];
  return won ? profiles.win : profiles.loss;
}

/**
 * Leak-safe: the expectation profile of the LATEST WIN-OR-LOSS game
 * strictly before `kickoffWeek` in the same season for `team`. Mirrors
 * `covariate-bus.ts`'s `latestPriorRow` exactly — same-week and future games
 * are never eligible, and no qualifying prior game returns `null` rather
 * than imputing a default profile. A drawn prior game is skipped entirely
 * (not coded as a loss, and not assigned an invented profile the source
 * paper's Table 1 never defines) — the scan continues past it to the next
 * eligible win-or-loss game, exactly as if it were absent from `history`.
 */
export function priorGameExpectationProfile(
  history: readonly TeamGameResult[],
  team: string,
  season: number,
  kickoffWeek: number,
  closeBandPoints = 4,
): ExpectationProfile | null {
  let best: TeamGameResult | null = null;
  for (const g of history) {
    if (g.team !== team) continue;
    if (g.season !== season) continue;
    if (g.week >= kickoffWeek) continue; // strictly prior — no same-week, no future
    if (g.result === "draw") continue; // no draw profile in the source paper — skip, don't miscode
    if (best === null || g.week > best.week) best = g;
  }
  if (best === null) return null;
  return classifyExpectationProfile(classifyGameCloseness(best.closingSpreadForTeam, closeBandPoints), best.result === "win");
}
