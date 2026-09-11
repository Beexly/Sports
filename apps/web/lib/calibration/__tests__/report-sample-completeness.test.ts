import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The public /performance "Calibration Report" panel must score the WHOLE
 * population its own where-clause admits.
 *
 * Found in production 2026-09-12: the loader carried `take: 500`, so the panel
 * silently scored a rolling window of the newest settled picks while its header
 * still read "N settled picks". Measured against the same production rows:
 *
 *   take: 500    "500 settled picks"    80-89 bucket 78.0% (n=41)   brier 0.236
 *   no take      "2043 settled picks"   80-89 bucket 51.9% (n=129)  brier 0.261
 *
 * Meanwhile `lib/calibration/confidence-tail.ts` reads the SAME population with
 * NO cap and called the ≥80 tail overconfident (52.3% against 86.6% claimed,
 * n=222). One population definition, two public samples, two different stories.
 * These tests pin the sample to the population.
 */

const mocks = vi.hoisted(() => ({
  pickFindMany: vi.fn<(args?: { take?: number }) => Promise<unknown[]>>(),
  effective: vi.fn<() => Promise<{ canExposePerformanceStats: boolean }>>(),
}));

vi.mock("@sports/db", () => ({
  db: { pick: { findMany: mocks.pickFindMany } },
}));

vi.mock("@/lib/ops/effective-performance-gate", () => ({
  resolveEffectivePerformanceGate: mocks.effective,
}));

import { __resetPublicCalibrationSampleCache, loadPublicCalibrationReport } from "@/lib/calibration/report";

function settledPick(confidence: number, result: "WIN" | "LOSS", id: string) {
  return {
    id,
    confidence,
    result,
    modelVersion: "v5.2.7",
    pickType: "MONEYLINE",
    riskLevel: "MEDIUM",
    game: { sport: { name: "MLB" }, dataQualityScore: 80 },
  };
}

