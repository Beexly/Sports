/**
 * 2026 weeks 1-3 dropback rates. Week 4 only.
 * sack and hit are shares of dropbacks. cpoe is mean completion percentage over expected.
 */
export interface DropbackRates {
  readonly sackAllowed: number;
  readonly hitAllowed: number;
  readonly scrambleRate: number;
  readonly cpoe: number;
  readonly sackForced: number;
  readonly hitForced: number;
}

export const NFL_2026_W4_DROPBACK: Readonly<Record<string, DropbackRates>> = {
  ARI: { sackAllowed: 0.0407, hitAllowed: 0.1382, scrambleRate: 0.0163, cpoe: 3.77, sackForced: 0.0444, hitForced: 0.1111 },
  ATL: { sackAllowed: 0.0769, hitAllowed: 0.1209, scrambleRate: 0.044, cpoe: -7.95, sackForced: 0.0368, hitForced: 0.1765 },
  BAL: { sackAllowed: 0.0568, hitAllowed: 0.1023, scrambleRate: 0.1023, cpoe: 7.22, sackForced: 0.0504, hitForced: 0.1681 },
  BUF: { sackAllowed: 0.0784, hitAllowed: 0.1667, scrambleRate: 0.0686, cpoe: 4.45, sackForced: 0.0726, hitForced: 0.2177 },
  CAR: { sackAllowed: 0.053, hitAllowed: 0.1439, scrambleRate: 0.0303, cpoe: 3.7, sackForced: 0.0603, hitForced: 0.1207 },
  CHI: { sackAllowed: 0.0526, hitAllowed: 0.1404, scrambleRate: 0.0965, cpoe: 5.04, sackForced: 0.0714, hitForced: 0.1327 },
  CIN: { sackAllowed: 0.0619, hitAllowed: 0.1858, scrambleRate: 0.0265, cpoe: 3.36, sackForced: 0.0752, hitForced: 0.1579 },
  CLE: { sackAllowed: 0.0865, hitAllowed: 0.1731, scrambleRate: 0.1058, cpoe: 0.45, sackForced: 0.0614, hitForced: 0.1404 },
  DAL: { sackAllowed: 0.0254, hitAllowed: 0.1356, scrambleRate: 0.0763, cpoe: 6.31, sackForced: 0.0206, hitForced: 0.1237 },
  DEN: { sackAllowed: 0.0495, hitAllowed: 0.1089, scrambleRate: 0.0099, cpoe: -2.65, sackForced: 0.0656, hitForced: 0.2131 },
  DET: { sackAllowed: 0.0579, hitAllowed: 0.1901, scrambleRate: 0.0413, cpoe: 3.05, sackForced: 0.0816, hitForced: 0.1565 },
  GB: { sackAllowed: 0.0606, hitAllowed: 0.2273, scrambleRate: 0.0, cpoe: -10.12, sackForced: 0.0667, hitForced: 0.1333 },
  HOU: { sackAllowed: 0.0746, hitAllowed: 0.1642, scrambleRate: 0.0373, cpoe: -2.68, sackForced: 0.1, hitForced: 0.1636 },
  IND: { sackAllowed: 0.0556, hitAllowed: 0.1759, scrambleRate: 0.037, cpoe: -0.59, sackForced: 0.0631, hitForced: 0.1171 },
  JAX: { sackAllowed: 0.0465, hitAllowed: 0.1744, scrambleRate: 0.0233, cpoe: 8.62, sackForced: 0.0816, hitForced: 0.1531 },
  KC: { sackAllowed: 0.0367, hitAllowed: 0.1284, scrambleRate: 0.0642, cpoe: 3.21, sackForced: 0.037, hitForced: 0.0926 },
  LA: { sackAllowed: 0.042, hitAllowed: 0.2017, scrambleRate: 0.0252, cpoe: 0.92, sackForced: 0.028, hitForced: 0.1215 },
  LAC: { sackAllowed: 0.0769, hitAllowed: 0.1923, scrambleRate: 0.0769, cpoe: -4.22, sackForced: 0.0686, hitForced: 0.1961 },
  LV: { sackAllowed: 0.049, hitAllowed: 0.1667, scrambleRate: 0.0294, cpoe: 4.11, sackForced: 0.0885, hitForced: 0.2212 },
  MIA: { sackAllowed: 0.0841, hitAllowed: 0.1308, scrambleRate: 0.1121, cpoe: -8.05, sackForced: 0.0, hitForced: 0.1111 },
  MIN: { sackAllowed: 0.1011, hitAllowed: 0.1461, scrambleRate: 0.0674, cpoe: -5.5, sackForced: 0.1053, hitForced: 0.2556 },
  NE: { sackAllowed: 0.0849, hitAllowed: 0.1415, scrambleRate: 0.1038, cpoe: 3.42, sackForced: 0.0673, hitForced: 0.1731 },
  NO: { sackAllowed: 0.068, hitAllowed: 0.1429, scrambleRate: 0.034, cpoe: 4.53, sackForced: 0.0598, hitForced: 0.1624 },
  NYG: { sackAllowed: 0.0753, hitAllowed: 0.1935, scrambleRate: 0.0323, cpoe: -5.16, sackForced: 0.0096, hitForced: 0.0673 },
  NYJ: { sackAllowed: 0.075, hitAllowed: 0.125, scrambleRate: 0.0667, cpoe: 10.93, sackForced: 0.0748, hitForced: 0.1215 },
  PHI: { sackAllowed: 0.0755, hitAllowed: 0.1415, scrambleRate: 0.0943, cpoe: 6.25, sackForced: 0.0306, hitForced: 0.0816 },
  PIT: { sackAllowed: 0.064, hitAllowed: 0.168, scrambleRate: 0.024, cpoe: -3.14, sackForced: 0.086, hitForced: 0.1828 },
  SEA: { sackAllowed: 0.0297, hitAllowed: 0.1485, scrambleRate: 0.0198, cpoe: 5.89, sackForced: 0.0648, hitForced: 0.1944 },
  SF: { sackAllowed: 0.0, hitAllowed: 0.0787, scrambleRate: 0.0674, cpoe: 6.28, sackForced: 0.0545, hitForced: 0.1545 },
  TB: { sackAllowed: 0.1066, hitAllowed: 0.1639, scrambleRate: 0.082, cpoe: -0.77, sackForced: 0.0566, hitForced: 0.1321 },
  TEN: { sackAllowed: 0.0505, hitAllowed: 0.101, scrambleRate: 0.0606, cpoe: 1.48, sackForced: 0.0638, hitForced: 0.1277 },
  WAS: { sackAllowed: 0.0259, hitAllowed: 0.1466, scrambleRate: 0.1034, cpoe: 0.63, sackForced: 0.0431, hitForced: 0.1466 },
};
