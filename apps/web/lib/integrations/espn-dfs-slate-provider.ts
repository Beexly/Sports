/**
 * espn-dfs-slate-provider — the first provider for the active-slate seam.
 *
 * WHAT IT IS. A keyless slate built from the repo's ESPN public adapter
 * (`lib/data-sources/espn-public.ts`): the week's scoreboard decides which
 * teams play; each playing team's roster supplies REAL players (names,
 * positions, teams). That is all ESPN keyless honestly provides — it has
 * no DraftKings salaries and no projections — so the rest of the row comes
 * from the engine, injected as a projection lookup:
 *
 *   - A rostered player with NO engine projection is DROPPED, never
 *     invented. The drop count is reported, not hidden.
 *   - `salary` is 0 and `salaryIsReal` is false until a licensed salary
 *     feed is wired — the same convention the engine slate provider
 *     established, so the optimizer's cap is a no-op rather than a silent
 *     constraint built on fiction.
 *   - `own` is the neutral 0.5 and `ownershipIsAssumed` is true; field
 *     ownership is not derivable from anything keyless.
 *   - Any ESPN failure (network, HTTP, parse) yields an EMPTY slate with
 *     the failure named in the report. Empty is the honest state; the
 *     sample slate is never a substitute (see dfs-active-slate.ts).
 *
 * The join key between ESPN athletes and engine projections is the
 * caller's problem, deliberately: the provider takes a lookup keyed by
 * ESPN athlete id (team defenses keyed `DST-<ABBR>`), and the production
 * wiring of that lookup (Player.espnId → engine projections) is the named
 * shadow seam. This module never fabricates the join.
 */

import type { DfsPlayer, DfsPos } from "../fantasy/dfs-slate";
import type { ActiveSlateProvider } from "./dfs-active-slate";

/** Minimal structural shapes of the ESPN public adapter's results. */
export interface EspnGameLike {
  readonly home: { readonly teamId: string; readonly abbreviation: string };
  readonly away: { readonly teamId: string; readonly abbreviation: string };
}
export interface EspnScoreboardLike {
  readonly ok: boolean;
  readonly games?: readonly EspnGameLike[];
}
export interface EspnRosterPlayerLike {
  readonly id: string;
  readonly fullName: string;
  readonly position: string;
  readonly status: string;
}
export interface EspnRosterLike {
  readonly ok: boolean;
  readonly players?: readonly EspnRosterPlayerLike[];
}

/** A measured engine projection for one player. Never a guess. */
export interface SlateProjection {
  readonly proj: number;
  readonly floor: number;
  readonly ceiling: number;
}

export interface EspnSlateDeps {
  readonly fetchScoreboard: () => Promise<EspnScoreboardLike>;
  readonly fetchRoster: (teamId: string) => Promise<EspnRosterLike>;
  /** ESPN athlete id → projection, or null when the engine has none. */
  readonly projectionFor: (espnAthleteId: string) => SlateProjection | null;
}

export interface EspnSlateReport {
  readonly players: readonly DfsPlayer[];
  readonly games: number;
  readonly teams: number;
  /** Rostered players dropped for lack of an engine projection. */
  readonly droppedNoProjection: number;
  /** Roster entries skipped for an unmappable position or inactive status. */
  readonly skipped: number;
  /** FALSE until a licensed salary feed is wired. */
  readonly salaryIsReal: boolean;
  /** TRUE: field ownership is the neutral 0.5, not a projection. */
  readonly ownershipIsAssumed: boolean;
  /** Set when ESPN failed; the slate is empty and this says why. */
  readonly failure: string | null;
}

const NEUTRAL_OWNERSHIP = 0.5;

const POS_MAP: Readonly<Record<string, DfsPos>> = {
  QB: "QB", RB: "RB", FB: "RB", WR: "WR", TE: "TE",
};

