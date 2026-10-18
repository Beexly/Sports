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

// Case-insensitive lookup keyed by alphanumeric-compacted, lowercased alias —
// so "kansas city", "KANSAS CITY", "KansasCity", and "KC" all resolve to "KC".
const COMPACT_ALIAS_LOOKUP: Record<string, string> = Object.fromEntries(
  Object.entries(NFL_TEAM_ALIASES).map(([key, value]) => [
    key.replace(/[^A-Za-z0-9]/g, "").toLowerCase(),
    value,
  ]),
);

export function normalizeTeamAlias(input: string): string | null {
  const compact = input.replace(/[^A-Za-z0-9]/g, "").toLowerCase();
  return COMPACT_ALIAS_LOOKUP[compact] ?? null;
}

/**
 * Resolve any of the NFL team spellings we actually see in our own rows —
 * "ARI", "Arizona", "Cardinals", and the full "Arizona Cardinals" that
 * `games.homeTeamName` / `games.awayTeamName` carry — to the canonical
 * abbreviation used by the ingestion tables (`depth_chart_entries.team`,
 * `snap_counts.team`, nflverse `club_code`).
 *
 * The alias table is the single source of truth (never a second 32-team
 * switch). Full names are matched on their two halves: the city ("Arizona")
 * and the nickname ("Cardinals") are each independently a valid alias, so
 * "Arizona Cardinals" resolves without a 32-entry full-name duplicate. The
 * whole string is tried first so a genuine multi-word alias always wins.
 *
 * Ambiguous nicknames ("Cardinals" exists in both NFL and NCAAF) are only
 * resolved by callers that already know the sport is NFL — this function
 * itself has no sport context and must not be used to disambiguate leagues.
 */
export function resolveNflTeamAbbreviation(input: string | null | undefined): string | null {
  if (!input) return null;
  const direct = normalizeTeamAlias(input);
  if (direct) return direct;
  const words = input.trim().split(/\s+/).filter(Boolean);
  if (words.length < 2) return null;
  return normalizeTeamAlias(words[words.length - 1]!) ?? normalizeTeamAlias(words[0]!);
}
