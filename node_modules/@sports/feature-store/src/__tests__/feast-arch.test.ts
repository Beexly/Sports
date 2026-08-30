import { describe, expect, it } from "vitest";
import {
  assessServingPath,
  defaultGseMaterializePlan,
  FEAST_COMPETITIVE_STRENGTH,
  FEAST_FORBIDDEN_VIEWS,
  planMaterialize,
  selectOnlineBackend,
} from "../feast-arch.js";

describe("feast-arch competitive strength", () => {
  it("thesis asserts odds independence and hybrid SoR", () => {
    expect(FEAST_COMPETITIVE_STRENGTH.thesis).toMatch(/FeatureRecords/);
    expect(FEAST_COMPETITIVE_STRENGTH.thesis).toMatch(/never touches Redis online/);
    expect(FEAST_COMPETITIVE_STRENGTH.differentiators).toContain("online_not_public");
  });

  it("assessServingPath always marks forPublicApi false", () => {
    const a = assessServingPath({
      mode: "sdk_inprocess",
      backend: "redis",
      precomputeOnline: false,
      entityCount: 50,
      featureViewCount: 5,
      sameAz: true,
    });
    expect(a.forPublicApi).toBe(false);
    expect(a.allowed).toBe(true);
    expect(a.estimatedP50Ms).toBeGreaterThan(0);
    expect(a.estimatedP99Ms).toBeGreaterThan(a.estimatedP50Ms);
  });

  it("precompute lowers multi-FV latency estimate", () => {
    const base = {
      mode: "sdk_inprocess" as const,
      backend: "redis" as const,
      entityCount: 50,
      featureViewCount: 20,
      sameAz: true,
    };
    const no = assessServingPath({ ...base, precomputeOnline: false });
    const yes = assessServingPath({ ...base, precomputeOnline: true });
    expect(yes.estimatedP50Ms).toBeLessThan(no.estimatedP50Ms);
  });

  it("cluster multi-entity tax exceeds standalone", () => {
    const path = {
      mode: "sdk_inprocess" as const,
      precomputeOnline: true,
      entityCount: 20,
      featureViewCount: 5,
      sameAz: true,
    };
    const stand = assessServingPath({ ...path, backend: "redis" });
    const clus = assessServingPath({ ...path, backend: "redis_cluster" });
    expect(clus.estimatedP50Ms).toBeGreaterThan(stand.estimatedP50Ms);
  });

  it("blocks forbidden quote/cert views", () => {
    const p = planMaterialize({
      kind: "incremental",
      featureViews: ["quote_plane", "scorebug", "calibration_certificate"],
      ttlSecondsByView: { scorebug: 21600 },
      materializeIntervalSeconds: 900,
    });
    expect(p.ok).toBe(true);
    expect(p.blockedViews).toContain("quote_plane");
    expect(p.blockedViews).toContain("calibration_certificate");
    expect(p.command.join(" ")).toContain("scorebug");
    expect(p.command.join(" ")).not.toContain("quote_plane");
  });

  it("refuses materialize_interval ≥ TTL", () => {
    const p = planMaterialize({
      kind: "incremental",
      featureViews: ["scorebug"],
      ttlSecondsByView: { scorebug: 3600 },
      materializeIntervalSeconds: 3600,
    });
    expect(p.ok).toBe(false);
    expect(p.warnings.some((w) => w.includes("TTL"))).toBe(true);
  });

  it("range requires window", () => {
    const p = planMaterialize({
      kind: "range",
      featureViews: ["player_stats"],
      ttlSecondsByView: { player_stats: 86400 },
      materializeIntervalSeconds: 3600,
    });
    expect(p.ok).toBe(false);
  });

  it("default GSE plan is incremental and ok", () => {
    const p = defaultGseMaterializePlan("2026-07-29T12:00:00Z");
    expect(p.ok).toBe(true);
    expect(p.kind).toBe("incremental");
    expect(p.command).toContain("incremental");
  });

  it("selectOnlineBackend phases correctly", () => {
    expect(
      selectOnlineBackend({
        multiInstance: false,
        memoryPressure: false,
        multiEntityQps: 10,
      }).phase,
    ).toBe("sqlite");
    expect(
      selectOnlineBackend({
        multiInstance: true,
        memoryPressure: false,
        multiEntityQps: 100,
      }).phase,
    ).toBe("redis");
    expect(
      selectOnlineBackend({
        multiInstance: true,
        memoryPressure: true,
        multiEntityQps: 50_000,
      }).phase,
    ).toBe("redis_cluster");
  });

  it("forbidden view list covers odds and pedersen secrets", () => {
    expect(FEAST_FORBIDDEN_VIEWS).toContain("odds_api");
    expect(FEAST_FORBIDDEN_VIEWS).toContain("pedersen_binding");
  });
});
