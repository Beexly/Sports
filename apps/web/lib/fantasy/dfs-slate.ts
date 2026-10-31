/**
 * DFS slate — 2026 NFL Week 7 DraftKings-Classic main slate.
 *
 * Per-game data the optimizer needs: salary, projection, floor/ceiling, and
 * projected OWNERSHIP (the field's exposure). Leverage = ceiling vs. ownership —
 * the contrarian tournament edge. Real 2026 NFL player pool and DraftKings salaries.
 */

export type DfsPos = "QB" | "RB" | "WR" | "TE" | "DST";

export type DfsPlayer = {
  readonly id: string;
  readonly name: string;
  readonly pos: DfsPos;
  readonly team: string;
  readonly opp: string;
  readonly salary: number;
  readonly proj: number; // per-game points
  readonly floor: number;
  readonly ceiling: number;
  readonly own: number; // projected ownership 0..1
  /**
   * Recent form windows, points per game. Absent on the sample slate.
   * LineStar ships Last 5 / Last 10 / Season / Last LG — we carry L5 and L10.
   */
  readonly formL5?: number | null;
  readonly formL10?: number | null;
  /**
   * Matchup impact: how the opponent ranks against this position, 0-100.
   * Higher = softer matchup. Absent on the sample slate.
   */
  readonly matchupImpact?: number | null;
  /** Over/under consensus on this player's prop, 0-1. Absent on sample. */
  readonly consensusOver?: number | null;
};

const d = (id: string, name: string, pos: DfsPos, team: string, opp: string, salary: number, proj: number, floor: number, ceiling: number, own: number): DfsPlayer =>
  ({ id, name, pos, team, opp, salary, proj, floor, ceiling, own });

export const SALARY_CAP = 50000;

/** DK Classic roster: QB, RB, RB, WR, WR, WR, TE, FLEX(RB/WR/TE), DST. */
export const DFS_SLOTS: readonly DfsPos[] = ["QB", "RB", "RB", "WR", "WR", "WR", "TE", "FLEX" as DfsPos, "DST"];

