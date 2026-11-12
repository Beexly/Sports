/**
 * Canonical team codes.
 *
 * The slate pipeline resolved "LA" and "LAR" as different teams, so the Rams
 * were handed Green Bay's or Carolina's coaching staff. Every team string that
 * enters the bundle passes through `canonicalTeamCode` first, and an unknown
 * string throws rather than passing through — a silently unmatched team is how
 * the wrong staff gets attached.
 */

/** Canonical NFL codes. */
export const NFL_TEAM_CODES = [
  "ARI", "ATL", "BAL", "BUF", "CAR", "CHI", "CIN", "CLE",
  "DAL", "DEN", "DET", "GB", "HOU", "IND", "JAX", "KC",
  "LAC", "LAR", "LV", "MIA", "MIN", "NE", "NO", "NYG",
  "NYJ", "PHI", "PIT", "SEA", "SF", "TB", "TEN", "WSH",
] as const;

export type NflTeamCode = (typeof NFL_TEAM_CODES)[number];

const NFL_SET: ReadonlySet<string> = new Set(NFL_TEAM_CODES);

/** Nickname -> canonical code. Nicknames are unique; city names are not. */
const NICKNAMES: Readonly<Record<string, NflTeamCode>> = {
  cardinals: "ARI",
  falcons: "ATL",
  ravens: "BAL",
  bills: "BUF",
  panthers: "CAR",
  bears: "CHI",
  bengals: "CIN",
  browns: "CLE",
  cowboys: "DAL",
  broncos: "DEN",
  lions: "DET",
  packers: "GB",
  texans: "HOU",
  colts: "IND",
  jaguars: "JAX",
  chiefs: "KC",
  chargers: "LAC",
  rams: "LAR",
  raiders: "LV",
  dolphins: "MIA",
  vikings: "MIN",
  patriots: "NE",
  saints: "NO",
  giants: "NYG",
  jets: "NYJ",
  eagles: "PHI",
  steelers: "PIT",
  seahawks: "SEA",
  "49ers": "SF",
  niners: "SF",
  buccaneers: "TB",
  bucs: "TB",
  titans: "TEN",
  commanders: "WSH",
  redskins: "WSH",
  footballteam: "WSH",
};

/** Feed-specific abbreviations that are not the canonical code. */
const ABBREVIATION_ALIASES: Readonly<Record<string, NflTeamCode>> = {
  LA: "LAR",
  STL: "LAR",
  SL: "LAR",
  SD: "LAC",
  SDG: "LAC",
  OAK: "LV",
  LVR: "LV",
  WAS: "WSH",
  WSH: "WSH",
  JAC: "JAX",
  JAG: "JAX",
  SFO: "SF",
  SF: "SF",
  TAM: "TB",
  TBB: "TB",
  NEP: "NE",
  NWE: "NE",
  NOS: "NO",
  NOR: "NO",
  GBP: "GB",
  GNB: "GB",
  KCC: "KC",
  KAN: "KC",
  LAC: "LAC",
  LAR: "LAR",
  ARZ: "ARI",
  ARI: "ARI",
  BLT: "BAL",
  BAL: "BAL",
  CLV: "CLE",
  CLE: "CLE",
  HST: "HOU",
  HOU: "HOU",
  CLT: "IND",
  IND: "IND",
  OTI: "TEN",
  TEN: "TEN",
  CHI: "CHI",
  CIN: "CIN",
  DAL: "DAL",
  DEN: "DEN",
  DET: "DET",
  MIA: "MIA",
  MIN: "MIN",
  NYG: "NYG",
  NYJ: "NYJ",
  PHI: "PHI",
  PIT: "PIT",
  SEA: "SEA",
  ATL: "ATL",
  BUF: "BUF",
  CAR: "CAR",
  JAX: "JAX",
  LV: "LV",
};

export class UnknownTeamError extends Error {
  readonly input: string;
  constructor(input: string) {
    super(`Unknown team: "${input}" — refusing to guess a canonical code`);
    this.name = "UnknownTeamError";
    this.input = input;
  }
}

/**
 * Resolve any team string a feed might hand us to a canonical NFL code.
 * Throws on anything unrecognised. Never returns the input unchanged.
 */
export function canonicalTeamCode(input: string): NflTeamCode {
  const raw = input.trim();
  if (raw.length === 0) throw new UnknownTeamError(input);

  const upper = raw.toUpperCase().replace(/[.\s]+/g, "");
  if (NFL_SET.has(upper)) return upper as NflTeamCode;
  const alias = ABBREVIATION_ALIASES[upper];
  if (alias !== undefined) return alias;

  // Full name: match on the nickname, which is unique. "Los Angeles Rams" and
  // "Los Angeles Chargers" both start with the city, so the city is useless.
  const words = raw.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean);
  for (let i = words.length - 1; i >= 0; i -= 1) {
    const word = words[i];
    if (word === undefined) continue;
    const hit = NICKNAMES[word];
    if (hit !== undefined) return hit;
  }

  throw new UnknownTeamError(input);
}

/** Non-throwing variant for callers that want to report rather than fail. */
export function tryCanonicalTeamCode(input: string): NflTeamCode | null {
  try {
    return canonicalTeamCode(input);
  } catch {
    return null;
  }
}

/** True when both strings resolve to the same canonical code. */
export function sameTeam(a: string, b: string): boolean {
  return canonicalTeamCode(a) === canonicalTeamCode(b);
}
