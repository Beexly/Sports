/**
 * WorldDelta — the semantic difference between two bitemporal snapshots,
 * every entry attributed to the observation(s) that caused it. This is the
 * kernel's "semantic WorldDelta": not a text diff, but added / changed /
 * removed world-state cells with evidence ids, so a consumer can render
 * "what changed and WHY" without re-deriving anything.
 *
 * Pure function over two snapshots from the same store (or any two snapshots —
 * the function only reads cells). Deterministic: entries sorted by
 * (entityId, attribute).
 */

import { canonicalJson } from "@/lib/intelligence-playback/canonical-json";
import type { WorldDelta, WorldDeltaEntry, WorldSnapshot } from "./types";

export function worldDelta(from: WorldSnapshot, to: WorldSnapshot): WorldDelta {
  const key = (entityId: string, attribute: string): string => `${entityId} ${attribute}`;
  const before = new Map(from.cells.map((c) => [key(c.entityId, c.attribute), c]));
  const after = new Map(to.cells.map((c) => [key(c.entityId, c.attribute), c]));

  const entries: WorldDeltaEntry[] = [];

  for (const [k, b] of before) {
    const a = after.get(k);
    if (!a) {
      entries.push({
        kind: "REMOVED",
        entityId: b.entityId,
        attribute: b.attribute,
        before: b.value,
        after: null,
        causedBy: [b.observationId],
      });
    } else if (canonicalJson(a.value) !== canonicalJson(b.value)) {
      entries.push({
        kind: "CHANGED",
        entityId: b.entityId,
        attribute: b.attribute,
        before: b.value,
        after: a.value,
        // both winners explain the change; dedupe when the same observation
        // resolves both sides (possible when only the coordinate moved).
        causedBy: a.observationId === b.observationId ? [a.observationId] : [b.observationId, a.observationId],
      });
    }
  }
  for (const [k, a] of after) {
    if (!before.has(k)) {
      entries.push({
        kind: "ADDED",
        entityId: a.entityId,
        attribute: a.attribute,
        before: null,
        after: a.value,
        causedBy: [a.observationId],
      });
    }
  }

  entries.sort((x, y) =>
    x.entityId === y.entityId
      ? x.attribute < y.attribute ? -1 : x.attribute > y.attribute ? 1 : 0
      : x.entityId < y.entityId ? -1 : 1,
  );

  return { from: from.at, to: to.at, entries };
}
