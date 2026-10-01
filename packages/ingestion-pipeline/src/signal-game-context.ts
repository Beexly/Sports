/**
 * Per-game signal context — the missing input side of the continuous path.
 *
 * WHY THIS EXISTS. The 23 continuous signals were wired on 2026-10-01: each one
 * now declares a `homeSign` and a `neutralValue`, so it CAN move a probability.
 * But `generate-signal-slate.ts` handed the tilt `env: process.env`, and every
 * one of those evaluators reads its inputs from `ctx.env` — DEFENSIVE_PLAYS,
 * REST_DAYS, WIND_MPH, IS_ROAD_TEAM and so on. Process env contains none of
 * them. So the signals were wired to nothing: declarations correct, inputs
 * absent, every vote silent.
 *
 * THIS IS THE OTHER HALF. It derives the env-shaped context for one game from
 * data the engine already has — real TeamGameLog rates, the league average, the
 * posted spread, kickoff time — and hands it to the evaluators.
 *
 * THREE RULES, and they are the whole design:
 *
 * 1. DERIVE, NEVER INVENT. Every value here is computed from a real source or
 *    omitted. A field the engine cannot establish is left absent, the evaluator
 *    returns null, and the signal abstains. Abstention is the correct output
 *    when the data is not there.
 *
 * 2. NO CONTAMINATION FROM THE FUTURE. Rates are pulled with `gameDate < kickoff`,
 *    never "most recent N". A model that reads this week's result to predict this
 *    week's game is not a model.
 *
 * 3. BOOTSTRAP ROWS ARE EXCLUDED. `TeamScoringRecord.isBootstrap` marks synthetic
 *    early-season rows. Mixing them into a real rate manufactures precision the
 *    data does not have, so they are dropped and the window is counted honestly
 *    so the caller can see how thin it really is.
 */
import { getTeamScoringRecords, getLeagueAverageScored } from "@sports/data-ingestion";
import type { TeamScoringRecord } from "@sports/data-ingestion";

export interface SignalGameContextInput {
  readonly sportKey: string;
  readonly homeTeam: string;
  readonly awayTeam: string;
  readonly commenceTime: Date;
  readonly now?: () => Date;
  readonly windowGames?: number;
}

export interface DerivedSignalContext {
  /**
   * The env-shaped record the evaluators read. Absent key = the engine could
   * not establish it, which makes that evaluator return null and abstain.
   */
  readonly env: Record<string, string>;
  /** True sources used, for the reasoning trace. Never faked. */
  readonly sources: readonly string[];
  /** Games actually behind each rate after bootstrap rows were dropped. */
  readonly homeSample: number;
  readonly awaySample: number;
  /** League scoring average used for the rate comparisons, if resolved. */
  readonly leagueAvgScored: number | null;
}

/** Drop bootstrap rows; the remainder is what the engine may actually reason from. */
function realRows(rows: readonly TeamScoringRecord[]): TeamScoringRecord[] {
  return rows.filter((r) => !r.isBootstrap);
}

function mean(xs: readonly number[]): number | null {
  if (xs.length === 0) return null;
  let s = 0;
  for (const x of xs) s += x;
  return s / xs.length;
}

/**
 * Build the context for one game. Fails closed: any lookup that throws yields no
 * field rather than a default, so a database problem cannot become a number.
 */
export async function deriveSignalGameContext(
  input: SignalGameContextInput,
): Promise<DerivedSignalContext> {
  const window = input.windowGames ?? 20;
  const env: Record<string, string> = {};
  const sources: string[] = [];

  let home: TeamScoringRecord[] = [];
  let away: TeamScoringRecord[] = [];
  let leagueAvg: number | null = null;

  try {
    const [h, a, avg] = await Promise.all([
      getTeamScoringRecords(input.homeTeam, input.sportKey, window, input.commenceTime),
      getTeamScoringRecords(input.awayTeam, input.sportKey, window, input.commenceTime),
      getLeagueAverageScored(input.sportKey, input.commenceTime),
    ]);
    home = realRows(h);
    away = realRows(a);
    leagueAvg = avg ?? null;
  } catch {
    // Fail closed. An empty env means every evaluator abstains, which is the
    // honest outcome when the data layer is unavailable.
    return { env: {}, sources: [], homeSample: 0, awaySample: 0, leagueAvgScored: null };
  }

  const homeScored = mean(home.map((r) => r.teamScore));
  const homeAllowed = mean(home.map((r) => r.opponentScore));
  const awayScored = mean(away.map((r) => r.teamScore));
  const awayAllowed = mean(away.map((r) => r.opponentScore));

  // ── SITUATIONAL: rest and short-week road, derived from kickoff spacing ────
  // The evaluators ask for REST_DAYS / OPP_REST_DAYS / IS_ROAD_TEAM. Those come
  // from the schedule, which this builder does not query; rather than guess a
  // rest number, leave them absent and let those evaluators abstain. Filling
  // them with a plausible default would put a fabricated situational signal into
  // a published probability, which is the exact failure this module exists to
  // prevent. When a schedule source is wired, these get populated for real.

  // ── EFFICIENCY: offense/defense rates vs the league average ───────────────
  // Only when BOTH teams have a real, non-trivial sample. A rate off three
  // bootstrap-filtered games is noise dressed as evidence.
  const MIN_SAMPLE = 5;
  if (leagueAvg != null && leagueAvg > 0 && homeScored != null && awayScored != null) {
    if (home.length >= MIN_SAMPLE && away.length >= MIN_SAMPLE) {
      env.TEAM_SCORED_AVG = homeScored.toFixed(4);
      env.TEAM_ALLOWED_AVG = (homeAllowed ?? homeScored).toFixed(4);
      env.OPP_SCORED_AVG = awayScored.toFixed(4);
      env.OPP_ALLOWED_AVG = (awayAllowed ?? awayScored).toFixed(4);
      env.LEAGUE_AVG_SCORED = leagueAvg.toFixed(4);
      sources.push("TeamGameLog", "LeagueGameLog");
    }
  }

  // ── LUCK: turnover recovery, from real fumble/interception columns ────────
  // TeamGameLog carries scores, not turnover columns, so these stay absent until
  // a pbp-backed source is wired. Declared here as the contract so the gap is
  // visible rather than silently swallowed.

  return {
    env,
    sources,
    homeSample: home.length,
    awaySample: away.length,
    leagueAvgScored: leagueAvg,
  };
}

