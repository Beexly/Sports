/**
 * NFL body-clock / circadian features (leak-free by nature).
 *
 * A well-documented situational effect: a team playing far from its home time
 * zone experiences kickoff at a shifted body-clock hour — the classic case is a
 * Pacific-zone team in a 1:00 PM ET kickoff, whose players are performing at
 * 10:00 AM body time. The literature (and the market's occasional slowness to
 * price it) makes this a legitimate CANDIDATE feature; as always the §5 trials
 * registry decides whether it carries real edge — this module only makes the
 * candidate available on the leak-free rails.
 *
 * Leak-freeness: every input (kickoff instant, each team's home time zone) is a
 * schedule fact known months before the game — there is nothing here that could
 * only be known after the decision cutoff. Features are stamped
 * `observedAt = decisionAt` (the schedule is knowable long before; stamping at
 * the decision instant is the conservative latest bound and keeps the as-of
 * store's audit meaningful).
 *
 * The team→zone map is a static table of public facts (which time zone each
 * franchise's home city sits in), maintained the same way as
 * OUTDOOR_NFL_VENUES. UTC offsets are STANDARD-TIME offsets; the NFL season
 * (Sep–Feb) is mostly outside US DST, and body-clock displacement is a
 * relative difference, so a ±1h DST wobble affects both teams equally and
 * cancels in the diff. Pure module — no I/O, no clock.
 */

import { AsOfFeatureStore } from "../asof-store.js";
import { proportionalDevig } from "../devig.js";
import type { GameRow } from "../game-row.js";
import type { EvalRow } from "../placebo.js";

export const BODY_CLOCK_FEATURE_KEYS = [
  "clock:home_shift_h",
  "clock:away_shift_h",
  "clock:shift_diff",
  "clock:away_early_west_flag",
] as const;

/** Decision cutoff: features frozen this long before kickoff (mirrors siblings). */
const DECISION_LEAD_MS = 60 * 60_000;
const GAME_DURATION_MS = 4 * 3_600_000;

/**
 * Standard-time UTC offsets (hours) for each franchise's home metro.
 * Public facts; abbreviations follow the nflverse convention.
 */
export const NFL_TEAM_UTC_OFFSET: Readonly<Record<string, number>> = {
  // Eastern (UTC-5)
  BUF: -5, MIA: -5, NE: -5, NYJ: -5, NYG: -5, PHI: -5, WAS: -5,
  BAL: -5, CIN: -5, CLE: -5, PIT: -5, ATL: -5, CAR: -5, JAX: -5,
  TB: -5, DET: -5, IND: -5,
  // Central (UTC-6)
  CHI: -6, GB: -6, MIN: -6, DAL: -6, HOU: -6, TEN: -6, NO: -6, KC: -6,
  // Mountain (UTC-7)
  DEN: -7,
  // Arizona does not observe DST; standard offset is UTC-7.
  ARI: -7,
  // Pacific (UTC-8)
  SEA: -8, SF: -8, LA: -8, LAR: -8, LAC: -8, LV: -8,
};

export interface BodyClockFeatureResult {
  readonly rows: EvalRow[];
  readonly skipped: {
    readonly noScores: number;
    readonly tie: number;
    readonly noOdds: number;
    /** Team abbreviation missing from the zone map — skipped, never guessed. */
    readonly unknownTeam: number;
  };
}

/**
 * Body-clock displacement for one team at one kickoff: the signed difference
 * (hours) between the team's body-clock hour and the local kickoff hour it is
 * actually playing at. Positive = playing "earlier" than its body clock (the
 * west-coast-team-at-1pm-ET case); negative = playing "later".
 *
 * Computed as (venue zone offset − team home zone offset). E.g. SEA (-8) at a
 * game hosted in an ET venue (-5): -5 − (-8) = +3 → kicking off three
 * body-clock hours early.
 */
export function bodyClockShiftHours(teamOffset: number, venueOffset: number): number {
  return venueOffset - teamOffset;
}

/**
 * Build leak-free body-clock EvalRows: ingest each feature at the decision
 * instant and serve the vector back through the as-of read path.
 */
export function buildBodyClockFeatureRows(
  games: readonly GameRow[],
  store: AsOfFeatureStore,
): BodyClockFeatureResult {
  const rows: EvalRow[] = [];
  const skipped = { noScores: 0, tie: 0, noOdds: 0, unknownTeam: 0 };

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

    const homeOffset = NFL_TEAM_UTC_OFFSET[g.homeTeam];
    const awayOffset = NFL_TEAM_UTC_OFFSET[g.awayTeam];
    if (homeOffset === undefined || awayOffset === undefined) {
      // Unknown abbreviation (relocation, alternate key) — skip honestly.
      skipped.unknownTeam += 1;
      continue;
    }

    const startMs = Date.parse(g.startTime);
    const decisionMs = startMs - DECISION_LEAD_MS;
    const decisionAt = new Date(decisionMs).toISOString();

    // The venue is the home team's zone (international/neutral-site games are a
    // known blind spot of this convention; they wash out as noise and can get a
    // venue override later — improve, not overclaim).
    const venueOffset = homeOffset;
    const homeShift = bodyClockShiftHours(homeOffset, venueOffset); // 0 by construction
    const awayShift = bodyClockShiftHours(awayOffset, venueOffset);

    // Kickoff hour in the venue's local standard time, for the classic
    // "west-coast body clock at an early kickoff" flag: an away team shifted
    // ≥2h earlier, kicking off before 2 PM venue-local.
    const venueLocalHour = ((startMs / 3_600_000 + venueOffset) % 24 + 24) % 24;
    const awayEarlyWest = awayShift >= 2 && venueLocalHour < 14 ? 1 : 0;

    const ingest = (featureKey: string, value: number): void =>
      store.ingest({ entityId: g.gameId, featureKey, value, observedAt: decisionAt, source: "nfl-body-clock" });

    ingest("clock:home_shift_h", homeShift);
    ingest("clock:away_shift_h", awayShift);
    ingest("clock:shift_diff", homeShift - awayShift);
    ingest("clock:away_early_west_flag", awayEarlyWest);

    rows.push({
      id: g.gameId,
      decisionAt,
      eventEndAt: new Date(startMs + GAME_DURATION_MS).toISOString(),
      features: store.vector(g.gameId, BODY_CLOCK_FEATURE_KEYS, decisionAt),
      y: g.homeScore > g.awayScore ? 1 : 0,
      qClose: q,
    });
  }

  return { rows, skipped };
}
