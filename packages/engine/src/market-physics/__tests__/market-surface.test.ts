import { describe, it, expect } from "vitest";
import {
  americanToImpliedProb,
  devig,
  median,
  buildMarketSurface,
  marketInstanceKey,
  pointDirection,
  getInstance,
  outcomeOf,
  bookOutlierFlags,
  type Quote,
} from "../market-surface.js";

describe("price math", () => {
  it("converts American odds to implied probability", () => {
    expect(americanToImpliedProb(-110)).toBeCloseTo(0.5238, 4);
    expect(americanToImpliedProb(100)).toBeCloseTo(0.5, 6);
    expect(americanToImpliedProb(150)).toBeCloseTo(0.4, 6);
    expect(americanToImpliedProb(-200)).toBeCloseTo(0.6667, 4);
  });

  it("removes vig by normalizing implied probs to 1", () => {
    const nv = devig({ OVER: americanToImpliedProb(-110), UNDER: americanToImpliedProb(-110) });
    expect(nv["OVER"]).toBeCloseTo(0.5, 6);
    expect(nv["UNDER"]).toBeCloseTo(0.5, 6);
    const skew = devig({ HOME: americanToImpliedProb(-200), AWAY: americanToImpliedProb(170) });
    expect(skew["HOME"]! + skew["AWAY"]!).toBeCloseTo(1, 9);
    expect(skew["HOME"]!).toBeGreaterThan(skew["AWAY"]!);
  });

  it("median handles odd/even/empty", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([1, 2, 3, 4])).toBe(2.5);
    expect(median([])).toBeNull();
  });
});

describe("instance grouping + direction", () => {
  it("keys instances by player/team/market", () => {
    expect(marketInstanceKey({ book: "x", market: "spread", outcome: "HOME", price: -110 } as Quote)).toBe("spread");
    expect(marketInstanceKey({ book: "x", market: "team_total", outcome: "OVER", team: "KC", price: -110 } as Quote)).toBe("team_total:KC");
    expect(marketInstanceKey({ book: "x", market: "player_rush_yds", outcome: "OVER", player: "Bijan Robinson", price: -110 } as Quote)).toBe("player_rush_yds:Bijan Robinson");
  });

  it("knows which point direction favors the bettor", () => {
    expect(pointDirection("OVER")).toBe("lower");
    expect(pointDirection("UNDER")).toBe("higher");
    expect(pointDirection("HOME")).toBe("higher");
    expect(pointDirection("YES")).toBe("none");
  });
});

// A small 3-book NFL surface fixture.
function fixture(): Quote[] {
  const t = "2024-09-08T16:00:00Z";
  return [
    // total 45.5 at two books, 46.5 at a third (the outlier book is slow/high)
    { book: "pinnacle", market: "total", outcome: "OVER", point: 45.5, price: -110, timestamp: t },
    { book: "pinnacle", market: "total", outcome: "UNDER", point: 45.5, price: -110, timestamp: t },
    { book: "fanduel", market: "total", outcome: "OVER", point: 45.5, price: -108, timestamp: t },
    { book: "fanduel", market: "total", outcome: "UNDER", point: 45.5, price: -112, timestamp: t },
    { book: "slowbook", market: "total", outcome: "OVER", point: 46.5, price: -110, timestamp: "2024-09-08T15:30:00Z" },
    { book: "slowbook", market: "total", outcome: "UNDER", point: 46.5, price: -110, timestamp: "2024-09-08T15:30:00Z" },
    // spread, home -3 / away +3
    { book: "pinnacle", market: "spread", outcome: "HOME", point: -3, price: -110, timestamp: t },
    { book: "pinnacle", market: "spread", outcome: "AWAY", point: 3, price: -110, timestamp: t },
    { book: "fanduel", market: "spread", outcome: "HOME", point: -2.5, price: -115, timestamp: t },
    { book: "fanduel", market: "spread", outcome: "AWAY", point: 2.5, price: -105, timestamp: t },
    // a player prop
    { book: "pinnacle", market: "player_rush_yds", outcome: "OVER", player: "Bijan Robinson", point: 70.5, price: -112, timestamp: t },
    { book: "pinnacle", market: "player_rush_yds", outcome: "UNDER", player: "Bijan Robinson", point: 70.5, price: -108, timestamp: t },
  ];
}

describe("buildMarketSurface", () => {
  const s = buildMarketSurface("game1", fixture());

  it("lists books and groups instances", () => {
    expect(s.books).toEqual(["fanduel", "pinnacle", "slowbook"]);
    expect(getInstance(s, "total")).toBeDefined();
    expect(getInstance(s, "spread")).toBeDefined();
    expect(getInstance(s, "player_rush_yds:Bijan Robinson")?.player).toBe("Bijan Robinson");
  });

  it("computes consensus, best-available, and dispersion for the total", () => {
    const over = outcomeOf(getInstance(s, "total"), "OVER")!;
    expect(over.nBooks).toBe(3);
    expect(over.consensusPoint).toBe(45.5); // median of [45.5,45.5,46.5]
    expect(over.bestPoint).toBe(45.5); // OVER prefers the lower number
    expect(over.bestPrice).toBe(-108); // highest payout among [-110,-108,-110]
    expect(over.pointDispersion).toBe(1); // 46.5 - 45.5
  });

  it("de-vigs two-way markets to fair probabilities summing to 1", () => {
    const total = getInstance(s, "total")!;
    expect(total.noVig["OVER"]! + total.noVig["UNDER"]!).toBeCloseTo(1, 9);
  });

  it("best spread point favors each side's own number", () => {
    const home = outcomeOf(getInstance(s, "spread"), "HOME")!;
    expect(home.bestPoint).toBe(-2.5); // home prefers the higher (less negative) handicap
  });

  it("flags the off-consensus (stale-candidate) book on the total", () => {
    // slowbook sits at 46.5 while consensus is 45.5 — its UNDER is mispriced high vs consensus.
    const under = outcomeOf(getInstance(s, "total"), "UNDER")!;
    // points differ but prices are all near -110, so implied dispersion is small; the point
    // outlier is the signal. Confirm we retain per-book detail to detect it.
    const slow = under.byBook.find((b) => b.book === "slowbook")!;
    expect(slow.point).toBe(46.5);
    expect(under.byBook).toHaveLength(3);
  });

  it("bookOutlierFlags surfaces a book priced off consensus", () => {
    const q = fixture();
    q.push({ book: "badbook", market: "total", outcome: "OVER", point: 45.5, price: 120, timestamp: "2024-09-08T16:00:00Z" });
    const s2 = buildMarketSurface("g", q);
    const over = outcomeOf(getInstance(s2, "total"), "OVER")!;
    const flags = bookOutlierFlags(over, 0.04);
    expect(flags.some((f) => f.book === "badbook")).toBe(true);
  });
});