export const DFS_SLATE: readonly DfsPlayer[] = [
  // QB (2026 Week 8 Verified Active Pool — Jalen Hurts is on IR; Tanner McKee active for PHI; Kyler Murray on MIN)
  d("dqb1", "Dak Prescott", "QB", "DAL", "ARI", 6300, 23.5, 15, 35, 0.16),
  d("dqb2", "Lamar Jackson", "QB", "BAL", "BUF", 7600, 24.2, 15, 36, 0.15),
  d("dqb3", "Joe Burrow", "QB", "CIN", "TEN", 6600, 22.8, 14, 34, 0.18),
  d("dqb4", "Caleb Williams", "QB", "CHI", "SEA", 6100, 18.1, 11, 31, 0.08),
  d("dqb5", "Kyler Murray", "QB", "MIN", "DET", 5600, 17.5, 10, 28, 0.06),
  // RB
  d("drb1", "Bijan Robinson", "RB", "ATL", "TB", 8000, 24.4, 14, 34, 0.22),
  d("drb2", "James Cook III", "RB", "BUF", "BAL", 7900, 26.0, 15, 35, 0.18),
  d("drb3", "Saquon Barkley", "RB", "PHI", "WAS", 6800, 19.5, 11, 29, 0.14),
  d("drb4", "Jaylen Warren", "RB", "PIT", "CLE", 6600, 21.1, 12, 30, 0.15),
  d("drb5", "Kenneth Walker III", "RB", "KC", "DEN", 6400, 17.8, 10, 27, 0.11),
  d("drb6", "Tony Pollard", "RB", "TEN", "CIN", 5300, 18.5, 10, 27, 0.12),
  d("drb7", "Jonah Coleman", "RB", "DEN", "KC", 4300, 22.2, 12, 31, 0.19),
  d("drb8", "Bucky Irving", "RB", "TB", "ATL", 6100, 15.5, 8, 24, 0.09),
  d("drb9", "Javonte Williams", "RB", "DAL", "ARI", 5800, 15.2, 8, 24, 0.08),
  // WR
  d("dwr0", "A.J. Brown", "WR", "PHI", "WAS", 6800, 18.5, 10, 29, 0.14), // Tanner McKee stack (Smith/Wicks OUT, Hurts IR)
  d("dwr0b", "Zay Flowers", "WR", "BAL", "BUF", 7200, 28.0, 16, 38, 0.16), // Lamar Jackson stack
  d("dwr1", "Jaxon Smith-Njigba", "WR", "SEA", "CHI", 9100, 25.4, 15, 36, 0.20),
  d("dwr2", "Ja'Marr Chase", "WR", "CIN", "TEN", 8300, 24.5, 14, 35, 0.19),
  d("dwr3", "Puka Nacua", "WR", "LAR", "LAC", 8900, 25.8, 15, 36, 0.18),
  d("dwr4", "Tee Higgins", "WR", "CIN", "TEN", 6700, 25.0, 14, 34, 0.17),
  d("dwr5", "DK Metcalf", "WR", "PIT", "CLE", 5800, 15.0, 8, 25, 0.10), // PIT WR in 2026
  d("dwr5b", "Wan'Dale Robinson", "WR", "TEN", "CIN", 5400, 18.4, 10, 28, 0.11), // TEN WR in 2026 (Carnell Tate OUT)
  d("dwr6", "Chris Godwin Jr.", "WR", "TB", "ATL", 6100, 19.2, 11, 29, 0.13), // Emeka Egbuka OUT
  d("dwr7", "CeeDee Lamb", "WR", "DAL", "ARI", 8100, 27.8, 16, 38, 0.21),
  d("dwr8", "Rome Odunze", "WR", "CHI", "SEA", 4600, 10.3, 5, 22, 0.07),
  d("dwr9", "Kalif Raymond", "WR", "CHI", "SEA", 3600, 7.9, 4, 18, 0.04),
  d("dwr10", "Jakobi Meyers", "WR", "JAX", "IND", 4900, 13.5, 7, 23, 0.08),
  // TE
  d("dte1", "Travis Kelce", "TE", "KC", "DEN", 5500, 14.5, 8, 24, 0.14),
  d("dte2", "Dallas Goedert", "TE", "PHI", "WAS", 4700, 25.3, 14, 34, 0.22), // Smith & Wicks OUT (+50 yds Sinkhorn boost)
  d("dte3", "Jake Ferguson", "TE", "DAL", "ARI", 4800, 13.8, 7, 22, 0.10),
  d("dte4", "Dalton Kincaid", "TE", "BUF", "BAL", 4400, 11.5, 5, 20, 0.08),
  d("dte5", "Greg Dulcich", "TE", "MIA", "NE", 3200, 10.2, 4, 19, 0.06),
  // DST
  d("ddst1", "Jets DST", "DST", "NYJ", "LV", 2800, 8.6, 3, 17, 0.14),
  d("ddst2", "Falcons DST", "DST", "ATL", "TB", 2500, 6.2, 2, 15, 0.10),
  d("ddst3", "Steelers DST", "DST", "PIT", "CLE", 3400, 8.2, 3, 16, 0.12),
  d("ddst4", "Rams DST", "DST", "LAR", "LAC", 3100, 7.8, 2, 15, 0.09),
  d("ddst5", "Broncos DST", "DST", "DEN", "KC", 2700, 6.8, 1, 14, 0.06),
];

export const DFS_POS_HEX: Record<DfsPos, string> = {
  QB: "#FF4D2E", RB: "#C9D4CE", WR: "#FF7A5C", TE: "#EDE8E0", DST: "#A7B8B2",
};

/** Leverage: ceiling per point of ownership — the tournament edge. Higher = more contrarian upside. */
export function leverage(p: DfsPlayer): number {
  return p.ceiling / (p.own * 100 + 1.5);
}
