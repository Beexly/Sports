/**
 * Public API skeleton — can ONLY return public_api_eligible records.
 */

import type { FeatureStore } from "../store.js";
import type { FeatureId, EntityId, FeatureRecord } from "../types.js";

export type ApiResponse =
  | { ok: true; record: FeatureRecord }
  | { ok: false; status: 404 | 403 | 400; error: string };

export function getPublicFeature(
  store: FeatureStore,
  featureId: string,
  entityId: string,
  asOf: string,
): ApiResponse {
  if (!featureId || !entityId || !asOf) {
    return { ok: false, status: 400, error: "featureId, entityId, asOf required" };
  }
  const rec = store.getPublic({
    featureId: featureId as FeatureId,
    entityId: entityId as EntityId,
    asOf,
  });
  if (rec == null) {
    // Collapse missing + ineligible into 404 — no leak of ineligible existence
    return { ok: false, status: 404, error: "not found or not public_api_eligible" };
  }
  return { ok: true, record: rec };
}
