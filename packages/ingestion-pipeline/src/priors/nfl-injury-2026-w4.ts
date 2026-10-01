/**
 * Official NFL injury and practice report, 2026 REG week 4.
 * Source: nfl.com via Firecrawl Alexandria nfl-com/sports-league-data/injury_report.
 * Observed 2026-10-01T20:21:46Z. NFL.com spells Arizona as AZ.
 * A club absent from the report is not zero. Do not treat absence as healthy.
 */
export const NFL_INJURY_REPORT = {
  season: 2026,
  week: 4,
  seasonType: "REG" as const,
  observedAt: "2026-10-01T20:21:46.194Z",
  sourceUrl: "https://www.nfl.com/injuries/league/2026/reg4",
} as const;

export const NFL_INJURY_BY_TEAM: Readonly<Record<string, { dnp: number; limited: number; out: number; questionable: number; dnpSkill: number; outSkill: number }>> = {
  AZ: { dnp: 4, limited: 4, out: 0, questionable: 0, dnpSkill: 1, outSkill: 0 },
  BAL: { dnp: 4, limited: 7, out: 0, questionable: 0, dnpSkill: 2, outSkill: 0 },
  BUF: { dnp: 4, limited: 3, out: 0, questionable: 0, dnpSkill: 1, outSkill: 0 },
  CAR: { dnp: 7, limited: 0, out: 0, questionable: 0, dnpSkill: 6, outSkill: 0 },
  CHI: { dnp: 5, limited: 3, out: 0, questionable: 0, dnpSkill: 4, outSkill: 0 },
  CIN: { dnp: 4, limited: 2, out: 0, questionable: 0, dnpSkill: 2, outSkill: 0 },
  CLE: { dnp: 2, limited: 1, out: 3, questionable: 0, dnpSkill: 2, outSkill: 3 },
  DAL: { dnp: 3, limited: 1, out: 0, questionable: 0, dnpSkill: 0, outSkill: 0 },
  DEN: { dnp: 1, limited: 1, out: 0, questionable: 0, dnpSkill: 0, outSkill: 0 },
  DET: { dnp: 2, limited: 1, out: 0, questionable: 0, dnpSkill: 1, outSkill: 0 },
  GB: { dnp: 4, limited: 3, out: 0, questionable: 0, dnpSkill: 2, outSkill: 0 },
  HOU: { dnp: 3, limited: 9, out: 0, questionable: 0, dnpSkill: 2, outSkill: 0 },
  IND: { dnp: 2, limited: 1, out: 0, questionable: 0, dnpSkill: 1, outSkill: 0 },
  JAX: { dnp: 0, limited: 7, out: 0, questionable: 0, dnpSkill: 0, outSkill: 0 },
  KC: { dnp: 1, limited: 1, out: 0, questionable: 0, dnpSkill: 1, outSkill: 0 },
  LA: { dnp: 5, limited: 4, out: 0, questionable: 0, dnpSkill: 3, outSkill: 0 },
  LAC: { dnp: 7, limited: 5, out: 0, questionable: 0, dnpSkill: 3, outSkill: 0 },
  LV: { dnp: 2, limited: 0, out: 0, questionable: 0, dnpSkill: 2, outSkill: 0 },
  MIA: { dnp: 2, limited: 4, out: 0, questionable: 0, dnpSkill: 1, outSkill: 0 },
  MIN: { dnp: 3, limited: 2, out: 0, questionable: 0, dnpSkill: 1, outSkill: 0 },
  NE: { dnp: 3, limited: 6, out: 0, questionable: 0, dnpSkill: 1, outSkill: 0 },
  NYG: { dnp: 2, limited: 2, out: 0, questionable: 0, dnpSkill: 2, outSkill: 0 },
  NYJ: { dnp: 5, limited: 4, out: 0, questionable: 0, dnpSkill: 4, outSkill: 0 },
  PHI: { dnp: 6, limited: 3, out: 0, questionable: 0, dnpSkill: 5, outSkill: 0 },
  PIT: { dnp: 1, limited: 3, out: 2, questionable: 2, dnpSkill: 1, outSkill: 1 },
  SEA: { dnp: 1, limited: 6, out: 0, questionable: 0, dnpSkill: 0, outSkill: 0 },
  SF: { dnp: 8, limited: 2, out: 0, questionable: 0, dnpSkill: 4, outSkill: 0 },
  TB: { dnp: 7, limited: 4, out: 0, questionable: 0, dnpSkill: 3, outSkill: 0 },
  TEN: { dnp: 0, limited: 2, out: 0, questionable: 0, dnpSkill: 0, outSkill: 0 },
  WAS: { dnp: 3, limited: 10, out: 2, questionable: 0, dnpSkill: 2, outSkill: 1 },
};

/** NFL.com abbreviation to the GSE abbreviation used everywhere else. */
export const NFL_COM_TO_GSE: Readonly<Record<string, string>> = { AZ: "ARI" };
