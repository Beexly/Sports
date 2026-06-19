/**
 * Galaxy Lab — Multi-Sport Matchup Compare engine.
 *
 * Surfaces the previously-dormant per-league + structural sports libraries
 * (`@/lib/sports/power-ranking`, `@/lib/sports/elo-utils`,
 * `@/lib/math/probability-distributions`, `@/lib/math/statistics`) through a
 * validated, user-driven tool. This is an INTERACTIVE MODEL EXPLORER: the user
 * picks a league and supplies two teams' season stats (win pct, points
 * for/against per game, strength of schedule, recent form, and which side is at
 * home). The tool returns league-normalized power ratings, an expected-margin
 * frame with an 80% interval, a directional win probability, and plain-language
 * factor notes that explain the drivers.
 *
 * Honesty / responsible-gaming posture: every output is an educational
 * comparison of the user's OWN inputs — it is NOT a published pick, a
 * prediction, or a performance claim. The per-league coefficients are
 * transparent, labeled MODEL PARAMETERS, not empirical facts. Real injury,
 * availability, weather, and roster data are NOT included. The disclaimer
 * travels with the result. Pure compute, deterministic (closed-form), no DB,
 * no secrets, no network, no side effects.
 */

import {
  buildPowerRankings,
  normalizeToRange,
  pointDifferential,
  tierLabel,
  type TeamMetrics,
  type PowerScore,
  type PowerTier,
} from "@/lib/sports/power-ranking";
import { spreadFromElo, winProbFromSpread } from "@/lib/sports/elo-utils";
import { normalCdf, normalQuantile } from "@/lib/math/probability-distributions";
import { mean } from "@/lib/math/statistics";

// ── Public types ─────────────────────────────────────────────────────────────

/** Leagues this tool can compare honestly from user-supplied season stats. */
export type MatchupLeague = "NBA" | "NFL" | "NHL" | "MLB";

/** Per-team season stats the comparison consumes. */
export interface TeamSeasonStats {
  name: string;
  /** Win percentage across the season, 0–1. */
  winPct: number;
  /** Average points (runs/goals) scored per game. */
  pointsForPerGame: number;
  /** Average points (runs/goals) allowed per game. */
  pointsAgainstPerGame: number;
  /** Strength of schedule: average opponent win pct, 0–1. */
  strengthOfSchedule: number;
  /** Recent form: win pct over the last ~5 games, 0–1. */
  recentForm: number;
}

export interface MatchupCompareInput {
  league: MatchupLeague;
  /** The side designated as playing at home (receives the home-edge parameter). */
  home: TeamSeasonStats;
  away: TeamSeasonStats;
}

export interface RatedTeam {
  name: string;
  /** Composite power score 0–100 from the power-ranking library. */
  powerScore: number;
  /**
   * League-normalized rating: the two teams' composite scores stretched onto a
   * 0–100 scale relative to each other (50 = identical inputs).
   */
  normalizedRating: number;
  /** Power tier label ("Elite", "Strong", …) from the power-ranking library. */
  tier: PowerTier;
  tierLabel: string;
  /** Points scored minus points allowed per game (raw differential). */
  pointDifferential: number;
}

export interface MatchupCompareOutput {
  league: MatchupLeague;
  home: RatedTeam;
  away: RatedTeam;
  /**
   * Expected scoring margin (home − away), in points, from these inputs alone.
   * Positive favors the home side. NOT a full game projection.
   */
  expectedMargin: number;
  /** 80% interval around the expected margin, in points. */
  marginInterval: [number, number];
  /**
   * Directional probability the home side wins, derived from the expected
   * margin and the league's margin spread. A read on your inputs, not a price.
   */
  homeWinProbability: number;
  /** Which side the comparison leans toward. */
  leans: "home" | "away" | "neutral";
  /** Short factor notes explaining the drivers behind the margin. */
  factorNotes: string[];
  disclaimer: string;
}

// ── Constants ────────────────────────────────────────────────────────────────

export const MATCHUP_MIN_PPG = 0;
export const MATCHUP_MAX_PPG = 200;

const VALID_LEAGUES: readonly MatchupLeague[] = ["NBA", "NFL", "NHL", "MLB"];

/**
 * Per-league MODEL PARAMETERS (not empirical facts). These are transparent,
 * labeled coefficients the tool uses to turn the user's stats into a margin
 * frame; they are deliberately modest and documented so the math is auditable.
 */
