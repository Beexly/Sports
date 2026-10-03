import { describe, it, expect } from "vitest";
import {
  DROPS,
  nextOccurrence,
  nextTransmission,
  formatCountdown,
} from "@/lib/broadcast/schedule";
import { buildBroadcast, NOVA, ORION } from "@/lib/fantasy/host";

/**
 * GSN Broadcast — drop cadence + two-reporter contract.
 */

describe("broadcast schedule", () => {
  it("defines the two-drop weekly cadence (pre-waiver + inactives)", () => {
    expect(DROPS.map((d) => d.kind).sort()).toEqual(["inactives", "pre-waiver"]);
    for (const d of DROPS) {
      expect(d.cadence.length).toBeGreaterThan(0);
      expect(d.purpose.length).toBeGreaterThan(0);
      expect(d.weekday).toBeGreaterThanOrEqual(0);
      expect(d.weekday).toBeLessThanOrEqual(6);
    }
  });

  it("nextOccurrence always lands on the requested weekday, strictly in the future", () => {
    const now = new Date("2026-06-21T12:00:00Z"); // a Sunday
    for (const d of DROPS) {
      const at = nextOccurrence(now, d.weekday, d.hourUtc);
      expect(at.getUTCDay()).toBe(d.weekday);
      expect(at.getTime()).toBeGreaterThan(now.getTime());
    }
  });

  it("nextTransmission returns the soonest upcoming drop", () => {
    const now = new Date("2026-06-23T18:00:00Z"); // a Tuesday evening
    const next = nextTransmission(now);
    expect(next.msUntil).toBeGreaterThan(0);
    // The soonest drop is never further out than a full week.
    expect(next.msUntil).toBeLessThanOrEqual(7 * 24 * 60 * 60 * 1000);
    // It must be the minimum across both drops.
    const all = DROPS.map((d) => nextOccurrence(now, d.weekday, d.hourUtc).getTime() - now.getTime());
    expect(next.msUntil).toBe(Math.min(...all));
  });

  it("formats a human countdown", () => {
    expect(formatCountdown(0)).toBe("now");
    expect(formatCountdown(2 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000)).toBe("2d 4h");
    expect(formatCountdown(90 * 60 * 1000)).toBe("1h 30m");
    expect(formatCountdown(20 * 60 * 1000)).toBe("20m");
  });
});

describe("two-reporter broadcast", () => {
  const broadcast = buildBroadcast();

  it("assigns every segment a reporter (Nova in the field, Orion at the desk)", () => {
    const names = new Set(broadcast.segments.map((s) => s.reporter.name));
    expect(names.has(NOVA.name)).toBe(true);
    expect(names.has(ORION.name)).toBe(true);
    for (const s of broadcast.segments) {
      expect(s.reporter.initial).toBe(s.reporter.name.charAt(0).toUpperCase());
      expect(s.reporter.role.length).toBeGreaterThan(0);
    }
  });

  it("credits both anchors and discloses they are synthetic", () => {
    expect(broadcast.plaintext).toContain(NOVA.name);
    expect(broadcast.plaintext).toContain(ORION.name);
    expect(broadcast.disclosure.toLowerCase()).toContain("synthetic presenter");
  });

  it("never sells certainty in either persona's voice rules", () => {
    for (const p of [NOVA, ORION]) {
      const text = [...p.voice, ...p.values].join(" ").toLowerCase();
      expect(text).not.toMatch(/guarantee|sure thing|can't lose|lock of/);
    }
  });
});
