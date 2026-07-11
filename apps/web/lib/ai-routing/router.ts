/**
 * Model Portfolio Router — recommendation assembly (never a call).
 *
 * Lane from policy → endpoint from the registry (approved lanes, usability,
 * training policy) → budget ceiling → serializable recommendation with a
 * reason. Blocked outcomes are recommendations too: they say exactly why.
 */

import type { RouteRecommendation, RouteTaskProfile } from "./types";
import { LANE_BUDGET_CEILINGS, ROUTING_POLICY_VERSION, selectLane } from "./policy";
import { ENDPOINT_REGISTRY, getEndpoint } from "./providers/current-claude";
import { defaultHealth, isUsable, type HealthReading } from "./health";

export function recommendRoute(
  profile: RouteTaskProfile,
  healthReadings: readonly HealthReading[] = []
): RouteRecommendation {
  const { lane, reason } = selectLane(profile);
  const laneCeiling = LANE_BUDGET_CEILINGS[lane];
  const budgetCeilingUsd =
    profile.budgetUsd === null ? laneCeiling : Math.min(profile.budgetUsd, laneCeiling);

  if (lane === "NO_MODEL") {
    return {
      policyVersion: ROUTING_POLICY_VERSION,
      lane,
      endpointId: null,
      fallbackOrder: [],
      blocked: false,
      reason,
      budgetCeilingUsd: 0,
      shadow: true,
    };
  }

  // Candidate endpoints: approved for the lane, must not train on data,
  // must be usable per health evidence. Unknown endpoints cannot appear —
  // the registry is the only source.
  const candidates = ENDPOINT_REGISTRY.filter((e) => {
    if (!e.approvedLanes.includes(lane)) return false;
    if (e.trainsOnData) return false;
    const reading = healthReadings.find((h) => h.endpointId === e.id) ?? defaultHealth(e);
    return isUsable(e, reading);
  });

  if (candidates.length === 0) {
    return {
      policyVersion: ROUTING_POLICY_VERSION,
      lane,
      endpointId: null,
      fallbackOrder: [],
      blocked: true,
      reason: `${reason} No registered endpoint is approved and usable for lane ${lane}; the task stays on the current production path (shadow mode never falls back).`,
      budgetCeilingUsd,
      shadow: true,
    };
  }

  // Current production endpoint first among candidates — shadow mode should
  // agree with reality unless policy has a concrete reason not to.
  const ordered = [...candidates].sort(
    (a, b) => Number(b.isCurrentProduction) - Number(a.isCurrentProduction) || a.id.localeCompare(b.id)
  );

  return {
    policyVersion: ROUTING_POLICY_VERSION,
    lane,
    endpointId: ordered[0]!.id,
    fallbackOrder: ordered.slice(1).map((e) => e.id),
    blocked: false,
    reason,
    budgetCeilingUsd,
    shadow: true,
  };
}

/** Guard for tests and future consumers: unknown endpoint ids are blocked. */
export function isKnownEndpoint(id: string): boolean {
  return getEndpoint(id) !== undefined;
}
