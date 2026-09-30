/**
 * NFL full-name -> 2-3 character team abbreviation.
 *
 * WHY THIS IS ITS OWN MODULE
 * `team_game_efficiency.team` is TEXT holding an abbreviation ('LA', 'NYG',
 * 'GB'), while `games.homeTeamName` / `awayTeamName` is TEXT holding a full
 * name ('Los Angeles Rams'). There is no relational path between them:
 * `games.homeTeamId` is NULL on every row and the `teams` table is empty, so
 * every SQL-level join returns zero rows. The only correct join is in the
 * application layer, and that join needs exactly one name map.
 *
 * That map used to live inline inside `tryNflEpaFairValue` in
 * build-independent-fair-values.ts. It is extracted here — unchanged — so the
 * fair-value path and the observation-engine loaders share one source. A
 * second copy would drift, and a drifted abbreviation silently returns zero
 * rows rather than failing loudly.
 *
 * This is the GSE spelling, which is NOT the Kalshi spelling: the Kalshi map
 * in kalshi-team-abbr.ts resolves the Rams to 'LAR' because that is the Kalshi
 * ticker, while GSE stores 'LA'. Do not merge the two.
 */

/** The 32 NFL clubs, full name (lower case) -> GSE abbreviation. */
export const NFL_NAME_TO_ABBR: Readonly<Record<string, string>> = {
  "arizona cardinals": "ARI",
  "atlanta falcons": "ATL",
  "baltimore ravens": "BAL",
  "buffalo bills": "BUF",
  "carolina panthers": "CAR",
  "chicago bears": "CHI",
  "cincinnati bengals": "CIN",
  "cleveland browns": "CLE",
  "dallas cowboys": "DAL",
  "denver broncos": "DEN",
  "detroit lions": "DET",
  "green bay packers": "GB",
  "houston texans": "HOU",
  "indianapolis colts": "IND",
  "jacksonville jaguars": "JAX",
  "kansas city chiefs": "KC",
  "las vegas raiders": "LV",
  "los angeles chargers": "LAC",
  "los angeles rams": "LA",
  "miami dolphins": "MIA",
  "minnesota vikings": "MIN",
  "new england patriots": "NE",
  "new orleans saints": "NO",
  "new york giants": "NYG",
  "new york jets": "NYJ",
  "philadelphia eagles": "PHI",
  "pittsburgh steelers": "PIT",
  "san francisco 49ers": "SF",
  "seattle seahawks": "SEA",
  "tampa bay buccaneers": "TB",
  "tennessee titans": "TEN",
  "washington commanders": "WAS",
};

/**
 * Resolve a full team name to its GSE abbreviation.
 *
 * Returns null — never a guess — for placeholder names ('TBD', empty, null)
 * and for anything outside the 32-club map. A caller that receives null must
 * skip that surface rather than substitute a default: a wrong abbreviation
 * returns another real team's rows, which is worse than returning none.
 *
 * Pass-through: a name that is already an abbreviation is returned upper-cased
 * only when it is a key of the map's value set.
 */
export function nflTeamAbbr(name: string | null | undefined): string | null {
  const trimmed = (name ?? "").trim();
  if (trimmed === "") return null;
  const lower = trimmed.toLowerCase();
  const direct = NFL_NAME_TO_ABBR[lower];
  if (direct) return direct;
  const upper = trimmed.toUpperCase();
  for (const abbr of Object.values(NFL_NAME_TO_ABBR)) {
    if (abbr === upper) return abbr;
  }
  return null;
}

/** True when the name is a placeholder that must never be joined on. */
export function isPlaceholderTeamName(name: string | null | undefined): boolean {
  const t = (name ?? "").trim().toUpperCase();
  return t === "" || t === "TBD" || t === "TBA" || t === "N/A";
}