/**
 * Graded projections provider — the wire that makes data drive every tool.
 *
 * It composes the real Player Intelligence model (process grade) + Expected
 * Fantasy Points (xFP) + Team Environment (per-team neutral-script EPA) + QB
 * Forward (forward-looking passing prior) into REAL graded players mapped onto
 * the Player shape the fantasy engines already read. Registered through the
 * existing founder-gated seam (registerProjectionsProvider + PROJECTIONS_PROVIDER
 * env), so the moment the founder flips it on, lineup / waivers / DFS / draft /
 * trade / autopilot all run on real nflverse-graded data via activePlayerPool() —
 * with ZERO changes to those tools.
 *
 * No fabrication: the projection is derived from xFP (expected points), falling
 * back to actual per-game only when xFP is missing; a player without the inputs
 * is excluded, not invented. schemeFit is the player's TEAM offensive environment
 * (within-league percentile of neutral-script offensive EPA) and falls back to a
 * neutral 0.6 when the team has no environment row — never an invented number.
 * The floor/ceiling band and usage are clearly model-derived. Names are REAL here
 * (grades are real facts), unlike the illustrative pool. Gated by design — a
 * deliberate go-live decision.
 */

import { registerProjectionsProvider, type PlayerProjection, type ProjectionsProvider } from "./projections";
import type { Player } from "../fantasy/players";
import { loadPlayerModel, type PlayerProfile } from "../intelligence/player-model";
import { loadExpectedPoints, type ExpectedPointsRow } from "../intelligence/expected-points";
import { normName, percentileRanks } from "../intelligence/qb-consensus";
import type { TeamEnvironmentRow } from "../intelligence/team-environment";
import type { QbForwardRow } from "../intelligence/qb-forward";
import { canonicalTeam } from "../nflverse/entities";

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

const SEASON_GAMES = 17;
const NEUTRAL_SCHEME_FIT = 0.6; // honest neutral when we have no team environment

// Bounded, clearly model-derived QB Forward nudges. Forward grade is a 0-100
// within-pool percentile; we only act on it near the extremes so the nudge is a
// principled "elite passing environment" signal, not noise.
const QB_FORWARD_ELITE = 75; // forwardGrade at/above this counts as an elite forward prior
const QB_CEILING_NUDGE_MAX = 0.08; // up to +8% ceiling for an elite QB (the QB himself)
const PASS_CATCHER_NUDGE_MAX = 0.05; // up to +5% ceiling for a WR/TE in an elite passing env

function round(v: number, d = 0): number {
  const f = 10 ** d;
  return Math.round(v * f) / f;
}
function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

/**
 * Normalize a team abbreviation for cross-source joins. Delegates to the canonical
 * entity graph (lib/nflverse/entities) so relocations / spelling / PFR variants
 * fold the same way everywhere — formerly a duplicated local alias map.
 */
const normTeam = canonicalTeam;

/**
 * Build a team -> schemeFit (0..1) map from team-environment rows. schemeFit is
 * the team's within-league OFFENSIVE quality, expressed 0..1.
 *
 * team-environment already publishes `offEpaPct` (a within-league percentile of
 * neutral-script offensive EPA/play). To be robust to the exact set of teams that
 * qualified in the current sample, we RE-RANK the supplied rows here with the
 * shared `percentileRanks` helper over offensive EPA/play and average that with
 * success-rate rank — two correlated-but-distinct reads of offensive quality —
 * so a single noisy metric can't dominate. Result is 0..1 (percentile/100).
 */
function buildSchemeFitByTeam(teamEnv: readonly TeamEnvironmentRow[]): Map<string, number> {
  const out = new Map<string, number>();
  if (teamEnv.length === 0) return out;
  const epaPcts = percentileRanks(teamEnv.map((r) => r.offEpaPerPlay));
  const successPcts = percentileRanks(teamEnv.map((r) => r.offSuccessRate));
  teamEnv.forEach((r, i) => {
    const blended = ((epaPcts[i] ?? 0) + (successPcts[i] ?? 0)) / 2; // 0..100
    out.set(normTeam(r.team), clamp01(blended / 100));
  });
  return out;
}

