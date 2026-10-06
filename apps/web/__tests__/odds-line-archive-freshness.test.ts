/**
 * odds_line_snapshots freshness monitor — see
 * lib/ops/odds-line-archive-freshness.ts for the 2026-08-22 outage this
 * exists to catch next time (three weeks of silent writes-that-never-
 * happened, swallowed by a catch that returned a zero count).
 */
import { describe, expect, it, vi } from "vitest";
import {
  ODDS_LINE_ARCHIVE_FRESHNESS_VERDICTS,
  assessOddsLineArchiveFreshness,
  readOddsLineArchiveFreshnessInput,
  type OddsLineArchiveFreshnessThresholds,
} from "@/lib/ops/odds-line-archive-freshness";

const NOW = Date.parse("2026-09-19T12:00:00.000Z");

const THRESHOLDS: OddsLineArchiveFreshnessThresholds = {
  degradedAfterMinutes: 90,
  staleAfterMinutes: 360,
};

describe("assessOddsLineArchiveFreshness — verdict vocabulary", () => {
  it("exposes exactly three verdicts, healthy/degraded/stale, as a runtime array", () => {
    expect(ODDS_LINE_ARCHIVE_FRESHNESS_VERDICTS).toEqual(["healthy", "degraded", "stale"]);
  });
});

describe("assessOddsLineArchiveFreshness — absence is the loudest signal, not the quietest (negative control)", () => {
  it("null timestamp -> STALE, never healthy, never a bare null verdict", () => {
    const result = assessOddsLineArchiveFreshness(
      { mostRecentCapturedAt: null },
      THRESHOLDS,
      NOW,
    );
    expect(result.verdict).toBe("stale");
    expect(result.verdict).not.toBeNull();
    expect(ODDS_LINE_ARCHIVE_FRESHNESS_VERDICTS).toContain(result.verdict);
    expect(result.ageMinutes).toBeNull();
    expect(result.mostRecentCapturedAt).toBeNull();
    expect(result.reason).toMatch(/never been recorded|outage/i);
  });

  it("undefined timestamp (table never queried a row) -> STALE, same as null", () => {
    const result = assessOddsLineArchiveFreshness(
      { mostRecentCapturedAt: undefined },
      THRESHOLDS,
      NOW,
    );
    expect(result.verdict).toBe("stale");
  });

  it("unparseable timestamp string -> STALE, not silently coerced to healthy", () => {
    const result = assessOddsLineArchiveFreshness(
      { mostRecentCapturedAt: "not-a-real-timestamp" },
      THRESHOLDS,
      NOW,
    );
    expect(result.verdict).toBe("stale");
    expect(result.ageMinutes).toBeNull();
    expect(result.reason).toMatch(/could not be parsed/i);
  });

  it("this is the EXACT shape of the original 2026-08-22 bug: a catch that returns a zero count reads as absence, and absence must never read as healthy", () => {
    // Simulating a failed reader: caller got { mostRecentCapturedAt: null }
    // back from an error path, exactly like captureLineSnapshots's own
    // catch returned { persisted: 0 } instead of raising.
    const simulatedFailurePassthrough = { mostRecentCapturedAt: null, recentWindowRowCount: 0 };
    const result = assessOddsLineArchiveFreshness(simulatedFailurePassthrough, THRESHOLDS, NOW);
    expect(result.verdict).toBe("stale");
    expect(result.verdict).not.toBe("healthy");
  });
});