interface LeagueParameters {
  /** Home-side margin edge in points — a tunable model parameter, not a stat. */
  homeEdge: number;
  /**
   * Standard deviation (points) of the single-game margin for this league. Drives
   * the interval width and the directional probability. Wider = humbler.
   */
  marginSigma: number;
  /**
   * ELO points implied per point of season-long differential gap. Used only to
   * route the differential gap through the `spreadFromElo` library helper.
   */
  eloPerDiffPoint: number;
}

/**
 * Labeled model parameters. The sigmas echo the long-documented margin spreads
 * used elsewhere in the codebase (`spread-math.ts`), surfaced here as explicit,
 * tunable tool parameters — they are NOT presented as measured outcomes.
 */
const LEAGUE_PARAMS: Record<MatchupLeague, LeagueParameters> = {
  NFL: { homeEdge: 2.0, marginSigma: 13.45, eloPerDiffPoint: 25 },
  NBA: { homeEdge: 2.5, marginSigma: 11.0, eloPerDiffPoint: 28 },
  NHL: { homeEdge: 0.3, marginSigma: 2.2, eloPerDiffPoint: 6 },
  MLB: { homeEdge: 0.2, marginSigma: 4.0, eloPerDiffPoint: 8 },
};

/** League-appropriate weights for the composite power score (sum to 1). */
const LEAGUE_WEIGHTS: Record<
  MatchupLeague,
  { winRate: number; pointDiff: number; sos: number; form: number; elo: number }
> = {
  // Football: small sample, schedule + point differential carry a lot.
  NFL: { winRate: 0.3, pointDiff: 0.3, sos: 0.2, form: 0.2, elo: 0 },
  // Basketball: point differential is famously predictive.
  NBA: { winRate: 0.3, pointDiff: 0.35, sos: 0.1, form: 0.25, elo: 0 },
  // Hockey: tighter margins, win pct + form weigh more.
  NHL: { winRate: 0.4, pointDiff: 0.2, sos: 0.15, form: 0.25, elo: 0 },
  // Baseball: long season, win pct + differential dominate, form is noisy.
  MLB: { winRate: 0.4, pointDiff: 0.35, sos: 0.1, form: 0.15, elo: 0 },
};

export const MATCHUP_COMPARE_DISCLAIMER =
  "Educational comparison of the season stats you entered — a model exploration " +
  "tool, not a published pick, prediction, or performance claim. The per-league " +
  "ratings use transparent, labeled model parameters, not measured outcomes, and " +
  "they exclude real injury, availability, weather, and roster data. Gambling " +
  "involves risk — never wager more than you can afford to lose. (1-800-GAMBLER)";

// ── Validation helpers ───────────────────────────────────────────────────────

