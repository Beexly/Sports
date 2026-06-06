/**
 * Galaxy Fantasy — the illustrative player universe.
 *
 * The substrate every tool reads from: draft board, waiver/FAAB, optimizer,
 * trade analyzer, DFS MRI, and the League Twin. Each player carries the fields
 * an A+ intelligence layer needs — projection band (floor/ceiling → volatility),
 * usage share, scheme fit, role archetype, trend, bye, injury.
 *
 * DOCTRINE: explicitly illustrative. Player NAMES are fictional so no estimate is
 * ever pinned to a real person; team codes are real for realism. This is a
 * demonstration of the intelligence, not live projections. A real projections
 * source gets wired behind a gate later.
 */

export type Pos = "QB" | "RB" | "WR" | "TE";
export type Trend = "up" | "flat" | "down";
export type Injury = "healthy" | "questionable" | "out";

export type Player = {
  readonly id: string;
  readonly name: string;
  readonly pos: Pos;
  readonly team: string;
  readonly bye: number;
  /** Projected PPR points for the season. */
  readonly proj: number;
  /** Floor / ceiling season points (the volatility band). */
  readonly floor: number;
  readonly ceiling: number;
  /** Snap/target/carry share 0..1 — the usage signal. */
  readonly usage: number;
  /** How well the player fits the team's (new) scheme, 0..1. */
  readonly schemeFit: number;
  readonly role: string;
  readonly trend: Trend;
  readonly injury: Injury;
  readonly note: string;
};

const p = (
  id: string, name: string, pos: Pos, team: string, bye: number,
  proj: number, floor: number, ceiling: number, usage: number, schemeFit: number,
  role: string, trend: Trend, injury: Injury, note: string,
): Player => ({ id, name, pos, team, bye, proj, floor, ceiling, usage, schemeFit, role, trend, injury, note });

