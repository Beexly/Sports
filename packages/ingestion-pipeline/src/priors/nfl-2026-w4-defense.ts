/**
 * 2026 weeks 1-3 EPA allowed. Same split as nfl_scheme_defense.py:
 * mean epa on pass==1 and rush==1 for the defense. Lower is better.
 * Week 4 only. Earlier leaks. Later is stale.
 */
export interface DefenseAllowed {
  readonly passEpaAllowed: number;
  readonly rushEpaAllowed: number;
  readonly passPlays: number;
  readonly rushPlays: number;
}

export const NFL_2026_W4_DEFENSE: Readonly<Record<string, DefenseAllowed>> = {
  ARI: { passEpaAllowed: 0.404, rushEpaAllowed: -0.188, passPlays: 99, rushPlays: 79 },
  ATL: { passEpaAllowed: 0.03, rushEpaAllowed: -0.312, passPlays: 143, rushPlays: 53 },
  BAL: { passEpaAllowed: 0.033, rushEpaAllowed: 0.02, passPlays: 125, rushPlays: 70 },
  BUF: { passEpaAllowed: 0.166, rushEpaAllowed: -0.041, passPlays: 136, rushPlays: 77 },
  CAR: { passEpaAllowed: 0.012, rushEpaAllowed: -0.09, passPlays: 125, rushPlays: 87 },
  CHI: { passEpaAllowed: -0.066, rushEpaAllowed: -0.031, passPlays: 104, rushPlays: 66 },
  CIN: { passEpaAllowed: -0.035, rushEpaAllowed: -0.139, passPlays: 142, rushPlays: 52 },
  CLE: { passEpaAllowed: 0.007, rushEpaAllowed: -0.063, passPlays: 120, rushPlays: 75 },
  DAL: { passEpaAllowed: 0.408, rushEpaAllowed: -0.053, passPlays: 107, rushPlays: 94 },
  DEN: { passEpaAllowed: -0.028, rushEpaAllowed: 0.107, passPlays: 131, rushPlays: 79 },
  DET: { passEpaAllowed: 0.235, rushEpaAllowed: 0.045, passPlays: 157, rushPlays: 69 },
  GB: { passEpaAllowed: 0.231, rushEpaAllowed: -0.055, passPlays: 112, rushPlays: 92 },
  HOU: { passEpaAllowed: 0.129, rushEpaAllowed: -0.187, passPlays: 114, rushPlays: 72 },
  IND: { passEpaAllowed: 0.201, rushEpaAllowed: 0.014, passPlays: 117, rushPlays: 81 },
  JAX: { passEpaAllowed: -0.104, rushEpaAllowed: -0.116, passPlays: 105, rushPlays: 68 },
  KC: { passEpaAllowed: -0.066, rushEpaAllowed: -0.096, passPlays: 117, rushPlays: 71 },
  LA: { passEpaAllowed: -0.046, rushEpaAllowed: -0.029, passPlays: 113, rushPlays: 77 },
  LAC: { passEpaAllowed: 0.125, rushEpaAllowed: -0.152, passPlays: 108, rushPlays: 89 },
  LV: { passEpaAllowed: -0.127, rushEpaAllowed: -0.313, passPlays: 121, rushPlays: 75 },
  MIA: { passEpaAllowed: 0.464, rushEpaAllowed: -0.174, passPlays: 87, rushPlays: 80 },
  MIN: { passEpaAllowed: -0.126, rushEpaAllowed: -0.359, passPlays: 140, rushPlays: 70 },
  NE: { passEpaAllowed: -0.085, rushEpaAllowed: 0.003, passPlays: 109, rushPlays: 71 },
  NO: { passEpaAllowed: 0.134, rushEpaAllowed: -0.038, passPlays: 123, rushPlays: 79 },
  NYG: { passEpaAllowed: 0.242, rushEpaAllowed: -0.098, passPlays: 113, rushPlays: 63 },
  NYJ: { passEpaAllowed: 0.069, rushEpaAllowed: -0.194, passPlays: 115, rushPlays: 57 },
  PHI: { passEpaAllowed: 0.154, rushEpaAllowed: -0.003, passPlays: 104, rushPlays: 89 },
  PIT: { passEpaAllowed: -0.056, rushEpaAllowed: -0.043, passPlays: 98, rushPlays: 72 },
  SEA: { passEpaAllowed: 0.039, rushEpaAllowed: -0.371, passPlays: 116, rushPlays: 72 },
  SF: { passEpaAllowed: 0.071, rushEpaAllowed: -0.122, passPlays: 120, rushPlays: 85 },
  TB: { passEpaAllowed: -0.006, rushEpaAllowed: -0.234, passPlays: 111, rushPlays: 67 },
  TEN: { passEpaAllowed: 0.132, rushEpaAllowed: -0.104, passPlays: 98, rushPlays: 105 },
  WAS: { passEpaAllowed: 0.244, rushEpaAllowed: -0.318, passPlays: 121, rushPlays: 54 },
};
