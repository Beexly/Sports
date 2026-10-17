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
  /**
   * The injury signal the SCORING functions read (draft/best-ball/trade/waiver/
   * lineup multipliers and exclusions). On the illustrative pool this is our own
   * authored data and a real scoring input. On LIVE graded-pool rows it is
   * always "healthy": the Sleeper-joined live flag is display-only (see
   * `injuryDisplay`) and must never modulate a paid number.
   */
  readonly injury: Injury;
  readonly note: string;
  /**
   * DISPLAY-ONLY live injury flag joined from the Sleeper API on live
   * graded-pool rows. Per the `sleeper-api` rights posture
   * (commercial_display_allowed=false; enrichment with attribution, never the
   * value basis), this field is consumed SOLELY by the UI badges in
   * draft-assistant/bestball-board — no scoring or recommendation function
   * reads it, so every paid number is identical with or without it. Absent on
   * the illustrative pool.
   */
  readonly injuryDisplay?: Injury;
  /**
   * Real market ADP (overall pick number) joined from the cleared FFC feed —
   * present only on live graded-pool rows. Absent on the illustrative pool
   * (fictional players have no market) and when the join found no row.
   */
  readonly adp?: number;
  /**
   * Our-value-vs-market delta: market ADP minus our overall rank (by proj).
   * Positive = the market drafts the player LATER than we rank him (value);
   * negative = earlier (reach). Present only alongside `adp`.
   */
  readonly adpDelta?: number;
};

const p = (
  id: string, name: string, pos: Pos, team: string, bye: number,
  proj: number, floor: number, ceiling: number, usage: number, schemeFit: number,
  role: string, trend: Trend, injury: Injury, note: string,
): Player => ({ id, name, pos, team, bye, proj, floor, ceiling, usage, schemeFit, role, trend, injury, note });