describe("loadPublicCalibrationReport — the sample is the whole eligible population", () => {
  beforeEach(() => {
    // C-322: the loader memoises its sample, so a test that did not clear the memo
    // would silently be asserting against the PREVIOUS test's rows.
    __resetPublicCalibrationSampleCache();
    mocks.effective.mockResolvedValue({ canExposePerformanceStats: true });
    mocks.pickFindMany.mockReset();
    mocks.pickFindMany.mockResolvedValue([]);
  });

  it("requests no `take`: a cap replaces the record with a rolling window the header does not disclose", async () => {
    await loadPublicCalibrationReport();
    expect(mocks.pickFindMany).toHaveBeenCalledTimes(1);
    const args = mocks.pickFindMany.mock.calls[0]?.[0];
    expect(args?.take).toBeUndefined();
  });

  it("reports the sample size the query actually returned, past any 500-row cap", async () => {
    const rows = [
      ...Array.from({ length: 600 }, (_, i) => settledPick(55, i % 2 === 0 ? "WIN" : "LOSS", `low-${i}`)),
      ...Array.from({ length: 600 }, (_, i) => settledPick(85, i % 3 === 0 ? "LOSS" : "WIN", `high-${i}`)),
    ];
    mocks.pickFindMany.mockResolvedValue(rows);

    const report = await loadPublicCalibrationReport();

    expect(report.data.sampleSize).toBe(1200);
    expect(report.data.buckets.find((b) => b.label === "80-89")?.sampleSize).toBe(600);
    expect(report.data.population.decided).toBe(1200);
  });

  it("still withholds the population when the effective gate is closed", async () => {
    mocks.effective.mockResolvedValue({ canExposePerformanceStats: false });
    const report = await loadPublicCalibrationReport();
    expect(mocks.pickFindMany).not.toHaveBeenCalled();
    expect(report.meta.gated).toBe(true);
    expect(report.data.sampleSize).toBe(0);
    // Nothing was read, so nothing was excluded — stated, not left undefined.
    expect(report.data.excludedInPlay).toBe(0);
  });

  /**
   * C-302. C-298 excluded in-play-generated rows from the ELIGIBILITY sample and
   * C-299 stopped the generator minting new ones, but this reader did not apply
   * it — so with the performance gate open a pick priced off a live line still
   * moved a published number. The withheld row below is a HIGH-confidence WIN on
   * purpose: it is the row that would IMPROVE the record, so withholding it is
   * not self-serving, and the kept row is the losing one.
   */
  it("withholds a row generated at or after kickoff, and discloses the count with its denominator", async () => {
    const inPlay = new Date("2026-09-10T23:30:00Z");
    const kickoff = new Date("2026-09-10T23:00:00Z");
    mocks.pickFindMany.mockResolvedValue([
      {
        ...settledPick(85, "WIN", "in-play"),
        generatedAt: inPlay,
        game: { sport: { name: "MLB" }, dataQualityScore: 80, commenceTime: kickoff },
      },
      {
        ...settledPick(85, "LOSS", "pre-game"),
        generatedAt: new Date("2026-09-10T12:00:00Z"),
        game: { sport: { name: "MLB" }, dataQualityScore: 80, commenceTime: kickoff },
      },
    ]);

    const report = await loadPublicCalibrationReport();

    expect(report.data.sampleSize).toBe(1);
    expect(report.data.population.decided).toBe(1);
    expect(report.data.excludedInPlay).toBe(1);
    expect(report.data.inPlayNote).toMatch(/Excluded 1 of 2 settled rows as in-play/);
    // Never dropped by outcome: the excluded row is the WIN, the scored row the LOSS.
    expect(report.data.buckets.find((b) => b.label === "80-89")?.wins).toBe(0);
  });

  it("keeps a row whose clocks cannot be read, and reports zero exclusions", async () => {
    // Absent means "cannot tell". Dropping on a missing timestamp would shrink
    // every published denominator by however much the data happened to be missing.
    mocks.pickFindMany.mockResolvedValue([
      { ...settledPick(85, "WIN", "no-clocks"), generatedAt: null, game: { sport: { name: "MLB" }, dataQualityScore: 80, commenceTime: null } },
    ]);

    const report = await loadPublicCalibrationReport();

    expect(report.data.sampleSize).toBe(1);
    expect(report.data.excludedInPlay).toBe(0);
    expect(report.data.inPlayNote).toMatch(/Excluded 0 of 1 settled rows as in-play/);
  });

  describe("C-322 — the sample is memoised, and the freshness claim has to keep up", () => {
    it("serves a second call inside the TTL without re-querying, and stamps updatedAt with the SAMPLE's time", async () => {
      mocks.pickFindMany.mockResolvedValue([settledPick(85, "WIN", "a")]);
      const first = new Date("2026-09-11T10:00:00Z");
      const inside = new Date("2026-09-11T10:00:30Z");

      const a = await loadPublicCalibrationReport(first);
      const b = await loadPublicCalibrationReport(inside);

      // One read for two requests: that is the point of the memo.
      expect(mocks.pickFindMany).toHaveBeenCalledTimes(1);
      expect(a.data.updatedAt).toBe(first.toISOString());
      // The second call reports the SAMPLE's age, not its own arrival time.
      // Stamping `now` here is what would make "updated less than a minute ago" false.
      expect(b.data.updatedAt).toBe(first.toISOString());
      expect(b.data.updatedAt).not.toBe(inside.toISOString());
    });

    it("re-queries once the TTL has passed", async () => {
      mocks.pickFindMany.mockResolvedValue([settledPick(85, "WIN", "a")]);
      await loadPublicCalibrationReport(new Date("2026-09-11T10:00:00Z"));
      await loadPublicCalibrationReport(new Date("2026-09-11T10:01:01Z"));
      expect(mocks.pickFindMany).toHaveBeenCalledTimes(2);
    });

    it("does NOT serve the memo when the gate has closed — withholding beats the cache", async () => {
      mocks.pickFindMany.mockResolvedValue([settledPick(85, "WIN", "a")]);
      const open = await loadPublicCalibrationReport(new Date("2026-09-11T10:00:00Z"));
      expect(open.data.sampleSize).toBe(1);

      // The gate closes one request later, still inside the TTL.
      mocks.effective.mockResolvedValue({ canExposePerformanceStats: false });
      const closed = await loadPublicCalibrationReport(new Date("2026-09-11T10:00:10Z"));

      expect(closed.meta.gated).toBe(true);
      expect(closed.data.sampleSize).toBe(0);
      expect(mocks.pickFindMany).toHaveBeenCalledTimes(1); // the memo was not even consulted
    });

    it("never caches a failed read, so a recovered database is visible immediately", async () => {
      mocks.pickFindMany.mockRejectedValueOnce(new Error("database unavailable"));
      const failed = await loadPublicCalibrationReport(new Date("2026-09-11T10:00:00Z"));
      expect(failed.data.isCollecting).toBe(true);
      expect(failed.data.sampleSize).toBe(0);

      // One second later, still inside the TTL: must re-query rather than hold the error.
      mocks.pickFindMany.mockResolvedValue([settledPick(85, "WIN", "a")]);
      const recovered = await loadPublicCalibrationReport(new Date("2026-09-11T10:00:01Z"));
      expect(recovered.data.sampleSize).toBe(1);
      expect(mocks.pickFindMany).toHaveBeenCalledTimes(2);
    });
  });
});
