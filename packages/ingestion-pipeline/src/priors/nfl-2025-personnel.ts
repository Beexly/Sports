/**
 * 2025 participation personnel shares.
 * 11 is a string with 1 RB, 1 TE, and 3 WR. 12 is 1 RB, 2 TE, and 2 WR.
 * Not a charted package grade. A team under 200 plays is omitted. None are.
 */
export interface PersonnelShare {
  readonly personnel11: number;
  readonly personnel12: number;
  readonly plays: number;
}

export const NFL_2025_PERSONNEL: Readonly<Record<string, PersonnelShare>> = {
  ARI: { personnel11: 0.386, personnel12: 0.252, plays: 1395 },
  ATL: { personnel11: 0.373, personnel12: 0.324, plays: 1363 },
  BAL: { personnel11: 0.248, personnel12: 0.296, plays: 1276 },
  BUF: { personnel11: 0.519, personnel12: 0.095, plays: 1529 },
  CAR: { personnel11: 0.549, personnel12: 0.169, plays: 1381 },
  CHI: { personnel11: 0.436, personnel12: 0.267, plays: 1602 },
  CIN: { personnel11: 0.532, personnel12: 0.271, plays: 1385 },
  CLE: { personnel11: 0.366, personnel12: 0.336, plays: 1352 },
  DAL: { personnel11: 0.501, personnel12: 0.144, plays: 1456 },
  DEN: { personnel11: 0.502, personnel12: 0.091, plays: 1556 },
  DET: { personnel11: 0.483, personnel12: 0.187, plays: 1364 },
  GB: { personnel11: 0.423, personnel12: 0.257, plays: 1376 },
  HOU: { personnel11: 0.547, personnel12: 0.068, plays: 1579 },
  IND: { personnel11: 0.525, personnel12: 0.237, plays: 1316 },
  JAX: { personnel11: 0.557, personnel12: 0.151, plays: 1483 },
  KC: { personnel11: 0.48, personnel12: 0.235, plays: 1349 },
  LA: { personnel11: 0.495, personnel12: 0.086, plays: 1643 },
  LAC: { personnel11: 0.48, personnel12: 0.06, plays: 1474 },
  LV: { personnel11: 0.468, personnel12: 0.28, plays: 1236 },
  MIA: { personnel11: 0.28, personnel12: 0.081, plays: 1228 },
  MIN: { personnel11: 0.485, personnel12: 0.17, plays: 1250 },
  NE: { personnel11: 0.412, personnel12: 0.146, plays: 1660 },
  NO: { personnel11: 0.567, personnel12: 0.096, plays: 1379 },
  NYG: { personnel11: 0.516, personnel12: 0.286, plays: 1414 },
  NYJ: { personnel11: 0.555, personnel12: 0.139, plays: 1316 },
  PHI: { personnel11: 0.505, personnel12: 0.216, plays: 1401 },
  PIT: { personnel11: 0.327, personnel12: 0.203, plays: 1352 },
  SEA: { personnel11: 0.353, personnel12: 0.246, plays: 1551 },
  SF: { personnel11: 0.364, personnel12: 0.093, plays: 1494 },
  TB: { personnel11: 0.579, personnel12: 0.212, plays: 1390 },
  TEN: { personnel11: 0.571, personnel12: 0.151, plays: 1325 },
  WAS: { personnel11: 0.478, personnel12: 0.186, plays: 1309 },
};