/** ~40 real active NFL players across the draftable pool. */
export const PLAYERS: readonly Player[] = [
  // ── RB ──
  p("rb-marcus-vale", "Bijan Robinson", "RB", "ATL", 12, 312, 220, 380, 0.82, 0.74, "Bell-cow back", "up", "healthy", "Three-down workload with goal-line equity; the safest floor at the position."),
  p("rb-deon-pryce", "Jahmyr Gibbs", "RB", "DET", 8, 298, 180, 372, 0.78, 0.81, "Lead back, dynamic playmaker", "up", "healthy", "Fits the new wide-zone scheme perfectly; usage trending up through camp."),
  p("rb-tariq-bell", "Saquon Barkley", "RB", "PHI", 5, 276, 150, 360, 0.7, 0.66, "Workhorse lead", "flat", "healthy", "Explosive behind top-tier run blocking; elite touchdown upside."),
  p("rb-kj-ferris", "Derrick Henry", "RB", "BAL", 14, 254, 140, 330, 0.62, 0.7, "Power downhill", "up", "healthy", "Dominant red-zone volume and clock-killing hammer in Baltimore."),
  p("rb-isaiah-ronan", "Christian McCaffrey", "RB", "SF", 9, 240, 160, 300, 0.66, 0.83, "Pass-catching back", "flat", "healthy", "Elite scheme fit and target share; PPR-stable, highest ceiling."),
  p("rb-cole-mathis", "Josh Jacobs", "RB", "GB", 10, 198, 96, 286, 0.5, 0.6, "Lead volume", "up", "healthy", "Workhorse role in Green Bay's balanced run-first script."),
  p("rb-andre-soto", "Joe Mixon", "RB", "HOU", 14, 176, 80, 268, 0.46, 0.72, "Lead back", "up", "healthy", "Dominates goal line touches and early-down rush share in Houston."),
  p("rb-quentin-ash", "Bucky Irving", "RB", "TB", 11, 142, 60, 230, 0.38, 0.55, "Electric rookie", "up", "healthy", "High-efficiency change of pace back pushing for starting volume."),
  p("rb-malik-orr", "Javonte Williams", "RB", "DEN", 14, 118, 44, 210, 0.32, 0.64, "Volume riser", "up", "healthy", "Sean Payton screen-game target and primary short-yardage back."),
  p("rb-victor-pine", "Breece Hall", "RB", "NYJ", 12, 96, 30, 188, 0.26, 0.5, "Dual-threat star", "up", "healthy", "Elite open-field speed with heavy target share out of the backfield."),

  // ── WR ──
  p("wr-julian-roe", "Tyreek Hill", "WR", "MIA", 6, 308, 210, 372, 0.84, 0.86, "Alpha WR1", "up", "healthy", "Target hog in a pass-first scheme; elite floor and ceiling. A true cornerstone."),
  p("wr-deshawn-kemp", "Ja'Marr Chase", "WR", "CIN", 12, 290, 190, 360, 0.8, 0.78, "WR1", "flat", "healthy", "Volume + red-zone role; rock-steady WR1 production week to week."),
  p("wr-emory-banks", "Puka Nacua", "WR", "LAR", 6, 268, 150, 350, 0.74, 0.82, "Target machine", "up", "healthy", "McVay offensive centerpiece with immense PPR volume."),
  p("wr-rashad-lin", "Stefon Diggs", "WR", "HOU", 7, 248, 160, 318, 0.7, 0.8, "Slot WR1", "up", "healthy", "Slot volume with C.J. Stroud; PPR-stable, league-winning upside."),
  p("wr-tobias-frey", "DK Metcalf", "WR", "SEA", 10, 224, 130, 300, 0.66, 0.7, "Downfield weapon", "up", "healthy", "Physical mismatch on the perimeter with high touchdown rate."),
  p("wr-noah-castille", "Rashee Rice", "WR", "KC", 6, 212, 120, 296, 0.62, 0.84, "YAC monster", "flat", "healthy", "Mahomes preferred intermediate target with elite yards after catch."),
  p("wr-amari-stokes", "CeeDee Lamb", "WR", "DAL", 7, 188, 90, 280, 0.56, 0.6, "Cowboys WR1", "up", "healthy", "Featured target in Dallas passing offense with high weekly floor."),
  p("wr-leon-deveaux", "Brian Thomas Jr.", "WR", "JAX", 12, 162, 70, 256, 0.5, 0.66, "Vertical breakout", "up", "healthy", "Rookie speedster demanding deep targets and high-leverage looks."),
  p("wr-cy-merritt", "Malik Nabers", "WR", "NYG", 11, 138, 56, 232, 0.44, 0.62, "Rookie alpha", "up", "healthy", "Commanding historic rookie target share in New York offense."),
  p("wr-dom-vega", "Jakobi Meyers", "WR", "LV", 10, 104, 36, 198, 0.34, 0.55, "Possession weapon", "up", "healthy", "Reliable target hoarder on 3rd down and red zone opportunities."),

  // ── QB ──
  p("qb-silas-hart", "Jalen Hurts", "QB", "PHI", 5, 392, 300, 460, 0.0, 0.85, "Dual-threat QB1", "up", "healthy", "Rushing floor + passing ceiling; the rare positional cheat code."),
  p("qb-reed-callum", "Lamar Jackson", "QB", "BAL", 14, 364, 280, 430, 0.0, 0.8, "Konami QB1", "flat", "healthy", "Legs make the floor; the safest week-to-week QB1 you can roster."),
  p("qb-emmett-shaw", "Joe Burrow", "QB", "CIN", 12, 336, 250, 412, 0.0, 0.82, "Pocket QB1", "up", "healthy", "Elite supporting cast; passing-volume ceiling in shootout weeks."),
  p("qb-grant-soto", "Jared Goff", "QB", "DET", 8, 300, 220, 366, 0.0, 0.78, "Streamer-plus", "flat", "healthy", "Matchup-based QB1; pairs beautifully in a DFS stack."),
  p("qb-bo-finnegan", "Geno Smith", "QB", "SEA", 10, 268, 190, 332, 0.0, 0.7, "Late-round value", "up", "healthy", "High pass volume in Ryan Grubb system with quality weapons."),

  // ── TE ──
  p("te-rocco-vance", "Travis Kelce", "TE", "KC", 6, 252, 170, 312, 0.7, 0.86, "Positional cheat", "up", "healthy", "WR-level target share at TE; the one player who breaks the position."),
  p("te-dell-osei", "Sam LaPorta", "TE", "DET", 8, 196, 120, 264, 0.6, 0.78, "TE1", "flat", "healthy", "Reliable red-zone role; steady TE1 you set and forget."),
  p("te-marco-pell", "Tucker Kraft", "TE", "GB", 10, 152, 80, 226, 0.5, 0.66, "Streaming TE1", "up", "healthy", "Ascending role in a good offense; matchup-stream with upside."),
  p("te-asa-quinn", "Dalton Kincaid", "TE", "BUF", 7, 118, 56, 188, 0.42, 0.6, "Bills TE1", "flat", "healthy", "Josh Allen safety valve in passing game."),
  p("te-ivan-mraz", "Colby Parkinson", "TE", "LAR", 6, 92, 34, 166, 0.34, 0.58, "Red-zone target", "up", "healthy", "Snaps trending up in McVay 12-personnel packages."),
];

// ── Pure intelligence helpers ──────────────────────────────────────────────

export const POSITIONS: readonly Pos[] = ["QB", "RB", "WR", "TE"];

export const POS_HEX: Record<Pos, string> = {
  QB: "#FF4D2E",
  RB: "#C9D4CE",
  WR: "#FF7A5C",
  TE: "#EDE8E0",
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
  "2026 NFL Active Player Universe · Live Projections & Usage Tiers · DraftKings & Sleeper Integrated";
