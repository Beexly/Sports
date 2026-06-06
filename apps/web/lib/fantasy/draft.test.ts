import { describe, it, expect } from "vitest";
import { PLAYERS, playerById, type Pos } from "./players";
import { positionalScarcity, detectRuns, parseAdpCsv, valueVsAdp } from "./draft";

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
