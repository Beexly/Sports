export const SNAPSHOT = "Week 8 · October 30, 2026 · source-locked";

export type PickData = {
  id: string;
  league: "NFL";
  matchup: string;
  selection: string;
  price: string;
  modelProbability: number;
  marketProbability: number;
  edge: number;
};

export const PICKS: PickData[] = [
  {
    id: "chi-sea-ml",
    league: "NFL",
    matchup: "CHI @ SEA",
    selection: "CHI ML",
    price: "+142",
    modelProbability: 63.56,
    marketProbability: 39.62,
    edge: 23.94,
  },
  {
    id: "kc-den-ml",
    league: "NFL",
    matchup: "KC @ DEN",
    selection: "KC ML",
    price: "-118",
    modelProbability: 73.82,
    marketProbability: 51.74,
    edge: 22.08,
  },
  {
    id: "lv-nyj-ml",
    league: "NFL",
    matchup: "LV @ NYJ",
    selection: "NYJ ML",
    price: "-122",
    modelProbability: 72.28,
    marketProbability: 52.61,
    edge: 19.67,
  },
];

export type LineupRow = {
  slot: "QB" | "RB" | "WR" | "TE" | "FLEX" | "DST";
  name: string;
  team: string;
  salary: number;
};

export const LINEUP: LineupRow[] = [
  { slot: "QB", name: "Caleb Williams", team: "CHI", salary: 6100 },
  { slot: "RB", name: "James Cook III", team: "BUF", salary: 7900 },
  { slot: "RB", name: "Jonah Coleman", team: "DEN", salary: 4300 },
  { slot: "WR", name: "Jaxon Smith-Njigba", team: "SEA", salary: 9100 },
  { slot: "WR", name: "Zay Flowers", team: "BAL", salary: 7200 },
  { slot: "WR", name: "Rome Odunze", team: "CHI", salary: 4600 },
  { slot: "TE", name: "Dallas Goedert", team: "PHI", salary: 4700 },
  { slot: "FLEX", name: "Kalif Raymond", team: "CHI", salary: 3600 },
  { slot: "DST", name: "Falcons", team: "ATL", salary: 2500 },
];

export function salaryTotal(rows: LineupRow[]): number {
  return rows.reduce((total, row) => total + row.salary, 0);
}

export const CFB_HOLD = {
  evaluated: 47,
  published: 0,
  reason: "The college JEV spine and active injury reallocation tables are not wired. Every game stays held.",
};

export const ROSTER_IDENTITIES = {
  mikeEvans: { name: "Mike Evans", team: "SF", position: "WR" },
  genoSmith: { name: "Geno Smith", team: "NYJ", position: "QB" },
} as const;

export const DATA_PROVENANCE =
  "Source: user-supplied Halloween CFB & NFL.docx, Week 8 engine report dated October 30, 2026. Historical snapshot; not a live board.";
