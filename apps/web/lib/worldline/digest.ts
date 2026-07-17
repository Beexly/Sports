/**
 * Worldline digests — provable replays via the ONE canonical serializer.
 *
 * Reuses `canonicalJson` from the W001 playback spine rather than introducing a
 * second canonicalization (one canonical truth path). The digest covers the
 * bitemporal coordinate and every resolved cell, so two parties replaying the
 * same observation set at the same coordinate MUST produce the same hex — and
 * any divergence is a real semantic difference, never key-order noise.
 */

import { createHash } from "node:crypto";
import { canonicalJson } from "@/lib/intelligence-playback/canonical-json";
import type { WorldCoordinate, WorldStateCell } from "./types";

export function snapshotDigest(at: WorldCoordinate, cells: readonly WorldStateCell[]): string {
  const canonical = canonicalJson({
    at: { validTime: at.validTime, knowledgeTime: at.knowledgeTime },
    cells: cells.map((c) => ({
      entityId: c.entityId,
      attribute: c.attribute,
      value: c.value,
      observationId: c.observationId,
      occurredAt: c.occurredAt,
      observedAt: c.observedAt,
    })),
  });
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}
