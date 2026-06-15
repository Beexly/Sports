export const NFL_TEAM_ALIASES: Record<string, string> = {
  ARI: "ARI", ARZ: "ARI", Arizona: "ARI", Cardinals: "ARI",
  ATL: "ATL", Atlanta: "ATL", Falcons: "ATL",
  BAL: "BAL", Baltimore: "BAL", Ravens: "BAL",
  BUF: "BUF", Buffalo: "BUF", Bills: "BUF",
  CAR: "CAR", Carolina: "CAR", Panthers: "CAR",
  CHI: "CHI", Chicago: "CHI", Bears: "CHI",
  CIN: "CIN", Cincinnati: "CIN", Bengals: "CIN",
  CLE: "CLE", Cleveland: "CLE", Browns: "CLE",
  DAL: "DAL", Dallas: "DAL", Cowboys: "DAL",
  DEN: "DEN", Denver: "DEN", Broncos: "DEN",
  DET: "DET", Detroit: "DET", Lions: "DET",
  GB: "GB", GNB: "GB", GreenBay: "GB", Packers: "GB",
  HOU: "HOU", Houston: "HOU", Texans: "HOU",
  IND: "IND", Indianapolis: "IND", Colts: "IND",
  JAX: "JAX", JAC: "JAX", Jacksonville: "JAX", Jaguars: "JAX",
  KC: "KC", KAN: "KC", KansasCity: "KC", Chiefs: "KC",
  LV: "LV", LVR: "LV", OAK: "LV", Raiders: "LV",
  LAC: "LAC", Chargers: "LAC",
  LA: "LA", LAR: "LA", Rams: "LA",
  MIA: "MIA", Miami: "MIA", Dolphins: "MIA",
  MIN: "MIN", Minnesota: "MIN", Vikings: "MIN",
  NE: "NE", NEP: "NE", NewEngland: "NE", Patriots: "NE",
  NO: "NO", NOR: "NO", NewOrleans: "NO", Saints: "NO",
  NYG: "NYG", Giants: "NYG",
  NYJ: "NYJ", Jets: "NYJ",
  PHI: "PHI", Philadelphia: "PHI", Eagles: "PHI",
  PIT: "PIT", Pittsburgh: "PIT", Steelers: "PIT",
  SEA: "SEA", Seattle: "SEA", Seahawks: "SEA",
  SF: "SF", SFO: "SF", SanFrancisco: "SF", "49ers": "SF",
  TB: "TB", TAM: "TB", TampaBay: "TB", Buccaneers: "TB",
  TEN: "TEN", Tennessee: "TEN", Titans: "TEN",
  WAS: "WAS", WSH: "WAS", Washington: "WAS", Commanders: "WAS",
};

export function normalizeTeamAlias(input: string): string | null {
  const compact = input.replace(/[^A-Za-z0-9]/g, "");
  return NFL_TEAM_ALIASES[input] ?? NFL_TEAM_ALIASES[compact] ?? NFL_TEAM_ALIASES[input.toUpperCase()] ?? null;
}