/** Build a team -> QB forwardGrade (0-100) map, keeping the team's best forward grade. */
function buildQbGradeByTeam(qbForward: readonly QbForwardRow[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const r of qbForward) {
    const team = normTeam(r.team);
    const prev = out.get(team);
    if (prev == null || r.forwardGrade > prev) out.set(team, r.forwardGrade);
  }
  return out;
}

/**
 * Map graded profiles (+ xFP, + team environment, + QB forward) to the rich
 * Player shape. Pure + testable.
 *
 * Projection basis is unchanged: xFP-per-game x 17 when available, else actual
 * per-game; trend from the buy/sell signal; a model-derived band + usage.
 *
 * schemeFit (0..1) is the player's TEAM offensive environment, joined by team
 * abbreviation. When `teamEnv` is absent or the team has no row, schemeFit falls
 * back to the neutral 0.6 (never fabricated).
 *
 * QB Forward is a passing-environment nudge applied to the CEILING only (never the
 * floor), and only when present:
 *   • QB whose own team forwardGrade is elite (>= 75): ceiling x (1 + up to +8%),
 *     scaled linearly from the elite threshold to a perfect 100 grade.
 *   • WR/TE on a team with an elite QB forward grade: ceiling x (1 + up to +5%),
 *     same linear scaling — a modest team-passing tailwind for pass-catchers.
 * Nudges are bounded, clearly model-derived, and fully graceful (no qbForward ->
 * no nudge).
 */
export function buildGradedPool(
  profiles: readonly PlayerProfile[],
  xfp: readonly ExpectedPointsRow[],
  teamEnv: readonly TeamEnvironmentRow[] = [],
  qbForward: readonly QbForwardRow[] = [],
): Player[] {
  const xfpByName = new Map(xfp.map((r) => [normName(r.name), r.xfpPerGame]));
  const schemeFitByTeam = buildSchemeFitByTeam(teamEnv);
  const qbGradeByTeam = buildQbGradeByTeam(qbForward);

  return profiles
    .map((p): Player | null => {
      const xfpPg = xfpByName.get(normName(p.name));
      const basis = xfpPg != null && xfpPg > 0 ? xfpPg : p.fppg; // prefer expected (predictive) over actual
      if (!(basis > 0)) return null; // no usable input -> exclude, never invent
      const proj = round(basis * SEASON_GAMES);
      const trend: Player["trend"] = p.signal === "buy-low" ? "up" : p.signal === "sell-high" ? "down" : "flat";
      const usage = p.position === "QB" ? 0 : clamp01(p.touches / Math.max(1, p.games * 18));

      // schemeFit from the team's offensive environment; neutral 0.6 fallback.
      const teamKey = normTeam(p.team);
      const teamFit = schemeFitByTeam.get(teamKey);
      const schemeFit = teamFit ?? NEUTRAL_SCHEME_FIT;

      // QB Forward passing-environment nudge -> ceiling only.
      const teamQbGrade = qbGradeByTeam.get(teamKey);
      // Linear ramp from the elite threshold (0) to a perfect 100 grade (1).
      const eliteScale =
        teamQbGrade != null && teamQbGrade >= QB_FORWARD_ELITE
          ? clamp01((teamQbGrade - QB_FORWARD_ELITE) / (100 - QB_FORWARD_ELITE))
          : 0;
      const ceilingMult =
        p.position === "QB"
          ? 1 + QB_CEILING_NUDGE_MAX * eliteScale
          : p.position === "WR" || p.position === "TE"
            ? 1 + PASS_CATCHER_NUDGE_MAX * eliteScale
            : 1;
      const ceiling = round(proj * 1.4 * ceilingMult);

      // Surface the environment context in the role / note where natural.
      const fitPct = Math.round(schemeFit * 100);
      const envBit = teamFit != null ? ` · ${teamKey} off env ${fitPct}%` : "";
      const qbBit =
        eliteScale > 0
          ? p.position === "QB"
            ? " · elite forward prior"
            : p.position === "WR" || p.position === "TE"
              ? " · elite passing env"
              : ""
          : "";
      const role = `${p.position}${p.signal === "buy-low" ? " · rising" : p.signal === "sell-high" ? " · regressing" : ""}${envBit}${qbBit}`;
      const note =
        teamFit != null
          ? `${p.note} Team offensive environment: ${teamKey} ${fitPct}th pct (neutral-script EPA).`
          : p.note;

      return {
        id: p.playerId,
        name: p.name,
        pos: p.position,
        team: p.team,
        bye: 0, // bye not in this feed; tools' bye logic no-ops rather than misfire
        proj,
        floor: round(proj * 0.75), // floor is never nudged
        ceiling,
        usage: Math.round(usage * 100) / 100,
        schemeFit: Math.round(schemeFit * 100) / 100,
        role,
        trend,
        injury: "healthy",
        note,
      };
    })
    .filter((p): p is Player => p !== null)
    .sort((a, b) => b.proj - a.proj);
}

