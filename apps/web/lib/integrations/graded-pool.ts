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
import type { SleeperPlayersMap } from "../sleeper/source";

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
 * Normalize a team abbreviation for cross-source joins. The model, team
 * environment, and QB forward all read nflverse `recent_team` / `posteam`, so the
 * codes already align in the common case — this just upper-cases and folds the
 * handful of historical relocations / spelling variants so a join never silently
 * misses (e.g. a stale "OAK" row against a current "LV" player). Unknown codes
 * pass through unchanged.
 */
function normTeam(team: string | undefined | null): string {
  const t = (team ?? "").trim().toUpperCase();
  const aliases: Record<string, string> = {
    OAK: "LV",
    SD: "LAC",
    STL: "LA",
    LAR: "LA",
    WAS: "WSH",
    WSH: "WSH",
    JAX: "JAX",
    JAC: "JAX",
    ARZ: "ARI",
    BLT: "BAL",
    CLV: "CLE",
    HST: "HOU",
  };
  return aliases[t] ?? t;
}

// ---------------------------------------------------------------------------
// Sleeper enrichment — consensus rank signal + age curve, applied post-build
// ---------------------------------------------------------------------------

// Up to +6% proj boost for the consensus #1 at their position; scales linearly
// to 0% at 3× the tier cutoff (beyond that the market has low conviction).
const SLEEPER_RANK_MAX_NUDGE = 0.06;

const RANK_TIER_CUTOFF: Record<string, number> = { QB: 12, RB: 24, WR: 36, TE: 12 };

function sleeperRankMult(
  rankPpr: number | null | undefined,
  searchRank: number | null | undefined,
  pos: Player["pos"],
): number {
  const rank = rankPpr ?? searchRank;
  if (!rank || rank <= 0) return 1;
  const cutoff = RANK_TIER_CUTOFF[pos] ?? 24;
  const maxRank = cutoff * 3;
  if (rank > maxRank) return 1;
  const pct = Math.max(0, 1 - (rank - 1) / Math.max(1, maxRank - 1));
  return 1 + SLEEPER_RANK_MAX_NUDGE * pct;
}

// Age-based projection multiplier. QBs peak later; RBs fade earliest.
function ageMultiplier(age: number | null | undefined, pos: Player["pos"]): number {
  if (age == null) return 1;
  if (pos === "QB") {
    if (age < 24) return 1.03;
    if (age <= 35) return 1;
    return Math.max(0.85, 1 - (age - 35) * 0.05);
  }
  if (pos === "RB") {
    if (age < 23) return 1.03;
    if (age <= 26) return 1;
    return Math.max(0.78, 1 - (age - 26) * 0.06);
  }
  // WR / TE
  if (age < 24) return 1.02;
  if (age <= 28) return 1;
  return Math.max(0.80, 1 - (age - 28) * 0.04);
}

/**
 * Enrich a graded pool using Sleeper's current player map:
 *   1. Patch team assignments (Sleeper tracks trades within hours; nflverse lags days).
 *   2. Apply a forward-looking consensus rank nudge (up to +6% proj for the #1 pick).
 *   3. Apply a position-aware age curve (prime window = neutral; aging fade bounded).
 *
 * All three steps are team-patch-then-proj-scale: purely multiplicative, no
 * fabrication. A player absent from Sleeper passes through unchanged. Exported for
 * unit tests; used by loadAndRegisterGradedProvider on the live path.
 */
export function enrichFromSleeper(players: readonly Player[], sleeperMap: SleeperPlayersMap): readonly Player[] {
  return players.map((p) => {
    const raw = sleeperMap[p.id];
    if (!raw) return p;

    // --- Step 1: team patch ---
    const team = raw.team && raw.team !== p.team ? raw.team : p.team;

    // --- Step 2+3: proj multiplier (rank * age) ---
    const rankMult = sleeperRankMult(raw.rank_ppr, raw.search_rank, p.pos);
    const ageMult = ageMultiplier(raw.age, p.pos);
    const totalMult = rankMult * ageMult;

    if (team === p.team && Math.abs(totalMult - 1) <= 0.001) return p;

    // Scale proj and floor/ceiling proportionally (preserves any existing ceiling nudge ratio).
    const newProj = totalMult === 1 ? p.proj : round(p.proj * totalMult);
    const scale = newProj / Math.max(1, p.proj);
    const floor = round(p.floor * scale);
    const ceiling = round(p.ceiling * scale);

    // Annotate the role string so downstream UIs can surface the signal.
    const rankBit = rankMult > 1.001 ? ` · rank #${raw.rank_ppr ?? raw.search_rank}` : "";
    const ageBit = ageMult < 0.999 ? ` · age ${raw.age}↓` : ageMult > 1.001 ? ` · age ${raw.age}↑` : "";
    const role = rankBit || ageBit ? `${p.role}${rankBit}${ageBit}` : p.role;

    return { ...p, team, proj: newProj, floor, ceiling, role };
  });
}

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
 * Load + register the nflverse graded provider. Always active — no env flag
 * required. A source-error model registers nothing (tools stay on the illustrative
 * pool). On success, enriches via Sleeper: patches teams for 2026 offseason moves,
 * applies a forward-looking consensus rank nudge (up to +6% proj), and applies a
 * position-aware age curve. All three degrade gracefully when Sleeper is unavailable.
 */
export async function loadAndRegisterGradedProvider({ fetcher = fetch }: { fetcher?: FetchLike } = {}): Promise<GradedPoolResult> {
  const result = await loadGradedPool({ fetcher });
  if (result.status !== "live" || result.players.length === 0) {
    registerProjectionsProvider(null);
    return result;
  }

  let enriched = result.players;
  try {
    const { fetchSleeperPlayers } = await import("../sleeper/source");
    const sleeperMap = await fetchSleeperPlayers({ fetcher });
    enriched = enrichFromSleeper(result.players, sleeperMap);
  } catch {
    // Sleeper down → keep base nflverse pool unchanged
  }

  registerProjectionsProvider(buildGradedProvider(enriched));
  return { ...result, players: enriched };
}
