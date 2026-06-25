import { describe, it, expect } from "vitest";
import { buildMarketSurface, type Quote } from "../market-surface.js";
import {
  impliedTeamTotals,
  checkSpreadTotalTeamTotal,
  checkQbReceiverConservation,
  checkRbRoleCoherence,
  checkTotalToPropTransmission,
  detectStaleBooks,
} from "../coherence.js";

const T = "2024-09-08T16:00:00Z";
const twoBook = (market: Quote["market"], outcome: string, point: number, extra: Partial<Quote> = {}): Quote[] => [
  { book: "pinnacle", market, outcome, point, price: -110, timestamp: T, ...extra },
  { book: "fanduel", market, outcome, point, price: -110, timestamp: T, ...extra },
];

function gameSurface(spreadHome: number, total: number, extra: Quote[] = []) {
  return buildMarketSurface("g", [
    ...twoBook("spread", "HOME", spreadHome),
    ...twoBook("spread", "AWAY", -spreadHome),
    ...twoBook("total", "OVER", total),
    ...twoBook("total", "UNDER", total),
    ...extra,
  ]);
}

describe("spread/total/team-total algebra", () => {
  it("derives implied team totals", () => {
    const tt = impliedTeamTotals(gameSurface(-3, 45))!;
    expect(tt.homeTotal).toBe(24); // (45 - (-3))/2
    expect(tt.awayTotal).toBe(21);
  });

  it("passes a coherent team total and flags an incoherent one", () => {
    const ok = gameSurface(-3, 45, [
      ...twoBook("team_total", "OVER", 24, { team: "KC" }),
      ...twoBook("team_total", "UNDER", 24, { team: "KC" }),
    ]);
    expect(checkSpreadTotalTeamTotal(ok, { homeTeam: "KC", awayTeam: "BUF" })).toHaveLength(0);

    const bad = gameSurface(-3, 45, [
      ...twoBook("team_total", "OVER", 27.5, { team: "KC" }), // implied 24 → Δ3.5
      ...twoBook("team_total", "UNDER", 27.5, { team: "KC" }),
    ]);
    const flags = checkSpreadTotalTeamTotal(bad, { homeTeam: "KC", awayTeam: "BUF" });
    expect(flags).toHaveLength(1);
    expect(flags[0]!.severity).toBe("contradiction");
    expect(flags[0]!.metric).toBeCloseTo(3.5, 1);
  });
});

describe("QB → receiver conservation", () => {
  const withProps = (qbYds: number, recYds: number[]) =>
    buildMarketSurface("g", [
      ...twoBook("player_pass_yds", "OVER", qbYds, { player: "QB1" }),
      ...recYds.flatMap((y, i) => twoBook("player_reception_yds", "OVER", y, { player: `WR${i}` })),
    ]);
  const recKeys = (n: number) => Array.from({ length: n }, (_, i) => `player_reception_yds:WR${i}`);

  it("accepts a conserved set", () => {
    const s = withProps(270, [90, 60, 50]); // sum 200, ratio 0.74 in band
    expect(checkQbReceiverConservation(s, { qbKey: "player_pass_yds:QB1", receiverKeys: recKeys(3) })).toHaveLength(0);
  });

  it("warns when receiver surface is far too light (stale/incomplete)", () => {
    const s = withProps(270, [50, 30]); // sum 80, ratio 0.30
    const f = checkQbReceiverConservation(s, { qbKey: "player_pass_yds:QB1", receiverKeys: recKeys(2) });
    expect(f[0]!.severity).toBe("warn");
  });

  it("flags a contradiction when receivers exceed the QB line", () => {
    const s = withProps(200, [120, 110]); // sum 230 > 200
    const f = checkQbReceiverConservation(s, { qbKey: "player_pass_yds:QB1", receiverKeys: recKeys(2) });
    expect(f[0]!.severity).toBe("contradiction");
  });
});

