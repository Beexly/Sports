import { describe, it, expect } from "vitest";
import { PLAYERS, playerById, type Player, type Pos } from "./players";
import { recommend, positionalScarcity, detectRuns, parseAdpCsv, valueVsAdp, marketAdpMap, valueVsMarket } from "./draft";

describe("positionalScarcity", () => {
  it("reports remaining + startersLeft per position on the full board", () => {
    const s = positionalScarcity(PLAYERS);
    const rb = s.find((x) => x.pos === "RB")!;
    expect(rb.remaining).toBe(PLAYERS.filter((p) => p.pos === "RB").length);
    expect(rb.startersLeft).toBeGreaterThan(0);
    expect(["critical", "tight", "ok"]).toContain(rb.level);
  });

  it("flags a cliff (critical) when only the last player in the top tier remains", () => {
    // keep just the single best QB available
    const qbs = PLAYERS.filter((p) => p.pos === "QB").sort((a, b) => b.proj - a.proj);
    const available = [qbs[0]!];
    const qb = positionalScarcity(available).find((x) => x.pos === "QB")!;
    expect(qb.topTierLeft).toBe(1);
    expect(qb.level).toBe("critical");
  });
});

describe("detectRuns", () => {
  it("flags a positional run inside the window", () => {
    const picks: Pos[] = ["RB", "RB", "RB", "WR", "QB"];
    const alerts = detectRuns(picks, 5, 3);
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({ pos: "RB", count: 3 });
  });

  it("returns nothing below threshold or with no picks", () => {
    expect(detectRuns(["RB", "WR", "QB", "TE"], 5, 3)).toEqual([]);
    expect(detectRuns([], 5, 3)).toEqual([]);
  });

  it("only considers the trailing window", () => {
    const picks: Pos[] = ["RB", "RB", "RB", "WR", "WR", "WR"]; // last 3 are WR
    const alerts = detectRuns(picks, 3, 3);
    expect(alerts.map((a) => a.pos)).toEqual(["WR"]);
  });
});

describe("parseAdpCsv", () => {
  it("parses a name,adp CSV with a header", () => {
    const m = parseAdpCsv("Player,ADP\nMarcus Vale,5\nJulian Roe,3.4");
    expect(m.get("marcus vale")).toBe(5);
    expect(m.get("julian roe")).toBe(3.4);
  });

  it("handles header-less and reversed-column inputs", () => {
    expect(parseAdpCsv("Marcus Vale,12").get("marcus vale")).toBe(12);
    const rev = parseAdpCsv("ADP,Name\n7,Marcus Vale");
    expect(rev.get("marcus vale")).toBe(7);
  });

  it("skips rows without a valid positive ADP", () => {
    const m = parseAdpCsv("Player,ADP\nGhost Player,\nBad Row,-3\nReal,8");
    expect(m.has("ghost player")).toBe(false);
    expect(m.has("bad row")).toBe(false);
    expect(m.get("real")).toBe(8);
  });
});

describe("valueVsAdp", () => {
  const vale = playerById("rb-marcus-vale")!;

  it("labels a player falling well past ADP a steal", () => {
    const v = valueVsAdp(vale, new Map([["marcus vale", 20]]), 5);
    expect(v.delta).toBe(15);
    expect(v.label).toBe("steal");
  });

  it("labels reaching well ahead of ADP a reach", () => {
    expect(valueVsAdp(vale, new Map([["marcus vale", 5]]), 20).label).toBe("reach");
  });

  it("labels near-ADP picks on-time, and unknown players none", () => {
    expect(valueVsAdp(vale, new Map([["marcus vale", 6]]), 5).label).toBe("on-time");
    expect(valueVsAdp(vale, new Map(), 5).label).toBe("none");
  });
});

