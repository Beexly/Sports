/**
 * Prior-season NFL scheme measurements.
 *
 * Source: nflverse 2025 regular-season play-by-play (week <= 18), computed by
 * gse-competitive-intel/fantasyguru/nfl_scheme_defense.py.
 * proePp is mean nflverse pass_oe on scrimmage plays, in percentage points.
 * neutralPass is the pass rate on 1st and 2nd down in neutral win probability.
 * rzPass is the pass rate inside the opponent 20.
 * wrFunnel is the top pass-catcher's share of team targets.
 * playsPg is scrimmage plays per game. offEpa is EPA per scrimmage play.
 * passDefenseRank is 1 (lowest pass EPA allowed) to 32.
 *
 * Completed prior season. Not this week's form. A missing club abstains.
 * Do not add a guessed row.
 */
export interface NflSchemePrior {
  readonly proePp: number;
  readonly neutralPass: number;
  readonly passRate: number;
  readonly playsPg: number;
  readonly plays: number;
  readonly games: number;
  readonly rzPass: number;
  readonly wrFunnel: number;
  readonly offEpa: number;
  readonly shotgun: number;
  readonly noHuddle: number;
  readonly rbBellcow: number;
  readonly passDefenseRank: number;
}

export const NFL_SCHEME_PRIOR_SEASON = 2025;