function toProjection(p: Player): PlayerProjection {
  return { playerId: p.id, name: p.name, pos: p.pos, team: p.team, proj: p.proj, floor: p.floor, ceiling: p.ceiling, source: "live" };
}

/** Build a live ProjectionsProvider from an already-loaded graded pool. Pure. */
export function buildGradedProvider(pool: readonly Player[]): ProjectionsProvider {
  return {
    name: "Graded — nflverse process model",
    live: true,
    list: () => pool.map(toProjection),
    players: () => pool,
  };
}

export interface GradedPoolResult {
  readonly status: "live" | "source-error";
  readonly season: number;
  readonly count: number;
  readonly players: readonly Player[];
  readonly error: string | null;
}

/** Load the model + xFP + team environment + QB forward and build the graded pool (no registration). */
export async function loadGradedPool({ fetcher = fetch }: { fetcher?: FetchLike } = {}): Promise<GradedPoolResult> {
  const model = await loadPlayerModel({ fetcher });
  if (model.status === "source-error") {
    return { status: "source-error", season: 0, count: 0, players: [], error: model.error };
  }
  // Season-consistent composition: the expected-points basis and the QB forward
  // prior must describe the SAME season as the process grade. They publish on
  // different cadences (nflverse player_stats vs ffverse ff_opportunity), so we
  // pin each to the model's season and only feed it when status === "live" AND the
  // season matches exactly — otherwise we drop it (xFP basis falls back to the
  // model's own per-game; no QB nudge). We never pair a grade from one season with
  // a signal from another.
  //
  // DELIBERATELY NOT loaded here: team-environment (neutral-script EPA). It reads
  // play-by-play (~40MB), which is far too heavy to fetch+parse on a serverless
  // cold start / per request — it times out in production. schemeFit therefore
  // falls back to its documented neutral default on the live path. The richer
  // team-environment schemeFit returns via a precomputed snapshot refresh (where
  // the heavy load runs with an extended budget), not on this hot path.
  const { loadQbForward } = await import("../intelligence/qb-forward");

  // Both remaining downstream loads are cheap; run them concurrently, each guarded.
  const [xfp, qbForward] = await Promise.all([
    loadExpectedPoints({ fetcher, season: model.season }),
    loadQbForward({ fetcher, season: model.season }),
  ]);

  const xfpRows = xfp.status === "live" && xfp.season === model.season ? xfp.rows : [];
  const qbForwardRows = qbForward.status === "live" && qbForward.season === model.season ? qbForward.rows : [];

  // teamEnv intentionally [] on the live path (see note above) -> neutral schemeFit.
  const pool = buildGradedPool(model.profiles, xfpRows, [], qbForwardRows);
  return { status: "live", season: model.season, count: pool.length, players: pool, error: null };
}

/**
 * Founder/server hook: load + register the graded provider so the tools go live
 * (only takes effect when PROJECTIONS_PROVIDER is also set — the env gate). A
 * source-error model registers nothing (the tools stay on the illustrative pool).
 */
export async function loadAndRegisterGradedProvider({ fetcher = fetch }: { fetcher?: FetchLike } = {}): Promise<GradedPoolResult> {
  const result = await loadGradedPool({ fetcher });
  registerProjectionsProvider(result.status === "live" && result.players.length > 0 ? buildGradedProvider(result.players) : null);
  return result;
}