/** ~40 illustrative players across the draftable pool. */
export const PLAYERS: readonly Player[] = [
  // ── RB ──
  p("rb-marcus-vale", "Marcus Vale", "RB", "ATL", 12, 312, 220, 380, 0.82, 0.74, "Bell-cow back", "up", "healthy", "Three-down workload with goal-line equity; the safest floor at the position."),
  p("rb-deon-pryce", "Deon Pryce", "RB", "DET", 8, 298, 180, 372, 0.78, 0.81, "Lead back, new OC", "up", "healthy", "Fits the new wide-zone scheme perfectly; usage trending up through camp."),
  p("rb-tariq-bell", "Tariq Bell", "RB", "PHI", 5, 276, 150, 360, 0.7, 0.66, "Committee lead", "flat", "questionable", "Talented but shares carries; an ankle question caps the early floor."),
  p("rb-kj-ferris", "K.J. Ferris", "RB", "BAL", 14, 254, 140, 330, 0.62, 0.7, "Boom/bust", "up", "healthy", "Explosive but touchdown-dependent; ceiling weeks win you the matchup."),
  p("rb-isaiah-ronan", "Isaiah Ronan", "RB", "SF", 9, 240, 160, 300, 0.66, 0.83, "Pass-catching back", "flat", "healthy", "Elite scheme fit and target share; PPR-stable, lower ceiling."),
  p("rb-cole-mathis", "Cole Mathis", "RB", "GB", 10, 198, 96, 286, 0.5, 0.6, "Timeshare", "down", "healthy", "Losing snaps to a rookie; trending the wrong way but matchup-proof."),
  p("rb-andre-soto", "Andre Soto", "RB", "HOU", 14, 176, 80, 268, 0.46, 0.72, "Handcuff / upside", "up", "healthy", "One injury from a workhorse role; a priority stash with standalone flex value."),
  p("rb-quentin-ash", "Quentin Ash", "RB", "TB", 11, 142, 60, 230, 0.38, 0.55, "Change of pace", "flat", "healthy", "Streaming flex in plus matchups; thin floor without a role change."),
  p("rb-malik-orr", "Malik Orr", "RB", "DEN", 14, 118, 44, 210, 0.32, 0.64, "Waiver upside", "up", "healthy", "Buried on the depth chart but the most talented back if the room thins out."),
  p("rb-victor-pine", "Victor Pine", "RB", "NYJ", 12, 96, 30, 188, 0.26, 0.5, "Deep stash", "up", "healthy", "Camp riser; pure speculative add, no standalone value yet."),

  // ── WR ──
  p("wr-julian-roe", "Julian Roe", "WR", "MIA", 6, 308, 210, 372, 0.84, 0.86, "Alpha WR1", "up", "healthy", "Target hog in a pass-first scheme; elite floor and ceiling — a true cornerstone."),
  p("wr-deshawn-kemp", "DeShawn Kemp", "WR", "CIN", 12, 290, 190, 360, 0.8, 0.78, "WR1", "flat", "healthy", "Volume + red-zone role; rock-steady WR1 production week to week."),
  p("wr-emory-banks", "Emory Banks", "WR", "LAR", 6, 268, 150, 350, 0.74, 0.82, "Vertical WR1", "up", "questionable", "Big-play profile; a hamstring tweak adds week-1 risk to a high ceiling."),
  p("wr-rashad-lin", "Rashad Lin", "WR", "BUF", 7, 248, 160, 318, 0.7, 0.8, "Slot WR1", "up", "healthy", "Slot volume with a great quarterback; PPR-stable, league-winning upside."),
  p("wr-tobias-frey", "Tobias Frey", "WR", "SEA", 10, 224, 130, 300, 0.66, 0.7, "WR2, rising", "up", "healthy", "Earned the WR2 role in camp; ascending arrow you want exposure to."),
  p("wr-noah-castille", "Noah Castille", "WR", "KC", 6, 212, 120, 296, 0.62, 0.84, "Field-stretcher", "flat", "healthy", "Boom/bust deep threat tied to a great offense; tournament leverage in DFS."),
  p("wr-amari-stokes", "Amari Stokes", "WR", "DAL", 7, 188, 90, 280, 0.56, 0.6, "WR2/3", "down", "healthy", "Target competition rising; flex floor, capped ceiling this season."),
  p("wr-leon-deveaux", "Leon Deveaux", "WR", "JAX", 12, 162, 70, 256, 0.5, 0.66, "Bench flex", "flat", "healthy", "Matchup-dependent; a fine bye-week fill-in, not a weekly starter."),
  p("wr-cy-merritt", "Cy Merritt", "WR", "NYG", 11, 138, 56, 232, 0.44, 0.62, "Waiver target", "up", "healthy", "Snap share climbing; the kind of add that becomes a flex by midseason."),
  p("wr-dom-vega", "Dom Vega", "WR", "LV", 10, 104, 36, 198, 0.34, 0.55, "Deep stash", "up", "healthy", "Rookie with route polish; stash for a second-half role."),

  // ── QB ──
  p("qb-silas-hart", "Silas Hart", "QB", "PHI", 5, 392, 300, 460, 0.0, 0.85, "Dual-threat QB1", "up", "healthy", "Rushing floor + passing ceiling; the rare positional cheat code."),
  p("qb-reed-callum", "Reed Callum", "QB", "BAL", 14, 364, 280, 430, 0.0, 0.8, "Konami QB1", "flat", "healthy", "Legs make the floor; the safest week-to-week QB1 you can roster."),
  p("qb-emmett-shaw", "Emmett Shaw", "QB", "CIN", 12, 336, 250, 412, 0.0, 0.82, "Pocket QB1", "up", "healthy", "Elite supporting cast; passing-volume ceiling in shootout weeks."),
  p("qb-grant-soto", "Grant Soto", "QB", "DET", 8, 300, 220, 366, 0.0, 0.78, "Streamer-plus", "flat", "healthy", "Matchup-based QB1; pairs beautifully in a DFS stack."),
  p("qb-bo-finnegan", "Bo Finnegan", "QB", "SEA", 10, 268, 190, 332, 0.0, 0.7, "Late-round value", "up", "healthy", "Cheap dual-threat upside; the value QB that wins drafts."),

  // ── TE ──
  p("te-rocco-vance", "Rocco Vance", "TE", "KC", 6, 252, 170, 312, 0.7, 0.86, "Positional cheat", "up", "healthy", "WR-level target share at TE; the one player who breaks the position."),
  p("te-dell-osei", "Dell Osei", "TE", "DET", 8, 196, 120, 264, 0.6, 0.78, "TE1", "flat", "healthy", "Reliable red-zone role; steady TE1 you set and forget."),
  p("te-marco-pell", "Marco Pell", "TE", "GB", 10, 152, 80, 226, 0.5, 0.66, "Streaming TE1", "up", "healthy", "Ascending role in a good offense; matchup-stream with upside."),
  p("te-asa-quinn", "Asa Quinn", "TE", "BUF", 7, 118, 56, 188, 0.42, 0.6, "Bench TE", "flat", "questionable", "Touchdown-dependent; a knock keeps the floor thin."),
  p("te-ivan-mraz", "Ivan Mraz", "TE", "LAR", 6, 92, 34, 166, 0.34, 0.58, "Waiver dart", "up", "healthy", "Snaps trending up; speculative add for a thin TE room."),
];

