/**
 * PROVIDER CLASSIFICATIONS (Addendum III) — the Provider Trial Court's verdict on the providers this
 * batch introduced, framed by ROLE, not just cost.
 *
 * The hard rules: a public-observer source can never settle; a discovery list can never go LIVE
 * directly; a sportsbook execution API is DO_NOT_USE_FOR_EXECUTION; every provider needs a fact-supply
 * path before LIVE and a rights review before public display. SerpApi Google Sports is a Public Observer,
 * not official truth. Pure + deterministic.
 */

export type ProviderRole =
  | "PUBLIC_OBSERVER"
  | "ENTITY_DISCOVERY"
  | "LATENCY_DISCOVERY"
  | "CORE_FEED_CANDIDATE"
  | "ODDS_PROPS_CANDIDATE"
  | "OFFICIAL_CANDIDATE"
  | "WEATHER"
  | "DISCOVERY_SOURCE_ONLY"
  | "EXECUTION_GATED";

export type ProviderStatus = "TRIAL_REQUIRED" | "DISCOVERY_ONLY" | "DO_NOT_USE_FOR_EXECUTION" | "CANDIDATE";

export interface ProviderClassification {
  readonly providerId: string;
  readonly roles: readonly ProviderRole[];
  readonly status: ProviderStatus;
  /** Can this provider's data be promoted to a LIVE production source (after a trial)? */
  readonly canBeLive: boolean;
  /** Can it settle an event by itself? (Only official/licensed sources can.) */
  readonly canSettle: boolean;
  /** Can it place bets / execute trades? (Always false — execution is owner+legal gated elsewhere.) */
  readonly canExecute: boolean;
  /** A provider may not go LIVE without a declared fact-supply path. */
  readonly requiresFactSupplyPath: boolean;
  /** A provider may not be displayed publicly without a rights review. */
  readonly requiresRightsReview: boolean;
  readonly authorityCeiling: "INFO_ONLY" | "WATCH" | "ACTION" | "PUBLIC_ACTION";
  readonly note: string;
}

function obs(providerId: string, note: string): ProviderClassification {
  return { providerId, roles: ["PUBLIC_OBSERVER", "ENTITY_DISCOVERY", "LATENCY_DISCOVERY"], status: "TRIAL_REQUIRED", canBeLive: false, canSettle: false, canExecute: false, requiresFactSupplyPath: true, requiresRightsReview: true, authorityCeiling: "WATCH", note };
}
function feed(providerId: string, note: string, roles: ProviderRole[] = ["CORE_FEED_CANDIDATE"]): ProviderClassification {
  return { providerId, roles, status: "TRIAL_REQUIRED", canBeLive: true, canSettle: false, canExecute: false, requiresFactSupplyPath: true, requiresRightsReview: true, authorityCeiling: "ACTION", note };
}
function discoveryOnly(providerId: string, note: string): ProviderClassification {
  return { providerId, roles: ["DISCOVERY_SOURCE_ONLY"], status: "DISCOVERY_ONLY", canBeLive: false, canSettle: false, canExecute: false, requiresFactSupplyPath: true, requiresRightsReview: true, authorityCeiling: "INFO_ONLY", note };
}
function executionGated(providerId: string, note: string): ProviderClassification {
  return { providerId, roles: ["EXECUTION_GATED"], status: "DO_NOT_USE_FOR_EXECUTION", canBeLive: false, canSettle: false, canExecute: false, requiresFactSupplyPath: true, requiresRightsReview: true, authorityCeiling: "INFO_ONLY", note };
}

export const PROVIDER_CLASSIFICATIONS: readonly ProviderClassification[] = [
  obs("SERPAPI_GOOGLE_SPORTS", "Public observer / entity discovery / latency. Not official truth; cannot settle."),
  discoveryOnly("PUBLIC_API_LISTS", "Discovery source only — finds candidates; proves nothing for production."),
  discoveryOnly("PUBLIC_APIS", "Discovery source only — awesome-list style; never LIVE directly."),
  feed("BALLDONTLIE", "Core feed candidate (NBA/MLB). Bakeoff required."),
  feed("MYSPORTSFEEDS", "Core feed candidate (multi-sport). Bakeoff required."),
  feed("API_FOOTBALL", "Core feed candidate (soccer). Trial required."),
  feed("CFL_OFFICIAL_API", "High-value CFL candidate. Terms + endpoint trial required.", ["OFFICIAL_CANDIDATE", "CORE_FEED_CANDIDATE"]),
  feed("COLLEGEFOOTBALLDATA", "CFB candidate. Trial required."),
  feed("THE_ODDS_API", "Licensed odds feed (in use). Authority via market lifecycle.", ["ODDS_PROPS_CANDIDATE"]),
  feed("SPORTSGAMEODDS", "Odds candidate. Trial required.", ["ODDS_PROPS_CANDIDATE"]),
  feed("SLEEPER", "Fantasy platform candidate. Trial required."),
  feed("THE_RUNDOWN", "Odds/props candidate. Trial required.", ["ODDS_PROPS_CANDIDATE"]),
  feed("PROPLINE", "Props candidate. Trial required.", ["ODDS_PROPS_CANDIDATE"]),
  feed("ODDSMAGNET", "Odds-comparison candidate. Trial required.", ["ODDS_PROPS_CANDIDATE"]),
  feed("SPORTMONKS_FOOTBALL", "Soccer candidate. Trial required."),
  feed("SPORTMONKS_CRICKET", "Cricket candidate. Trial required."),
  feed("SPORTSCORE", "Multi-sport candidate. Trial required."),
  feed("THESPORTSDB", "Open-ish multi-sport candidate. Rights + trial required."),
  feed("OPENF1", "F1 candidate. Trial required."),
  { providerId: "NWS", roles: ["WEATHER"], status: "CANDIDATE", canBeLive: true, canSettle: false, canExecute: false, requiresFactSupplyPath: true, requiresRightsReview: false, authorityCeiling: "ACTION", note: "US weather (public domain). Context feed; never settles a game." },
  executionGated("CLOUDBET", "Sportsbook execution API — DO_NOT_USE_FOR_EXECUTION without legal + owner approval."),
];

export function getProviderClassification(providerId: string): ProviderClassification | null {
  return PROVIDER_CLASSIFICATIONS.find((p) => p.providerId === providerId) ?? null;
}


/** Validate the registry's invariants. Returns problems; empty = OK. */
export function validateProviderClassifications(list: readonly ProviderClassification[] = PROVIDER_CLASSIFICATIONS): { ok: boolean; problems: readonly string[] } {
  const problems: string[] = [];
  for (const p of list) {
    if (p.roles.includes("PUBLIC_OBSERVER") && p.canSettle) problems.push(`${p.providerId}: a public observer cannot settle`);
    if (p.status === "DISCOVERY_ONLY" && p.canBeLive) problems.push(`${p.providerId}: a discovery-only source cannot be LIVE`);
    if (p.roles.includes("EXECUTION_GATED") && p.status !== "DO_NOT_USE_FOR_EXECUTION") problems.push(`${p.providerId}: execution sources must be DO_NOT_USE_FOR_EXECUTION`);
    if (p.canExecute) problems.push(`${p.providerId}: no provider may execute bets/trades`);
    if (p.canBeLive && !p.requiresFactSupplyPath) problems.push(`${p.providerId}: a LIVE-capable provider must require a fact-supply path`);
  }
  return { ok: problems.length === 0, problems };
}
