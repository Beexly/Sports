import { describe, expect, it } from "vitest";
import { readFounderPick, type FounderPickContext } from "@/lib/founder-picks/factors";

const BASE: FounderPickContext = {
  sport: "NFL",
  player: "Test Back",
  team: "KC",
  opponent: "LV",
  market: "Rush Yds",
  ourNumber: 78.5,
  postedLine: 72.5,
};

describe("readFounderPick — empty context", () => {
  it("returns a pure number call with no factors", () => {
    const r = readFounderPick(BASE);
    expect(r.factors).toHaveLength(0);
    expect(r.leanSide).toBe("over");
    expect(r.summary).toMatch(/pure number call/i);
  });
});

describe("readFounderPick — depth chart", () => {
  it("boosts when the player moves up the chart", () => {
    const r = readFounderPick({ ...BASE, depthRank: 1, priorDepthRank: 2 });
    const f = r.factors.find((x) => x.key === "depth-change");
    expect(f?.direction).toBe("boost");
    expect(f?.note).toMatch(/Moved up/);
  });

  it("drags when the player moves down", () => {
    const r = readFounderPick({ ...BASE, depthRank: 3, priorDepthRank: 1 });
    const f = r.factors.find((x) => x.key === "depth-change");
    expect(f?.direction).toBe("drag");
  });

  it("does not fire when rank is unchanged", () => {
    const r = readFounderPick({ ...BASE, depthRank: 1, priorDepthRank: 1 });
    expect(r.factors.find((x) => x.key === "depth-change")).toBeUndefined();
  });
});

describe("readFounderPick — teammate OUT", () => {
  it("boosts with the vacated looks named", () => {
    const r = readFounderPick({
      ...BASE,
      teammateOutSameGroup: { name: "Starter RB", vacatedPerGame: 14.2 },
    });
    const f = r.factors.find((x) => x.key === "teammate-out");
    expect(f?.direction).toBe("boost");
    expect(f?.note).toMatch(/14\.2 looks/);
  });
});

describe("readFounderPick — OL out", () => {
  it("drags, harder for RB/QB markets", () => {
    const rb = readFounderPick({ ...BASE, olOut: { name: "LT Star", position: "LT" } });
    const rbF = rb.factors.find((x) => x.key === "ol-out");
    expect(rbF?.direction).toBe("drag");
    expect(rbF!.weight).toBeGreaterThanOrEqual(30);
  });
});

describe("readFounderPick — matchup split", () => {
  it("fires only with n>=20 and a 3pt+ gap", () => {
    const good = readFounderPick({
      ...BASE,
      matchupSplit: { label: "vs zone", playerRate: 0.62, leagueAvg: 0.55, sample: 80 },
    });
    expect(good.factors.find((x) => x.key === "matchup-split")?.direction).toBe("boost");

    const thin = readFounderPick({
      ...BASE,
      matchupSplit: { label: "vs zone", playerRate: 0.62, leagueAvg: 0.55, sample: 10 },
    });
    expect(thin.factors.find((x) => x.key === "matchup-split")).toBeUndefined();

    const tiny = readFounderPick({
      ...BASE,
      matchupSplit: { label: "vs zone", playerRate: 0.56, leagueAvg: 0.55, sample: 80 },
    });
    expect(tiny.factors.find((x) => x.key === "matchup-split")).toBeUndefined();
  });
});

describe("readFounderPick — underlying metric", () => {
  it("boosts when the process number is better than league", () => {
    const r = readFounderPick({
      ...BASE,
      sport: "MLB",
      market: "Total Bases",
      underlying: { label: "Hard-hit %", value: 52.1, leagueAvg: 40.2, higherIsBetter: true },
    });
    const f = r.factors.find((x) => x.key === "underlying");
    expect(f?.direction).toBe("boost");
    expect(f?.note).toMatch(/more is coming/);
  });
});