export const NFL_SCHEME_PRIOR: Readonly<Record<string, NflSchemePrior>> = {
  "KC": { proePp: 4.6, neutralPass: 0.622, passRate: 0.669, playsPg: 64.5, plays: 1097, games: 17, rzPass: 0.614, wrFunnel: 0.235, offEpa: 0.043, shotgun: 0.81, noHuddle: 0.026, rbBellcow: 0.471, passDefenseRank: 15 },
  "ARI": { proePp: 4.2, neutralPass: 0.628, passRate: 0.699, playsPg: 66.6, plays: 1132, games: 17, rzPass: 0.702, wrFunnel: 0.34, offEpa: -0.015, shotgun: 0.712, noHuddle: 0.12, rbBellcow: 0.316, passDefenseRank: 27 },
  "LA": { proePp: 3.5, neutralPass: 0.601, passRate: 0.597, playsPg: 65, plays: 1105, games: 17, rzPass: 0.59, wrFunnel: 0.321, offEpa: 0.149, shotgun: 0.413, noHuddle: 0.071, rbBellcow: 0.627, passDefenseRank: 8 },
  "NE": { proePp: 2.9, neutralPass: 0.584, passRate: 0.612, playsPg: 62.5, plays: 1063, games: 17, rzPass: 0.55, wrFunnel: 0.258, offEpa: 0.157, shotgun: 0.557, noHuddle: 0.024, rbBellcow: 0.484, passDefenseRank: 10 },
  "DEN": { proePp: 2.1, neutralPass: 0.583, passRate: 0.633, playsPg: 66, plays: 1122, games: 17, rzPass: 0.607, wrFunnel: 0.263, offEpa: 0.037, shotgun: 0.652, noHuddle: 0.13, rbBellcow: 0.445, passDefenseRank: 9 },
  "CIN": { proePp: 2.1, neutralPass: 0.609, passRate: 0.662, playsPg: 64.5, plays: 1097, games: 17, rzPass: 0.615, wrFunnel: 0.373, offEpa: 0.011, shotgun: 0.82, noHuddle: 0.026, rbBellcow: 0.695, passDefenseRank: 28 },
  "JAX": { proePp: 2, neutralPass: 0.594, passRate: 0.609, playsPg: 66.2, plays: 1125, games: 17, rzPass: 0.514, wrFunnel: 0.233, offEpa: 0.037, shotgun: 0.612, noHuddle: 0.071, rbBellcow: 0.705, passDefenseRank: 4 },
  "LAC": { proePp: 0.7, neutralPass: 0.6, passRate: 0.633, playsPg: 66.2, plays: 1125, games: 17, rzPass: 0.595, wrFunnel: 0.26, offEpa: -0.015, shotgun: 0.712, noHuddle: 0.036, rbBellcow: 0.438, passDefenseRank: 6 },
  "PIT": { proePp: -0.2, neutralPass: 0.556, passRate: 0.618, playsPg: 59.8, plays: 1017, games: 17, rzPass: 0.545, wrFunnel: 0.241, offEpa: 0.028, shotgun: 0.671, noHuddle: 0.118, rbBellcow: 0.598, passDefenseRank: 16 },
  "DAL": { proePp: -0.2, neutralPass: 0.545, passRate: 0.632, playsPg: 68.6, plays: 1166, games: 17, rzPass: 0.606, wrFunnel: 0.261, offEpa: 0.111, shotgun: 0.636, noHuddle: 0.093, rbBellcow: 0.658, passDefenseRank: 31 },
  "HOU": { proePp: -0.4, neutralPass: 0.575, passRate: 0.608, playsPg: 67.3, plays: 1144, games: 17, rzPass: 0.575, wrFunnel: 0.253, offEpa: -0.012, shotgun: 0.616, noHuddle: 0.043, rbBellcow: 0.504, passDefenseRank: 1 },
  "SF": { proePp: -0.5, neutralPass: 0.58, passRate: 0.597, playsPg: 64.7, plays: 1100, games: 17, rzPass: 0.55, wrFunnel: 0.242, offEpa: 0.09, shotgun: 0.539, noHuddle: 0.037, rbBellcow: 0.772, passDefenseRank: 25 },
  "MIN": { proePp: -0.6, neutralPass: 0.548, passRate: 0.617, playsPg: 58, plays: 986, games: 17, rzPass: 0.669, wrFunnel: 0.381, offEpa: -0.094, shotgun: 0.556, noHuddle: 0.074, rbBellcow: 0.468, passDefenseRank: 3 },
  "IND": { proePp: -0.7, neutralPass: 0.563, passRate: 0.604, playsPg: 62.4, plays: 1061, games: 17, rzPass: 0.505, wrFunnel: 0.257, offEpa: 0.08, shotgun: 0.716, noHuddle: 0.052, rbBellcow: 0.866, passDefenseRank: 18 },
  "LV": { proePp: -1.7, neutralPass: 0.552, passRate: 0.644, playsPg: 57.9, plays: 984, games: 17, rzPass: 0.653, wrFunnel: 0.249, offEpa: -0.192, shotgun: 0.669, noHuddle: 0.089, rbBellcow: 0.866, passDefenseRank: 22 },
  "PHI": { proePp: -2, neutralPass: 0.558, passRate: 0.585, playsPg: 60.9, plays: 1035, games: 17, rzPass: 0.469, wrFunnel: 0.309, offEpa: 0.033, shotgun: 0.777, noHuddle: 0.195, rbBellcow: 0.759, passDefenseRank: 11 },
  "NO": { proePp: -2.3, neutralPass: 0.566, passRate: 0.639, playsPg: 65.4, plays: 1112, games: 17, rzPass: 0.549, wrFunnel: 0.393, offEpa: -0.079, shotgun: 0.789, noHuddle: 0.225, rbBellcow: 0.434, passDefenseRank: 12 },
  "TB": { proePp: -2.8, neutralPass: 0.532, passRate: 0.614, playsPg: 66.1, plays: 1124, games: 17, rzPass: 0.596, wrFunnel: 0.283, offEpa: 0.002, shotgun: 0.654, noHuddle: 0.066, rbBellcow: 0.435, passDefenseRank: 17 },
  "WAS": { proePp: -3.1, neutralPass: 0.51, passRate: 0.596, playsPg: 60.9, plays: 1035, games: 17, rzPass: 0.455, wrFunnel: 0.263, offEpa: 0.034, shotgun: 0.879, noHuddle: 0.615, rbBellcow: 0.507, passDefenseRank: 30 },
  "TEN": { proePp: -3.2, neutralPass: 0.518, passRate: 0.656, playsPg: 61.5, plays: 1046, games: 17, rzPass: 0.617, wrFunnel: 0.214, offEpa: -0.148, shotgun: 0.728, noHuddle: 0.1, rbBellcow: 0.738, passDefenseRank: 29 },
  "CLE": { proePp: -3.2, neutralPass: 0.533, passRate: 0.632, playsPg: 63.4, plays: 1078, games: 17, rzPass: 0.56, wrFunnel: 0.266, offEpa: -0.177, shotgun: 0.673, noHuddle: 0.09, rbBellcow: 0.646, passDefenseRank: 2 },
  "BUF": { proePp: -3.3, neutralPass: 0.517, passRate: 0.561, playsPg: 65.1, plays: 1107, games: 17, rzPass: 0.49, wrFunnel: 0.228, offEpa: 0.14, shotgun: 0.505, noHuddle: 0.061, rbBellcow: 0.737, passDefenseRank: 7 },
  "CHI": { proePp: -3.3, neutralPass: 0.558, passRate: 0.597, playsPg: 67.1, plays: 1141, games: 17, rzPass: 0.5, wrFunnel: 0.2, offEpa: 0.076, shotgun: 0.524, noHuddle: 0.05, rbBellcow: 0.558, passDefenseRank: 19 },
  "GB": { proePp: -3.5, neutralPass: 0.52, passRate: 0.568, playsPg: 60.6, plays: 1030, games: 17, rzPass: 0.497, wrFunnel: 0.23, offEpa: 0.124, shotgun: 0.63, noHuddle: 0.091, rbBellcow: 0.606, passDefenseRank: 23 },
  "NYG": { proePp: -4.1, neutralPass: 0.499, passRate: 0.592, playsPg: 67.1, plays: 1141, games: 17, rzPass: 0.51, wrFunnel: 0.344, offEpa: 0.044, shotgun: 0.77, noHuddle: 0.212, rbBellcow: 0.444, passDefenseRank: 20 },
  "DET": { proePp: -4.3, neutralPass: 0.529, passRate: 0.597, playsPg: 64, plays: 1088, games: 17, rzPass: 0.54, wrFunnel: 0.403, offEpa: 0.072, shotgun: 0.518, noHuddle: 0.061, rbBellcow: 0.597, passDefenseRank: 14 },
  "MIA": { proePp: -5.2, neutralPass: 0.516, passRate: 0.574, playsPg: 57.2, plays: 972, games: 17, rzPass: 0.527, wrFunnel: 0.288, offEpa: -0.022, shotgun: 0.714, noHuddle: 0.036, rbBellcow: 0.63, passDefenseRank: 26 },
  "CAR": { proePp: -5.3, neutralPass: 0.53, passRate: 0.597, playsPg: 61.2, plays: 1040, games: 17, rzPass: 0.609, wrFunnel: 0.314, offEpa: -0.027, shotgun: 0.67, noHuddle: 0.061, rbBellcow: 0.605, passDefenseRank: 24 },
  "ATL": { proePp: -5.6, neutralPass: 0.524, passRate: 0.572, playsPg: 63.5, plays: 1080, games: 17, rzPass: 0.523, wrFunnel: 0.306, offEpa: -0.008, shotgun: 0.806, noHuddle: 0.113, rbBellcow: 0.654, passDefenseRank: 13 },
  "SEA": { proePp: -6.1, neutralPass: 0.535, passRate: 0.529, playsPg: 61.3, plays: 1042, games: 17, rzPass: 0.472, wrFunnel: 0.356, offEpa: 0.039, shotgun: 0.463, noHuddle: 0.074, rbBellcow: 0.502, passDefenseRank: 5 },
  "BAL": { proePp: -8.2, neutralPass: 0.473, passRate: 0.536, playsPg: 58.5, plays: 995, games: 17, rzPass: 0.452, wrFunnel: 0.355, offEpa: 0.037, shotgun: 0.656, noHuddle: 0.03, rbBellcow: 0.783, passDefenseRank: 21 },
  "NYJ": { proePp: -8.2, neutralPass: 0.473, passRate: 0.612, playsPg: 61.2, plays: 1040, games: 17, rzPass: 0.563, wrFunnel: 0.186, offEpa: -0.124, shotgun: 0.73, noHuddle: 0.095, rbBellcow: 0.73, passDefenseRank: 32 },
};
