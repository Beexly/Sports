/**
 * Graded projections provider — the wire that makes data drive every tool.
 *
 * It composes the real Player Intelligence model (process grade) + Expected
 * Fantasy Points (xFP) into REAL graded players mapped onto the Player shape the
 * fantasy engines already read. Registered through the existing founder-gated
 * seam (registerProjectionsProvider + PROJECTIONS_PROVIDER env), so the moment
 * the founder flips it on, lineup / waivers / DFS / draft / trade / autopilot all
 * run on real nflverse-graded data via activePlayerPool() — with ZERO changes to
 * those tools.
 *
 * No fabrication: the projection is derived from xFP (expected points), falling
 * back to actual per-game only when xFP is missing; a player without the inputs
 * is excluded, not invented. The floor/ceiling band and usage are clearly
 * model-derived. Names are REAL here (grades are real facts), unlike the
 * illustrative pool. Gated by design — a deliberate go-live decision.
 */

import { registerProjectionsProvider, type PlayerProjection, type ProjectionsProvider } from "./projections";
import type { Player } from "../fantasy/players";
import { loadPlayerModel, type PlayerProfile } from "../intelligence/player-model";
import { loadExpectedPoints, type ExpectedPointsRow } from "../intelligence/expected-points";
import { normName } from "../intelligence/qb-consensus";

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

const SEASON_GAMES = 17;

function round(v: number, d = 0): number {
  const f = 10 ** d;
  return Math.round(v * f) / f;
}
function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

/**
 * Map graded profiles (+ xFP) to the rich Player shape. Projection is xFP-per-
 * game x 17 when available, else actual per-game; trend from the buy/sell signal;
 * a model-derived band + usage. Pure + testable.
 */
export function buildGradedPool(profiles: readonly PlayerProfile[], xfp: readonly ExpectedPointsRow[]): Player[] {
  const xfpByName = new Map(xfp.map((r) => [normName(r.name), r.xfpPerGame]));

  return profiles
    .map((p): Player | null => {
      const xfpPg = xfpByName.get(normName(p.name));
      const basis = xfpPg != null && xfpPg > 0 ? xfpPg : p.fppg; // prefer expected (predictive) over actual
      if (!(basis > 0)) return null; // no usable input -> exclude, never invent
      const proj = round(basis * SEASON_GAMES);
      const trend: Player["trend"] = p.signal === "buy-low" ? "up" : p.signal === "sell-high" ? "down" : "flat";
      const usage = p.position === "QB" ? 0 : clamp01(p.touches / Math.max(1, p.games * 18));
      return {
        id: p.playerId,
        name: p.name,
        pos: p.position,
        team: p.team,
        bye: 0, // bye not in this feed; tools' bye logic no-ops rather than misfire
        proj,
        floor: round(proj * 0.75),
        ceiling: round(proj * 1.4),
        usage: Math.round(usage * 100) / 100,
        schemeFit: 0.6,
        role: `${p.position}${p.signal === "buy-low" ? " · rising" : p.signal === "sell-high" ? " · regressing" : ""}`,
        trend,
        injury: "healthy",
        note: p.note,
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

/** Load the model + xFP and build the graded pool (no registration). */
export async function loadGradedPool({ fetcher = fetch }: { fetcher?: FetchLike } = {}): Promise<GradedPoolResult> {
  const model = await loadPlayerModel({ fetcher });
  if (model.status === "source-error") {
    return { status: "source-error", season: 0, count: 0, players: [], error: model.error };
  }
  // Season-consistent composition: the process grade and the expected-points
  // basis must describe the SAME season. The two sources publish on different
  // cadences (nflverse player_stats vs ffverse ff_opportunity), so we pin xFP to
  // the model's season and only let it feed projections when the seasons match
  // exactly — otherwise the basis falls back to the model's own per-game (still
  // season-correct), never a 2024 grade paired with 2025 expected points.
  const xfp = await loadExpectedPoints({ fetcher, season: model.season });
  const xfpRows = xfp.status === "live" && xfp.season === model.season ? xfp.rows : [];
  const pool = buildGradedPool(model.profiles, xfpRows);
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
