/**
 * The honesty-critical property under test: prior-season MLB player features
 * ingest under clearly role-prefixed keys, skip counting is honest (mirrors
 * ../schedule-features.ts's skip counters), and — the real leak-free proof —
 * a read BEFORE the stamped observedAt genuinely refuses the feature via the
 * as-of store's real cutoff semantics (../asof-store.ts), not a mocked one.
 */
import { describe, expect, it } from "vitest";

import { AsOfFeatureStore } from "../asof-store.js";
import {
  ingestMlbPriorSeasonFeatures,
  ingestPlatoonPriorSeasonFeatures,
  ingestStatcastPriorSeasonFeatures,
  mlbPlayerEntityId,
} from "../loaders/mlb-feature-ingest.js";
import { mlbSeasonEndIso } from "../loaders/mlb-season-boundaries.js";
import type { PlatoonSplitRecord } from "../loaders/mlb-platoon-splits.js";
import type { StatcastPlayerSeasonFeature } from "../loaders/statcast-features.js";

const SOURCE_SEASON = 2023;
const OBSERVED_AT = mlbSeasonEndIso(SOURCE_SEASON);

function statcastRecord(overrides: Partial<StatcastPlayerSeasonFeature> = {}): StatcastPlayerSeasonFeature {
  return {
    mlbamId: 663457,
    targetSeason: 2024,
    sourceSeason: SOURCE_SEASON,
    playerType: "batter",
    barrelRate: 8.8,
    xwoba: 0.357,
    hardHitPercent: 37.8,
    kPercent: 19.7,
    bbPercent: 14.3,
    observedAt: OBSERVED_AT,
    ...overrides,
  };
}

function platoonRecord(overrides: Partial<PlatoonSplitRecord> = {}): PlatoonSplitRecord {
  return {
    personId: 665742,
    targetSeason: 2024,
    sourceSeason: SOURCE_SEASON,
    group: "hitting",
    opsVsL: 0.813,
    opsVsR: 0.98,
    paVsL: 207,
    paVsR: 501,
    observedAt: OBSERVED_AT,
    ...overrides,
  };
}

describe("ingestStatcastPriorSeasonFeatures", () => {
  it("ingests all 5 fields under role-prefixed keys for a batter", () => {
    const store = new AsOfFeatureStore();
    const { ingested, skipped } = ingestStatcastPriorSeasonFeatures([statcastRecord()], store);
    expect(ingested).toBe(5);
    expect(skipped).toBe(0);

    const entityId = mlbPlayerEntityId(663457);
    expect(store.get(entityId, "statcast_prior_batter_barrel_rate", OBSERVED_AT)?.value).toBeCloseTo(8.8, 6);
    expect(store.get(entityId, "statcast_prior_batter_xwoba", OBSERVED_AT)?.value).toBeCloseTo(0.357, 6);
    expect(store.get(entityId, "statcast_prior_batter_hard_hit_pct", OBSERVED_AT)?.value).toBeCloseTo(37.8, 6);
    expect(store.get(entityId, "statcast_prior_batter_k_pct", OBSERVED_AT)?.value).toBeCloseTo(19.7, 6);
    expect(store.get(entityId, "statcast_prior_batter_bb_pct", OBSERVED_AT)?.value).toBeCloseTo(14.3, 6);
  });

  it("uses the _allowed-suffixed pitcher keys, distinct from the batter keys, for the same mlbamId (two-way-player safety)", () => {
    const store = new AsOfFeatureStore();
    const batter = statcastRecord({ mlbamId: 660271, playerType: "batter", barrelRate: 10 });
    const pitcher = statcastRecord({ mlbamId: 660271, playerType: "pitcher", barrelRate: 5 });
    ingestStatcastPriorSeasonFeatures([batter, pitcher], store);

    const entityId = mlbPlayerEntityId(660271);
    expect(store.get(entityId, "statcast_prior_batter_barrel_rate", OBSERVED_AT)?.value).toBe(10);
    expect(store.get(entityId, "statcast_prior_pitcher_barrel_rate_allowed", OBSERVED_AT)?.value).toBe(5);
  });

  it("ingests only the present fields when some are null (missing-field tolerance), and does not count that as a skip", () => {
    const store = new AsOfFeatureStore();
    const partial = statcastRecord({ barrelRate: null, hardHitPercent: null });
    const { ingested, skipped } = ingestStatcastPriorSeasonFeatures([partial], store);
    expect(ingested).toBe(3); // xwoba, kPercent, bbPercent
    expect(skipped).toBe(0);
    const entityId = mlbPlayerEntityId(663457);
    expect(store.get(entityId, "statcast_prior_batter_barrel_rate", OBSERVED_AT)).toBeNull();
    expect(store.get(entityId, "statcast_prior_batter_xwoba", OBSERVED_AT)?.value).toBeCloseTo(0.357, 6);
  });

  it("counts (and does not write) a record with every field null", () => {
    const store = new AsOfFeatureStore();
    const allNull = statcastRecord({
      barrelRate: null,
      xwoba: null,
      hardHitPercent: null,
      kPercent: null,
      bbPercent: null,
    });
    const { ingested, skipped } = ingestStatcastPriorSeasonFeatures([allNull, statcastRecord()], store);
    expect(ingested).toBe(5); // only the second (fully-populated) record
    expect(skipped).toBe(1);
  });
});