describe("RB role coherence", () => {
  it("flags a high rush line on a likely-trailing team", () => {
    const s = gameSurface(7, 40, twoBook("player_rush_yds", "OVER", 72, { player: "RB1" }));
    // away team (RB1's) implied total = (40+7)/2 = 23.5? home spread +7 means home is the DOG.
    // Put RB on the home dog: implied home total = (40-7)/2 = 16.5 ≤ 18 → flag.
    const f = checkRbRoleCoherence(s, { rbRushKey: "player_rush_yds:RB1", rbTeam: "KC", homeTeam: "KC", awayTeam: "BUF", highLine: 65 });
    expect(f).toHaveLength(1);
    expect(f[0]!.check).toBe("rb_role_coherence");
  });

  it("does not flag a high rush line on a strong offense", () => {
    const s = gameSurface(-7, 50, twoBook("player_rush_yds", "OVER", 72, { player: "RB1" }));
    // home favored, implied home total = (50+7)/2 = 28.5 > 18 → no flag.
    const f = checkRbRoleCoherence(s, { rbRushKey: "player_rush_yds:RB1", rbTeam: "KC", homeTeam: "KC", awayTeam: "BUF" });
    expect(f).toHaveLength(0);
  });
});

describe("total → prop transmission (temporal)", () => {
  it("flags props that fail to move when the total moves", () => {
    const before = gameSurface(-3, 45, [
      ...twoBook("player_rush_yds", "OVER", 60, { player: "RB" }),
      ...twoBook("player_reception_yds", "OVER", 50, { player: "WR" }),
    ]);
    const after = gameSurface(-3, 42, [
      ...twoBook("player_rush_yds", "OVER", 57, { player: "RB" }), // moved with the total
      ...twoBook("player_reception_yds", "OVER", 50, { player: "WR" }), // STALE
    ]);
    const r = checkTotalToPropTransmission(before, after, {
      propKeys: ["player_rush_yds:RB", "player_reception_yds:WR"],
      totalThreshold: 2,
    });
    expect(r.totalMove).toBe(-3);
    expect(r.lagging.map((l) => l.key)).toEqual(["player_reception_yds:WR"]);
    expect(r.flags).toHaveLength(1);
  });

  it("does nothing when the total barely moves", () => {
    const before = gameSurface(-3, 45);
    const after = gameSurface(-3, 44.5);
    expect(checkTotalToPropTransmission(before, after, { propKeys: [], totalThreshold: 2 }).flags).toHaveLength(0);
  });
});

describe("book staleness (consensus-moved-first)", () => {
  function totalAcross(points: Record<string, number>): Quote[] {
    return Object.entries(points).flatMap(([book, p]) => [
      { book, market: "total" as const, outcome: "OVER", point: p, price: -110, timestamp: T },
      { book, market: "total" as const, outcome: "UNDER", point: p, price: -110, timestamp: T },
    ]);
  }
  it("flags the book that failed to follow a consensus move", () => {
    const before = buildMarketSurface("g", totalAcross({ pinnacle: 45, fanduel: 45, slowbook: 45 }));
    const after = buildMarketSurface("g", totalAcross({ pinnacle: 43, fanduel: 43, slowbook: 45 }));
    const { stale, flags } = detectStaleBooks(before, after, { instanceKey: "total", outcome: "OVER" });
    expect(stale.map((s) => s.book)).toEqual(["slowbook"]);
    expect(flags[0]!.metric).toBe(2);
  });

  it("does not flag staleness when the consensus did not move", () => {
    const before = buildMarketSurface("g", totalAcross({ pinnacle: 45, fanduel: 45, slowbook: 45 }));
    const after = buildMarketSurface("g", totalAcross({ pinnacle: 45, fanduel: 45, slowbook: 45 }));
    expect(detectStaleBooks(before, after, { instanceKey: "total", outcome: "OVER" }).stale).toHaveLength(0);
  });
});
