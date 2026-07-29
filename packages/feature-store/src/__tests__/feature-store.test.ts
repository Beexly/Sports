import { describe, expect, it } from "vitest";
import {
  InMemoryFeatureStore,
  asFeatureId,
  asEntityId,
  getPublicFeature,
  runHarness,
  opticalConfirmationScore,
  exportForFeast,
} from "../index.js";

describe("InMemoryFeatureStore PIT", () => {
  it("returns latest asOf <= query and refuses future leak", () => {
    const s = new InMemoryFeatureStore();
    s.put({
      featureId: asFeatureId("snap_share"),
      entityId: asEntityId("player_1"),
      asOf: "2025-11-01T12:00:00.000Z",
      value: 0.55,
      sourceRights: "free_legal",
      pitCorrect: true,
      publicApiEligible: true,
    });
    s.put({
      featureId: asFeatureId("snap_share"),
      entityId: asEntityId("player_1"),
      asOf: "2025-11-08T12:00:00.000Z",
      value: 0.62,
      sourceRights: "free_legal",
      pitCorrect: true,
      publicApiEligible: true,
    });
    const mid = s.getAsOf({
      featureId: asFeatureId("snap_share"),
      entityId: asEntityId("player_1"),
      asOf: "2025-11-05T00:00:00.000Z",
    });
    expect(mid?.value).toBe(0.55);
  });

  it("getPublic refuses non-eligible", () => {
    const s = new InMemoryFeatureStore();
    s.put({
      featureId: asFeatureId("x"),
      entityId: asEntityId("e"),
      asOf: "2025-11-01T00:00:00.000Z",
      value: 1,
      sourceRights: "licensed",
      pitCorrect: true,
      publicApiEligible: false,
    });
    const api = getPublicFeature(s, "x", "e", "2025-11-02T00:00:00.000Z");
    expect(api.ok).toBe(false);
  });

  it("refuses rights_hold + public eligible write", () => {
    const s = new InMemoryFeatureStore();
    expect(() =>
      s.put({
        featureId: asFeatureId("x"),
        entityId: asEntityId("e"),
        asOf: "2025-11-01T00:00:00.000Z",
        value: 1,
        sourceRights: "rights_hold",
        pitCorrect: true,
        publicApiEligible: true,
      }),
    ).toThrow(/rights_hold/);
  });
});

describe("scorebug harness", () => {
  it("computes exact/clean rates", () => {
    const report = runHarness([
      {
        truth: {
          frameId: "1",
          clock: "12:34",
          homeScore: 14,
          awayScore: 7,
          quarter: 2,
        },
        pred: {
          frameId: "1",
          clock: "12:34",
          homeScore: 14,
          awayScore: 7,
          quarter: 2,
        },
      },
    ]);
    expect(report.exactRate).toBe(1);
    expect(report.cleanRate).toBe(1);
  });
});

describe("proprietary metrics", () => {
  it("holds shippable until sample floor", () => {
    const m = opticalConfirmationScore([]);
    expect(m.shippable).toBe(false);
    expect(m.value).toBeNull();
  });
});

describe("feast export", () => {
  it("exports only pit-correct rows", () => {
    const s = new InMemoryFeatureStore();
    const r = s.put({
      featureId: asFeatureId("a"),
      entityId: asEntityId("b"),
      asOf: "2025-01-01T00:00:00.000Z",
      value: 3,
      sourceRights: "free_legal",
      pitCorrect: true,
      publicApiEligible: true,
    });
    expect(exportForFeast([r])).toHaveLength(1);
  });
});