describe("readFounderPick — consensus", () => {
  it("names the over/under split and fires above 100 picks", () => {
    const r = readFounderPick({
      ...BASE,
      consensus: { overCount: 3700, underCount: 1300 },
    });
    const f = r.factors.find((x) => x.key === "consensus");
    expect(f).toBeDefined();
    expect(f!.note).toMatch(/3,700 over/);
    expect(f!.note).toMatch(/1,300 under/);
  });

  it("does not fire below 100 total picks", () => {
    const r = readFounderPick({ ...BASE, consensus: { overCount: 40, underCount: 30 } });
    expect(r.factors.find((x) => x.key === "consensus")).toBeUndefined();
  });

  it("treats a heavy crowd against us as a contrarian boost", () => {
    // Lean is OVER (ourNumber 78.5 > line 72.5). Crowd is 80% UNDER → against us.
    const r = readFounderPick({
      ...BASE,
      consensus: { overCount: 200, underCount: 800 },
    });
    const f = r.factors.find((x) => x.key === "consensus");
    expect(f?.direction).toBe("boost");
    expect(f?.note).toMatch(/fade it/);
  });
});

describe("readFounderPick — net signal and conviction", () => {
  it("multiple boosts on an OVER lean produce a positive net signal", () => {
    const r = readFounderPick({
      ...BASE,
      depthRank: 1,
      priorDepthRank: 3,
      teammateOutSameGroup: { name: "RB1", vacatedPerGame: 12 },
      matchupSplit: { label: "vs soft box", playerRate: 0.7, leagueAvg: 0.55, sample: 40 },
    });
    expect(r.netSignal).toBeGreaterThan(0);
    expect(r.conviction).toBeGreaterThan(0);
  });

  it("boosts on an UNDER lean read negative on the over-scale", () => {
    // Our number BELOW the line → lean UNDER. A depth boost favors the under,
    // so netSignal (over-scale) must be negative.
    const r = readFounderPick({
      ...BASE,
      ourNumber: 60,
      postedLine: 72.5,
      depthRank: 1,
      priorDepthRank: 3,
    });
    expect(r.leanSide).toBe("under");
    expect(r.netSignal).toBeLessThan(0);
  });

  it("conviction is clamped 0-100", () => {
    const r = readFounderPick({
      ...BASE,
      depthRank: 1,
      priorDepthRank: 5,
      teammateOutSameGroup: { name: "RB1", vacatedPerGame: 20 },
      olOut: { name: "LT", position: "LT" },
      matchupSplit: { label: "vs zone", playerRate: 0.9, leagueAvg: 0.5, sample: 100 },
      underlying: { label: "Hit rate", value: 99, leagueAvg: 40, higherIsBetter: true },
      consensus: { overCount: 5000, underCount: 100 },
    });
    expect(r.conviction).toBeGreaterThanOrEqual(0);
    expect(r.conviction).toBeLessThanOrEqual(100);
    expect(r.netSignal).toBeGreaterThanOrEqual(-100);
    expect(r.netSignal).toBeLessThanOrEqual(100);
  });
});

describe("readFounderPick — every factor carries a note", () => {
  it("no factor ships without a plain-language note", () => {
    const r = readFounderPick({
      ...BASE,
      depthRank: 1,
      priorDepthRank: 2,
      teammateOutSameGroup: { name: "X", vacatedPerGame: 10 },
      olOut: { name: "Y", position: "C" },
      injuryStatus: "questionable",
      matchupSplit: { label: "vs man", playerRate: 0.6, leagueAvg: 0.5, sample: 30 },
      underlying: { label: "Barrel %", value: 15, leagueAvg: 8, higherIsBetter: true },
      consensus: { overCount: 2000, underCount: 2000 },
      rest: { label: "B2B", gamesInLastDays: 3, daysRest: 0 },
    });
    expect(r.factors.length).toBeGreaterThanOrEqual(6);
    for (const f of r.factors) {
      expect(f.note.length).toBeGreaterThan(10);
      expect(f.source.length).toBeGreaterThan(0);
    }
  });
});
