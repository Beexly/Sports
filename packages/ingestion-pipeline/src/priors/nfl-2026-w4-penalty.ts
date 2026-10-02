/**
 * Last five team-games before 2026 REG week 4.
 * 2026 weeks 1-3 plus the last two 2025 regular-season games.
 * Pre-snap fouls are False Start, Delay of Game, and Neutral Zone Infraction.
 * DPI beneficiary yards are the yards the offense was awarded on Defensive Pass Interference.
 * Net yards are the team's penalty yards minus the opponent's in those games.
 * Negative net means the team was penalized for fewer yards.
 * Earlier than week 4 would leak. Later than week 4 is a stale window.
 */
export interface PenaltyWindow {
  readonly netYards: number;
  readonly preSnapPerGame: number;
  readonly dpiBeneficiaryYardsPerGame: number;
}

export const NFL_2026_W4_PENALTY: Readonly<Record<string, PenaltyWindow>> = {
  ARI: { netYards: 124, preSnapPerGame: 1.8, dpiBeneficiaryYardsPerGame: 12.8 },
  ATL: { netYards: 67, preSnapPerGame: 1.4, dpiBeneficiaryYardsPerGame: 0.0 },
  BAL: { netYards: 86, preSnapPerGame: 1.8, dpiBeneficiaryYardsPerGame: 14.6 },
  BUF: { netYards: 10, preSnapPerGame: 0.4, dpiBeneficiaryYardsPerGame: 14.4 },
  CAR: { netYards: 11, preSnapPerGame: 2.0, dpiBeneficiaryYardsPerGame: 1.8 },
  CHI: { netYards: -36, preSnapPerGame: 1.6, dpiBeneficiaryYardsPerGame: 0.0 },
  CIN: { netYards: -7, preSnapPerGame: 3.0, dpiBeneficiaryYardsPerGame: 3.2 },
  CLE: { netYards: 70, preSnapPerGame: 3.2, dpiBeneficiaryYardsPerGame: 3.4 },
  DAL: { netYards: 29, preSnapPerGame: 1.6, dpiBeneficiaryYardsPerGame: 23.6 },
  DEN: { netYards: 1, preSnapPerGame: 1.8, dpiBeneficiaryYardsPerGame: 4.4 },
  DET: { netYards: 46, preSnapPerGame: 2.0, dpiBeneficiaryYardsPerGame: 1.6 },
  GB: { netYards: 42, preSnapPerGame: 2.4, dpiBeneficiaryYardsPerGame: 19.0 },
  HOU: { netYards: 40, preSnapPerGame: 1.2, dpiBeneficiaryYardsPerGame: 9.8 },
  IND: { netYards: -92, preSnapPerGame: 1.6, dpiBeneficiaryYardsPerGame: 23.2 },
  JAX: { netYards: -109, preSnapPerGame: 1.4, dpiBeneficiaryYardsPerGame: 1.4 },
  KC: { netYards: 38, preSnapPerGame: 1.2, dpiBeneficiaryYardsPerGame: 5.4 },
  LA: { netYards: 73, preSnapPerGame: 1.6, dpiBeneficiaryYardsPerGame: 5.8 },
  LAC: { netYards: -107, preSnapPerGame: 2.6, dpiBeneficiaryYardsPerGame: 15.6 },
  LV: { netYards: -104, preSnapPerGame: 1.6, dpiBeneficiaryYardsPerGame: 1.4 },
  MIA: { netYards: 50, preSnapPerGame: 2.6, dpiBeneficiaryYardsPerGame: 6.2 },
  MIN: { netYards: -134, preSnapPerGame: 1.4, dpiBeneficiaryYardsPerGame: 6.4 },
  NE: { netYards: -97, preSnapPerGame: 2.0, dpiBeneficiaryYardsPerGame: 10.4 },
  NO: { netYards: 57, preSnapPerGame: 2.2, dpiBeneficiaryYardsPerGame: 8.6 },
  NYG: { netYards: 5, preSnapPerGame: 2.6, dpiBeneficiaryYardsPerGame: 7.6 },
  NYJ: { netYards: 67, preSnapPerGame: 2.4, dpiBeneficiaryYardsPerGame: 12.0 },
  PHI: { netYards: 101, preSnapPerGame: 1.4, dpiBeneficiaryYardsPerGame: 4.2 },
  PIT: { netYards: -63, preSnapPerGame: 1.2, dpiBeneficiaryYardsPerGame: 10.0 },
  SEA: { netYards: 36, preSnapPerGame: 2.8, dpiBeneficiaryYardsPerGame: 6.8 },
  SF: { netYards: 11, preSnapPerGame: 0.4, dpiBeneficiaryYardsPerGame: 1.0 },
  TB: { netYards: -43, preSnapPerGame: 2.0, dpiBeneficiaryYardsPerGame: 8.0 },
  TEN: { netYards: -65, preSnapPerGame: 0.8, dpiBeneficiaryYardsPerGame: 10.0 },
  WAS: { netYards: -107, preSnapPerGame: 2.4, dpiBeneficiaryYardsPerGame: 21.2 },
};
