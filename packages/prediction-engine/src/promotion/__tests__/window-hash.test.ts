import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { computeWindowHash } from "../window-hash.js";
import type { RegisteredWindow } from "../types.js";

const window: RegisteredWindow = {
  windowId: "w-2026-h1",
  marketFamily: "nfl-spreads",
  registeredAt: "2026-01-01T00:00:00.000Z",
  start: "2026-02-01T00:00:00.000Z",
  end: "2026-03-01T00:00:00.000Z",
  nMin: 500,
  deltaPrac: 0.002,
  epsilonClv: 0.0005,
  minClvN: 100,
  concurrentChallengers: 1,
  alpha: 0.05,
  registeredEventIds: ["evt-1", "evt-2"],
  coverageFloor: 0.95,
};

describe("computeWindowHash", () => {
  it("is a real sha256 digest, not a template-string stub", () => {
    const hash = computeWindowHash(window, "rev-abc123");
    expect(hash).toMatch(/^sha256:[0-9a-f]{64}$/);

    // The skeleton's defect: `sha256:${windowId}:${codeRevision}` is not a
    // hash at all — it doesn't even contain hex digits derived from the
    // rest of the window. Assert the real digest independently: hashing the
    // same canonical payload by hand (sorted keys) must reproduce it.
    const canonical = {
      codeRevision: "rev-abc123",
      window: {
        alpha: window.alpha,
        concurrentChallengers: window.concurrentChallengers,
        coverageFloor: window.coverageFloor,
        deltaPrac: window.deltaPrac,
        end: window.end,
        epsilonClv: window.epsilonClv,
        marketFamily: window.marketFamily,
        minClvN: window.minClvN,
        nMin: window.nMin,
        registeredAt: window.registeredAt,
        registeredEventIds: window.registeredEventIds,
        start: window.start,
        windowId: window.windowId,
      },
    };
    const expected = `sha256:${createHash("sha256").update(JSON.stringify(canonical), "utf8").digest("hex")}`;
    expect(hash).toBe(expected);
  });

  it("is deterministic across repeated calls", () => {
    const a = computeWindowHash(window, "rev-abc123");
    const b = computeWindowHash(window, "rev-abc123");
    expect(a).toBe(b);
  });

  it("is independent of source key ordering (canonicalization)", () => {
    const reordered: RegisteredWindow = {
      alpha: window.alpha,
      concurrentChallengers: window.concurrentChallengers,
      coverageFloor: window.coverageFloor,
      deltaPrac: window.deltaPrac,
      end: window.end,
      epsilonClv: window.epsilonClv,
      marketFamily: window.marketFamily,
      minClvN: window.minClvN,
      nMin: window.nMin,
      registeredAt: window.registeredAt,
      registeredEventIds: window.registeredEventIds,
      start: window.start,
      windowId: window.windowId,
    };
    expect(computeWindowHash(reordered, "rev-abc123")).toBe(computeWindowHash(window, "rev-abc123"));
  });

  it("changes when codeRevision changes", () => {
    const a = computeWindowHash(window, "rev-abc123");
    const b = computeWindowHash(window, "rev-def456");
    expect(a).not.toBe(b);
  });

  it("changes when ANY registered window parameter changes", () => {
    const base = computeWindowHash(window, "rev-abc123");
    const variants: RegisteredWindow[] = [
      { ...window, windowId: "w-other" },
      { ...window, marketFamily: "nba-totals" },
      { ...window, start: "2026-02-02T00:00:00.000Z" },
      { ...window, end: "2026-03-02T00:00:00.000Z" },
      { ...window, registeredAt: "2026-01-02T00:00:00.000Z" },
      { ...window, nMin: 501 },
      { ...window, deltaPrac: 0.0021 },
      { ...window, epsilonClv: 0.0006 },
      { ...window, minClvN: 101 },
      { ...window, concurrentChallengers: 2 },
      { ...window, alpha: 0.04 },
    ];
    for (const variant of variants) {
      expect(computeWindowHash(variant, "rev-abc123")).not.toBe(base);
    }
  });
});