describe("marketAdpMap (real FFC ADP riding on pool rows)", () => {
  it("builds the lowercased-name map from rows carrying adp, skipping rows without one", () => {
    const pool: Player[] = [
      { ...playerById("rb-marcus-vale")!, adp: 3.4, adpDelta: -2.4 },
      playerById("wr-julian-roe")!, // no adp on the row
    ];
    const m = marketAdpMap(pool);
    expect(m.get("marcus vale")).toBe(3.4);
    expect(m.has("julian roe")).toBe(false);
  });

  it("is empty on the illustrative pool (fictional players carry no market)", () => {
    expect(marketAdpMap(PLAYERS).size).toBe(0);
  });

  it("feeds the same valueVsAdp compare the CSV path uses", () => {
    const enriched: Player = { ...playerById("rb-marcus-vale")!, adp: 20, adpDelta: 19 };
    const v = valueVsAdp(enriched, marketAdpMap([enriched]), 5);
    expect(v.delta).toBe(15);
    expect(v.label).toBe("steal");
  });
});

describe("byeStackRisk regression — bye 0 (unjoined) is 'no bye info', never a Week 0 stack", () => {
  // Live graded-pool rows without an FFC join carry bye 0. A roster full of
  // bye-0 rows previously made every bye-0 candidate score a false "Bye stack
  // risk: N starters on Week 0" 0.86x penalty. There is no Week 0.
  const roster: Player[] = [
    { ...playerById("rb-marcus-vale")!, bye: 0 },
    { ...playerById("wr-deshawn-kemp")!, bye: 0 },
  ];
  const base = playerById("wr-julian-roe")!;
  const other = playerById("te-rocco-vance")!;

  /** Score the SAME candidate with only the bye changed. */
  function scoreWithBye(bye: number): { score: number; reasons: readonly string[] } {
    const candidate: Player = { ...base, id: "wr-candidate", name: "Bye Candidate", bye };
    const universe = [...roster, candidate, other];
    const rec = recommend([candidate, other], roster, 6, universe).find((r) => r.player.id === "wr-candidate")!;
    return { score: rec.score, reasons: rec.reasons };
  }

  it("two candidates identical except bye 0 vs 7 score identically", () => {
    const zero = scoreWithBye(0);
    const seven = scoreWithBye(7);
    expect(zero.score).toBe(seven.score);
  });

  it("no reason ever mentions Week 0", () => {
    for (const rec of [scoreWithBye(0), scoreWithBye(7)]) {
      for (const reason of rec.reasons) expect(reason).not.toMatch(/Week 0/);
    }
  });

  it("real same-week stacking still penalizes (the fix only exempts bye <= 0)", () => {
    const stackedRoster: Player[] = [
      { ...playerById("rb-marcus-vale")!, bye: 7 },
      { ...playerById("wr-deshawn-kemp")!, bye: 7 },
    ];
    const candidate: Player = { ...base, id: "wr-candidate", name: "Bye Candidate", bye: 7 };
    const universe = [...stackedRoster, candidate, other];
    const rec = recommend([candidate, other], stackedRoster, 6, universe).find((r) => r.player.id === "wr-candidate")!;
    expect(rec.reasons.some((r) => r.includes("Week 7"))).toBe(true);
  });
});

describe("valueVsMarket (our-rank-vs-ADP steal/reach)", () => {
  const vale = playerById("rb-marcus-vale")!;

  it("labels a big positive delta (market drafts him later than we rank him) a steal", () => {
    const v = valueVsMarket({ ...vale, adp: 15, adpDelta: 12 });
    expect(v).toEqual({ adp: 15, delta: 12, label: "steal" });
  });

  it("labels a big negative delta (market well ahead of our rank) a reach", () => {
    expect(valueVsMarket({ ...vale, adp: 2, adpDelta: -11 }).label).toBe("reach");
  });

  it("labels small deltas value/on-time with the shared thresholds", () => {
    expect(valueVsMarket({ ...vale, adp: 8, adpDelta: 4 }).label).toBe("value");
    expect(valueVsMarket({ ...vale, adp: 5, adpDelta: 1.4 }).label).toBe("on-time");
  });

  it("returns none when the row carries no market ADP (illustrative pool rows)", () => {
    expect(valueVsMarket(vale).label).toBe("none");
  });
});
