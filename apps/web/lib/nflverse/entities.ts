/**
 * Canonical NFL entity graph — the one source of truth for team and player
 * identity across every source we ingest. (BUILD-002.)
 *
 * WHY THIS EXISTS: the stack joins data from sources that key entities
 * differently — nflverse uses `LA`/`WSH`/`LV`, PFR advstats use `GNB`/`KAN`/`SFO`,
 * schedules carry relocation history (`OAK`, `SD`, `STL`), and name-only sources
 * (combine, Sleeper) carry no id at all. Before this module, the same alias map
 * was duplicated in `lib/integrations/graded-pool.ts` and `lib/intelligence/matchup.ts`,
 * and the same player-name normalizer was copy-pasted in `dossier.ts` and
 * `offensive-line.ts`. A drift between any two of those silently breaks a join
 * (the accuracy audit's M1/M7). This is the canonical home — every join folds its
 * keys through here so a "WAS" schedule row and a "WSH" defense row collapse to one.
 *
 * PURE + dependency-free (no node/Next imports) so it composes inside BOTH server
 * loaders and client components without tripping the RSC/node-builtin boundary.
 */

export type Conference = "AFC" | "NFC";
export type Division =
  | "AFC East" | "AFC North" | "AFC South" | "AFC West"
  | "NFC East" | "NFC North" | "NFC South" | "NFC West";

export interface TeamEntity {
  /** Canonical nflverse team code (the join key everything folds to). */
  readonly code: string;
  readonly name: string;
  readonly conference: Conference;
  readonly division: Division;
}

// The 32 franchises keyed by canonical nflverse code. `LA` = Rams, `WSH` =
// Washington, `LV` = Raiders, `LAC` = Chargers, `JAX` = Jaguars — matching the
// codes the nflverse loaders already emit, so this never shifts an existing join.
const TEAM_LIST: readonly TeamEntity[] = [
  { code: "BUF", name: "Buffalo Bills", conference: "AFC", division: "AFC East" },
  { code: "MIA", name: "Miami Dolphins", conference: "AFC", division: "AFC East" },
  { code: "NE", name: "New England Patriots", conference: "AFC", division: "AFC East" },
  { code: "NYJ", name: "New York Jets", conference: "AFC", division: "AFC East" },
  { code: "BAL", name: "Baltimore Ravens", conference: "AFC", division: "AFC North" },
  { code: "CIN", name: "Cincinnati Bengals", conference: "AFC", division: "AFC North" },
  { code: "CLE", name: "Cleveland Browns", conference: "AFC", division: "AFC North" },
  { code: "PIT", name: "Pittsburgh Steelers", conference: "AFC", division: "AFC North" },
  { code: "HOU", name: "Houston Texans", conference: "AFC", division: "AFC South" },
  { code: "IND", name: "Indianapolis Colts", conference: "AFC", division: "AFC South" },
  { code: "JAX", name: "Jacksonville Jaguars", conference: "AFC", division: "AFC South" },
  { code: "TEN", name: "Tennessee Titans", conference: "AFC", division: "AFC South" },
  { code: "DEN", name: "Denver Broncos", conference: "AFC", division: "AFC West" },
  { code: "KC", name: "Kansas City Chiefs", conference: "AFC", division: "AFC West" },
  { code: "LV", name: "Las Vegas Raiders", conference: "AFC", division: "AFC West" },
  { code: "LAC", name: "Los Angeles Chargers", conference: "AFC", division: "AFC West" },
  { code: "DAL", name: "Dallas Cowboys", conference: "NFC", division: "NFC East" },
  { code: "NYG", name: "New York Giants", conference: "NFC", division: "NFC East" },
  { code: "PHI", name: "Philadelphia Eagles", conference: "NFC", division: "NFC East" },
  { code: "WSH", name: "Washington Commanders", conference: "NFC", division: "NFC East" },
  { code: "CHI", name: "Chicago Bears", conference: "NFC", division: "NFC North" },
  { code: "DET", name: "Detroit Lions", conference: "NFC", division: "NFC North" },
  { code: "GB", name: "Green Bay Packers", conference: "NFC", division: "NFC North" },
  { code: "MIN", name: "Minnesota Vikings", conference: "NFC", division: "NFC North" },
  { code: "ATL", name: "Atlanta Falcons", conference: "NFC", division: "NFC South" },
  { code: "CAR", name: "Carolina Panthers", conference: "NFC", division: "NFC South" },
  { code: "NO", name: "New Orleans Saints", conference: "NFC", division: "NFC South" },
  { code: "TB", name: "Tampa Bay Buccaneers", conference: "NFC", division: "NFC South" },
  { code: "ARI", name: "Arizona Cardinals", conference: "NFC", division: "NFC West" },
  { code: "LA", name: "Los Angeles Rams", conference: "NFC", division: "NFC West" },
  { code: "SF", name: "San Francisco 49ers", conference: "NFC", division: "NFC West" },
  { code: "SEA", name: "Seattle Seahawks", conference: "NFC", division: "NFC West" },
];

