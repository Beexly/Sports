/**
 * 2026 weeks 1-3 snap leader at QB, joined to the 2025 qb_types.csv rush rate.
 * A leader who is not in that file is omitted. Absence is not zero.
 * Week 4 only. The snap leader can change later.
 */
export interface QbRushPrior {
  readonly qb: string;
  readonly rushAttPerGame: number;
  readonly qbType: string;
}

export const NFL_2026_W4_QB_RUSH: Readonly<Record<string, QbRushPrior>> = {
  ARI: { qb: "Jacoby Brissett", rushAttPerGame: 2.7, qbType: "Pocket" },
  BAL: { qb: "Lamar Jackson", rushAttPerGame: 5.2, qbType: "Mobile" },
  BUF: { qb: "Josh Allen", rushAttPerGame: 7.0, qbType: "Very Mobile/Running" },
  CAR: { qb: "Bryce Young", rushAttPerGame: 3.4, qbType: "Pocket" },
  CHI: { qb: "Caleb Williams", rushAttPerGame: 4.5, qbType: "Mobile" },
  CIN: { qb: "Joe Burrow", rushAttPerGame: 1.8, qbType: "Pocket" },
  DAL: { qb: "Dak Prescott", rushAttPerGame: 3.1, qbType: "Pocket" },
  DEN: { qb: "Bo Nix", rushAttPerGame: 4.9, qbType: "Mobile" },
  DET: { qb: "Jared Goff", rushAttPerGame: 1.1, qbType: "Pocket" },
  GB: { qb: "Jordan Love", rushAttPerGame: 3.1, qbType: "Pocket" },
  HOU: { qb: "C.J. Stroud", rushAttPerGame: 3.4, qbType: "Pocket" },
  IND: { qb: "Daniel Jones", rushAttPerGame: 3.5, qbType: "Pocket" },
  JAX: { qb: "Trevor Lawrence", rushAttPerGame: 4.8, qbType: "Mobile" },
  KC: { qb: "Patrick Mahomes", rushAttPerGame: 4.6, qbType: "Mobile" },
  LA: { qb: "Matthew Stafford", rushAttPerGame: 1.7, qbType: "Pocket" },
  LAC: { qb: "Justin Herbert", rushAttPerGame: 5.2, qbType: "Mobile" },
  MIN: { qb: "Carson Wentz", rushAttPerGame: 2.2, qbType: "Pocket" },
  NE: { qb: "Drake Maye", rushAttPerGame: 6.1, qbType: "Very Mobile/Running" },
  NO: { qb: "Tyler Shough", rushAttPerGame: 4.1, qbType: "Mobile" },
  NYG: { qb: "Jaxson Dart", rushAttPerGame: 6.1, qbType: "Very Mobile/Running" },
  PHI: { qb: "Jalen Hurts", rushAttPerGame: 6.6, qbType: "Very Mobile/Running" },
  PIT: { qb: "Aaron Rodgers", rushAttPerGame: 1.3, qbType: "Pocket" },
  SF: { qb: "Brock Purdy", rushAttPerGame: 3.7, qbType: "Mobile" },
  TB: { qb: "Baker Mayfield", rushAttPerGame: 3.2, qbType: "Mobile" },
  TEN: { qb: "Cam Ward", rushAttPerGame: 2.3, qbType: "Pocket" },
  WAS: { qb: "Jayden Daniels", rushAttPerGame: 8.3, qbType: "Very Mobile/Running" },
};
