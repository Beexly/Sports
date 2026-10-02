/**
 * 2026 regular season, weeks 1-3 only. Counted before week 4.
 * Definitions match gse-competitive-intel/fantasyguru/nfl_scheme_defense.py:
 * scrimmage is pass==1 or rush==1; shotgun and no_huddle are means of those flags;
 * proePp is mean pass_oe; neutralPass is pass rate on downs 1-2 with wp in [0.2, 0.8];
 * rzPass is pass rate inside the opponent 20; bellcow is the top rusher's share of rushes;
 * wrFunnel is the top pass-catcher's share of targets.
 * Earlier than week 4 would leak. Later than week 4 is a stale window.
 */
export interface EnteringRates {
  readonly passRate: number;
  readonly earlyDownPassRate: number;
  readonly offEpa: number;
  readonly playsPerGame: number;
  readonly scrimmagePlays: number;
  readonly shotgun: number;
  readonly noHuddle: number;
  readonly proePp: number;
  readonly neutralPass: number;
  readonly neutralPlays: number;
  readonly rzPass: number;
  readonly rzPlays: number;
  readonly rbBellcow: number;
  readonly wrFunnel: number;
}

export const NFL_2026_W4_ENTERING: Readonly<Record<string, EnteringRates>> = {
  ARI: { passRate: 0.6377, earlyDownPassRate: 0.5823, offEpa: 0.0411, playsPerGame: 69.0, scrimmagePlays: 207, shotgun: 0.546, noHuddle: 0.087, proePp: 1.0, neutralPass: 0.592, neutralPlays: 98, rzPass: 0.605, rzPlays: 38, rbBellcow: 0.562, wrFunnel: 0.301 },
  ATL: { passRate: 0.4949, earlyDownPassRate: 0.4241, offEpa: -0.162, playsPerGame: 66.0, scrimmagePlays: 198, shotgun: 0.535, noHuddle: 0.03, proePp: -11.0, neutralPass: 0.426, neutralPlays: 94, rzPass: 0.2, rzPlays: 15, rbBellcow: 0.673, wrFunnel: 0.257 },
  BAL: { passRate: 0.5351, earlyDownPassRate: 0.4834, offEpa: 0.1706, playsPerGame: 61.67, scrimmagePlays: 185, shotgun: 0.541, noHuddle: 0.038, proePp: -5.5, neutralPass: 0.49, neutralPlays: 98, rzPass: 0.368, rzPlays: 38, rbBellcow: 0.776, wrFunnel: 0.247 },
  BUF: { passRate: 0.5833, earlyDownPassRate: 0.5484, offEpa: 0.2215, playsPerGame: 64.0, scrimmagePlays: 192, shotgun: 0.443, noHuddle: 0.042, proePp: 0.4, neutralPass: 0.552, neutralPlays: 105, rzPass: 0.588, rzPlays: 34, rbBellcow: 0.744, wrFunnel: 0.217 },
  CAR: { passRate: 0.6603, earlyDownPassRate: 0.6098, offEpa: 0.0163, playsPerGame: 69.67, scrimmagePlays: 209, shotgun: 0.656, noHuddle: 0.053, proePp: 1.9, neutralPass: 0.612, neutralPlays: 103, rzPass: 0.733, rzPlays: 45, rbBellcow: 0.667, wrFunnel: 0.213 },
  CHI: { passRate: 0.5596, earlyDownPassRate: 0.503, offEpa: 0.1208, playsPerGame: 72.67, scrimmagePlays: 218, shotgun: 0.468, noHuddle: 0.037, proePp: -1.6, neutralPass: 0.546, neutralPlays: 119, rzPass: 0.509, rzPlays: 53, rbBellcow: 0.587, wrFunnel: 0.256 },
  CIN: { passRate: 0.6425, earlyDownPassRate: 0.5852, offEpa: 0.0482, playsPerGame: 59.67, scrimmagePlays: 179, shotgun: 0.682, noHuddle: 0.045, proePp: 4.4, neutralPass: 0.667, neutralPlays: 75, rzPass: 0.524, rzPlays: 21, rbBellcow: 0.778, wrFunnel: 0.245 },
  CLE: { passRate: 0.64, earlyDownPassRate: 0.5909, offEpa: -0.0535, playsPerGame: 58.33, scrimmagePlays: 175, shotgun: 0.68, noHuddle: 0.034, proePp: -0.1, neutralPass: 0.614, neutralPlays: 88, rzPass: 0.625, rzPlays: 24, rbBellcow: 0.7, wrFunnel: 0.241 },
  DAL: { passRate: 0.6738, earlyDownPassRate: 0.625, offEpa: 0.1981, playsPerGame: 62.33, scrimmagePlays: 187, shotgun: 0.652, noHuddle: 0.053, proePp: 5.1, neutralPass: 0.616, neutralPlays: 99, rzPass: 0.615, rzPlays: 39, rbBellcow: 0.717, wrFunnel: 0.255 },
  DEN: { passRate: 0.6193, earlyDownPassRate: 0.5588, offEpa: -0.0503, playsPerGame: 58.67, scrimmagePlays: 176, shotgun: 0.659, noHuddle: 0.057, proePp: -1.2, neutralPass: 0.615, neutralPlays: 96, rzPass: 0.657, rzPlays: 35, rbBellcow: 0.556, wrFunnel: 0.236 },
  DET: { passRate: 0.6049, earlyDownPassRate: 0.5515, offEpa: 0.1407, playsPerGame: 68.33, scrimmagePlays: 205, shotgun: 0.454, noHuddle: 0.029, proePp: -0.1, neutralPass: 0.545, neutralPlays: 77, rzPass: 0.562, rzPlays: 48, rbBellcow: 0.855, wrFunnel: 0.324 },
  GB: { passRate: 0.7254, earlyDownPassRate: 0.66, offEpa: -0.0993, playsPerGame: 64.33, scrimmagePlays: 193, shotgun: 0.684, noHuddle: 0.124, proePp: 2.2, neutralPass: 0.562, neutralPlays: 89, rzPass: 0.613, rzPlays: 31, rbBellcow: 0.479, wrFunnel: 0.25 },
  HOU: { passRate: 0.684, earlyDownPassRate: 0.6582, offEpa: -0.0834, playsPerGame: 70.67, scrimmagePlays: 212, shotgun: 0.693, noHuddle: 0.08, proePp: -0.8, neutralPass: 0.617, neutralPlays: 128, rzPass: 0.655, rzPlays: 29, rbBellcow: 0.561, wrFunnel: 0.223 },
  IND: { passRate: 0.5842, earlyDownPassRate: 0.5442, offEpa: -0.0356, playsPerGame: 63.33, scrimmagePlays: 190, shotgun: 0.558, noHuddle: 0.042, proePp: -4.0, neutralPass: 0.55, neutralPlays: 100, rzPass: 0.536, rzPlays: 28, rbBellcow: 0.835, wrFunnel: 0.255 },
  JAX: { passRate: 0.5314, earlyDownPassRate: 0.5248, offEpa: 0.1465, playsPerGame: 58.33, scrimmagePlays: 175, shotgun: 0.531, noHuddle: 0.069, proePp: -3.3, neutralPass: 0.6, neutralPlays: 65, rzPass: 0.556, rzPlays: 27, rbBellcow: 0.537, wrFunnel: 0.303 },
  KC: { passRate: 0.5758, earlyDownPassRate: 0.5484, offEpa: 0.1657, playsPerGame: 66.0, scrimmagePlays: 198, shotgun: 0.606, noHuddle: 0.005, proePp: 3.9, neutralPass: 0.579, neutralPlays: 126, rzPass: 0.636, rzPlays: 44, rbBellcow: 0.793, wrFunnel: 0.198 },
  LA: { passRate: 0.6287, earlyDownPassRate: 0.5901, offEpa: 0.0024, playsPerGame: 67.33, scrimmagePlays: 202, shotgun: 0.525, noHuddle: 0.089, proePp: -0.3, neutralPass: 0.6, neutralPlays: 85, rzPass: 0.586, rzPlays: 29, rbBellcow: 0.521, wrFunnel: 0.274 },
  LAC: { passRate: 0.6021, earlyDownPassRate: 0.5369, offEpa: -0.1771, playsPerGame: 63.67, scrimmagePlays: 191, shotgun: 0.702, noHuddle: 0.042, proePp: -7.1, neutralPass: 0.468, neutralPlays: 124, rzPass: 0.5, rzPlays: 32, rbBellcow: 0.685, wrFunnel: 0.198 },
  LV: { passRate: 0.5596, earlyDownPassRate: 0.5034, offEpa: 0.0113, playsPerGame: 64.33, scrimmagePlays: 193, shotgun: 0.482, noHuddle: 0.031, proePp: -2.9, neutralPass: 0.59, neutralPlays: 100, rzPass: 0.581, rzPlays: 43, rbBellcow: 0.768, wrFunnel: 0.191 },
  MIA: { passRate: 0.6277, earlyDownPassRate: 0.5725, offEpa: -0.1239, playsPerGame: 62.67, scrimmagePlays: 188, shotgun: 0.622, noHuddle: 0.021, proePp: -8.3, neutralPass: 0.518, neutralPlays: 83, rzPass: 0.44, rzPlays: 25, rbBellcow: 0.515, wrFunnel: 0.271 },
  MIN: { passRate: 0.5549, earlyDownPassRate: 0.4215, offEpa: -0.0968, playsPerGame: 57.67, scrimmagePlays: 173, shotgun: 0.549, noHuddle: 0.052, proePp: -5.4, neutralPass: 0.449, neutralPlays: 107, rzPass: 0.5, rzPlays: 16, rbBellcow: 0.684, wrFunnel: 0.265 },
  NE: { passRate: 0.6043, earlyDownPassRate: 0.5429, offEpa: -0.1305, playsPerGame: 62.33, scrimmagePlays: 187, shotgun: 0.519, noHuddle: 0.011, proePp: -1.7, neutralPass: 0.561, neutralPlays: 82, rzPass: 0.8, rzPlays: 15, rbBellcow: 0.431, wrFunnel: 0.195 },
  NO: { passRate: 0.6739, earlyDownPassRate: 0.6416, offEpa: 0.0238, playsPerGame: 76.67, scrimmagePlays: 230, shotgun: 0.683, noHuddle: 0.157, proePp: 2.3, neutralPass: 0.607, neutralPlays: 122, rzPass: 0.658, rzPlays: 38, rbBellcow: 0.413, wrFunnel: 0.288 },
  NYG: { passRate: 0.508, earlyDownPassRate: 0.4315, offEpa: -0.0401, playsPerGame: 62.33, scrimmagePlays: 187, shotgun: 0.535, noHuddle: 0.043, proePp: -10.3, neutralPass: 0.397, neutralPlays: 68, rzPass: 0.385, rzPlays: 26, rbBellcow: 0.595, wrFunnel: 0.28 },
  NYJ: { passRate: 0.6207, earlyDownPassRate: 0.5686, offEpa: 0.0427, playsPerGame: 67.67, scrimmagePlays: 203, shotgun: 0.611, noHuddle: 0.054, proePp: -0.7, neutralPass: 0.578, neutralPlays: 109, rzPass: 0.571, rzPlays: 28, rbBellcow: 0.689, wrFunnel: 0.289 },
  PHI: { passRate: 0.6145, earlyDownPassRate: 0.5224, offEpa: -0.0523, playsPerGame: 59.67, scrimmagePlays: 179, shotgun: 0.676, noHuddle: 0.156, proePp: -6.8, neutralPass: 0.504, neutralPlays: 121, rzPass: 0.448, rzPlays: 29, rbBellcow: 0.531, wrFunnel: 0.333 },
  PIT: { passRate: 0.6959, earlyDownPassRate: 0.64, offEpa: -0.1407, playsPerGame: 64.67, scrimmagePlays: 194, shotgun: 0.665, noHuddle: 0.098, proePp: 5.2, neutralPass: 0.623, neutralPlays: 106, rzPass: 0.722, rzPlays: 18, rbBellcow: 0.644, wrFunnel: 0.229 },
  SEA: { passRate: 0.5753, earlyDownPassRate: 0.5274, offEpa: 0.0533, playsPerGame: 62.0, scrimmagePlays: 186, shotgun: 0.457, noHuddle: 0.016, proePp: -1.5, neutralPass: 0.538, neutralPlays: 104, rzPass: 0.5, rzPlays: 42, rbBellcow: 0.416, wrFunnel: 0.379 },
  SF: { passRate: 0.5655, earlyDownPassRate: 0.5, offEpa: 0.3303, playsPerGame: 56.0, scrimmagePlays: 168, shotgun: 0.435, noHuddle: 0.006, proePp: 4.8, neutralPass: 0.542, neutralPlays: 59, rzPass: 0.594, rzPlays: 32, rbBellcow: 0.493, wrFunnel: 0.21 },
  TB: { passRate: 0.6947, earlyDownPassRate: 0.6187, offEpa: -0.1995, playsPerGame: 63.33, scrimmagePlays: 190, shotgun: 0.658, noHuddle: 0.095, proePp: -0.0, neutralPass: 0.583, neutralPlays: 103, rzPass: 0.767, rzPlays: 30, rbBellcow: 0.727, wrFunnel: 0.211 },
  TEN: { passRate: 0.638, earlyDownPassRate: 0.5772, offEpa: -0.0821, playsPerGame: 54.33, scrimmagePlays: 163, shotgun: 0.669, noHuddle: 0.141, proePp: -9.1, neutralPass: 0.544, neutralPlays: 79, rzPass: 0.556, rzPlays: 27, rbBellcow: 0.655, wrFunnel: 0.25 },
  WAS: { passRate: 0.601, earlyDownPassRate: 0.5563, offEpa: 0.0228, playsPerGame: 69.33, scrimmagePlays: 208, shotgun: 0.697, noHuddle: 0.082, proePp: -2.4, neutralPass: 0.526, neutralPlays: 95, rzPass: 0.559, rzPlays: 34, rbBellcow: 0.573, wrFunnel: 0.234 },
};
