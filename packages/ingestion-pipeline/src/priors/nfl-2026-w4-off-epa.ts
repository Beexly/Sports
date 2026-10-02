/**
 * 2026 weeks 1-3 offensive EPA per pass and per rush. Week 4 only.
 * A side under 60 plays on that split abstains.
 */
export interface OffEpaSplit {
  readonly passEpa: number;
  readonly passPlays: number;
  readonly rushEpa: number;
  readonly rushPlays: number;
}

export const NFL_2026_W4_OFF_EPA: Readonly<Record<string, OffEpaSplit>> = {
  ARI: { passEpa: 0.1267, passPlays: 132, rushEpa: -0.1094, rushPlays: 75 },
  ATL: { passEpa: -0.3533, passPlays: 98, rushEpa: 0.0255, rushPlays: 100 },
  BAL: { passEpa: 0.3079, passPlays: 99, rushEpa: 0.0126, rushPlays: 86 },
  BUF: { passEpa: 0.3275, passPlays: 112, rushEpa: 0.0731, rushPlays: 80 },
  CAR: { passEpa: 0.1295, passPlays: 138, rushEpa: -0.2038, rushPlays: 71 },
  CHI: { passEpa: 0.2505, passPlays: 122, rushEpa: -0.0439, rushPlays: 96 },
  CIN: { passEpa: 0.1091, passPlays: 115, rushEpa: -0.0611, rushPlays: 64 },
  CLE: { passEpa: 0.1063, passPlays: 112, rushEpa: -0.3378, rushPlays: 63 },
  DAL: { passEpa: 0.3438, passPlays: 126, rushEpa: -0.1029, rushPlays: 61 },
  DEN: { passEpa: -0.0277, passPlays: 109, rushEpa: -0.0872, rushPlays: 67 },
  DET: { passEpa: 0.2861, passPlays: 124, rushEpa: -0.082, rushPlays: 81 },
  GB: { passEpa: 0.0328, passPlays: 140, rushEpa: -0.4484, rushPlays: 53 },
  HOU: { passEpa: -0.0135, passPlays: 145, rushEpa: -0.2348, rushPlays: 67 },
  IND: { passEpa: -0.1065, passPlays: 111, rushEpa: 0.0641, rushPlays: 79 },
  JAX: { passEpa: 0.2128, passPlays: 93, rushEpa: 0.0712, rushPlays: 82 },
  KC: { passEpa: 0.2409, passPlays: 114, rushEpa: 0.0635, rushPlays: 84 },
  LA: { passEpa: 0.0711, passPlays: 127, rushEpa: -0.1138, rushPlays: 75 },
  LAC: { passEpa: -0.0945, passPlays: 115, rushEpa: -0.3021, rushPlays: 76 },
  LV: { passEpa: 0.1989, passPlays: 108, rushEpa: -0.2269, rushPlays: 85 },
  MIA: { passEpa: -0.0254, passPlays: 118, rushEpa: -0.29, rushPlays: 70 },
  MIN: { passEpa: -0.0373, passPlays: 96, rushEpa: -0.171, rushPlays: 77 },
  NE: { passEpa: -0.0815, passPlays: 113, rushEpa: -0.2052, rushPlays: 74 },
  NO: { passEpa: 0.0482, passPlays: 155, rushEpa: -0.0265, rushPlays: 75 },
  NYG: { passEpa: 0.0245, passPlays: 95, rushEpa: -0.1068, rushPlays: 92 },
  NYJ: { passEpa: 0.2197, passPlays: 126, rushEpa: -0.247, rushPlays: 77 },
  PHI: { passEpa: -0.0581, passPlays: 110, rushEpa: -0.0432, rushPlays: 69 },
  PIT: { passEpa: -0.1768, passPlays: 135, rushEpa: -0.0579, rushPlays: 59 },
  SEA: { passEpa: 0.287, passPlays: 107, rushEpa: -0.2633, rushPlays: 79 },
  SF: { passEpa: 0.6222, passPlays: 95, rushEpa: -0.0497, rushPlays: 73 },
  TB: { passEpa: -0.2557, passPlays: 132, rushEpa: -0.0717, rushPlays: 58 },
  TEN: { passEpa: -0.1145, passPlays: 104, rushEpa: -0.0251, rushPlays: 59 },
  WAS: { passEpa: 0.1305, passPlays: 125, rushEpa: -0.1394, rushPlays: 83 },
};
