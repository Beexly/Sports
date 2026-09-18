import { describe, expect, it } from "vitest";
import {
  FLASH_VENN_WIDTH_MEASURE,
  measureVennWidthBySport,
} from "../venn-width-by-sport.js";

describe("measureVennWidthBySport", () => {
  it("throws on empty and cites flash rather than re-measuring production", () => {
    expect(() => measureVennWidthBySport([], 0.2)).toThrow(/empty sample/);
    expect(FLASH_VENN_WIDTH_MEASURE.vetoNfl).toBe(0.4);
    expect(FLASH_VENN_WIDTH_MEASURE.vetoOverall).toBe(0.23);
    expect(FLASH_VENN_WIDTH_MEASURE.globalCap).toBe(0.2);
  });

  it("a global 0.20 cap is a sport lottery when NFL widths are wide and NBA widths are tight", () => {
    const nfl = Array.from({ length: 40 }, (_, i) => ({
      sport: "NFL",
      width: 0.25 + (i % 5) * 0.02,
      wouldFireWithoutWidthCap: true,
    }));
    const nba = Array.from({ length: 40 }, () => ({
      sport: "NBA",
      width: 0.04,
      wouldFireWithoutWidthCap: true,
    }));
    const report = measureVennWidthBySport([...nfl, ...nba], FLASH_VENN_WIDTH_MEASURE.globalCap);
    const nflCard = report.bySport.find((s) => s.sport === "NFL")!;
    const nbaCard = report.bySport.find((s) => s.sport === "NBA")!;
    expect(nflCard.vetoRate).toBe(1);
    expect(nbaCard.vetoRate).toBe(0);
    expect(report.globalCapIsSportLottery).toBe(true);
    expect(report.dbQueried).toBe(false);
    expect(report.priced).toBe(false);
    expect(report.flashCitation.source).toBe("flash/20260918T194145225Z-669d");
  });

  it("does not count rows that would not have fired", () => {
    const rows = Array.from({ length: 30 }, (_, i) => ({
      sport: "MLB",
      width: 0.4,
      wouldFireWithoutWidthCap: i < 5,
    }));
    const report = measureVennWidthBySport(rows, 0.2);
    expect(report.overall.fireEligible).toBe(5);
    expect(report.overall.vetoed).toBe(5);
    expect(report.overall.licensed).toBe(false);
  });
});
