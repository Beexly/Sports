import { describe, it, expect } from "vitest";
import {
  OfflineStatsProvider,
  RegistryStatsProvider,
  createStatsProviders,
  mergeStatsFeatures,
  isCertifiableStatsProvider,
  type StatsFeature,
  type StatsProviderResult,
} from "../stats-provider.js";

const T0 = new Date("2026-07-27T20:00:00Z");

function feature(over: Partial<StatsFeature> = {}): StatsFeature {
  return {
    providerId: "nflverse",
    sourceRegistryId: "nflverse",
    category: "RATINGS",
    signalKey: "test.signal",
    value: 1,
    fetchedAt: T0,
    trustLevel: 0.9,
    ...over,
  };
}

describe("OfflineStatsProvider", () => {
  it("never invents features and is not live-gate certifiable", async () => {
    const p = new OfflineStatsProvider("budget pause");
    expect(p.capabilities.certifiableForLiveGate).toBe(false);
    expect(p.capabilities.role).toBe("stats");
    expect(isCertifiableStatsProvider(p)).toBe(false);

    const r = await p.fetchFeatures({ sportKey: "baseball_mlb" });
    expect(r.healthy).toBe(false);
    expect(r.features).toEqual([]);
    expect(r.error).toContain("budget pause");

    const h = await p.probe();
    expect(h.available).toBe(false);
  });
});

describe("RegistryStatsProvider", () => {
  it("accepts nflverse (cleared-with-attribution)", async () => {
    const p = new RegistryStatsProvider("nflverse", "nflverse", {
      role: "stats",
      certifiableForLiveGate: false,
      categories: ["RATINGS"],
      sports: ["americanfootball_nfl"],
      requiresNetwork: true,
    });
    expect(p.capabilities.certifiableForLiveGate).toBe(false);
    const h = await p.probe();
    expect(h.available).toBe(true);
    expect(h.attribution).toMatch(/nflverse/i);

    const r = await p.fetchFeatures();
    expect(r.healthy).toBe(true);
    expect(r.features).toEqual([]); // shell until bulk loader attaches
  });

  it("refuses forbidden registry ids", () => {
    expect(
      () =>
        new RegistryStatsProvider("nflverse", "espn-hidden-api", {
          role: "stats",
          certifiableForLiveGate: false,
          categories: [],
          sports: [],
          requiresNetwork: true,
        }),
    ).toThrow(/Refusing to ingest/);
  });
});

describe("createStatsProviders", () => {
  it("returns offline only when STATS_PROVIDER=offline", () => {
    const list = createStatsProviders({ env: { STATS_PROVIDER: "offline" } });
    expect(list).toHaveLength(1);
    expect(list[0]!.id).toBe("offline");
  });

  it("returns multiple registry-backed providers by default", () => {
    const list = createStatsProviders({ env: {} });
    expect(list.length).toBeGreaterThanOrEqual(3);
    expect(list.every((p) => p.capabilities.certifiableForLiveGate === false)).toBe(
      true,
    );
    expect(list.every((p) => p.capabilities.role === "stats")).toBe(true);
    const ids = list.map((p) => p.id);
    expect(ids).toContain("nflverse");
    expect(ids).toContain("retrosheet");
    expect(ids).toContain("nws-weather");
  });
});

describe("mergeStatsFeatures", () => {
  it("skips unhealthy batches and de-dupes signal keys", () => {
    const unhealthy: StatsProviderResult = {
      providerId: "offline",
      healthy: false,
      features: [feature({ signalKey: "should.skip" })],
      fetchedAt: T0,
    };
    const a: StatsProviderResult = {
      providerId: "nflverse",
      healthy: true,
      features: [feature({ signalKey: "a", entityKey: "g1" })],
      fetchedAt: T0,
    };
    const b: StatsProviderResult = {
      providerId: "lahman-db",
      healthy: true,
      features: [
        feature({
          providerId: "lahman-db",
          sourceRegistryId: "lahman-db",
          signalKey: "a",
          entityKey: "g1",
          value: 2,
        }),
        feature({
          providerId: "lahman-db",
          sourceRegistryId: "lahman-db",
          signalKey: "b",
          entityKey: "g1",
        }),
      ],
      fetchedAt: T0,
    };
    const merged = mergeStatsFeatures([unhealthy, a, b]);
    expect(merged).toHaveLength(2);
    expect(merged.find((f) => f.signalKey === "a")!.value).toBe(1); // first wins
    expect(merged.some((f) => f.signalKey === "b")).toBe(true);
  });
});