describe("assessOddsLineArchiveFreshness — timestamp-driven thresholds", () => {
  it("healthy: well within the degraded threshold", () => {
    const result = assessOddsLineArchiveFreshness(
      { mostRecentCapturedAt: new Date(NOW - 10 * 60_000) },
      THRESHOLDS,
      NOW,
    );
    expect(result.verdict).toBe("healthy");
    expect(result.ageMinutes).toBe(10);
    expect(result.thresholds).toEqual(THRESHOLDS);
  });

  it("degraded: past degradedAfterMinutes but not staleAfterMinutes", () => {
    const result = assessOddsLineArchiveFreshness(
      { mostRecentCapturedAt: new Date(NOW - 120 * 60_000) },
      THRESHOLDS,
      NOW,
    );
    expect(result.verdict).toBe("degraded");
    expect(result.ageMinutes).toBe(120);
  });

  it("stale: past staleAfterMinutes — the three-week-outage shape", () => {
    const agedMinutes = 21 * 24 * 60; // three weeks
    const result = assessOddsLineArchiveFreshness(
      { mostRecentCapturedAt: new Date(NOW - agedMinutes * 60_000) },
      THRESHOLDS,
      NOW,
    );
    expect(result.verdict).toBe("stale");
    expect(result.ageMinutes).toBe(agedMinutes);
  });

  it("boundary: exactly at degradedAfterMinutes is still healthy, one minute past is degraded", () => {
    const atBoundary = assessOddsLineArchiveFreshness(
      { mostRecentCapturedAt: new Date(NOW - 90 * 60_000) },
      THRESHOLDS,
      NOW,
    );
    expect(atBoundary.verdict).toBe("healthy");

    const pastBoundary = assessOddsLineArchiveFreshness(
      { mostRecentCapturedAt: new Date(NOW - 91 * 60_000) },
      THRESHOLDS,
      NOW,
    );
    expect(pastBoundary.verdict).toBe("degraded");
  });

  it("boundary: exactly at staleAfterMinutes is still degraded, one minute past is stale", () => {
    const atBoundary = assessOddsLineArchiveFreshness(
      { mostRecentCapturedAt: new Date(NOW - 360 * 60_000) },
      THRESHOLDS,
      NOW,
    );
    expect(atBoundary.verdict).toBe("degraded");

    const pastBoundary = assessOddsLineArchiveFreshness(
      { mostRecentCapturedAt: new Date(NOW - 361 * 60_000) },
      THRESHOLDS,
      NOW,
    );
    expect(pastBoundary.verdict).toBe("stale");
  });

  it("accepts an ISO string timestamp identically to a Date", () => {
    const asDate = assessOddsLineArchiveFreshness(
      { mostRecentCapturedAt: new Date(NOW - 30 * 60_000) },
      THRESHOLDS,
      NOW,
    );
    const asString = assessOddsLineArchiveFreshness(
      { mostRecentCapturedAt: new Date(NOW - 30 * 60_000).toISOString() },
      THRESHOLDS,
      NOW,
    );
    expect(asString.verdict).toBe(asDate.verdict);
    expect(asString.ageMinutes).toBe(asDate.ageMinutes);
  });

  it("clamps a future-dated timestamp to zero age rather than reporting negative age", () => {
    const result = assessOddsLineArchiveFreshness(
      { mostRecentCapturedAt: new Date(NOW + 5 * 60_000) },
      THRESHOLDS,
      NOW,
    );
    expect(result.ageMinutes).toBe(0);
    expect(result.verdict).toBe("healthy");
    expect(result.reason).toMatch(/clock skew/i);
  });
});

describe("assessOddsLineArchiveFreshness — recentWindowRowCount as corroboration", () => {
  it("a recent timestamp with a corroborating zero-row window is still judged stale, not healthy", () => {
    const result = assessOddsLineArchiveFreshness(
      { mostRecentCapturedAt: new Date(NOW - 5 * 60_000), recentWindowRowCount: 0 },
      THRESHOLDS,
      NOW,
    );
    expect(result.verdict).toBe("stale");
    expect(result.reason).toMatch(/zero rows/i);
  });

  it("a positive row count does not itself force healthy when the timestamp says stale", () => {
    const result = assessOddsLineArchiveFreshness(
      { mostRecentCapturedAt: new Date(NOW - 500 * 60_000), recentWindowRowCount: 40 },
      THRESHOLDS,
      NOW,
    );
    expect(result.verdict).toBe("stale");
  });

  it("omitting recentWindowRowCount entirely does not affect a healthy verdict", () => {
    const result = assessOddsLineArchiveFreshness(
      { mostRecentCapturedAt: new Date(NOW - 5 * 60_000) },
      THRESHOLDS,
      NOW,
    );
    expect(result.verdict).toBe("healthy");
    expect(result.recentWindowRowCount).toBeNull();
  });
});

