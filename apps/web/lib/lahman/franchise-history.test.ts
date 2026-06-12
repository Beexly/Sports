import { describe, expect, it } from "vitest";
import { buildFranchiseHistory } from "./franchise-history";

const RECORDS = [
  { yearID: "1903", franchID: "BOS", name: "Boston Americans", W: "91", L: "47", WSWin: "Y", LgWin: "Y" },
  { yearID: "2018", franchID: "BOS", name: "Boston Red Sox", W: "108", L: "54", WSWin: "Y", LgWin: "Y" },
  { yearID: "2019", franchID: "BOS", name: "Boston Red Sox", W: "84", L: "78", WSWin: "N", LgWin: "N" },
  { yearID: "1962", franchID: "NYM", name: "New York Mets", W: "40", L: "120", WSWin: "N", LgWin: "N" },
  { yearID: "1969", franchID: "NYM", name: "New York Mets", W: "100", L: "62", WSWin: "Y", LgWin: "Y" },
  // malformed rows must be skipped, not defaulted
  { yearID: "", franchID: "BAD", name: "Ghost Team", W: "10", L: "0", WSWin: "Y", LgWin: "Y" },
];

describe("buildFranchiseHistory", () => {
  const rows = buildFranchiseHistory(RECORDS);

  it("rolls every season up per franchise with titles and pennants", () => {
    const bos = rows.find((r) => r.franchise === "BOS")!;
    expect(bos.seasons).toBe(3);
    expect(bos.wins).toBe(91 + 108 + 84);
    expect(bos.worldSeriesTitles).toBe(2);
    expect(bos.pennants).toBe(2);
    expect(bos.firstSeason).toBe(1903);
    expect(bos.lastSeason).toBe(2019);
    expect(bos.currentName).toBe("Boston Red Sox");
  });

  it("best season is by win percentage, with the year attached", () => {
    const bos = rows.find((r) => r.franchise === "BOS")!;
    expect(bos.bestSeason).toEqual({ year: 2018, wins: 108, losses: 54 });
    const nym = rows.find((r) => r.franchise === "NYM")!;
    expect(nym.bestSeason.year).toBe(1969);
  });

  it("sorts by all-time wins and computes win pct", () => {
    expect(rows[0]!.franchise).toBe("BOS");
    expect(rows[0]!.winPct).toBeCloseTo(283 / (283 + 179), 3);
  });

  it("skips rows without a year or franchise instead of inventing them", () => {
    expect(rows.find((r) => r.franchise === "BAD")).toBeUndefined();
  });
});
