import { describe, it, expect } from "vitest";
import { playerById } from "./players";
import {
  rosterProjection,
  rosterCeiling,
  spikeScore,
  stacks,
  stackScore,
  byeFragility,
  rosterStructure,
  rosterNeedsNext,
  adpDeltaValue,
  evaluateBestBallRoster,
  BEST_BALL_ROSTER_SIZE,
} from "./bestball";

// Real (illustrative) pool fixtures, chosen for known teams/byes/bands.
const vale = playerById("rb-marcus-vale")!; // ATL, bye 12, proj 312, ceil 380
const roe = playerById("wr-julian-roe")!; // MIA, bye 6, proj 308, ceil 372
const cinQb = playerById("qb-emmett-shaw")!; // CIN, bye 12
const cinWr = playerById("wr-deshawn-kemp")!; // CIN, bye 12
const ferris = playerById("rb-kj-ferris")!; // BAL, bye 14
const soto = playerById("rb-andre-soto")!; // HOU, bye 14
const orr = playerById("rb-malik-orr")!; // DEN, bye 14
const pryce = playerById("rb-deon-pryce")!; // DET, bye 8

describe("roster strength", () => {
  it("sums projection, ceiling, and spike (upside over projection)", () => {
    const roster = [vale, roe];
    expect(rosterProjection(roster)).toBe(312 + 308);
    expect(rosterCeiling(roster)).toBe(380 + 372);
    expect(spikeScore(roster)).toBe(380 - 312 + (372 - 308));
  });
});

describe("stacks", () => {
  it("detects a QB↔same-team pass-catcher stack and ignores non-stacked players", () => {
    const s = stacks([cinQb, cinWr, vale]);
    expect(s).toHaveLength(1);
    expect(s[0]!.qb.id).toBe("qb-emmett-shaw");
    expect(s[0]!.size).toBe(1);
    expect(s[0]!.catchers.map((c) => c.id)).toContain("wr-deshawn-kemp");
    expect(stackScore([cinQb, cinWr, vale])).toBe(1);
  });

  it("scores zero with no same-team correlation", () => {
    expect(stacks([cinQb, roe])).toHaveLength(0);
    expect(stackScore([cinQb, roe])).toBe(0);
  });
});

describe("byeFragility", () => {
  it("flags a position dropped below its lineup requirement by a shared bye", () => {
    const { risks, score } = byeFragility([ferris, soto, orr]); // 3 RB all bye 14
    expect(risks).toHaveLength(1);
    expect(risks[0]).toMatchObject({ week: 14, pos: "RB", onBye: 3, available: 0, starters: 2 });
    expect(score).toBe(2);
  });

  it("is clean when byes are spread across weeks", () => {
    const { risks, score } = byeFragility([vale, pryce, ferris]); // RB byes 12/8/14
    expect(risks).toEqual([]);
    expect(score).toBe(0);
  });
});

describe("rosterStructure", () => {
  it("marks every position short on an empty roster", () => {
    expect(rosterStructure([]).every((s) => s.status === "short")).toBe(true);
  });

  it("marks a position heavy when it exceeds target", () => {
    const qbs = [playerById("qb-silas-hart")!, playerById("qb-reed-callum")!, cinQb]; // 3 QB > target 2
    const qb = rosterStructure(qbs).find((s) => s.pos === "QB")!;
    expect(qb.status).toBe("heavy");
    expect(qb.have).toBe(3);
  });
});

describe("rosterNeedsNext", () => {
  it("rewards a pick that builds a stack with a rostered QB", () => {
    const recs = rosterNeedsNext([cinWr, roe], [cinQb]);
    const cinRec = recs.find((r) => r.player.id === "wr-deshawn-kemp")!;
    const miaRec = recs.find((r) => r.player.id === "wr-julian-roe")!;
    expect(cinRec.reasons.some((r) => /stack/i.test(r))).toBe(true);
    expect(miaRec.reasons.some((r) => /stack/i.test(r))).toBe(false);
  });

  it("flags a thin position room in its reasons", () => {
    const recs = rosterNeedsNext([roe], [cinQb]);
    expect(recs[0]!.reasons.some((r) => /thin WR room/i.test(r))).toBe(true);
  });
});

describe("adpDeltaValue", () => {
  it("delegates to the draft module's user-CSV ADP compare", () => {
    const v = adpDeltaValue(vale, new Map([["marcus vale", 20]]), 5);
    expect(v.delta).toBe(15);
    expect(v.label).toBe("steal");
  });
});

describe("evaluateBestBallRoster", () => {
  it("returns a coherent aggregate and is not full below the roster size", () => {
    const e = evaluateBestBallRoster([cinQb, cinWr, vale]);
    expect(e.rosterSize).toBe(3);
    expect(e.full).toBe(false);
    expect(e.structure).toHaveLength(4);
    expect(e.stackScore).toBe(1);
    expect(e.ceiling).toBe(rosterCeiling([cinQb, cinWr, vale]));
    expect(BEST_BALL_ROSTER_SIZE).toBe(18);
  });
});