/** Canonical teams keyed by code. */
export const TEAMS: Readonly<Record<string, TeamEntity>> = Object.freeze(
  Object.fromEntries(TEAM_LIST.map((t) => [t.code, t])),
);

/**
 * Variant → canonical code. Three kinds of variant fold here:
 *   • Relocations: OAK→LV, SD→LAC, STL→LA.
 *   • nflverse spelling: LAR→LA, WAS→WSH, JAC→JAX, ARZ→ARI, BLT→BAL, CLV→CLE, HST→HOU.
 *   • PFR advstats 3-letter codes: GNB→GB, KAN→KC, NWE→NE, NOR→NO, SFO→SF, TAM→TB,
 *     LVR→LV, NWE/SFO/etc. — so PFR-keyed joins collapse onto the nflverse code.
 * Canonical codes are intentionally NOT listed (they pass through unchanged).
 */
const TEAM_ALIASES: Readonly<Record<string, string>> = {
  // relocations + nflverse spelling variants (superset of the former duplicated maps)
  OAK: "LV", SD: "LAC", STL: "LA", LAR: "LA",
  WAS: "WSH", JAC: "JAX", ARZ: "ARI", BLT: "BAL", CLV: "CLE", HST: "HOU",
  // PFR advstats 3-letter codes
  GNB: "GB", KAN: "KC", NWE: "NE", NOR: "NO", SFO: "SF", TAM: "TB", LVR: "LV",
  GBP: "GB", SFR: "SF", TBB: "TB", KCC: "KC", NEP: "NE", NOS: "NO",
};

/**
 * Fold any team-code variant onto its canonical nflverse code. Trims + uppercases
 * first; unknown codes pass through uppercased (graceful — never throws, never
 * invents). This is the single normalizer every cross-source team join must use.
 */
export function canonicalTeam(code: string | null | undefined): string {
  const t = (code ?? "").trim().toUpperCase();
  return TEAM_ALIASES[t] ?? t;
}

/** Look up a team's canonical metadata by any variant code (null if unknown). */
export function teamMeta(code: string | null | undefined): TeamEntity | null {
  return TEAMS[canonicalTeam(code)] ?? null;
}

/** True when both codes resolve to the same canonical franchise. */
export function sameTeam(a: string | null | undefined, b: string | null | undefined): boolean {
  const ca = canonicalTeam(a);
  return ca !== "" && ca === canonicalTeam(b);
}

/**
 * Normalize a player name into a stable join key for the name-only / cross-id
 * sources (combine, Sleeper, PFR). Lowercased, accent-stripped, generational
 * suffixes (Jr/Sr/II–V) removed, letters only. This is the canonical version of
 * the normalizer formerly duplicated in dossier.ts and offensive-line.ts.
 *
 * NOTE: deliberately distinct from qb-consensus.normName (a different,
 * widely-used cross-provider QB normalizer) — do not conflate them.
 */
export function normalizePlayerName(name: string | null | undefined): string {
  return (name ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip combining diacritics
    .replace(/\b(jr|sr|ii|iii|iv|v)\b\.?/g, "") // drop generational suffixes
    .replace(/[^a-z]/g, ""); // keep letters only
}
