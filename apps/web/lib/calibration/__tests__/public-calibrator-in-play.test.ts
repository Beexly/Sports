import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * C-302, reader three. The public calibrator is fit from learning-eligible settled
 * picks and its output is applied to the confidence a reader sees on a pick, so a
 * row generated at or after kickoff must not shape it: that row's "publish-time"
 * probability is a LIVE price that already encodes part of the outcome it was
 * later graded against.
 *
 * The same rule already governs the C-298 eligibility sample, the /performance
 * panel (calibration/report.ts) and the tail monitor (calibration/confidence-tail.ts).
 * These tests pin the third reader to it.
 */

const mocks = vi.hoisted(() => ({
  pickFindMany: vi.fn<(args?: { select?: { generatedAt?: boolean; game?: { select?: { commenceTime?: boolean } } } }) => Promise<unknown[]>>(),
}));

vi.mock("@sports/db", () => ({
  db: { pick: { findMany: mocks.pickFindMany } },
}));

import { __resetPublicCalibratorCache, loadPublicCalibratorFit } from "@/lib/calibration/public-confidence";

const KICKOFF = new Date("2026-09-10T23:00:00Z");

describe("loadPublicCalibratorFit — the public fit excludes in-play rows (C-302)", () => {
  beforeEach(() => {
    __resetPublicCalibratorCache();
    mocks.pickFindMany.mockReset();
    mocks.pickFindMany.mockResolvedValue([]);
  });

  it("selects the two clocks the exclusion reads", async () => {
    await loadPublicCalibratorFit();
    const args = mocks.pickFindMany.mock.calls[0]?.[0];
    expect(args?.select?.generatedAt).toBe(true);
    expect(args?.select?.game?.select?.commenceTime).toBe(true);
  });

  it("withholds a row generated at or after kickoff and discloses the count with its denominator", async () => {
    // The withheld row is a WIN at 90 on purpose — it is the row that would reach
    // the fit — while the kept row is a LOSS, so this cannot read as outcome-shopping.
    mocks.pickFindMany.mockResolvedValue([
      { confidence: 90, result: "WIN", generatedAt: new Date("2026-09-10T23:30:00Z"), game: { commenceTime: KICKOFF } },
      { confidence: 90, result: "LOSS", generatedAt: new Date("2026-09-10T09:00:00Z"), game: { commenceTime: KICKOFF } },
    ]);

    const fit = await loadPublicCalibratorFit();

    expect(fit.sampleSize).toBe(1);
    expect(fit.excludedInPlay).toBe(1);
    expect(fit.inPlayNote).toMatch(/Excluded 1 of 2 settled rows as in-play/);
  });

  it("keeps a row whose clocks cannot be read, and reports zero exclusions", async () => {
    // Absent means "cannot tell". Dropping would shrink the fit by however much the
    // data happened to be missing, which is the defect class this repo keeps finding.
    mocks.pickFindMany.mockResolvedValue([
      { confidence: 90, result: "WIN", generatedAt: null, game: null },
    ]);

    const fit = await loadPublicCalibratorFit();

    expect(fit.sampleSize).toBe(1);
    expect(fit.excludedInPlay).toBe(0);
    expect(fit.inPlayNote).toMatch(/Excluded 0 of 1 settled rows as in-play/);
  });

  it("rows with no clocks at all are still fit, so the exclusion cannot empty the fit", async () => {
    mocks.pickFindMany.mockResolvedValue([
      { confidence: 70, result: "WIN" },
      { confidence: 70, result: "LOSS" },
    ]);
    const fit = await loadPublicCalibratorFit();
    expect(fit.sampleSize).toBe(2);
    expect(fit.excludedInPlay).toBe(0);
  });
});
