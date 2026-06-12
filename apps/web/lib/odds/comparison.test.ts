import { describe, expect, it } from "vitest";
import {
  buildMarketBoard,
  findEdges,
  formatAmerican,
  impliedProbability,
  latestPerBook,
  noVigProbability,
  type BookLine,
} from "./comparison";

function line(partial: Partial<BookLine> & { bookmaker: string }): BookLine {
  return {
    market: "H2H",
    homePrice: null,
    awayPrice: null,
    spread: null,
    homeSpreadPrice: null,
    awaySpreadPrice: null,
    total: null,
    overPrice: null,
    underPrice: null,
    fetchedAt: "2026-06-12T00:00:00Z",
    ...partial,
  };
}

describe("odds math", () => {
  it("implied probability matches the book formulas", () => {
    expect(impliedProbability(-110)).toBeCloseTo(0.5238, 3);
    expect(impliedProbability(+150)).toBeCloseTo(0.4, 3);
  });

  it("no-vig strips the juice symmetrically", () => {
    expect(noVigProbability(-110, -110)).toBeCloseTo(0.5, 6);
    expect(noVigProbability(-200, +170)).toBeGreaterThan(0.6);
  });

  it("formats American odds with the plus sign", () => {
    expect(formatAmerican(150)).toBe("+150");
    expect(formatAmerican(-115)).toBe("-115");
  });
});

describe("latestPerBook", () => {
  it("keeps only the most recent row per bookmaker", () => {
    const rows = [
      line({ bookmaker: "draftkings", homePrice: -110, fetchedAt: "2026-06-12T00:00:00Z" }),
      line({ bookmaker: "draftkings", homePrice: -120, fetchedAt: "2026-06-12T02:00:00Z" }),
      line({ bookmaker: "fanduel", homePrice: -105, fetchedAt: "2026-06-12T01:00:00Z" }),
    ];
    const latest = latestPerBook(rows);
    expect(latest).toHaveLength(2);
    expect(latest.find((l) => l.bookmaker === "draftkings")!.homePrice).toBe(-120);
  });
});

describe("buildMarketBoard", () => {
  it("H2H: best price per side is the numerically highest American price", () => {
    const board = buildMarketBoard("H2H", [
      line({ bookmaker: "draftkings", homePrice: -115, awayPrice: -105 }),
      line({ bookmaker: "fanduel", homePrice: -110, awayPrice: -110 }),
      line({ bookmaker: "betmgm", homePrice: +100, awayPrice: -122 }),
    ]);
    expect(board.bestHome).toEqual({ bookmaker: "betmgm", price: 100, line: null });
    expect(board.bestAway).toEqual({ bookmaker: "draftkings", price: -105, line: null });
    expect(board.bookCount).toBe(3);
    expect(board.noVigHomeProb).toBeGreaterThan(0.45);
    expect(board.noVigHomeProb).toBeLessThan(0.55);
  });

  it("SPREADS: away best carries the flipped line; consensus is the median spread", () => {
    const board = buildMarketBoard("SPREADS", [
      line({ bookmaker: "a", market: "SPREADS", spread: -3.5, homeSpreadPrice: -110, awaySpreadPrice: -110 }),
      line({ bookmaker: "b", market: "SPREADS", spread: -3, homeSpreadPrice: -115, awaySpreadPrice: -105 }),
      line({ bookmaker: "c", market: "SPREADS", spread: -3.5, homeSpreadPrice: -108, awaySpreadPrice: -112 }),
    ]);
    expect(board.consensusLine).toBe(-3.5);
    expect(board.bestHome!.bookmaker).toBe("c");
    expect(board.bestAway).toEqual({ bookmaker: "b", price: -105, line: 3 });
  });

  it("TOTALS: over/under map to home/away slots with the total attached", () => {
    const board = buildMarketBoard("TOTALS", [
      line({ bookmaker: "a", market: "TOTALS", total: 44.5, overPrice: -105, underPrice: -115 }),
      line({ bookmaker: "b", market: "TOTALS", total: 45, overPrice: -110, underPrice: -110 }),
    ]);
    expect(board.consensusLine).toBeCloseTo(44.75, 2);
    expect(board.bestHome).toEqual({ bookmaker: "a", price: -105, line: 44.5 });
    expect(board.bestAway).toEqual({ bookmaker: "b", price: -110, line: 45 });
  });

  it("empty market is honest: no bests, no consensus, zero books", () => {
    const board = buildMarketBoard("H2H", []);
    expect(board.bestHome).toBeNull();
    expect(board.noVigHomeProb).toBeNull();
    expect(board.bookCount).toBe(0);
  });
});

describe("findEdges (+EV finder)", () => {
  it("flags a book whose price beats the no-vig consensus", () => {
    // Consensus says ~50/50; one book hangs +120 on home → clear +EV.
    const board = buildMarketBoard("H2H", [
      line({ bookmaker: "a", homePrice: -110, awayPrice: -110 }),
      line({ bookmaker: "b", homePrice: -108, awayPrice: -112 }),
      line({ bookmaker: "c", homePrice: -112, awayPrice: -108 }),
      line({ bookmaker: "soft", homePrice: +120, awayPrice: -150 }),
    ]);
    const edges = findEdges(board);
    expect(edges.length).toBeGreaterThanOrEqual(1);
    expect(edges[0]).toMatchObject({ side: "HOME", bookmaker: "soft", price: 120 });
    expect(edges[0]!.evPerUnit).toBeGreaterThan(0.05);
  });

  it("flags nothing when every book prices at consensus (vig eats the EV)", () => {
    const board = buildMarketBoard("H2H", [
      line({ bookmaker: "a", homePrice: -110, awayPrice: -110 }),
      line({ bookmaker: "b", homePrice: -110, awayPrice: -110 }),
      line({ bookmaker: "c", homePrice: -110, awayPrice: -110 }),
    ]);
    expect(findEdges(board)).toHaveLength(0);
  });

  it("refuses to call edges on a thin market (under 3 books)", () => {
    const board = buildMarketBoard("H2H", [
      line({ bookmaker: "a", homePrice: -110, awayPrice: -110 }),
      line({ bookmaker: "soft", homePrice: +140, awayPrice: -170 }),
    ]);
    expect(findEdges(board)).toHaveLength(0);
  });
});
