/**
 * Prior-season NFL scheme measurements.
 *
 * Source: nflverse 2025 regular-season play-by-play (week <= 18), computed by
 * gse-competitive-intel/fantasyguru/nfl_scheme_defense.py. proePp is the mean
 * of nflverse pass_oe on scrimmage plays, in percentage points. neutralPass is
 * the pass rate on 1st and 2nd down in neutral win probability (0.20 to 0.80).
 * passDefenseRank is 1 (lowest pass EPA allowed) to 32, from the same run's
 * team_defense.csv.
 *
 * This is a completed prior season. It is not this week's form. A team absent
 * from the table abstains. Do not extend it with a guessed row.
 */
export interface NflSchemePrior {
  readonly proePp: number;
  readonly neutralPass: number;
  readonly passRate: number;
  readonly plays: number;
  readonly games: number;
  readonly passDefenseRank: number;
}

export const NFL_SCHEME_PRIOR_SEASON = 2025;

export const NFL_SCHEME_PRIOR: Readonly<Record<string, NflSchemePrior>> = {
  "KC": { proePp: 4.6, neutralPass: 0.622, passRate: 0.669, plays: 1097, games: 17, passDefenseRank: 15 },
  "ARI": { proePp: 4.2, neutralPass: 0.628, passRate: 0.699, plays: 1132, games: 17, passDefenseRank: 27 },
  "LA": { proePp: 3.5, neutralPass: 0.601, passRate: 0.597, plays: 1105, games: 17, passDefenseRank: 8 },
  "NE": { proePp: 2.9, neutralPass: 0.584, passRate: 0.612, plays: 1063, games: 17, passDefenseRank: 10 },
  "DEN": { proePp: 2.1, neutralPass: 0.583, passRate: 0.633, plays: 1122, games: 17, passDefenseRank: 9 },
  "CIN": { proePp: 2.1, neutralPass: 0.609, passRate: 0.662, plays: 1097, games: 17, passDefenseRank: 28 },
  "JAX": { proePp: 2, neutralPass: 0.594, passRate: 0.609, plays: 1125, games: 17, passDefenseRank: 4 },
  "LAC": { proePp: 0.7, neutralPass: 0.6, passRate: 0.633, plays: 1125, games: 17, passDefenseRank: 6 },
  "PIT": { proePp: -0.2, neutralPass: 0.556, passRate: 0.618, plays: 1017, games: 17, passDefenseRank: 16 },
  "DAL": { proePp: -0.2, neutralPass: 0.545, passRate: 0.632, plays: 1166, games: 17, passDefenseRank: 31 },
  "HOU": { proePp: -0.4, neutralPass: 0.575, passRate: 0.608, plays: 1144, games: 17, passDefenseRank: 1 },
  "SF": { proePp: -0.5, neutralPass: 0.58, passRate: 0.597, plays: 1100, games: 17, passDefenseRank: 25 },
  "MIN": { proePp: -0.6, neutralPass: 0.548, passRate: 0.617, plays: 986, games: 17, passDefenseRank: 3 },
  "IND": { proePp: -0.7, neutralPass: 0.563, passRate: 0.604, plays: 1061, games: 17, passDefenseRank: 18 },
  "LV": { proePp: -1.7, neutralPass: 0.552, passRate: 0.644, plays: 984, games: 17, passDefenseRank: 22 },
  "PHI": { proePp: -2, neutralPass: 0.558, passRate: 0.585, plays: 1035, games: 17, passDefenseRank: 11 },
  "NO": { proePp: -2.3, neutralPass: 0.566, passRate: 0.639, plays: 1112, games: 17, passDefenseRank: 12 },
  "TB": { proePp: -2.8, neutralPass: 0.532, passRate: 0.614, plays: 1124, games: 17, passDefenseRank: 17 },
  "WAS": { proePp: -3.1, neutralPass: 0.51, passRate: 0.596, plays: 1035, games: 17, passDefenseRank: 30 },
  "TEN": { proePp: -3.2, neutralPass: 0.518, passRate: 0.656, plays: 1046, games: 17, passDefenseRank: 29 },
  "CLE": { proePp: -3.2, neutralPass: 0.533, passRate: 0.632, plays: 1078, games: 17, passDefenseRank: 2 },
  "BUF": { proePp: -3.3, neutralPass: 0.517, passRate: 0.561, plays: 1107, games: 17, passDefenseRank: 7 },
  "CHI": { proePp: -3.3, neutralPass: 0.558, passRate: 0.597, plays: 1141, games: 17, passDefenseRank: 19 },
  "GB": { proePp: -3.5, neutralPass: 0.52, passRate: 0.568, plays: 1030, games: 17, passDefenseRank: 23 },
  "NYG": { proePp: -4.1, neutralPass: 0.499, passRate: 0.592, plays: 1141, games: 17, passDefenseRank: 20 },
  "DET": { proePp: -4.3, neutralPass: 0.529, passRate: 0.597, plays: 1088, games: 17, passDefenseRank: 14 },
  "MIA": { proePp: -5.2, neutralPass: 0.516, passRate: 0.574, plays: 972, games: 17, passDefenseRank: 26 },
  "CAR": { proePp: -5.3, neutralPass: 0.53, passRate: 0.597, plays: 1040, games: 17, passDefenseRank: 24 },
  "ATL": { proePp: -5.6, neutralPass: 0.524, passRate: 0.572, plays: 1080, games: 17, passDefenseRank: 13 },
  "SEA": { proePp: -6.1, neutralPass: 0.535, passRate: 0.529, plays: 1042, games: 17, passDefenseRank: 5 },
  "BAL": { proePp: -8.2, neutralPass: 0.473, passRate: 0.536, plays: 995, games: 17, passDefenseRank: 21 },
  "NYJ": { proePp: -8.2, neutralPass: 0.473, passRate: 0.612, plays: 1040, games: 17, passDefenseRank: 32 },
};
