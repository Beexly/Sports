import { describe, expect, it } from "vitest";
import { intensityAt, logLikelihood, DEFAULT_INTENSITY, GSE_LIVE_EVENT_MODEL_ENABLED } from "./live-event-model-2312.js";

describe("live event model", () => {
  it("base intensity is positive with empty history", () => {
    expect(intensityAt("home_td", 10, [])).toBeCloseTo(DEFAULT_INTENSITY.base.home_td, 10);
  });
  it("recent scoring events excite the intensity (Hawkes)", () => {
    const withHist = intensityAt("home_td", 10, [{ t: 9, kind: "home_td" }]);
    expect(withHist).toBeGreaterThan(intensityAt("home_td", 10, []));
  });
  it("injury shocks multiply the intensity", () => {
    const shocked = intensityAt("away_fg", 20, [{ t: 5, kind: "injury_shock" }]);
    expect(shocked).toBeCloseTo(intensityAt("away_fg", 20, []) * DEFAULT_INTENSITY.injuryMultiplier, 10);
  });
  it("log-likelihood is finite on a small event list", () => {
    const ll = logLikelihood([
      { t: 5, kind: "home_td" },
      { t: 20, kind: "away_fg" },
    ]);
    expect(Number.isFinite(ll)).toBe(true);
  });
  it("handles empty events", () => {
    expect(Number.isFinite(logLikelihood([]))).toBe(true);
  });
  it("stays off until the mechanism + transfer gates clear", () => {
    expect(GSE_LIVE_EVENT_MODEL_ENABLED).toBe(false);
  });
});

