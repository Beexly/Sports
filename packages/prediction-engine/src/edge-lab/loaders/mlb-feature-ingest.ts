/**
 * Integration helper: ingest ./statcast-features.ts and
 * ./mlb-platoon-splits.ts records into an AsOfFeatureStore (../asof-store.ts)
 * with the correct PRIOR-SEASON `observedAt` stamps and clearly-prefixed
 * feature keys.
 *
 * Deliberately NOT wired into any pipeline/scoring path — this is loader +
 * ingest plumbing only. Consumption happens later through the trials-registry
 * admission flow (../trials-registry.ts), mirroring how ../schedule-features.ts's
 * output is a `store`-ingesting function, not a scored prediction.
 *
 * ── Entity keying ──
 * Both source loaders are keyed by MLBAM player id (`mlbamId` /
 * `personId` — same id space: both ultimately come from MLB Advanced
 * Media's player registry). This module keys the store by
 * `mlb-player-{id}` — deliberately NOT `mlb-{id}` (mlb-games.ts's game
 * entity id is `mlb-{gamePk}`) so a player id and a gamePk can never collide
 * on the same entity-id string even though the store's actual dedup key is
 * (entityId, featureKey) and the feature key namespaces already differ —
 * belt-and-suspenders for a store whose whole job is preventing silent
 * cross-talk.
 *
 * ── Feature key naming (a deliberate deviation from the task brief's literal
 *    example strings — documented here) ──
 * The task's example key names ("statcast_prior_barrel_rate",
 * "platoon_prior_ops_vl") don't distinguish batter-role numbers from
 * pitcher-role numbers. That's fine for the vast majority of players (a
 * player is either a batter or a pitcher, never both, in a given loader
 * record), EXCEPT a genuine two-way player (Shohei Ohtani being the only
 * real current case) can have BOTH a "batter" statcast/platoon record and a
 * "pitcher" one for the SAME mlbamId/personId in the SAME target season. If
 * both were ingested under identical un-prefixed feature keys with the same
 * `observedAt` (both stamped at the same prior-season-end instant — see
 * ../loaders/mlb-season-boundaries.ts), the as-of store's tie-break (last
 * ingested wins for a shared timestamp — see ../asof-store.ts's `ingest`)
 * would silently make one of the two numbers unrecoverable. So every key
 * here is prefixed with the role it describes:
 *   statcast_prior_batter_*        / statcast_prior_pitcher_*_allowed(*)
 *   platoon_prior_batter_ops_v{l,r} / platoon_prior_pitcher_ops_v{l,r}
 * (pitcher K%/BB% keep the plain `_k_pct`/`_bb_pct` suffix — those are
 * already the pitcher's own rate, not an "allowed" reading of a batter
 * stat, so no `_allowed` suffix is needed there; `barrel_rate`/`xwoba`/
 * `hard_hit_pct` DO get `_allowed` because for a pitcher those columns are
 * the opponent-facing reading of the same Statcast column name — see
 * ../loaders/statcast-features.ts's header scale note).
 */

import type { AsOfFeatureStore } from "../asof-store.js";
import type { StatcastPlayerSeasonFeature } from "./statcast-features.js";
import type { PlatoonSplitRecord } from "./mlb-platoon-splits.js";

/** Store entity id for one MLB player (MLBAM id) — see header. */
export function mlbPlayerEntityId(mlbamId: number): string {
  return `mlb-player-${mlbamId}`;
}

export interface FeatureIngestCount {
  /** Individual (entityId, featureKey) observations actually written. */
  readonly ingested: number;
  /** Player-season records with NO usable field at all — written nowhere,
   * counted here so the denominator stays explainable (mirrors
   * ../schedule-features.ts's `skipped` counters). */
  readonly skipped: number;
}

export interface MlbFeatureIngestResult {
  readonly statcast: FeatureIngestCount;
  readonly platoon: FeatureIngestCount;
}

/**
 * Ingest ./statcast-features.ts records. A record is SKIPPED (counted, not
 * written) only when every one of its five fields is null — i.e. genuinely
 * no prior-season Statcast data for that player. A record with SOME null
 * fields (Savant's real missing-field-tolerance case — see
 * ./statcast-features.ts's header) still ingests whichever fields ARE
 * present; it is not an all-or-nothing row.
 */
export function ingestStatcastPriorSeasonFeatures(
  records: readonly StatcastPlayerSeasonFeature[],
  store: AsOfFeatureStore,
): FeatureIngestCount {
  let ingested = 0;
  let skipped = 0;

  for (const r of records) {
    const rolePrefix = r.playerType === "batter" ? "statcast_prior_batter" : "statcast_prior_pitcher";
    const suffix = r.playerType === "pitcher" ? "_allowed" : "";
    const fields: ReadonlyArray<readonly [string, number | null]> = [
      [`${rolePrefix}_barrel_rate${suffix}`, r.barrelRate],
      [`${rolePrefix}_xwoba${suffix}`, r.xwoba],
      [`${rolePrefix}_hard_hit_pct${suffix}`, r.hardHitPercent],
      [`${rolePrefix}_k_pct`, r.kPercent],
      [`${rolePrefix}_bb_pct`, r.bbPercent],
    ];

    const entityId = mlbPlayerEntityId(r.mlbamId);
    let wroteAny = false;
    for (const [featureKey, value] of fields) {
      if (value === null) continue;
      store.ingest({ entityId, featureKey, value, observedAt: r.observedAt, source: "statcast-features" });
      ingested += 1;
      wroteAny = true;
    }
    if (!wroteAny) skipped += 1;
  }

  return { ingested, skipped };
}

/**
 * Ingest ./mlb-platoon-splits.ts records. A record is SKIPPED (counted, not
 * written) only when opsVsL, opsVsR, paVsL, and paVsR are ALL null — i.e.
 * genuinely no prior-season plate appearances / batters faced against
 * either handedness for that player+group.
 */
export function ingestPlatoonPriorSeasonFeatures(
  records: readonly PlatoonSplitRecord[],
  store: AsOfFeatureStore,
): FeatureIngestCount {
  let ingested = 0;
  let skipped = 0;

  for (const r of records) {
    const rolePrefix = r.group === "hitting" ? "platoon_prior_batter" : "platoon_prior_pitcher";
    const fields: ReadonlyArray<readonly [string, number | null]> = [
      [`${rolePrefix}_ops_vl`, r.opsVsL],
      [`${rolePrefix}_ops_vr`, r.opsVsR],
      [`${rolePrefix}_pa_vl`, r.paVsL],
      [`${rolePrefix}_pa_vr`, r.paVsR],
    ];

    const entityId = mlbPlayerEntityId(r.personId);
    let wroteAny = false;
    for (const [featureKey, value] of fields) {
      if (value === null) continue;
      store.ingest({ entityId, featureKey, value, observedAt: r.observedAt, source: "mlb-platoon-splits" });
      ingested += 1;
      wroteAny = true;
    }
    if (!wroteAny) skipped += 1;
  }

  return { ingested, skipped };
}

/** Convenience wrapper: ingest both record sets in one call. */
export function ingestMlbPriorSeasonFeatures(
  statcastRecords: readonly StatcastPlayerSeasonFeature[],
  platoonRecords: readonly PlatoonSplitRecord[],
  store: AsOfFeatureStore,
): MlbFeatureIngestResult {
  return {
    statcast: ingestStatcastPriorSeasonFeatures(statcastRecords, store),
    platoon: ingestPlatoonPriorSeasonFeatures(platoonRecords, store),
  };
}