// ── Pure intelligence helpers ──────────────────────────────────────────────

export const POSITIONS: readonly Pos[] = ["QB", "RB", "WR", "TE"];

export const POS_HEX: Record<Pos, string> = {
  QB: "#00E5FF",
  RB: "#7A5CFF",
  WR: "#FF2DD6",
  TE: "#F6F7FA",
};

/** Replacement-level baseline per position (the Nth starter across a 12-team league). */
const REPLACEMENT_RANK: Record<Pos, number> = { QB: 12, RB: 30, WR: 36, TE: 12 };

/**
 * The pool-dependent helpers (VOR, tiers, board rank) accept an optional `pool`
 * so they compute correctly against whatever player universe is active — the
 * illustrative default OR a licensed live feed routed in via
 * `activePlayerPool()`. The default keeps every existing caller/test unchanged.
 */
export function byPosition(pos: Pos, pool: readonly Player[] = PLAYERS): Player[] {
  return pool.filter((pl) => pl.pos === pos).sort((a, b) => b.proj - a.proj);
}

/** Value Over Replacement — the true draft currency. */
export function replacementProj(pos: Pos, pool: readonly Player[] = PLAYERS): number {
  const ranked = byPosition(pos, pool);
  const idx = Math.min(REPLACEMENT_RANK[pos], ranked.length) - 1;
  return ranked[Math.max(0, idx)]?.proj ?? ranked[ranked.length - 1]?.proj ?? 0;
}

export function vor(player: Player, pool: readonly Player[] = PLAYERS): number {
  return Math.round(player.proj - replacementProj(player.pos, pool));
}

/** Volatility 0..1 from the floor/ceiling band relative to the projection. */
export function volatility(player: Player): number {
  const band = player.ceiling - player.floor;
  return Math.max(0, Math.min(1, band / (player.proj * 1.4)));
}

/** Overall board ranked by VOR (cross-position draft value). */
export function overallBoard(pool: readonly Player[] = PLAYERS): Player[] {
  return [...pool].sort((a, b) => vor(b, pool) - vor(a, pool));
}

/** ADP-style overall rank (1-indexed) derived from VOR. */
export function adpRank(player: Player, pool: readonly Player[] = PLAYERS): number {
  return overallBoard(pool).findIndex((pl) => pl.id === player.id) + 1;
}

/** Tier within a position (1 = elite), from VOR gaps. */
export function tier(player: Player, pool: readonly Player[] = PLAYERS): number {
  const ranked = byPosition(player.pos, pool).sort((a, b) => vor(b, pool) - vor(a, pool));
  const idx = ranked.findIndex((pl) => pl.id === player.id);
  // simple tiering: every ~25 VOR points is a tier break
  let t = 1;
  for (let i = 1; i <= idx; i++) {
    if (vor(ranked[i - 1]!, pool) - vor(ranked[i]!, pool) >= 22) t++;
  }
  return t;
}

/** Two players are correlated if they share a team (e.g. QB↔WR stack). */
export function correlated(a: Player, b: Player): boolean {
  return a.id !== b.id && a.team === b.team;
}

export function playerById(id: string, pool: readonly Player[] = PLAYERS): Player | undefined {
  return pool.find((pl) => pl.id === id);
}

export const ILLUSTRATIVE_NOTE =
  "Illustrative player universe — fictional players, illustrative projections. A demonstration of the intelligence, not live data.";
