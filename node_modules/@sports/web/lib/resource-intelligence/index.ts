/**
 * Resource Intelligence — public surface.
 *
 * Turns the raw "Garrett resource dump" into a normalized, rights-gated ledger
 * and the owner cockpit decision feed. Piracy/evasion is hard-quarantined;
 * sports-data/scraping/ingestion is routed to owner-review behind the existing
 * source-provider + clearance gates.
 */

export * from "./types";
export { parseDump, splitNames } from "./parse";
export { classifyEntry, classifyResource, normalizeName, stableId } from "./classify";
export type { Classification } from "./classify";
export {
  buildLedger,
  implementNowQueue,
  ownerReviewQueue,
  quarantineQueue,
  findGatedLeaks,
} from "./pipeline";
export type { BuildLedgerOptions } from "./pipeline";
export {
  buildCockpitSummary,
  getResourceCockpitFeed,
} from "./cockpit";
export type {
  ResourceCockpitSummary,
  ResourceCockpitFeed,
  TopSafeItem,
} from "./cockpit";