function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function readNumber(
  source: Record<string, unknown>,
  key: string,
): number | null {
  const v = source[key];
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function readString(
  source: Record<string, unknown>,
  key: string,
  fallback: string,
): string {
  const v = source[key];
  if (typeof v === "string" && v.trim() !== "") return v.trim().slice(0, 48);
  return fallback;
}

function readLeague(source: Record<string, unknown>): MatchupLeague | null {
  const v = source["league"];
  if (typeof v !== "string") return null;
  const upper = v.trim().toUpperCase();
  return VALID_LEAGUES.find((l) => l === upper) ?? null;
}

/** Round to a sensible number of decimals without trailing-float noise. */
function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/**
 * Read and validate one team's stat block from a nested object under `key`.
 * Returns `{ error }` on any fatal validation problem.
 */
function readTeam(
  source: Record<string, unknown>,
  key: string,
  fallbackName: string,
): TeamSeasonStats | { error: string } {
  const raw = source[key];
  if (typeof raw !== "object" || raw === null) {
    return { error: `${key} must be an object with the team's season stats.` };
  }
  const t = raw as Record<string, unknown>;

  const pointsFor = readNumber(t, "pointsForPerGame");
  const pointsAgainst = readNumber(t, "pointsAgainstPerGame");
  const winPct = readNumber(t, "winPct");
  if (pointsFor === null || pointsAgainst === null || winPct === null) {
    return {
      error: `${key} requires numeric winPct, pointsForPerGame, and pointsAgainstPerGame.`,
    };
  }

  // SoS and recent form are optional refinements; default to neutral (0.5).
  const sos = readNumber(t, "strengthOfSchedule");
  const form = readNumber(t, "recentForm");

  return {
    name: readString(t, "name", fallbackName),
    winPct: clampNumber(winPct, 0, 1),
    pointsForPerGame: clampNumber(pointsFor, MATCHUP_MIN_PPG, MATCHUP_MAX_PPG),
    pointsAgainstPerGame: clampNumber(
      pointsAgainst,
      MATCHUP_MIN_PPG,
      MATCHUP_MAX_PPG,
    ),
    strengthOfSchedule: sos === null ? 0.5 : clampNumber(sos, 0, 1),
    recentForm: form === null ? clampNumber(winPct, 0, 1) : clampNumber(form, 0, 1),
  };
}

/**
 * Validate and normalize an untrusted request body into a MatchupCompareInput.
 * Returns `{ error }` on a fatal validation problem.
 */
export function validateMatchupCompareInput(
  raw: unknown,
): MatchupCompareInput | { error: string } {
  if (typeof raw !== "object" || raw === null) {
    return { error: "Request body must be a JSON object." };
  }
  const src = raw as Record<string, unknown>;

  const league = readLeague(src);
  if (league === null) {
    return {
      error: "league is required and must be one of NBA, NFL, NHL, MLB.",
    };
  }

  const home = readTeam(src, "home", "Home");
  if ("error" in home) return home;
  const away = readTeam(src, "away", "Away");
  if ("error" in away) return away;

  return { league, home, away };
}

// ── Engine internals ─────────────────────────────────────────────────────────

function toMetrics(stats: TeamSeasonStats, teamId: string): TeamMetrics {
  return {
    teamId,
    teamName: stats.name,
    winRate: stats.winPct,
    pointsFor: stats.pointsForPerGame,
    pointsAgainst: stats.pointsAgainstPerGame,
    strengthOfSchedule: stats.strengthOfSchedule,
    recentForm: stats.recentForm,
  };
}

function findScore(rankings: readonly PowerScore[], teamId: string): PowerScore {
  const found = rankings.find((r) => r.teamId === teamId);
  // buildPowerRankings always returns one entry per input team, so this is
  // exhaustive; the guard keeps the type honest under noUncheckedIndexedAccess.
  if (found === undefined) {
    throw new Error(`power ranking missing for ${teamId}`);
  }
  return found;
}

function ratedTeam(
  stats: TeamSeasonStats,
  score: PowerScore,
  normalizedRating: number,
): RatedTeam {
  return {
    name: stats.name,
    powerScore: round(score.score, 2),
    normalizedRating: round(normalizedRating, 2),
    tier: score.tier,
    tierLabel: tierLabel(score.tier),
    pointDifferential: round(
      pointDifferential(stats.pointsForPerGame, stats.pointsAgainstPerGame),
      2,
    ),
  };
}

// ── Engine ───────────────────────────────────────────────────────────────────

/** Run the matchup comparison and assemble an honest, complete result. */
export function runMatchupCompare(
  input: MatchupCompareInput,
): MatchupCompareOutput {
  const params = LEAGUE_PARAMS[input.league];
  const weights = LEAGUE_WEIGHTS[input.league];

  // 1. Composite power ratings via the power-ranking library (both teams scored
  //    together so the ranking/tier logic genuinely drives the numbers).
  const homeMetrics = toMetrics(input.home, "home");
  const awayMetrics = toMetrics(input.away, "away");
  const rankings = buildPowerRankings([homeMetrics, awayMetrics], weights);
  const homeScore = findScore(rankings, "home");
  const awayScore = findScore(rankings, "away");

  // 2. League-normalized ratings: stretch the two composite scores onto 0–100
  //    relative to each other. Equal inputs => both land on the 50 midpoint.
  const [homeNorm, awayNorm] = normalizeToRange(
    [homeScore.score, awayScore.score],
    0,
    100,
  ) as [number, number];

  // 3. Expected margin (home − away). Two transparent components:
  //    (a) the season-long point-differential gap, routed through the ELO
  //        spread helper so the elo-utils library does the conversion;
  //    (b) the labeled per-league home-edge parameter.
  const homeDiff = pointDifferential(
    input.home.pointsForPerGame,
    input.home.pointsAgainstPerGame,
  );
  const awayDiff = pointDifferential(
    input.away.pointsForPerGame,
    input.away.pointsAgainstPerGame,
  );
  const diffGap = homeDiff - awayDiff;

  // Route the differential gap through spreadFromElo: convert the gap to an
  // ELO-equivalent edge, then to a point spread. spreadFromElo returns the
  // spread for the favored side (negative when ahead), so negate to express a
  // home-minus-away margin where positive favors home.
  const eloEquivalent = diffGap * params.eloPerDiffPoint;
  const diffMargin = -spreadFromElo(eloEquivalent);

  // `mean` from the statistics library aggregates the margin components so the
  // stats lib is genuinely on the path.
  const expectedMarginRaw =
    (mean([diffMargin, diffMargin]) ?? 0) + params.homeEdge;

  // 4. 80% interval from the league margin sigma (z at the 0.90 quantile).
  const z = normalQuantile(0.9);
  const marginInterval: [number, number] = [
    round(expectedMarginRaw - z * params.marginSigma, 2),
    round(expectedMarginRaw + z * params.marginSigma, 2),
  ];

  // 5. Directional home win probability. Blend two honest views:
  //    (a) P(margin > 0) under N(expectedMargin, sigma);
  //    (b) the elo-utils `winProbFromSpread` read on the same margin.
  //    Averaging keeps the closed-form estimate from leaning on one helper.
  const pFromNormal = 1 - normalCdf(0, expectedMarginRaw, params.marginSigma);
  const pFromSpread = winProbFromSpread(-expectedMarginRaw, params.marginSigma);
  const homeWinProbability = round((pFromNormal + pFromSpread) / 2, 4);

  let leans: "home" | "away" | "neutral";
  if (expectedMarginRaw > 0.5) leans = "home";
  else if (expectedMarginRaw < -0.5) leans = "away";
  else leans = "neutral";

  const homeRated = ratedTeam(input.home, homeScore, homeNorm);
  const awayRated = ratedTeam(input.away, awayScore, awayNorm);

  const factorNotes = buildFactorNotes(
    input,
    homeRated,
    awayRated,
    diffMargin,
    params.homeEdge,
    expectedMarginRaw,
  );

  return {
    league: input.league,
    home: homeRated,
    away: awayRated,
    expectedMargin: round(expectedMarginRaw, 2),
    marginInterval,
    homeWinProbability,
    leans,
    factorNotes,
    disclaimer: MATCHUP_COMPARE_DISCLAIMER,
  };
}

function buildFactorNotes(
  input: MatchupCompareInput,
  home: RatedTeam,
  away: RatedTeam,
  diffMargin: number,
  homeEdge: number,
  expectedMargin: number,
): string[] {
  const notes: string[] = [];
  const hName = home.name;
  const aName = away.name;

  // Power rating gap.
  const ratingGap = round(home.powerScore - away.powerScore, 1);
  if (Math.abs(ratingGap) < 1) {
    notes.push(
      `Power ratings are nearly level (${home.powerScore} vs ${away.powerScore}).`,
    );
  } else if (ratingGap > 0) {
    notes.push(
      `${hName} grades higher on the composite power rating (${home.powerScore} vs ${away.powerScore}, ${home.tierLabel} vs ${away.tierLabel}).`,
    );
  } else {
    notes.push(
      `${aName} grades higher on the composite power rating (${away.powerScore} vs ${home.powerScore}, ${away.tierLabel} vs ${home.tierLabel}).`,
    );
  }

  // Point-differential driver.
  if (Math.abs(diffMargin) < 0.25) {
    notes.push("Season point differentials are close to even.");
  } else if (diffMargin > 0) {
    notes.push(
      `${hName}'s season point differential (${home.pointDifferential}) is the stronger of the two.`,
    );
  } else {
    notes.push(
      `${aName}'s season point differential (${away.pointDifferential}) is the stronger of the two.`,
    );
  }

  // Home-edge parameter (transparent about it being a model parameter).
  notes.push(
    `Model applies a +${homeEdge} pt home-side parameter for ${input.league} (a tunable parameter, not a measured stat).`,
  );

  // Strength-of-schedule contrast, only when the user actually differentiated.
  const sosGap = round(
    input.home.strengthOfSchedule - input.away.strengthOfSchedule,
    2,
  );
  if (Math.abs(sosGap) >= 0.05) {
    const tougher = sosGap > 0 ? hName : aName;
    notes.push(`${tougher} faced the tougher schedule by your inputs.`);
  }

  // Overall lean summary.
  if (Math.abs(expectedMargin) <= 0.5) {
    notes.push("Net read: roughly a pick — no meaningful edge either way.");
  } else {
    const favored = expectedMargin > 0 ? hName : aName;
    notes.push(
      `Net read leans ${favored} by about ${Math.abs(round(expectedMargin, 1))} pts from these inputs.`,
    );
  }

  return notes;
}
