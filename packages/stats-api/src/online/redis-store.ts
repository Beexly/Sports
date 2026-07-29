/**
 * Redis online store adapter for multi-instance cold/hot planes.
 * Pure contract + in-memory shim — real Redis client injected by workers.
 * Law: public API never reads this store; Feast/online is internal only.
 */

export type OnlineRow = {
  metricId: string;
  entityId: string;
  asOf: string;
  value: number;
};

export type OnlineStore = {
  put(row: OnlineRow): Promise<void> | void;
  get(
    metricId: string,
    entityId: string,
    asOf: string,
  ): Promise<OnlineRow | null> | OnlineRow | null;
  mget(
    keys: readonly { metricId: string; entityId: string; asOf: string }[],
  ): Promise<(OnlineRow | null)[]>;
  size(): number;
};

export function onlineKey(metricId: string, entityId: string, asOf: string): string {
  // Hash-tag entity for Redis Cluster slot locality; never tag whole league.
  return `{gse:${entityId}}:${metricId}:${asOf}`;
}

/** Process-local shim matching Redis semantics for single-instance / tests. */
export class MemoryOnlineStore implements OnlineStore {
  private readonly map = new Map<string, OnlineRow>();

  put(row: OnlineRow): void {
    if (!Number.isFinite(row.value)) {
      throw new Error("refuse put: non-finite value");
    }
    this.map.set(onlineKey(row.metricId, row.entityId, row.asOf), { ...row });
  }

  get(metricId: string, entityId: string, asOf: string): OnlineRow | null {
    return this.map.get(onlineKey(metricId, entityId, asOf)) ?? null;
  }

  async mget(
    keys: readonly { metricId: string; entityId: string; asOf: string }[],
  ): Promise<(OnlineRow | null)[]> {
    return keys.map((k) => this.get(k.metricId, k.entityId, k.asOf));
  }

  size(): number {
    return this.map.size;
  }
}

/**
 * Pipeline batch size guidance (from session Redis benchmarks).
 * Depth 100–1000; transaction=false for pure GETs.
 */
export const ONLINE_PIPELINE_GUIDANCE = {
  recommendedBatch: 200,
  maxBatch: 1000,
  transactionForReads: false as const,
  publicApiOnThisPath: false as const,
  reshardDuringLiveSlates: false as const,
} as const;

export function assertNotPublicApiPath(caller: string): void {
  if (caller.includes("api/gse/v1") && !caller.includes("internal")) {
    throw new Error(
      "refuse: public GSE API must not read Feast/Redis online store — use FeatureRecord SoR",
    );
  }
}