describe("assessOddsLineArchiveFreshness — thresholds are required and validated", () => {
  it("throws when staleAfterMinutes < degradedAfterMinutes (caller contract violation)", () => {
    expect(() =>
      assessOddsLineArchiveFreshness(
        { mostRecentCapturedAt: new Date(NOW) },
        { degradedAfterMinutes: 100, staleAfterMinutes: 50 },
        NOW,
      ),
    ).toThrow(/staleAfterMinutes/);
  });

  it("throws on a negative threshold", () => {
    expect(() =>
      assessOddsLineArchiveFreshness(
        { mostRecentCapturedAt: new Date(NOW) },
        { degradedAfterMinutes: -1, staleAfterMinutes: 10 },
        NOW,
      ),
    ).toThrow(/non-negative/);
  });

  it("echoes back the exact thresholds it judged against", () => {
    const thresholds: OddsLineArchiveFreshnessThresholds = {
      degradedAfterMinutes: 20,
      staleAfterMinutes: 45,
    };
    const result = assessOddsLineArchiveFreshness(
      { mostRecentCapturedAt: new Date(NOW - 5 * 60_000) },
      thresholds,
      NOW,
    );
    expect(result.thresholds).toEqual(thresholds);
  });
});

describe("readOddsLineArchiveFreshnessInput — thin reader, mocked db", () => {
  it("shapes a found row and count into freshness input", async () => {
    const findFirst = vi.fn().mockResolvedValue({ capturedAt: new Date(NOW - 15 * 60_000) });
    const count = vi.fn().mockResolvedValue(12);
    const db = { oddsLineSnapshot: { findFirst, count } };

    const result = await readOddsLineArchiveFreshnessInput({
      db,
      recentWindowMinutes: 60,
      nowMs: NOW,
    });

    expect(result.error).toBeUndefined();
    expect(result.input.mostRecentCapturedAt).toEqual(new Date(NOW - 15 * 60_000));
    expect(result.input.recentWindowRowCount).toBe(12);
    expect(findFirst).toHaveBeenCalledWith({
      orderBy: { capturedAt: "desc" },
      select: { capturedAt: true },
    });
    expect(count).toHaveBeenCalledWith({
      where: { capturedAt: { gte: new Date(NOW - 60 * 60_000) } },
    });
  });

  it("an empty table (findFirst resolves null) shapes to absence, not a throw", async () => {
    const findFirst = vi.fn().mockResolvedValue(null);
    const count = vi.fn().mockResolvedValue(0);
    const db = { oddsLineSnapshot: { findFirst, count } };

    const result = await readOddsLineArchiveFreshnessInput({
      db,
      recentWindowMinutes: 60,
      nowMs: NOW,
    });

    expect(result.error).toBeUndefined();
    expect(result.input.mostRecentCapturedAt).toBeNull();
    expect(result.input.recentWindowRowCount).toBe(0);

    // And feeding that straight into the pure function reads STALE, never healthy.
    const { assessOddsLineArchiveFreshness: assess } = await import(
      "@/lib/ops/odds-line-archive-freshness"
    );
    expect(assess(result.input, THRESHOLDS, NOW).verdict).toBe("stale");
  });

  it("a DB error never throws out of the reader — it returns absence plus an error string", async () => {
    const findFirst = vi.fn().mockRejectedValue(new Error("connection terminated"));
    const count = vi.fn().mockResolvedValue(0);
    const db = { oddsLineSnapshot: { findFirst, count } };

    const result = await readOddsLineArchiveFreshnessInput({
      db,
      recentWindowMinutes: 60,
      nowMs: NOW,
    });

    expect(result.error).toMatch(/connection terminated/);
    expect(result.input.mostRecentCapturedAt).toBeNull();
    expect(result.input.recentWindowRowCount).toBeNull();

    // The error path resolves to absence input, which the pure function
    // still judges STALE — this is the exact "catch swallows into zero"
    // shape from the original outage, and here it cannot hide as healthy.
    const { assessOddsLineArchiveFreshness: assess } = await import(
      "@/lib/ops/odds-line-archive-freshness"
    );
    expect(assess(result.input, THRESHOLDS, NOW).verdict).toBe("stale");
  });
});
