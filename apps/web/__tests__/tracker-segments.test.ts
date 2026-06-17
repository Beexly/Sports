import { describe, it, expect } from "vitest";
import type { Bet } from "@/lib/tracker/clv";
import { bySport, byMarket, bySportMarket, edgeBoard } from "@/lib/tracker/segments";

/** Build a settled bet quickly. */
const bet = (id: string, sport: string, market: string, odds: number, result: Bet["result"]): Bet => ({
  id, date: "2026-01-01", sport, event: "X @ Y", market, selection: "Home", odds, stake: 1, result,
});

// NBA totals: strong (4-1 at -110). NFL spreads: weak (1-3 at -110).
const bets: Bet[] = [
  bet("1", "nba", "Total", -110, "win"),
  bet("2", "nba", "Total", -110, "win"),
  bet("3", "nba", "Total", -110, "win"),
  bet("4", "nba", "Total", -110, "win"),
  bet("5", "nba", "Total", -110, "loss"),
  bet("6", "nfl", "Spread", -110, "loss"),
  bet("7", "nfl", "Spread", -110, "loss"),
  bet("8", "nfl", "Spread", -110, "loss"),
  bet("9", "nfl", "Spread", -110, "win"),
];

describe("performance segments (units & win% per sport / market)", () => {
  it("breaks down units, win% and ROI per sport, sorted by profit", () => {
    const segs = bySport(bets);
    const nba = segs.find((s) => s.key === "nba")!;
    const nfl = segs.find((s) => s.key === "nfl")!;
    expect(nba.label).toBe("NBA");
    expect(nba.portfolio.record).toBe("4-1");
    expect(nba.portfolio.winRate).toBe(80);
    expect(nba.portfolio.profit).toBeGreaterThan(0); // +units
    expect(nfl.portfolio.winRate).toBe(25);
    expect(nfl.portfolio.profit).toBeLessThan(0); // -units
    expect(segs[0]!.key).toBe("nba"); // most profitable first
  });

  it("breaks down per market", () => {
    const byMkt = byMarket(bets);
    expect(byMkt.map((s) => s.label).sort()).toEqual(["Spread", "Total"]);
    expect(byMkt.find((s) => s.label === "Total")!.portfolio.winRate).toBe(80);
  });

  it("cuts per sport×market with readable labels", () => {
    const segs = bySportMarket(bets);
    expect(segs.find((s) => s.key === "nba|Total")!.label).toBe("NBA · Total");
  });

  it("edgeBoard ranks real-sample segments by ROI and benches tiny samples", () => {
    // Only NBA·Total clears a small minSettled; both are below 20, so both are low-sample.
    const strict = edgeBoard(bets, { minSettled: 20 });
    expect(strict.leaders.length).toBe(0);
    expect(strict.lowSample.length).toBe(2);

    const loose = edgeBoard(bets, { minSettled: 5 });
    expect(loose.leaders[0]!.key).toBe("nba|Total"); // best ROI leads
    expect(loose.leaders[0]!.portfolio.roi).toBeGreaterThan(0);
    // NFL·Spread has only 4 settled → benched even at minSettled 5
    expect(loose.lowSample.some((s) => s.key === "nfl|Spread")).toBe(true);
  });

  it("does not crown a tiny hot streak as an edge (honesty guardrail)", () => {
    const hot: Bet[] = [bet("a", "nhl", "Moneyline", 150, "win"), bet("b", "nhl", "Moneyline", 150, "win")];
    const board = edgeBoard(hot, { minSettled: 20 });
    expect(board.leaders.length).toBe(0); // 2-0 is noise, never a leader
  });
});
