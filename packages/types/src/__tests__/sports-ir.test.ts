import { describe, expect, it } from "vitest";
import { SPORTS_IR_SCHEMA_VERSION, type SportsIrEntity, type SportsIrObservation, type SportsIrValue } from "../index.js";

describe("SportsIR v0 primitives", () => {
  it("exposes a stable schema-version tag", () => {
    expect(SPORTS_IR_SCHEMA_VERSION).toBe("sports-ir/v0");
  });

  it("SportsIrValue accepts every JSON-safe shape (null, bool, number, string, nested array/object)", () => {
    const values: SportsIrValue[] = [
      null,
      true,
      false,
      42,
      "text",
      [1, "two", null, [3]],
      { a: 1, b: { c: [true, null] } },
    ];
    expect(values).toHaveLength(7);
  });

  it("SportsIrEntity carries an explicit, non-inferred kind + label", () => {
    const entity: SportsIrEntity = { id: "game-1", kind: "GAME", label: "Away at Home" };
    expect(entity.kind).toBe("GAME");
  });

  it("SportsIrObservation carries both clocks plus provenance, publishedAt/effectiveAt optional", () => {
    const minimal: SportsIrObservation = {
      id: "obs-1",
      entityId: "game-1",
      attribute: "score.home",
      value: 21,
      source: "nflverse",
      occurredAt: "2026-07-14T20:00:00.000Z",
      observedAt: "2026-07-14T23:00:00.000Z",
    };
    expect(minimal.publishedAt).toBeUndefined();

    const full: SportsIrObservation = {
      ...minimal,
      publishedAt: "2026-07-14T23:05:00.000Z",
      effectiveAt: "2026-07-14T20:00:00.000Z",
    };
    expect(full.effectiveAt).toBe("2026-07-14T20:00:00.000Z");
  });
});