export async function buildEspnKeylessSlate(deps: EspnSlateDeps): Promise<EspnSlateReport> {
  const empty = (failure: string | null, games = 0, teams = 0): EspnSlateReport => ({
    players: [], games, teams, droppedNoProjection: 0, skipped: 0,
    salaryIsReal: false, ownershipIsAssumed: true, failure,
  });

  let scoreboard: EspnScoreboardLike;
  try {
    scoreboard = await deps.fetchScoreboard();
  } catch (err) {
    return empty(`scoreboard fetch threw: ${err instanceof Error ? err.message : String(err)}`);
  }
  if (!scoreboard.ok || !scoreboard.games) return empty("scoreboard unavailable from ESPN keyless feed");
  if (scoreboard.games.length === 0) return empty(null, 0, 0);

  // teamId → { abbr, opp } for every team playing this week.
  const teams = new Map<string, { abbr: string; opp: string }>();
  for (const g of scoreboard.games) {
    teams.set(g.home.teamId, { abbr: g.home.abbreviation, opp: g.away.abbreviation });
    teams.set(g.away.teamId, { abbr: g.away.abbreviation, opp: g.home.abbreviation });
  }

  const players: DfsPlayer[] = [];
  let droppedNoProjection = 0;
  let skipped = 0;

  for (const [teamId, t] of teams) {
    let roster: EspnRosterLike;
    try {
      roster = await deps.fetchRoster(teamId);
    } catch {
      continue; // a missing roster is a smaller honest slate, not a failure of the whole
    }
    if (!roster.ok || !roster.players) continue;
    for (const p of roster.players) {
      if (p.status && p.status.toLowerCase() !== "active") { skipped += 1; continue; }
      const pos = POS_MAP[p.position.toUpperCase()];
      if (!pos) { skipped += 1; continue; }
      const projection = deps.projectionFor(p.id);
      if (!projection) { droppedNoProjection += 1; continue; }
      players.push({
        id: p.id,
        name: p.fullName,
        pos,
        team: t.abbr,
        opp: t.opp,
        salary: 0,
        proj: projection.proj,
        floor: projection.floor,
        ceiling: projection.ceiling,
        own: NEUTRAL_OWNERSHIP,
      });
    }
    // Team defense: only when the engine projects it, keyed DST-<ABBR>.
    const dst = deps.projectionFor(`DST-${t.abbr}`);
    if (dst) {
      players.push({
        id: `DST-${t.abbr}`, name: `${t.abbr} DST`, pos: "DST",
        team: t.abbr, opp: t.opp, salary: 0,
        proj: dst.proj, floor: dst.floor, ceiling: dst.ceiling,
        own: NEUTRAL_OWNERSHIP,
      });
    }
  }

  return {
    players,
    games: scoreboard.games.length,
    teams: teams.size,
    droppedNoProjection,
    skipped,
    salaryIsReal: false,
    ownershipIsAssumed: true,
    failure: null,
  };
}

/**
 * The provider object for `registerActiveSlate`. The slate is built lazily
 * on each resolution and cached per provider instance; a build failure
 * resolves to the empty slate (the report keeps the reason).
 */
export function createEspnKeylessSlateProvider(deps: EspnSlateDeps): {
  provider: ActiveSlateProvider;
  lastReport: () => EspnSlateReport | null;
} {
  let cache: EspnSlateReport | null = null;
  const provider: ActiveSlateProvider = {
    name: "ESPN keyless slate",
    source: "espn-keyless",
    slate: async () => {
      cache = await buildEspnKeylessSlate(deps);
      return cache.players;
    },
  };
  return { provider, lastReport: () => cache };
}

/**
 * Production wiring against the repo's ESPN public adapter. The adapter is
 * imported lazily so unit tests of the seam never load it.
 * `projectionFor` stays the caller's injection — see the module header.
 */
export async function espnPublicDeps(
  projectionFor: EspnSlateDeps["projectionFor"],
): Promise<EspnSlateDeps> {
  const espn = await import("../data-sources/espn-public");
  return {
    fetchScoreboard: async () => {
      const r = await espn.fetchEspnScoreboard("football", "nfl");
      return "games" in r ? { ok: true, games: r.games } : { ok: false };
    },
    fetchRoster: async (teamId: string) => {
      const r = await espn.fetchEspnRoster("football", "nfl", teamId);
      return "players" in r ? { ok: true, players: r.players } : { ok: false };
    },
    projectionFor,
  };
}
