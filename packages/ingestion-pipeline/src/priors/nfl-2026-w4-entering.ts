/**
 * 2026 regular season, weeks 1-3 only. Counted before week 4.
 * Pass rate is pass plays over pass plus run. Early-down is downs 1 and 2.
 * EPA is the mean nflverse epa on those scrimmage plays.
 * Plays per game is scrimmage plays divided by games played.
 * Not the 2025 prior. Not pass-rate-over-expected.
 * Earlier than week 4 would leak. Later than week 4 is a stale window.
 */
export interface EnteringRates {
  readonly passRate: number;
  readonly earlyDownPassRate: number;
  readonly offEpa: number;
  readonly playsPerGame: number;
  readonly scrimmagePlays: number;
}

export const NFL_2026_W4_ENTERING: Readonly<Record<string, EnteringRates>> = {
  ARI: { passRate: 0.6173, earlyDownPassRate: 0.5733, offEpa: 0.0417, playsPerGame: 65.33, scrimmagePlays: 196 },
  ATL: { passRate: 0.4603, earlyDownPassRate: 0.3907, offEpa: -0.1505, playsPerGame: 63.0, scrimmagePlays: 189 },
  BAL: { passRate: 0.4566, earlyDownPassRate: 0.4028, offEpa: 0.1933, playsPerGame: 57.67, scrimmagePlays: 173 },
  BUF: { passRate: 0.5278, earlyDownPassRate: 0.4792, offEpa: 0.2184, playsPerGame: 60.0, scrimmagePlays: 180 },
  CAR: { passRate: 0.6564, earlyDownPassRate: 0.6133, offEpa: 0.0526, playsPerGame: 65.0, scrimmagePlays: 195 },
  CHI: { passRate: 0.5, earlyDownPassRate: 0.4586, offEpa: 0.1273, playsPerGame: 68.67, scrimmagePlays: 206 },
  CIN: { passRate: 0.625, earlyDownPassRate: 0.5714, offEpa: 0.0585, playsPerGame: 58.67, scrimmagePlays: 176 },
  CLE: { passRate: 0.5671, earlyDownPassRate: 0.562, offEpa: -0.0603, playsPerGame: 54.67, scrimmagePlays: 164 },
  DAL: { passRate: 0.6124, earlyDownPassRate: 0.55, offEpa: 0.1752, playsPerGame: 59.33, scrimmagePlays: 178 },
  DEN: { passRate: 0.6098, earlyDownPassRate: 0.5556, offEpa: -0.0566, playsPerGame: 54.67, scrimmagePlays: 164 },
  DET: { passRate: 0.5888, earlyDownPassRate: 0.5409, offEpa: 0.1334, playsPerGame: 65.67, scrimmagePlays: 197 },
  GB: { passRate: 0.7333, earlyDownPassRate: 0.6667, offEpa: -0.122, playsPerGame: 60.0, scrimmagePlays: 180 },
  HOU: { passRate: 0.645, earlyDownPassRate: 0.6242, offEpa: -0.0924, playsPerGame: 66.67, scrimmagePlays: 200 },
  IND: { passRate: 0.5561, earlyDownPassRate: 0.531, offEpa: -0.0595, playsPerGame: 62.33, scrimmagePlays: 187 },
  JAX: { passRate: 0.503, earlyDownPassRate: 0.5, offEpa: 0.174, playsPerGame: 55.67, scrimmagePlays: 167 },
  KC: { passRate: 0.534, earlyDownPassRate: 0.5067, offEpa: 0.184, playsPerGame: 63.67, scrimmagePlays: 191 },
  LA: { passRate: 0.6042, earlyDownPassRate: 0.5649, offEpa: 0.0133, playsPerGame: 64.0, scrimmagePlays: 192 },
  LAC: { passRate: 0.5424, earlyDownPassRate: 0.4632, offEpa: -0.1876, playsPerGame: 59.0, scrimmagePlays: 177 },
  LV: { passRate: 0.538, earlyDownPassRate: 0.4789, offEpa: -0.0074, playsPerGame: 61.33, scrimmagePlays: 184 },
  MIA: { passRate: 0.5491, earlyDownPassRate: 0.5, offEpa: -0.127, playsPerGame: 57.67, scrimmagePlays: 173 },
  MIN: { passRate: 0.503, earlyDownPassRate: 0.3866, offEpa: -0.119, playsPerGame: 55.0, scrimmagePlays: 165 },
  NE: { passRate: 0.5337, earlyDownPassRate: 0.4776, offEpa: -0.1464, playsPerGame: 59.33, scrimmagePlays: 178 },
  NO: { passRate: 0.6396, earlyDownPassRate: 0.6131, offEpa: 0.01, playsPerGame: 74.0, scrimmagePlays: 222 },
  NYG: { passRate: 0.5085, earlyDownPassRate: 0.4348, offEpa: -0.0353, playsPerGame: 59.0, scrimmagePlays: 177 },
  NYJ: { passRate: 0.5773, earlyDownPassRate: 0.5342, offEpa: 0.0441, playsPerGame: 64.67, scrimmagePlays: 194 },
  PHI: { passRate: 0.5647, earlyDownPassRate: 0.4841, offEpa: -0.0462, playsPerGame: 56.67, scrimmagePlays: 170 },
  PIT: { passRate: 0.663, earlyDownPassRate: 0.6138, offEpa: -0.1689, playsPerGame: 61.33, scrimmagePlays: 184 },
  SEA: { passRate: 0.5562, earlyDownPassRate: 0.5071, offEpa: 0.0509, playsPerGame: 59.33, scrimmagePlays: 178 },
  SF: { passRate: 0.5188, earlyDownPassRate: 0.4511, offEpa: 0.3567, playsPerGame: 53.33, scrimmagePlays: 160 },
  TB: { passRate: 0.6328, earlyDownPassRate: 0.5725, offEpa: -0.1934, playsPerGame: 59.0, scrimmagePlays: 177 },
  TEN: { passRate: 0.5924, earlyDownPassRate: 0.547, offEpa: -0.0659, playsPerGame: 52.33, scrimmagePlays: 157 },
  WAS: { passRate: 0.5253, earlyDownPassRate: 0.4803, offEpa: 0.0184, playsPerGame: 66.0, scrimmagePlays: 198 },
};
