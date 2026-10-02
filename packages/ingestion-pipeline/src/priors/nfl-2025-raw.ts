/**
 * Raw 2025 columns the index votes do not expose.
 * pressure_pct and sack_rate: lower is better protection.
 * pocket_time and ybc_att: higher is better.
 * pace_delta: last four 2025 weeks minus the season, plays per game.
 * ydsPerTargetAllowed: lower is better coverage.
 */
export interface RawPrior {
  readonly pressurePct: number;
  readonly sackRate: number;
  readonly pocketTime: number;
  readonly yardsBeforeContact: number;
  readonly paceDelta: number;
  readonly ydsPerTargetAllowed: number;
}

export const NFL_2025_RAW: Readonly<Record<string, RawPrior>> = {
  ARI: { pressurePct: 24.644, sackRate: 0.083, pocketTime: 2.373, yardsBeforeContact: 2.582, paceDelta: -7.6, ydsPerTargetAllowed: 7.59 },
  ATL: { pressurePct: 19.019, sackRate: 0.046, pocketTime: 2.4, yardsBeforeContact: 2.506, paceDelta: 0.8, ydsPerTargetAllowed: 7.3 },
  BAL: { pressurePct: 22.62, sackRate: 0.097, pocketTime: 2.454, yardsBeforeContact: 3.129, paceDelta: -4.2, ydsPerTargetAllowed: 7.37 },
  BUF: { pressurePct: 16.727, sackRate: 0.075, pocketTime: 2.507, yardsBeforeContact: 2.896, paceDelta: 0.2, ydsPerTargetAllowed: 6.59 },
  CAR: { pressurePct: 23.993, sackRate: 0.064, pocketTime: 2.4, yardsBeforeContact: 2.479, paceDelta: -8.9, ydsPerTargetAllowed: 7.4 },
  CHI: { pressurePct: 24.977, sackRate: 0.04, pocketTime: 2.496, yardsBeforeContact: 3.133, paceDelta: -4.8, ydsPerTargetAllowed: 7.95 },
  CIN: { pressurePct: 20.639, sackRate: 0.053, pocketTime: 2.22, yardsBeforeContact: 2.278, paceDelta: 5.0, ydsPerTargetAllowed: 8.19 },
  CLE: { pressurePct: 29.483, sackRate: 0.096, pocketTime: 2.444, yardsBeforeContact: 1.818, paceDelta: -6.9, ydsPerTargetAllowed: 6.76 },
  DAL: { pressurePct: 21.508, sackRate: 0.047, pocketTime: 2.396, yardsBeforeContact: 2.567, paceDelta: 0.1, ydsPerTargetAllowed: 8.61 },
  DEN: { pressurePct: 19.069, sackRate: 0.035, pocketTime: 2.401, yardsBeforeContact: 2.583, paceDelta: -1.0, ydsPerTargetAllowed: 6.55 },
  DET: { pressurePct: 24.561, sackRate: 0.061, pocketTime: 2.297, yardsBeforeContact: 2.847, paceDelta: 4.5, ydsPerTargetAllowed: 7.46 },
  GB: { pressurePct: 21.737, sackRate: 0.056, pocketTime: 2.41, yardsBeforeContact: 2.203, paceDelta: -2.8, ydsPerTargetAllowed: 6.7 },
  HOU: { pressurePct: 19.925, sackRate: 0.051, pocketTime: 2.345, yardsBeforeContact: 2.104, paceDelta: -3.3, ydsPerTargetAllowed: 6.87 },
  IND: { pressurePct: 19.289, sackRate: 0.051, pocketTime: 2.237, yardsBeforeContact: 2.441, paceDelta: -1.6, ydsPerTargetAllowed: 7.43 },
  JAX: { pressurePct: 21.861, sackRate: 0.068, pocketTime: 2.395, yardsBeforeContact: 2.246, paceDelta: -2.2, ydsPerTargetAllowed: 6.5 },
  KC: { pressurePct: 24.299, sackRate: 0.074, pocketTime: 2.212, yardsBeforeContact: 2.641, paceDelta: -11.5, ydsPerTargetAllowed: 7.44 },
  LA: { pressurePct: 18.469, sackRate: 0.037, pocketTime: 2.396, yardsBeforeContact: 2.785, paceDelta: 10.0, ydsPerTargetAllowed: 7.1 },
  LAC: { pressurePct: 28.528, sackRate: 0.095, pocketTime: 2.37, yardsBeforeContact: 2.615, paceDelta: -1.5, ydsPerTargetAllowed: 6.7 },
  LV: { pressurePct: 22.552, sackRate: 0.111, pocketTime: 2.487, yardsBeforeContact: 1.644, paceDelta: -3.7, ydsPerTargetAllowed: 7.09 },
  MIA: { pressurePct: 21.804, sackRate: 0.074, pocketTime: 2.29, yardsBeforeContact: 2.234, paceDelta: -2.4, ydsPerTargetAllowed: 7.86 },
  MIN: { pressurePct: 25.699, sackRate: 0.11, pocketTime: 2.429, yardsBeforeContact: 2.428, paceDelta: 0.2, ydsPerTargetAllowed: 7.06 },
  NE: { pressurePct: 21.366, sackRate: 0.086, pocketTime: 2.406, yardsBeforeContact: 2.599, paceDelta: -1.3, ydsPerTargetAllowed: 6.88 },
  NO: { pressurePct: 18.624, sackRate: 0.077, pocketTime: 2.2, yardsBeforeContact: 2.069, paceDelta: 1.1, ydsPerTargetAllowed: 6.99 },
  NYG: { pressurePct: 24.916, sackRate: 0.084, pocketTime: 2.388, yardsBeforeContact: 2.718, paceDelta: -2.1, ydsPerTargetAllowed: 7.41 },
  NYJ: { pressurePct: 25.038, sackRate: 0.109, pocketTime: 2.423, yardsBeforeContact: 2.878, paceDelta: 0.1, ydsPerTargetAllowed: 7.78 },
  PHI: { pressurePct: 20.208, sackRate: 0.066, pocketTime: 2.491, yardsBeforeContact: 2.617, paceDelta: 2.6, ydsPerTargetAllowed: 6.61 },
  PIT: { pressurePct: 15.156, sackRate: 0.053, pocketTime: 2.209, yardsBeforeContact: 2.289, paceDelta: 9.9, ydsPerTargetAllowed: 7.48 },
  SEA: { pressurePct: 20.825, sackRate: 0.053, pocketTime: 2.4, yardsBeforeContact: 2.459, paceDelta: 2.5, ydsPerTargetAllowed: 6.36 },
  SF: { pressurePct: 19.452, sackRate: 0.045, pocketTime: 2.547, yardsBeforeContact: 2.329, paceDelta: -2.0, ydsPerTargetAllowed: 7.1 },
  TB: { pressurePct: 14.999, sackRate: 0.064, pocketTime: 2.292, yardsBeforeContact: 2.714, paceDelta: 0.4, ydsPerTargetAllowed: 8.14 },
  TEN: { pressurePct: 27.863, sackRate: 0.089, pocketTime: 2.389, yardsBeforeContact: 2.515, paceDelta: 1.5, ydsPerTargetAllowed: 8.79 },
  WAS: { pressurePct: 18.297, sackRate: 0.071, pocketTime: 2.36, yardsBeforeContact: 2.499, paceDelta: -5.7, ydsPerTargetAllowed: 8.53 },
};
