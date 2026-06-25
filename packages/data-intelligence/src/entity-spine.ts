/**
 * DATA INTELLIGENCE MESH — Entity Spine (canonical identity).
 *
 * Every provider uses different IDs. Without a canonical identity layer, "more APIs" is chaos; with
 * it, every source becomes another observer of the same universe. The spine maps external provider
 * IDs to canonical GSE IDs and flags collisions. Pure + deterministic.
 */

export type GseEntityKind = "player" | "team" | "game" | "book" | "market" | "league" | "fantasy-league" | "dfs-slate" | "source";

export type GseEntityId = `${GseEntityKind}:${string}`;

export interface EntityRef {
  readonly id: GseEntityId;
  readonly kind: GseEntityKind;
}

export interface ExternalEntityMapping {
  readonly gseId: GseEntityId;
  readonly provider: string;
  readonly providerEntityId: string;
  readonly providerEntityName: string;
  readonly sport: string;
  readonly confidence: number;     // 0..1
  readonly firstSeenAt: string;    // ISO
  readonly lastConfirmedAt: string;// ISO
  readonly collisionRisk: number;  // 0..1
}

/** Build a canonical GSE entity id. */
export function gseEntityId(kind: GseEntityKind, raw: string): GseEntityId {
  return `${kind}:${raw.toLowerCase().trim().replace(/\s+/g, "_")}`;
}

export function entityRef(kind: GseEntityKind, raw: string): EntityRef {
  return { id: gseEntityId(kind, raw), kind };
}

/** Resolve a provider's entity id to its canonical GSE id, best-confidence first. */
export function resolveToGse(mappings: readonly ExternalEntityMapping[], provider: string, providerEntityId: string): ExternalEntityMapping | null {
  const matches = mappings.filter((m) => m.provider === provider && m.providerEntityId === providerEntityId).sort((a, b) => b.confidence - a.confidence);
  return matches[0] ?? null;
}

export interface CollisionReport {
  readonly key: string; // provider:providerEntityId
  readonly gseIds: readonly GseEntityId[];
  readonly maxCollisionRisk: number;
  readonly note: string;
}

/**
 * Find identity collisions: a single provider entity that maps to more than one canonical GSE id,
 * or any mapping flagged with high collision risk. These must be resolved before the data is trusted.
 */
export function findCollisions(mappings: readonly ExternalEntityMapping[], riskThreshold = 0.5): CollisionReport[] {
  const byKey = new Map<string, ExternalEntityMapping[]>();
  for (const m of mappings) {
    const key = `${m.provider}:${m.providerEntityId}`;
    const arr = byKey.get(key) ?? [];
    arr.push(m);
    byKey.set(key, arr);
  }
  const reports: CollisionReport[] = [];
  for (const [key, group] of byKey) {
    const gseIds = [...new Set(group.map((g) => g.gseId))];
    const maxRisk = Math.max(...group.map((g) => g.collisionRisk));
    if (gseIds.length > 1 || maxRisk >= riskThreshold) {
      reports.push({
        key,
        gseIds,
        maxCollisionRisk: Number(maxRisk.toFixed(3)),
        note: gseIds.length > 1 ? `One provider id maps to ${gseIds.length} canonical entities — ambiguous, resolve before use.` : `High collision risk (${maxRisk.toFixed(2)}) — verify mapping.`,
      });
    }
  }
  return reports.sort((a, b) => b.maxCollisionRisk - a.maxCollisionRisk);
}
