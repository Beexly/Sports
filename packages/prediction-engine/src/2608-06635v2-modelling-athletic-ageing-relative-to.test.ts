/**
 * Vitest suite for arXiv:2608.06635v2 (Modelling Athletic Ageing Relative to an Estimated Performance Envelope).
 * Gate: ADOPT STAR age curves if rolling-origin RMSE on age-30+ WR seasons beats the static age-curve baseline by >=5% AND the near-linearity diagnostic is computed and reported (no silent gamma fitting). Reject if rho-hat(alpha,delta) ~= 0 (no level-tempo structure — the hierarchy buys nothing) or if the envelope is unstable across bootstrap refits.
 */
import { describe, it, expect } from "vitest";
import { ingest, withinBudget, replayCursor, RawEvent, NormEvent } from "./2608-06635v2-modelling-athletic-ageing-relative-to";

describe("2608-06635v2 real-time data platform layer", () => {
  const typeMap = new Map([["feed-a", "play"], ["feed-b", "injury"]]);
  it("dedupes and validates on ingest", () => {
    const seen = new Set<string>();
    const evs: RawEvent[] = [
      { source: "feed-a", eventId: "e1", ts: 1000, payload: {} },
      { source: "feed-a", eventId: "e1", ts: 1000, payload: {} }, // dup
      { source: "feed-b", eventId: "", ts: 1001, payload: {} }, // invalid
    ];
    const { accepted, dropped } = ingest(evs, seen, 60000, 2000, typeMap);
    expect(accepted).toHaveLength(1);
    expect(accepted[0]?.type).toBe("play");
    expect(dropped).toBe(2);
  });
  it("enforces the latency budget", () => {
    const evs: NormEvent[] = [{ source: "a", eventId: "e1", ts: 1000, type: "play", payload: {} }];
    expect(withinBudget(evs, 1500, 1000)).toBe(true);
    expect(withinBudget(evs, 2500, 1000)).toBe(false);
    expect(() => withinBudget(evs, 1500, 0)).toThrow();
  });
  it("replay cursor finds the backfill start", () => {
    const evs: NormEvent[] = [100, 200, 300, 400].map((ts, i) => ({
      source: "a", eventId: `e${i}`, ts, type: "play", payload: {},
    }));
    expect(replayCursor(evs, 250)).toBe(2);
    expect(replayCursor(evs, 100)).toBe(0);
    expect(replayCursor(evs, 999)).toBe(4);
  });
});
