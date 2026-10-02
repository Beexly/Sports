/**
 * 2026 nflverse games.csv lines, fetched 2026-09-26, sha recorded in
 * data/gse-dataset/holdout.manifest.json. One aggregated pre-game line
 * per game. Vintage is not stamped. This is not a closing line and not
 * a per-book consensus. A game absent from this table abstains.
 */
export interface PregameLine {
  readonly week: number;
  readonly gameType: string;
  readonly home: string;
  readonly away: string;
  readonly homeMl: number;
  readonly awayMl: number;
  readonly surface: string | null;
  readonly roof: string | null;
  readonly neutral: boolean;
}
export const NFL_2026_PREGAME_LINES: readonly PregameLine[] = [
  { week: 1, gameType: "REG", home: "SEA", away: "NE", homeMl: -166, awayMl: 140, surface: "fieldturf", roof: "outdoors", neutral: false },
  { week: 1, gameType: "REG", home: "LA", away: "SF", homeMl: -218, awayMl: 180, surface: "grass", roof: "dome", neutral: true },
  { week: 1, gameType: "REG", home: "CAR", away: "CHI", homeMl: 140, awayMl: -166, surface: "grass", roof: "outdoors", neutral: false },
  { week: 1, gameType: "REG", home: "CIN", away: "TB", homeMl: -205, awayMl: 170, surface: "fieldturf", roof: "outdoors", neutral: false },
  { week: 1, gameType: "REG", home: "DET", away: "NO", homeMl: -325, awayMl: 260, surface: "fieldturf", roof: "dome", neutral: false },
  { week: 1, gameType: "REG", home: "HOU", away: "BUF", homeMl: -108, awayMl: -112, surface: "astroturf", roof: "closed", neutral: false },
  { week: 1, gameType: "REG", home: "IND", away: "BAL", homeMl: 136, awayMl: -162, surface: "fieldturf", roof: "closed", neutral: false },
  { week: 1, gameType: "REG", home: "JAX", away: "CLE", homeMl: -470, awayMl: 360, surface: "grass", roof: "outdoors", neutral: false },
  { week: 1, gameType: "REG", home: "PIT", away: "ATL", homeMl: -298, awayMl: 240, surface: "grass", roof: "outdoors", neutral: false },
  { week: 1, gameType: "REG", home: "TEN", away: "NYJ", homeMl: -118, awayMl: -102, surface: "grass", roof: "outdoors", neutral: false },
  { week: 1, gameType: "REG", home: "LAC", away: "ARI", homeMl: -455, awayMl: 350, surface: "matrixturf", roof: "dome", neutral: false },
  { week: 1, gameType: "REG", home: "LV", away: "MIA", homeMl: -170, awayMl: 142, surface: "grass", roof: "dome", neutral: false },
  { week: 1, gameType: "REG", home: "MIN", away: "GB", homeMl: -125, awayMl: 105, surface: "sportturf", roof: "dome", neutral: false },
  { week: 1, gameType: "REG", home: "PHI", away: "WAS", homeMl: -245, awayMl: 200, surface: "grass", roof: "outdoors", neutral: false },
  { week: 1, gameType: "REG", home: "NYG", away: "DAL", homeMl: 140, awayMl: -166, surface: "fieldturf", roof: "outdoors", neutral: false },
  { week: 1, gameType: "REG", home: "KC", away: "DEN", homeMl: -130, awayMl: 110, surface: "grass", roof: "outdoors", neutral: false },
  { week: 2, gameType: "REG", home: "BUF", away: "DET", homeMl: -238, awayMl: 195, surface: "grass", roof: "outdoors", neutral: false },
  { week: 2, gameType: "REG", home: "ATL", away: "CAR", homeMl: 130, awayMl: -155, surface: "fieldturf", roof: "closed", neutral: false },
  { week: 2, gameType: "REG", home: "BAL", away: "NO", homeMl: -375, awayMl: 295, surface: "grass", roof: "outdoors", neutral: false },
  { week: 2, gameType: "REG", home: "CHI", away: "MIN", homeMl: -218, awayMl: 180, surface: "grass", roof: "outdoors", neutral: false },
  { week: 2, gameType: "REG", home: "HOU", away: "CIN", homeMl: -148, awayMl: 124, surface: "astroturf", roof: "closed", neutral: false },
  { week: 2, gameType: "REG", home: "NE", away: "PIT", homeMl: -225, awayMl: 185, surface: "fieldturf", roof: "outdoors", neutral: false },
  { week: 2, gameType: "REG", home: "NYJ", away: "GB", homeMl: 154, awayMl: -185, surface: "fieldturf", roof: "outdoors", neutral: false },
  { week: 2, gameType: "REG", home: "TB", away: "CLE", homeMl: -425, awayMl: 330, surface: "grass", roof: "outdoors", neutral: false },
  { week: 2, gameType: "REG", home: "TEN", away: "PHI", homeMl: 260, awayMl: -325, surface: "grass", roof: "outdoors", neutral: false },
  { week: 2, gameType: "REG", home: "DEN", away: "JAX", homeMl: -148, awayMl: 124, surface: "grass", roof: "outdoors", neutral: false },
  { week: 2, gameType: "REG", home: "LAC", away: "LV", homeMl: -325, awayMl: 260, surface: "matrixturf", roof: "dome", neutral: false },
  { week: 2, gameType: "REG", home: "ARI", away: "SEA", homeMl: 180, awayMl: -218, surface: "grass", roof: "closed", neutral: false },
  { week: 2, gameType: "REG", home: "DAL", away: "WAS", homeMl: -218, awayMl: 180, surface: "matrixturf", roof: "closed", neutral: false },
  { week: 2, gameType: "REG", home: "SF", away: "MIA", homeMl: -900, awayMl: 600, surface: "grass", roof: "outdoors", neutral: false },
  { week: 2, gameType: "REG", home: "KC", away: "IND", homeMl: -265, awayMl: 215, surface: "grass", roof: "outdoors", neutral: false },
  { week: 2, gameType: "REG", home: "LA", away: "NYG", homeMl: -298, awayMl: 240, surface: "matrixturf", roof: "dome", neutral: false },
  { week: 3, gameType: "REG", home: "GB", away: "ATL", homeMl: -230, awayMl: 190, surface: "grass", roof: "outdoors", neutral: false },
  { week: 3, gameType: "REG", home: "BUF", away: "LAC", homeMl: -340, awayMl: 270, surface: "a_turf", roof: "outdoors", neutral: false },
  { week: 3, gameType: "REG", home: "CLE", away: "CAR", homeMl: 120, awayMl: -142, surface: "grass", roof: "outdoors", neutral: false },
  { week: 3, gameType: "REG", home: "DET", away: "NYJ", homeMl: -305, awayMl: 245, surface: "fieldturf", roof: "dome", neutral: false },
  { week: 3, gameType: "REG", home: "IND", away: "HOU", homeMl: 105, awayMl: -125, surface: "fieldturf", roof: null, neutral: false },
  { week: 3, gameType: "REG", home: "JAX", away: "NE", homeMl: -155, awayMl: 130, surface: "grass", roof: "outdoors", neutral: false },
  { week: 3, gameType: "REG", home: "MIA", away: "KC", homeMl: 455, awayMl: -625, surface: "grass", roof: "outdoors", neutral: false },
  { week: 3, gameType: "REG", home: "NYG", away: "TEN", homeMl: -135, awayMl: 114, surface: "fieldturf", roof: "outdoors", neutral: false },
  { week: 3, gameType: "REG", home: "PIT", away: "CIN", homeMl: 154, awayMl: -185, surface: "grass", roof: "outdoors", neutral: false },
  { week: 3, gameType: "REG", home: "WAS", away: "SEA", homeMl: 320, awayMl: -410, surface: "grass", roof: "outdoors", neutral: false },
  { week: 3, gameType: "REG", home: "SF", away: "ARI", homeMl: -440, awayMl: 340, surface: "grass", roof: "outdoors", neutral: false },
  { week: 3, gameType: "REG", home: "TB", away: "MIN", homeMl: 100, awayMl: -120, surface: "grass", roof: "outdoors", neutral: false },
  { week: 3, gameType: "REG", home: "DAL", away: "BAL", homeMl: 140, awayMl: -166, surface: "matrixturf", roof: null, neutral: true },
  { week: 3, gameType: "REG", home: "NO", away: "LV", homeMl: -185, awayMl: 154, surface: "sportturf", roof: "dome", neutral: false },
  { week: 3, gameType: "REG", home: "DEN", away: "LA", homeMl: 110, awayMl: -130, surface: "grass", roof: "outdoors", neutral: false },
  { week: 3, gameType: "REG", home: "CHI", away: "PHI", homeMl: 164, awayMl: -198, surface: "grass", roof: "outdoors", neutral: false },
  { week: 4, gameType: "REG", home: "CLE", away: "PIT", homeMl: 124, awayMl: -148, surface: "grass", roof: "outdoors", neutral: false },
  { week: 4, gameType: "REG", home: "WAS", away: "IND", homeMl: 170, awayMl: -205, surface: "grass", roof: "outdoors", neutral: true },
  { week: 4, gameType: "REG", home: "BAL", away: "TEN", homeMl: -575, awayMl: 425, surface: "grass", roof: "outdoors", neutral: false },
  { week: 4, gameType: "REG", home: "BUF", away: "NE", homeMl: -250, awayMl: 205, surface: "a_turf", roof: "outdoors", neutral: false },
  { week: 4, gameType: "REG", home: "CHI", away: "NYJ", homeMl: -166, awayMl: 140, surface: "grass", roof: "outdoors", neutral: false },
  { week: 4, gameType: "REG", home: "CIN", away: "JAX", homeMl: -162, awayMl: 136, surface: "fieldturf", roof: "outdoors", neutral: false },
  { week: 4, gameType: "REG", home: "HOU", away: "DAL", homeMl: -162, awayMl: 136, surface: "astroturf", roof: null, neutral: false },
  { week: 4, gameType: "REG", home: "NYG", away: "ARI", homeMl: -135, awayMl: 114, surface: "fieldturf", roof: "outdoors", neutral: false },
  { week: 4, gameType: "REG", home: "PHI", away: "LA", homeMl: 114, awayMl: -135, surface: "grass", roof: "outdoors", neutral: false },
  { week: 4, gameType: "REG", home: "TB", away: "GB", homeMl: -102, awayMl: -116, surface: "grass", roof: "outdoors", neutral: false },
  { week: 4, gameType: "REG", home: "MIN", away: "MIA", homeMl: -700, awayMl: 500, surface: "sportturf", roof: "dome", neutral: false },
  { week: 4, gameType: "REG", home: "LV", away: "KC", homeMl: 210, awayMl: -258, surface: "grass", roof: "dome", neutral: false },
  { week: 4, gameType: "REG", home: "SEA", away: "LAC", homeMl: -285, awayMl: 230, surface: "fieldturf", roof: "outdoors", neutral: false },
  { week: 4, gameType: "REG", home: "SF", away: "DEN", homeMl: -175, awayMl: 145, surface: "grass", roof: "outdoors", neutral: false },
  { week: 4, gameType: "REG", home: "CAR", away: "DET", homeMl: 130, awayMl: -155, surface: "grass", roof: "outdoors", neutral: false },
  { week: 4, gameType: "REG", home: "NO", away: "ATL", homeMl: -174, awayMl: 146, surface: "sportturf", roof: "dome", neutral: false },
];
