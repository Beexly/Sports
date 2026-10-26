import { describe, expect, it } from "vitest";
import {
  computeInputHash,
  maybeRecompute,
  nextTuesday04CT,
} from "../continuous-reconciliation-daemon";

describe("input hash", () => {
  it("is stable for equal objects", () => {
    expect(computeInputHash({ a: 1, b: "x" })).toBe(computeInputHash({ a: 1, b: "x" }));
  });
  it("changes when an input changes", () => {
    expect(computeInputHash({ a: 1 })).not.toBe(computeInputHash({ a: 2 }));
  });
});

describe("maybeRecompute", () => {
  it("always computes on first run", () => {
    const r = maybeRecompute({ lastHash: null, lastRunAt: null }, { a: 1 }, () => 7);
    expect(r.recomputed).toBe(true);
    expect(r.reason).toBe("first-run");
    expect(r.result).toBe(7);
  });
  it("skips when inputs are unchanged", () => {
    let runs = 0;
    const inputs = { snap: 55 };
    const one = maybeRecompute({ lastHash: null, lastRunAt: null }, inputs, () => ++runs);
    const two = maybeRecompute({ lastHash: one.hash, lastRunAt: one.ranAt }, inputs, () => ++runs);
    expect(one.recomputed).toBe(true);
    expect(two.recomputed).toBe(false);
    expect(two.reason).toBe("unchanged");
    expect(runs).toBe(1);
  });
  it("recomputes when any input changes", () => {
    const one = maybeRecompute({ lastHash: null, lastRunAt: null }, { snap: 55 }, () => 1);
    const two = maybeRecompute({ lastHash: one.hash, lastRunAt: one.ranAt }, { snap: 85 }, () => 2);
    expect(two.recomputed).toBe(true);
    expect(two.reason).toBe("inputs-changed");
  });
});

describe("nextTuesday04CT", () => {
  it("returns a Tuesday at 04:00 Chicago time", () => {
    const from = new Date("2026-10-23T12:00:00Z"); // Friday
    const next = nextTuesday04CT(from);
    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Chicago", weekday: "short", hour: "numeric", minute: "numeric", hour12: false,
    });
    const parts = Object.fromEntries(fmt.formatToParts(next).map((p) => [p.type, p.value]));
    expect(parts.weekday).toBe("Tue");
    expect(Number(parts.hour)).toBe(4);
    expect(Number(parts.minute)).toBe(0);
    expect(next.getTime()).toBeGreaterThan(from.getTime());
  });
});
