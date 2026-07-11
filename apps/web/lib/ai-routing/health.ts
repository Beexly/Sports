/**
 * Model Portfolio Router — endpoint health (honest, probe-less).
 *
 * No probe infrastructure exists in this wave, so health is UNKNOWN unless
 * a caller supplies observed evidence. UNKNOWN is not DOWN: the policy
 * treats UNKNOWN as usable-with-note for the current production endpoint
 * (production is already using it — that IS the evidence) and as excluded
 * for anything else. No fabricated uptime, ever.
 */

import type { EndpointHealth, ModelEndpoint } from "./types";

export interface HealthReading {
  readonly endpointId: string;
  readonly health: EndpointHealth;
  /** Where the reading came from — required so health is never invented. */
  readonly evidence: string;
}

/** Default posture when no reading is supplied. */
export function defaultHealth(endpoint: ModelEndpoint): HealthReading {
  return endpoint.isCurrentProduction
    ? {
        endpointId: endpoint.id,
        health: "UNKNOWN",
        evidence: "No probe exists; production call sites are actively using this endpoint.",
      }
    : {
        endpointId: endpoint.id,
        health: "UNKNOWN",
        evidence: "No probe exists and no production usage evidence.",
      };
}

/** Usable = not known-bad, and either evidenced by production use or HEALTHY. */
export function isUsable(endpoint: ModelEndpoint, reading: HealthReading): boolean {
  if (reading.health === "DOWN" || reading.health === "DEGRADED") return false;
  if (reading.health === "HEALTHY") return true;
  // UNKNOWN: only the current-production endpoint gets the benefit of use.
  return endpoint.isCurrentProduction;
}