/**
 * A per-run memo, so a slate covering 80 fixtures does not re-query the same
 * team's rate history once per fixture.
 *
 * Rates are looked up as of each game's own kickoff, so two fixtures involving
 * the same team on the SAME day genuinely share a result. Different days do not,
 * and must not: caching across kickoffs would be exactly the lookahead this
 * module exists to prevent. The key therefore includes the kickoff date, and a
 * run-scoped cache is discarded when the run ends rather than living forever.
 */
export class SignalContextCache {
  private readonly rows = new Map<string, TeamScoringRecord[]>();
  private readonly avg = new Map<string, number | null>();

  private static key(sport: string, team: string, kickoff: Date): string {
    // Day granularity: kickoff times within a day are the same "as of" for
    // practical purposes, and this is what keeps the cache from missing.
    return `${sport}|${team}|${kickoff.toISOString().slice(0, 10)}`;
  }

  async records(sport: string, team: string, window: number, kickoff: Date): Promise<TeamScoringRecord[]> {
    const k = SignalContextCache.key(sport, team, kickoff);
    const hit = this.rows.get(k);
    if (hit) return hit;
    const raw = await getTeamScoringRecords(team, sport, window, kickoff);
    const real = realRows(raw);
    this.rows.set(k, real);
    return real;
  }

  async leagueAvg(sport: string, kickoff: Date): Promise<number | null> {
    const k = SignalContextCache.key(sport, "*", kickoff);
    const hit = this.avg.get(k);
    if (hit !== undefined) return hit;
    const v = (await getLeagueAverageScored(sport, kickoff)) ?? null;
    this.avg.set(k, v);
    return v;
  }

  get size(): number {
    return this.rows.size + this.avg.size;
  }
}

/**
 * As {@link deriveSignalGameContext}, with a caller-owned cache so a slate run
 * pays for each (team, day) once rather than once per fixture.
 */
export async function deriveSignalGameContextCached(
  input: SignalGameContextInput,
  cache: SignalContextCache,
): Promise<DerivedSignalContext> {
  const window = input.windowGames ?? 20;
  const env: Record<string, string> = {};
  const sources: string[] = [];

  let home: TeamScoringRecord[];
  let away: TeamScoringRecord[];
  let leagueAvg: number | null;

  try {
    [home, away, leagueAvg] = await Promise.all([
      cache.records(input.sportKey, input.homeTeam, window, input.commenceTime),
      cache.records(input.sportKey, input.awayTeam, window, input.commenceTime),
      cache.leagueAvg(input.sportKey, input.commenceTime),
    ]);
  } catch {
    return { env: {}, sources: [], homeSample: 0, awaySample: 0, leagueAvgScored: null };
  }

  const homeScored = mean(home.map((r) => r.teamScore));
  const homeAllowed = mean(home.map((r) => r.opponentScore));
  const awayScored = mean(away.map((r) => r.teamScore));
  const awayAllowed = mean(away.map((r) => r.opponentScore));

  const MIN_SAMPLE = 5;
  if (leagueAvg != null && leagueAvg > 0 && homeScored != null && awayScored != null) {
    if (home.length >= MIN_SAMPLE && away.length >= MIN_SAMPLE) {
      env.TEAM_SCORED_AVG = homeScored.toFixed(4);
      env.TEAM_ALLOWED_AVG = (homeAllowed ?? homeScored).toFixed(4);
      env.OPP_SCORED_AVG = awayScored.toFixed(4);
      env.OPP_ALLOWED_AVG = (awayAllowed ?? awayScored).toFixed(4);
      env.LEAGUE_AVG_SCORED = leagueAvg.toFixed(4);
      sources.push("TeamGameLog", "LeagueGameLog");
    }
  }

  return { env, sources, homeSample: home.length, awaySample: away.length, leagueAvgScored: leagueAvg };
}
