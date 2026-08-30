import { describe, it, expect } from "vitest";
import { rosterFromIds, sampleRoster, SAMPLE_ROSTER_SHAPE, optimize, startReason, SLOTS } from "./lineup";
import type { Player } from "./players";

function mk(id: string, pos: Player["pos"], proj: number, extra: Partial<Player> = {}): Player {
  return {
    id, name: id, pos, team: "ATL", bye: 12, proj, floor: proj - 40, ceiling: proj + 60,
    usage: 0.5, schemeFit: 0.6, role: "role", trend: "flat", injury: "healthy", note: "", ...extra,
  };
}

const ROSTER: Player[] = [
  mk("qb1", "QB", 380), mk("qb2", "QB", 300),
  mk("rb1", "RB", 320), mk("rb2", "RB", 250), mk("rb3", "RB", 180),
  mk("wr1", "WR", 310), mk("wr2", "WR", 260), mk("wr3", "WR", 150),
  mk("te1", "TE", 240),
];

describe("lineup optimizer", () => {
  it("resolves a roster from ids against a provided pool", () => {
    const r = rosterFromIds(["rb1", "wr1"], ROSTER);
    expect(r.map((p) => p.id).sort()).toEqual(["rb1", "wr1"]);
  });

  it("fills every startable slot and benches the rest", () => {
    const o = optimize(ROSTER);
    expect(o.starters.length).toBe(SLOTS.length); // QB,RB,RB,WR,WR,TE,FLEX
    // the FLEX should be the best remaining RB/WR/TE after base slots (rb3=180 vs wr3=150) -> rb3
    const flex = o.starters.find((s) => s.slot === "FLEX");
    expect(flex?.player.id).toBe("rb3");
    expect(o.total).toBeGreaterThan(o.floor);
    expect(o.ceiling).toBeGreaterThan(o.total);
  });

  it("never starts a player ruled out", () => {
    const roster = [mk("qbOut", "QB", 999, { injury: "out" }), mk("qbOk", "QB", 300), mk("rbA", "RB", 200), mk("rbB", "RB", 190), mk("wrA", "WR", 200), mk("wrB", "WR", 190), mk("teA", "TE", 150)];
    const o = optimize(roster);
    const qb = o.starters.find((s) => s.slot === "QB");
    expect(qb?.player.id).toBe("qbOk"); // the 999-proj player is OUT and excluded
  });

  it("labels leverage verdicts and explains them", () => {
    const o = optimize(ROSTER);
    const anchor = o.starters.find((s) => s.verdict === "anchor");
    if (anchor) expect(startReason(anchor)).toContain("Anchor");
    for (const s of o.starters) expect(["anchor", "start", "close"]).toContain(s.verdict);
  });
});

describe("sampleRoster — drawing a roster from a LIVE pool", () => {
  // A pool with more than enough at each position; ids carry their proj for ordering.
  const pool: Player[] = [
    mk("qbA", "QB", 400), mk("qbB", "QB", 350), mk("qbC", "QB", 300),
    mk("rbA", "RB", 320), mk("rbB", "RB", 300), mk("rbC", "RB", 280), mk("rbD", "RB", 260), mk("rbE", "RB", 240),
    mk("wrA", "WR", 310), mk("wrB", "WR", 290), mk("wrC", "WR", 270), mk("wrD", "WR", 250), mk("wrE", "WR", 230), mk("wrF", "WR", 210),
    mk("teA", "TE", 240), mk("teB", "TE", 200), mk("teC", "TE", 160),
  ];

  it("takes the top-projected players per position in the configured shape", () => {
    const r = sampleRoster(pool);
    const count = (pos: Player["pos"]) => r.filter((p) => p.pos === pos).length;
    expect(count("QB")).toBe(SAMPLE_ROSTER_SHAPE.QB);
    expect(count("RB")).toBe(SAMPLE_ROSTER_SHAPE.RB);
    expect(count("WR")).toBe(SAMPLE_ROSTER_SHAPE.WR);
    expect(count("TE")).toBe(SAMPLE_ROSTER_SHAPE.TE);
    // top picks, never invented
    expect(r.filter((p) => p.pos === "QB").map((p) => p.id)).toEqual(["qbA", "qbB"]);
    expect(r.every((p) => pool.includes(p))).toBe(true);
  });

  it("never invents players — a thin pool yields a smaller roster, not fabricated names", () => {
    const thin = sampleRoster([mk("onlyQb", "QB", 200)]);
    expect(thin.map((p) => p.id)).toEqual(["onlyQb"]);
    expect(sampleRoster([])).toEqual([]);
  });
});
