/**
 * `canRampEnforce` — pure safety predicate for a FUTURE ENFORCE ramp
 * mechanism. See apps/web/lib/ai-control-plane/enforce-gate.ts: this
 * function is currently unconsumed by production code and is tested here
 * standalone.
 */
import { describe, it, expect } from "vitest";
import { canRampEnforce } from "@/lib/ai-control-plane/enforce-gate";

const NOW = new Date("2026-07-23T00:00:00.000Z");
const RECENT_DRILL = new Date("2026-07-01T00:00:00.000Z"); // 22 days before NOW
const STALE_DRILL = new Date("2026-01-01T00:00:00.000Z"); // ~203 days before NOW

describe("canRampEnforce", () => {
  it("all conditions met -> true", () => {
    expect(
      canRampEnforce({
        shadowDays: 30,
        falseRefuseRate: 0.01,
        drillPassedAt: RECENT_DRILL,
        now: NOW,
      }),
    ).toBe(true);
  });

  it("shadowDays < 14 -> false even if everything else is fine", () => {
    expect(
      canRampEnforce({
        shadowDays: 13,
        falseRefuseRate: 0,
        drillPassedAt: RECENT_DRILL,
        now: NOW,
      }),
    ).toBe(false);
  });

  it("shadowDays exactly 14 is sufficient (boundary)", () => {
    expect(
      canRampEnforce({
        shadowDays: 14,
        falseRefuseRate: 0,
        drillPassedAt: RECENT_DRILL,
        now: NOW,
      }),
    ).toBe(true);
  });

  it("falseRefuseRate > 0.05 -> false", () => {
    expect(
      canRampEnforce({
        shadowDays: 30,
        falseRefuseRate: 0.051,
        drillPassedAt: RECENT_DRILL,
        now: NOW,
      }),
    ).toBe(false);
  });

  it("falseRefuseRate exactly 0.05 is sufficient (boundary)", () => {
    expect(
      canRampEnforce({
        shadowDays: 30,
        falseRefuseRate: 0.05,
        drillPassedAt: RECENT_DRILL,
        now: NOW,
      }),
    ).toBe(true);
  });

  it("null falseRefuseRate does not block", () => {
    expect(
      canRampEnforce({
        shadowDays: 30,
        falseRefuseRate: null,
        drillPassedAt: RECENT_DRILL,
        now: NOW,
      }),
    ).toBe(true);
  });

  it("no drillPassedAt -> false", () => {
    expect(
      canRampEnforce({
        shadowDays: 30,
        falseRefuseRate: 0,
        drillPassedAt: null,
        now: NOW,
      }),
    ).toBe(false);
  });

  it("drillPassedAt stale (> 90 days) -> false", () => {
    expect(
      canRampEnforce({
        shadowDays: 30,
        falseRefuseRate: 0,
        drillPassedAt: STALE_DRILL,
        now: NOW,
      }),
    ).toBe(false);
  });

  it("drillPassedAt exactly 90 days old is sufficient (boundary)", () => {
    const exactly90DaysAgo = new Date(NOW.getTime() - 90 * 864e5);
    expect(
      canRampEnforce({
        shadowDays: 30,
        falseRefuseRate: 0,
        drillPassedAt: exactly90DaysAgo,
        now: NOW,
      }),
    ).toBe(true);
  });

  it("defaults `now` to the current time when omitted", () => {
    // A drill that "just passed" (Date.now()) with ample shadow days and a
    // clean false-refuse rate should ramp-eligible without passing `now`.
    expect(
      canRampEnforce({
        shadowDays: 30,
        falseRefuseRate: 0,
        drillPassedAt: new Date(),
      }),
    ).toBe(true);
  });
});
