/**
 * Telemetry surface taxonomy.
 *
 * Every surface the product can emit telemetry from is enumerated here.
 * Adding a route to the catalog without adding it here means events from
 * that surface will be rejected by the registry — by design.
 */

export const TELEMETRY_SURFACES = [
  "home",
  "today",
  "board",
  "picks",
  "no-bet",
  "autopsy",
  "parlay-mri",
  "market-mirage",
  "market-gravity",
  "roster-shock",
  "coaching-edge",
  "profile",
  "brain",
  "rumor-radar",
  "fantasy",
  "intelligence",
  "intelligence-glossary",
  "intelligence-how-it-works",
  "intelligence-calibration",
  "intelligence-source-hierarchy",
  "methodology",
  "academy",
  "performance",
  "observatory",
  "orbit",
  "ledger",
  "vault",
  "alerts",
  "tracker",
  "command",
  "briefing",
  "brief",
  "developer",
  "pricing",
  "responsible-play",
  "press",
  "about",
  "faq",
  "blog",
  "journal",
  "reports",
  "leaderboard",
  "props",
  "nfl",
  "nba",
  "mlb",
  "vs-tout-services",
  "auth-signin",
  "changelog",
] as const;

export type TelemetrySurfaceId = (typeof TELEMETRY_SURFACES)[number];

const SURFACE_SET: ReadonlySet<string> = new Set(TELEMETRY_SURFACES);

export function isKnownSurface(id: string): id is TelemetrySurfaceId {
  return SURFACE_SET.has(id);
}

/**
 * Surfaces classified as betting-adjacent.
 * These trigger the restraint layer (see lib/responsible-intelligence).
 */
export const BETTING_ADJACENT_SURFACES: ReadonlySet<TelemetrySurfaceId> = new Set([
  "home",
  "today",
  "board",
  "picks",
  "no-bet",
  "autopsy",
  "parlay-mri",
  "market-mirage",
  "market-gravity",
  "roster-shock",
  "coaching-edge",
  "props",
  "nfl",
  "nba",
  "mlb",
  "tracker",
  "ledger",
  "performance",
  "leaderboard",
]);

/**
 * Surfaces classified as educational.
 * These are explicitly allowed to be more permissive about content depth.
 */
export const EDUCATIONAL_SURFACES: ReadonlySet<TelemetrySurfaceId> = new Set([
  "academy",
  "methodology",
  "intelligence",
  "intelligence-glossary",
  "intelligence-how-it-works",
  "intelligence-calibration",
  "intelligence-source-hierarchy",
  "vault",
  "responsible-play",
  "press",
  "about",
  "faq",
  "blog",
  "developer",
]);
