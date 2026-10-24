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
  // QB
  d("dqb1", "Jalen Hurts", "QB", "PHI", "DAL", 7600, 22.5, 14, 34, 0.18),
  d("dqb2", "Lamar Jackson", "QB", "BAL", "CIN", 7200, 21.0, 13, 32, 0.15),
  d("dqb3", "Joe Burrow", "QB", "CIN", "BAL", 7000, 20.5, 12, 31, 0.14),
  d("dqb4", "Jared Goff", "QB", "DET", "GB", 6400, 19.0, 11, 29, 0.10),
  d("dqb5", "Geno Smith", "QB", "SEA", "LAR", 5800, 17.5, 9, 28, 0.06),
  // RB
  d("drb1", "Bijan Robinson", "RB", "ATL", "TB", 8200, 20.0, 12, 30, 0.22),
  d("drb2", "Jahmyr Gibbs", "RB", "DET", "GB", 7600, 18.5, 11, 28, 0.18),
  d("drb3", "Saquon Barkley", "RB", "PHI", "DAL", 6800, 16.0, 8, 27, 0.14),
  d("drb4", "Christian McCaffrey", "RB", "SF", "SEA", 6400, 15.0, 9, 23, 0.12),
  d("drb5", "Derrick Henry", "RB", "BAL", "CIN", 6000, 14.5, 6, 26, 0.10),
  d("drb6", "Josh Jacobs", "RB", "GB", "DET", 5200, 11.0, 5, 20, 0.08),
  d("drb7", "Joe Mixon", "RB", "HOU", "IND", 4600, 9.5, 3, 19, 0.05),
  d("drb8", "Bucky Irving", "RB", "TB", "ATL", 4200, 7.5, 2, 16, 0.03),
  d("drb9", "Javonte Williams", "RB", "DEN", "LV", 4000, 6.0, 1, 15, 0.02),
  // WR
  d("dwr0", "A.J. Brown", "WR", "PHI", "DAL", 6900, 16.5, 8, 28, 0.15), // Jalen Hurts stack
  d("dwr0b", "Zay Flowers", "WR", "BAL", "CIN", 6300, 15.0, 7, 27, 0.12), // Lamar Jackson stack
  d("dwr1", "Tyreek Hill", "WR", "MIA", "NYJ", 8000, 19.0, 11, 30, 0.20),
  d("dwr2", "Ja'Marr Chase", "WR", "CIN", "BAL", 7400, 17.5, 10, 28, 0.17),
  d("dwr3", "Puka Nacua", "WR", "LAR", "SEA", 6800, 16.0, 7, 29, 0.13),
  d("dwr4", "Stefon Diggs", "WR", "BUF", "MIA", 6600, 15.5, 9, 25, 0.14),
  d("dwr5", "DK Metcalf", "WR", "PIT", "CIN", 5800, 13.0, 6, 24, 0.10), // Traded to PIT in 2026 under Aaron Rodgers
  d("dwr5b", "Germie Bernard", "WR", "PIT", "CIN", 3800, 12.5, 5, 22, 0.08), // 2026 breakout slot technician
  d("dwr6", "Rashee Rice", "WR", "KC", "DEN", 5400, 12.0, 4, 26, 0.09),
  d("dwr7", "CeeDee Lamb", "WR", "DAL", "PHI", 5000, 10.5, 5, 20, 0.07),
  d("dwr8", "Brian Thomas Jr.", "WR", "JAX", "HOU", 4600, 9.0, 4, 18, 0.05),
  d("dwr9", "Malik Nabers", "WR", "NYG", "WAS", 4200, 7.5, 3, 17, 0.04),
  d("dwr10", "Jakobi Meyers", "WR", "LV", "DEN", 4000, 6.0, 2, 16, 0.02),
  // TE
  d("dte1", "Travis Kelce", "TE", "KC", "DEN", 6500, 15.0, 8, 24, 0.18),
  d("dte2", "Sam LaPorta", "TE", "DET", "GB", 5200, 11.5, 6, 19, 0.12),
  d("dte3", "Tucker Kraft", "TE", "GB", "DET", 4200, 9.0, 4, 16, 0.08),
  d("dte4", "Dalton Kincaid", "TE", "BUF", "MIA", 3400, 6.5, 2, 14, 0.04),
  d("dte5", "Colby Parkinson", "TE", "LAR", "SEA", 3000, 5.0, 1, 13, 0.02),
  // DST
  d("ddst1", "Ravens DST", "DST", "BAL", "CIN", 3800, 9.0, 3, 18, 0.14),
  d("ddst2", "Falcons DST", "DST", "ATL", "TB", 3400, 8.0, 2, 16, 0.10),
  d("ddst3", "Seahawks DST", "DST", "SEA", "LAR", 2800, 6.5, 1, 14, 0.06),
  d("ddst4", "Texans DST", "DST", "HOU", "IND", 2400, 5.5, 0, 13, 0.04),
  d("ddst5", "Broncos DST", "DST", "DEN", "LV", 2200, 5.0, 0, 12, 0.03),
];

export const DFS_POS_HEX: Record<DfsPos, string> = {
  QB: "#FF4D2E", RB: "#C9D4CE", WR: "#FF7A5C", TE: "#EDE8E0", DST: "#A7B8B2",
};

/** Leverage: ceiling per point of ownership — the tournament edge. Higher = more contrarian upside. */
export function leverage(p: DfsPlayer): number {
  return p.ceiling / (p.own * 100 + 1.5);
}
