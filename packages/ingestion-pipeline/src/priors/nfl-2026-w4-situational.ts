/**
 * 2026 weeks 1-3 situational rates. Week 4 only.
 * Explosive is a gain of 20 or more. Red-zone touchdown rate is inside the opponent 20.
 * Third-down sample is at least 30. Red-zone sample is at least 15.
 */
export interface SituationalRates {
  readonly thirdDownRate: number;
  readonly explosiveRate: number;
  readonly intRate: number;
  readonly defIntRate: number;
  readonly fumbleLostRate: number;
  readonly rzTdRate: number;
}

export const NFL_2026_W4_SITUATIONAL: Readonly<Record<string, SituationalRates>> = {
  ARI: { thirdDownRate: 0.4, explosiveRate: 0.0097, intRate: 0.0081, defIntRate: 0.0111, fumbleLostRate: 0.0, rzTdRate: 0.1579 },
  ATL: { thirdDownRate: 0.3333, explosiveRate: 0.0455, intRate: 0.0659, defIntRate: 0.0074, fumbleLostRate: 0.0, rzTdRate: 0.2667 },
  BAL: { thirdDownRate: 0.3226, explosiveRate: 0.0811, intRate: 0.0114, defIntRate: 0.0084, fumbleLostRate: 0.0, rzTdRate: 0.2105 },
  BUF: { thirdDownRate: 0.5455, explosiveRate: 0.0885, intRate: 0.0196, defIntRate: 0.0081, fumbleLostRate: 0.0125, rzTdRate: 0.2647 },
  CAR: { thirdDownRate: 0.3684, explosiveRate: 0.067, intRate: 0.0152, defIntRate: 0.0259, fumbleLostRate: 0.0, rzTdRate: 0.1778 },
  CHI: { thirdDownRate: 0.4348, explosiveRate: 0.0596, intRate: 0.0088, defIntRate: 0.0306, fumbleLostRate: 0.0104, rzTdRate: 0.1132 },
  CIN: { thirdDownRate: 0.4524, explosiveRate: 0.0615, intRate: 0.0088, defIntRate: 0.0075, fumbleLostRate: 0.0, rzTdRate: 0.1905 },
  CLE: { thirdDownRate: 0.3056, explosiveRate: 0.04, intRate: 0.0096, defIntRate: 0.0175, fumbleLostRate: 0.0, rzTdRate: 0.125 },
  DAL: { thirdDownRate: 0.5, explosiveRate: 0.0321, intRate: 0.0085, defIntRate: 0.0, fumbleLostRate: 0.0, rzTdRate: 0.2308 },
  DEN: { thirdDownRate: 0.3514, explosiveRate: 0.0455, intRate: 0.0297, defIntRate: 0.0328, fumbleLostRate: 0.0, rzTdRate: 0.1714 },
  DET: { thirdDownRate: 0.4, explosiveRate: 0.0488, intRate: 0.0, defIntRate: 0.0136, fumbleLostRate: 0.0, rzTdRate: 0.2292 },
  GB: { thirdDownRate: 0.2703, explosiveRate: 0.0622, intRate: 0.0152, defIntRate: 0.019, fumbleLostRate: 0.0189, rzTdRate: 0.1613 },
  HOU: { thirdDownRate: 0.3404, explosiveRate: 0.0519, intRate: 0.0, defIntRate: 0.0091, fumbleLostRate: 0.0, rzTdRate: 0.2069 },
  IND: { thirdDownRate: 0.3947, explosiveRate: 0.0526, intRate: 0.0278, defIntRate: 0.0, fumbleLostRate: 0.0, rzTdRate: 0.2143 },
  JAX: { thirdDownRate: 0.5294, explosiveRate: 0.0457, intRate: 0.0233, defIntRate: 0.0408, fumbleLostRate: 0.0, rzTdRate: 0.2963 },
  KC: { thirdDownRate: 0.4474, explosiveRate: 0.0657, intRate: 0.0183, defIntRate: 0.0278, fumbleLostRate: 0.0, rzTdRate: 0.2045 },
  LA: { thirdDownRate: 0.4054, explosiveRate: 0.0743, intRate: 0.0336, defIntRate: 0.028, fumbleLostRate: 0.0133, rzTdRate: 0.1724 },
  LAC: { thirdDownRate: 0.3421, explosiveRate: 0.0419, intRate: 0.0385, defIntRate: 0.0294, fumbleLostRate: 0.0263, rzTdRate: 0.1562 },
  LV: { thirdDownRate: 0.3902, explosiveRate: 0.0415, intRate: 0.0294, defIntRate: 0.0354, fumbleLostRate: 0.0, rzTdRate: 0.186 },
  MIA: { thirdDownRate: 0.3953, explosiveRate: 0.0532, intRate: 0.0187, defIntRate: 0.037, fumbleLostRate: 0.0143, rzTdRate: 0.08 },
  MIN: { thirdDownRate: 0.2653, explosiveRate: 0.0462, intRate: 0.0225, defIntRate: 0.0301, fumbleLostRate: 0.0, rzTdRate: 0.25 },
  NE: { thirdDownRate: 0.3023, explosiveRate: 0.0588, intRate: 0.0566, defIntRate: 0.0192, fumbleLostRate: 0.0, rzTdRate: 0.0667 },
  NO: { thirdDownRate: 0.5102, explosiveRate: 0.0565, intRate: 0.0204, defIntRate: 0.0085, fumbleLostRate: 0.0, rzTdRate: 0.2368 },
  NYG: { thirdDownRate: 0.4103, explosiveRate: 0.016, intRate: 0.0108, defIntRate: 0.0288, fumbleLostRate: 0.0109, rzTdRate: 0.1538 },
  NYJ: { thirdDownRate: 0.3721, explosiveRate: 0.0542, intRate: 0.0, defIntRate: 0.0, fumbleLostRate: 0.0, rzTdRate: 0.1786 },
  PHI: { thirdDownRate: 0.4634, explosiveRate: 0.0615, intRate: 0.0377, defIntRate: 0.0, fumbleLostRate: 0.0, rzTdRate: 0.1724 },
  PIT: { thirdDownRate: 0.2927, explosiveRate: 0.0567, intRate: 0.016, defIntRate: 0.0323, fumbleLostRate: 0.0, rzTdRate: 0.1111 },
  SEA: { thirdDownRate: 0.3235, explosiveRate: 0.0538, intRate: 0.0198, defIntRate: 0.037, fumbleLostRate: 0.0253, rzTdRate: 0.1667 },
  SF: { thirdDownRate: 0.5667, explosiveRate: 0.0714, intRate: 0.0112, defIntRate: 0.0091, fumbleLostRate: 0.0, rzTdRate: 0.3125 },
  TB: { thirdDownRate: 0.2979, explosiveRate: 0.0474, intRate: 0.0246, defIntRate: 0.0189, fumbleLostRate: 0.0, rzTdRate: 0.1 },
  TEN: { thirdDownRate: 0.3947, explosiveRate: 0.0368, intRate: 0.0101, defIntRate: 0.0213, fumbleLostRate: 0.0, rzTdRate: 0.1481 },
  WAS: { thirdDownRate: 0.3636, explosiveRate: 0.0337, intRate: 0.0, defIntRate: 0.0172, fumbleLostRate: 0.0, rzTdRate: 0.2059 },
};
