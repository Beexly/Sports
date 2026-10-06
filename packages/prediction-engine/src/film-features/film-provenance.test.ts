import { describe, expect, it } from "vitest";
import {
  filmProvenance,
  assertPublishable,
} from "./film-provenance.js";

describe("filmProvenance", () => {
  it("stamps film source, zero weight, UNCALIBRATED", () => {
    const p = filmProvenance(42, 0.8);
    expect(p.source).toBe("film");
    expect(p.plays).toBe(42);
    expect(p.confidence).toBe(0.8);
    expect(p.weight).toBe(0);
    expect(p.calibration).toBe("UNCALIBRATED");
    expect(typeof p.computedAt).toBe("string");
  });

  it("clamps confidence and floors plays", () => {
    expect(filmProvenance(-3, 2).plays).toBe(0);
    expect(filmProvenance(5, 2).confidence).toBe(1);
    expect(filmProvenance(5, -1).confidence).toBe(0);
  });
});

describe("assertPublishable", () => {
  it("throws for anything not CALIBRATED", () => {
    expect(() => assertPublishable("UNCALIBRATED")).toThrow(/not publishable/);
    expect(() => assertPublishable("SHADOW")).toThrow(/not publishable/);
    expect(() => assertPublishable("CALIBRATED")).not.toThrow();
  });
});
