/**
 * NFL.com standings entering 2026 week 4. Home and road splits are separate from the overall record.
 * Source: Firecrawl Alexandria nfl-com/sports-league-data/standings.
 * AZ stored as ARI, LAR as LA.
 */
export const NFL_STANDINGS_W4 = { season: 2026, week: 4, observedAt: "2026-10-01T20:39:11Z" } as const;

export const NFL_HOME_ROAD: Readonly<Record<string, { homeWins: number; homeLosses: number; homeTies: number; roadWins: number; roadLosses: number; roadTies: number }>> = {
  ARI: { homeWins: 0, homeLosses: 1, homeTies: 0, roadWins: 1, roadLosses: 1, roadTies: 0 },
  ATL: { homeWins: 0, homeLosses: 1, homeTies: 0, roadWins: 1, roadLosses: 1, roadTies: 0 },
  BAL: { homeWins: 0, homeLosses: 1, homeTies: 0, roadWins: 2, roadLosses: 0, roadTies: 0 },
  BUF: { homeWins: 2, homeLosses: 0, homeTies: 0, roadWins: 1, roadLosses: 0, roadTies: 0 },
  CAR: { homeWins: 0, homeLosses: 1, homeTies: 0, roadWins: 1, roadLosses: 1, roadTies: 0 },
  CHI: { homeWins: 1, homeLosses: 1, homeTies: 0, roadWins: 1, roadLosses: 0, roadTies: 0 },
  CIN: { homeWins: 1, homeLosses: 0, homeTies: 0, roadWins: 1, roadLosses: 1, roadTies: 0 },
  CLE: { homeWins: 1, homeLosses: 0, homeTies: 0, roadWins: 1, roadLosses: 1, roadTies: 0 },
  DAL: { homeWins: 1, homeLosses: 1, homeTies: 0, roadWins: 0, roadLosses: 1, roadTies: 0 },
  DEN: { homeWins: 2, homeLosses: 0, homeTies: 0, roadWins: 0, roadLosses: 1, roadTies: 0 },
  DET: { homeWins: 2, homeLosses: 0, homeTies: 0, roadWins: 0, roadLosses: 1, roadTies: 0 },
  GB: { homeWins: 0, homeLosses: 1, homeTies: 0, roadWins: 1, roadLosses: 1, roadTies: 0 },
  HOU: { homeWins: 0, homeLosses: 2, homeTies: 0, roadWins: 0, roadLosses: 1, roadTies: 0 },
  IND: { homeWins: 1, homeLosses: 1, homeTies: 0, roadWins: 0, roadLosses: 1, roadTies: 0 },
  JAX: { homeWins: 2, homeLosses: 0, homeTies: 0, roadWins: 0, roadLosses: 1, roadTies: 0 },
  KC: { homeWins: 2, homeLosses: 0, homeTies: 0, roadWins: 1, roadLosses: 0, roadTies: 0 },
  LA: { homeWins: 1, homeLosses: 1, homeTies: 0, roadWins: 0, roadLosses: 1, roadTies: 0 },
  LAC: { homeWins: 0, homeLosses: 2, homeTies: 0, roadWins: 0, roadLosses: 1, roadTies: 0 },
  LV: { homeWins: 1, homeLosses: 0, homeTies: 0, roadWins: 2, roadLosses: 0, roadTies: 0 },
  MIA: { homeWins: 0, homeLosses: 1, homeTies: 0, roadWins: 0, roadLosses: 2, roadTies: 0 },
  MIN: { homeWins: 1, homeLosses: 0, homeTies: 0, roadWins: 2, roadLosses: 0, roadTies: 0 },
  NE: { homeWins: 1, homeLosses: 0, homeTies: 0, roadWins: 0, roadLosses: 2, roadTies: 0 },
  NO: { homeWins: 0, homeLosses: 1, homeTies: 0, roadWins: 1, roadLosses: 1, roadTies: 0 },
  NYG: { homeWins: 2, homeLosses: 0, homeTies: 0, roadWins: 0, roadLosses: 1, roadTies: 0 },
  NYJ: { homeWins: 0, homeLosses: 1, homeTies: 0, roadWins: 1, roadLosses: 1, roadTies: 0 },
  PHI: { homeWins: 1, homeLosses: 0, homeTies: 0, roadWins: 1, roadLosses: 1, roadTies: 0 },
  PIT: { homeWins: 2, homeLosses: 0, homeTies: 0, roadWins: 0, roadLosses: 1, roadTies: 0 },
  SEA: { homeWins: 1, homeLosses: 0, homeTies: 0, roadWins: 1, roadLosses: 1, roadTies: 0 },
  SF: { homeWins: 2, homeLosses: 0, homeTies: 0, roadWins: 1, roadLosses: 0, roadTies: 0 },
  TB: { homeWins: 0, homeLosses: 2, homeTies: 0, roadWins: 0, roadLosses: 1, roadTies: 0 },
  TEN: { homeWins: 0, homeLosses: 2, homeTies: 0, roadWins: 0, roadLosses: 1, roadTies: 0 },
  WAS: { homeWins: 1, homeLosses: 0, homeTies: 0, roadWins: 0, roadLosses: 2, roadTies: 0 },
};

