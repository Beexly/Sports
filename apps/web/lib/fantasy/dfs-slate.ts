/**
 * DFS slate — an illustrative DraftKings-Classic main slate.
 *
 * Per-game data the optimizer needs: salary, projection, floor/ceiling, and
 * projected OWNERSHIP (the field's exposure). Leverage = ceiling vs. ownership —
 * the contrarian tournament edge. Fictional players, real team codes,
 * illustrative numbers.
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
};

const d = (id: string, name: string, pos: DfsPos, team: string, opp: string, salary: number, proj: number, floor: number, ceiling: number, own: number): DfsPlayer =>
  ({ id, name, pos, team, opp, salary, proj, floor, ceiling, own });

export const SALARY_CAP = 50000;

/** DK Classic roster: QB, RB, RB, WR, WR, WR, TE, FLEX(RB/WR/TE), DST. */
export const DFS_SLOTS: readonly DfsPos[] = ["QB", "RB", "RB", "WR", "WR", "WR", "TE", "FLEX" as DfsPos, "DST"];

export const DFS_SLATE: readonly DfsPlayer[] = [
  // QB
  d("dqb1", "Silas Hart", "QB", "PHI", "DAL", 7600, 22.5, 14, 34, 0.18),
  d("dqb2", "Reed Callum", "QB", "BAL", "CIN", 7200, 21.0, 13, 32, 0.15),
  d("dqb3", "Emmett Shaw", "QB", "CIN", "BAL", 7000, 20.5, 12, 31, 0.14),
  d("dqb4", "Grant Soto", "QB", "DET", "GB", 6400, 19.0, 11, 29, 0.10),
  d("dqb5", "Bo Finnegan", "QB", "SEA", "LAR", 5800, 17.5, 9, 28, 0.06),
  // RB
  d("drb1", "Marcus Vale", "RB", "ATL", "TB", 8200, 20.0, 12, 30, 0.22),
  d("drb2", "Deon Pryce", "RB", "DET", "GB", 7600, 18.5, 11, 28, 0.18),
  d("drb3", "Tariq Bell", "RB", "PHI", "DAL", 6800, 16.0, 8, 27, 0.14),
  d("drb4", "Isaiah Ronan", "RB", "SF", "SEA", 6400, 15.0, 9, 23, 0.12),
  d("drb5", "K.J. Ferris", "RB", "BAL", "CIN", 6000, 14.5, 6, 26, 0.10),
  d("drb6", "Cole Mathis", "RB", "GB", "DET", 5200, 11.0, 5, 20, 0.08),
  d("drb7", "Andre Soto", "RB", "HOU", "IND", 4600, 9.5, 3, 19, 0.05),
  d("drb8", "Quentin Ash", "RB", "TB", "ATL", 4200, 7.5, 2, 16, 0.03),
  d("drb9", "Malik Orr", "RB", "DEN", "LV", 4000, 6.0, 1, 15, 0.02),
  // WR
  d("dwr0", "Quincy Ohm", "WR", "PHI", "DAL", 6900, 16.5, 8, 28, 0.15), // Silas Hart stack
  d("dwr0b", "Xavier Poole", "WR", "BAL", "CIN", 6300, 15.0, 7, 27, 0.12), // Reed Callum stack
  d("dwr1", "Julian Roe", "WR", "MIA", "NYJ", 8000, 19.0, 11, 30, 0.20),
  d("dwr2", "DeShawn Kemp", "WR", "CIN", "BAL", 7400, 17.5, 10, 28, 0.17),
  d("dwr3", "Emory Banks", "WR", "LAR", "SEA", 6800, 16.0, 7, 29, 0.13),
  d("dwr4", "Rashad Lin", "WR", "BUF", "MIA", 6600, 15.5, 9, 25, 0.14),
  d("dwr5", "Tobias Frey", "WR", "SEA", "LAR", 5800, 13.0, 6, 24, 0.10),
  d("dwr6", "Noah Castille", "WR", "KC", "DEN", 5400, 12.0, 4, 26, 0.09),
  d("dwr7", "Amari Stokes", "WR", "DAL", "PHI", 5000, 10.5, 5, 20, 0.07),
  d("dwr8", "Leon Deveaux", "WR", "JAX", "HOU", 4600, 9.0, 4, 18, 0.05),
  d("dwr9", "Cy Merritt", "WR", "NYG", "WAS", 4200, 7.5, 3, 17, 0.04),
  d("dwr10", "Dom Vega", "WR", "LV", "DEN", 4000, 6.0, 2, 16, 0.02),
  // TE
  d("dte1", "Rocco Vance", "TE", "KC", "DEN", 6500, 15.0, 8, 24, 0.18),
  d("dte2", "Dell Osei", "TE", "DET", "GB", 5200, 11.5, 6, 19, 0.12),
  d("dte3", "Marco Pell", "TE", "GB", "DET", 4200, 9.0, 4, 16, 0.08),
  d("dte4", "Asa Quinn", "TE", "BUF", "MIA", 3400, 6.5, 2, 14, 0.04),
  d("dte5", "Ivan Mraz", "TE", "LAR", "SEA", 3000, 5.0, 1, 13, 0.02),
  // DST
  d("ddst1", "Ravens DST", "DST", "BAL", "CIN", 3800, 9.0, 3, 18, 0.14),
  d("ddst2", "Falcons DST", "DST", "ATL", "TB", 3400, 8.0, 2, 16, 0.10),
  d("ddst3", "Seahawks DST", "DST", "SEA", "LAR", 2800, 6.5, 1, 14, 0.06),
  d("ddst4", "Texans DST", "DST", "HOU", "IND", 2400, 5.5, 0, 13, 0.04),
  d("ddst5", "Broncos DST", "DST", "DEN", "LV", 2200, 5.0, 0, 12, 0.03),
];

export const DFS_POS_HEX: Record<DfsPos, string> = {
  QB: "#00E5FF", RB: "#7A5CFF", WR: "#FF2DD6", TE: "#F6F7FA", DST: "#9fb3c8",
};

/** Leverage: ceiling per point of ownership — the tournament edge. Higher = more contrarian upside. */
export function leverage(p: DfsPlayer): number {
  return p.ceiling / (p.own * 100 + 1.5);
}