describe("ingestPlatoonPriorSeasonFeatures", () => {
  it("ingests all 4 fields under role-prefixed keys for a hitter", () => {
    const store = new AsOfFeatureStore();
    const { ingested, skipped } = ingestPlatoonPriorSeasonFeatures([platoonRecord()], store);
    expect(ingested).toBe(4);
    expect(skipped).toBe(0);

    const entityId = mlbPlayerEntityId(665742);
    expect(store.get(entityId, "platoon_prior_batter_ops_vl", OBSERVED_AT)?.value).toBeCloseTo(0.813, 6);
    expect(store.get(entityId, "platoon_prior_batter_ops_vr", OBSERVED_AT)?.value).toBeCloseTo(0.98, 6);
    expect(store.get(entityId, "platoon_prior_batter_pa_vl", OBSERVED_AT)?.value).toBe(207);
    expect(store.get(entityId, "platoon_prior_batter_pa_vr", OBSERVED_AT)?.value).toBe(501);
  });

  it("uses distinct pitcher-role keys for a pitching-group record on the same personId", () => {
    const store = new AsOfFeatureStore();
    const pitching = platoonRecord({ group: "pitching", opsVsL: 0.678, opsVsR: 0.859, paVsL: 401, paVsR: 407 });
    ingestPlatoonPriorSeasonFeatures([platoonRecord(), pitching], store);
    const entityId = mlbPlayerEntityId(665742);
    expect(store.get(entityId, "platoon_prior_batter_ops_vl", OBSERVED_AT)?.value).toBeCloseTo(0.813, 6);
    expect(store.get(entityId, "platoon_prior_pitcher_ops_vl", OBSERVED_AT)?.value).toBeCloseTo(0.678, 6);
  });

  it("skips (and counts) a record where every field is null — the honest 'no prior-season data' case", () => {
    const store = new AsOfFeatureStore();
    const noData = platoonRecord({ opsVsL: null, opsVsR: null, paVsL: null, paVsR: null });
    const { ingested, skipped } = ingestPlatoonPriorSeasonFeatures([noData, platoonRecord({ personId: 2 })], store);
    expect(ingested).toBe(4); // only the second record
    expect(skipped).toBe(1);
  });
});

describe("ingestMlbPriorSeasonFeatures (combined)", () => {
  it("returns per-source ingest/skip counts", () => {
    const store = new AsOfFeatureStore();
    const result = ingestMlbPriorSeasonFeatures([statcastRecord()], [platoonRecord()], store);
    expect(result.statcast).toEqual({ ingested: 5, skipped: 0 });
    expect(result.platoon).toEqual({ ingested: 4, skipped: 0 });
  });
});

describe("as-of store round trip — the real leak-free proof", () => {
  it("refuses a statcast feature read strictly BEFORE the stamped prior-season observedAt, and serves it at/after", () => {
    const store = new AsOfFeatureStore();
    ingestStatcastPriorSeasonFeatures([statcastRecord()], store);
    const entityId = mlbPlayerEntityId(663457);

    const oneMsBefore = new Date(Date.parse(OBSERVED_AT) - 1).toISOString();
    // A decision instant strictly before the prior season's close must NOT
    // see this feature — it genuinely wasn't knowable yet.
    expect(store.get(entityId, "statcast_prior_batter_xwoba", oneMsBefore)).toBeNull();

    // At or after the stamped instant, the feature is served.
    expect(store.get(entityId, "statcast_prior_batter_xwoba", OBSERVED_AT)?.value).toBeCloseTo(0.357, 6);
    const targetSeasonKickoff = "2024-03-28T17:05:00.000Z"; // a plausible real 2024 Opening Day instant
    expect(store.get(entityId, "statcast_prior_batter_xwoba", targetSeasonKickoff)?.value).toBeCloseTo(0.357, 6);

    // The store's own tripwire must see zero lookahead across every read
    // actually served above.
    expect(() => store.assertNoLookahead()).not.toThrow();
  });

  it("refuses a platoon-split feature read strictly BEFORE the stamped observedAt", () => {
    const store = new AsOfFeatureStore();
    ingestPlatoonPriorSeasonFeatures([platoonRecord()], store);
    const entityId = mlbPlayerEntityId(665742);

    const oneDayBefore = new Date(Date.parse(OBSERVED_AT) - 86_400_000).toISOString();
    expect(store.get(entityId, "platoon_prior_batter_ops_vl", oneDayBefore)).toBeNull();
    expect(store.get(entityId, "platoon_prior_batter_ops_vl", OBSERVED_AT)?.value).toBeCloseTo(0.813, 6);
    expect(() => store.assertNoLookahead()).not.toThrow();
  });

  it("a read at a cutoff BEFORE observedAt returns null even when a later (in-bounds) read for the same key already happened", () => {
    // Guards against a store implementation that "remembers" the last
    // ingested value regardless of cutoff ordering across separate calls.
    const store = new AsOfFeatureStore();
    ingestStatcastPriorSeasonFeatures([statcastRecord()], store);
    const entityId = mlbPlayerEntityId(663457);

    // First: a valid, in-bounds read (as a real caller ingesting downstream might do out of order).
    expect(store.get(entityId, "statcast_prior_batter_barrel_rate", "2024-06-01T00:00:00.000Z")?.value).toBeCloseTo(
      8.8,
      6,
    );
    // Then: an earlier cutoff, strictly before observedAt, must still refuse.
    const beforeObserved = new Date(Date.parse(OBSERVED_AT) - 1).toISOString();
    expect(store.get(entityId, "statcast_prior_batter_barrel_rate", beforeObserved)).toBeNull();
  });
});
