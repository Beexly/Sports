/**
 * ESPN NFL scoreboard, 2026 regular-season week 4, all 16 games still scheduled.
 * Source: Firecrawl Alexandria espn-com/sports-data/scoreboard.
 * Observed 2026-10-01T20:23:19Z. Records are the entering record, scores were null.
 * WSH is stored as WAS and LAR as LA, matching the GSE abbreviation map.
 */
export const ESPN_NFL_WEEK4 = {
  season: 2026,
  week: 4,
  observedAt: "2026-10-01T20:23:19.863Z",
} as const;

export const ESPN_ENTERING_RECORD: Readonly<Record<string, { wins: number; losses: number; ties: number; winPct: number | null }>> = {
  ARI: { wins: 1, losses: 2, ties: 0, winPct: 0.3333 },
  ATL: { wins: 1, losses: 2, ties: 0, winPct: 0.3333 },
  BAL: { wins: 2, losses: 1, ties: 0, winPct: 0.6667 },
  BUF: { wins: 3, losses: 0, ties: 0, winPct: 1.0 },
  CAR: { wins: 1, losses: 2, ties: 0, winPct: 0.3333 },
  CHI: { wins: 2, losses: 1, ties: 0, winPct: 0.6667 },
  CIN: { wins: 2, losses: 1, ties: 0, winPct: 0.6667 },
  CLE: { wins: 2, losses: 1, ties: 0, winPct: 0.6667 },
  DAL: { wins: 1, losses: 2, ties: 0, winPct: 0.3333 },
  DEN: { wins: 2, losses: 1, ties: 0, winPct: 0.6667 },
  DET: { wins: 2, losses: 1, ties: 0, winPct: 0.6667 },
  GB: { wins: 1, losses: 2, ties: 0, winPct: 0.3333 },
  HOU: { wins: 0, losses: 3, ties: 0, winPct: 0.0 },
  IND: { wins: 1, losses: 2, ties: 0, winPct: 0.3333 },
  JAX: { wins: 2, losses: 1, ties: 0, winPct: 0.6667 },
  KC: { wins: 3, losses: 0, ties: 0, winPct: 1.0 },
  LA: { wins: 1, losses: 2, ties: 0, winPct: 0.3333 },
  LAC: { wins: 0, losses: 3, ties: 0, winPct: 0.0 },
  LV: { wins: 3, losses: 0, ties: 0, winPct: 1.0 },
  MIA: { wins: 0, losses: 3, ties: 0, winPct: 0.0 },
  MIN: { wins: 3, losses: 0, ties: 0, winPct: 1.0 },
  NE: { wins: 1, losses: 2, ties: 0, winPct: 0.3333 },
  NO: { wins: 1, losses: 2, ties: 0, winPct: 0.3333 },
  NYG: { wins: 2, losses: 1, ties: 0, winPct: 0.6667 },
  NYJ: { wins: 1, losses: 2, ties: 0, winPct: 0.3333 },
  PHI: { wins: 2, losses: 1, ties: 0, winPct: 0.6667 },
  PIT: { wins: 2, losses: 1, ties: 0, winPct: 0.6667 },
  SEA: { wins: 2, losses: 1, ties: 0, winPct: 0.6667 },
  SF: { wins: 3, losses: 0, ties: 0, winPct: 1.0 },
  TB: { wins: 0, losses: 3, ties: 0, winPct: 0.0 },
  TEN: { wins: 0, losses: 3, ties: 0, winPct: 0.0 },
  WAS: { wins: 1, losses: 2, ties: 0, winPct: 0.3333 },
};

export const ESPN_NEUTRAL_SITE_PAIRS: readonly (readonly [string, string])[] = [
  ["IND", "WAS"],
];
