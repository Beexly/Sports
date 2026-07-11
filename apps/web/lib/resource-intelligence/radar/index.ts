/**
 * R&D Radar — public module surface (Resource Intelligence 2.0).
 *
 * Everything the cockpit page, the admin API, and the tests may touch.
 * Consumers never reach into generated/ directly.
 */

export type {
  RadarWindow,
  RadarPosture,
  RadarRisk,
  RadarSourceKind,
  RepoRadarObservation,
  RadarSnapshot,
  RadarScore,
  AdoptionDossier,
  RadarFeed,
} from "./types";

export { normalizeRepository, normalizePosture, observationId, displayName } from "./normalize";
export {
  isRadarEnabled,
  isLicenseVerified,
  effectiveDisposition,
  whyNotReady,
  mostRestrictivePosture,
  highestRisk,
  RADAR_FRESHNESS_DAYS,
} from "./policy";
export { scoreObservation } from "./score";
export { RADAR_SNAPSHOT, getObservations, validateSnapshot } from "./snapshot";
export { buildDossiers } from "./dossier";
export { buildRadarFeed } from "./queries";
