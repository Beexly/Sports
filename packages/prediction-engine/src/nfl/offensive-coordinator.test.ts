import { describe, expect, it } from "vitest";
import {
  BLITZ_HEAVY_THRESHOLD,
  recommendPlays,
  scorePlay,
  type DefensiveLook,
  type GameSituation,
  type PlayCandidate,
} from "./offensive-coordinator";

const situation: GameSituation = { down: 1, distance: 10, fieldPosition: 25 };

function look(overrides: Partial<DefensiveLook> = {}): DefensiveLook {
  return {
    personnel: "nickel",
    coverage: "cover-3",
    blitzRate: 0.18,
    boxCount: 6,
    ...overrides,
  };
}

function candidates(): PlayCandidate[] {
  return [
    { formation: "gun-trips", playType: "dropback", baseEPA: 0.05 },
    { formation: "gun-trips", playType: "screen", baseEPA: 0.02 },
    { formation: "gun-bunch", playType: "rpo", baseEPA: 0.04 },
    { formation: "i-form", playType: "run", baseEPA: 0.01 },
    { formation: "gun-empty", playType: "play-action", baseEPA: 0.03 },
  ];
}

describe("offensive-coordinator scoring vs defensive look", () => {
  it("blitz-heavy look raises screen / RPO / play-action above base EPA", () => {
    const blitzLook = look({ blitzRate: 0.45, coverage: "cover-1", boxCount: 7 });
    expect(blitzLook.blitzRate).toBeGreaterThanOrEqual(BLITZ_HEAVY_THRESHOLD);

    const screen = scorePlay(
      { formation: "gun-trips", playType: "screen", baseEPA: 0.02 },
      blitzLook,
      situation,
    );
    const rpo = scorePlay(
      { formation: "gun-bunch", playType: "rpo", baseEPA: 0.04 },
      blitzLook,
      situation,
    );
    const pa = scorePlay(
      { formation: "gun-empty", playType: "play-action", baseEPA: 0.03 },
      blitzLook,
      situation,
    );
    const dropback = scorePlay(
      { formation: "gun-trips", playType: "dropback", baseEPA: 0.05 },
      blitzLook,
      situation,
    );

    expect(screen).not.toBeNull();
    expect(rpo).not.toBeNull();
    expect(pa).not.toBeNull();
    if (screen === null || rpo === null || pa === null || dropback === null) {
      throw new Error("expected scores");
    }

    // Each anti-blitz concept is strictly above its base EPA.
    expect(screen.expectedEPA).toBeGreaterThan(0.02);
    expect(rpo.expectedEPA).toBeGreaterThan(0.04);
    expect(pa.expectedEPA).toBeGreaterThan(0.03);

    // Blitz lift is larger than the lift a non-blitz look would give.
    const calm = look({ blitzRate: 0.1, coverage: "cover-1", boxCount: 7 });
    const screenCalm = scorePlay(
      { formation: "gun-trips", playType: "screen", baseEPA: 0.02 },
      calm,
      situation,
    );
    const rpoCalm = scorePlay(
      { formation: "gun-bunch", playType: "rpo", baseEPA: 0.04 },
      calm,
      situation,
    );
    const paCalm = scorePlay(
      { formation: "gun-empty", playType: "play-action", baseEPA: 0.03 },
      calm,
      situation,
    );
    if (screenCalm === null || rpoCalm === null || paCalm === null) {
      throw new Error("expected calm scores");
    }
    expect(screen.expectedEPA).toBeGreaterThan(screenCalm.expectedEPA);
    expect(rpo.expectedEPA).toBeGreaterThan(rpoCalm.expectedEPA);
    expect(pa.expectedEPA).toBeGreaterThan(paCalm.expectedEPA);

    // Exploit tag records the blitz.
    expect(screen.exploits).toContain("blitz");
    expect(rpo.exploits).toContain("blitz");
    expect(pa.exploits).toContain("blitz");
    expect(dropback.exploits).not.toContain("blitz");
  });

  it("returns top 3 ranked by expected EPA with formation/playType/exploits", () => {
    const recs = recommendPlays(candidates(), look({ blitzRate: 0.4, coverage: "cover-1" }), situation);
    expect(recs).not.toBeNull();
    if (recs === null) throw new Error("expected recommendations");
    expect(recs).toHaveLength(3);
    for (let i = 1; i < recs.length; i++) {
      const prev = recs[i - 1];
      const cur = recs[i];
      if (prev === undefined || cur === undefined) throw new Error("missing rec");
      expect(prev.expectedEPA).toBeGreaterThanOrEqual(cur.expectedEPA);
    }
    for (const r of recs) {
      expect(typeof r.formation).toBe("string");
      expect(r.formation.length).toBeGreaterThan(0);
      expect(typeof r.playType).toBe("string");
      expect(Number.isFinite(r.expectedEPA)).toBe(true);
      expect(Array.isArray(r.exploits)).toBe(true);
    }
    // With a heavy blitz + cover-1, anti-blitz concepts should lead.
    const topTypes = recs.map((r) => r.playType);
    expect(topTypes.some((t) => t === "screen" || t === "rpo" || t === "play-action")).toBe(true);
  });

  it("situation features adjust scoring (red-zone play-action, short-yardage run)", () => {
    const base = scorePlay(
      { formation: "gun-empty", playType: "play-action", baseEPA: 0.0 },
      look(),
      situation,
    );
    const redZone = scorePlay(
      { formation: "gun-empty", playType: "play-action", baseEPA: 0.0 },
      look(),
      { down: 1, distance: 10, fieldPosition: 92 },
    );
    if (base === null || redZone === null) throw new Error("expected scores");
    expect(redZone.expectedEPA).toBeGreaterThan(base.expectedEPA);
    expect(redZone.exploits).toContain("red-zone");

    const runEarly = scorePlay(
      { formation: "i-form", playType: "run", baseEPA: 0.0 },
      look(),
      { down: 1, distance: 10, fieldPosition: 25 },
    );
    const runShort = scorePlay(
      { formation: "i-form", playType: "run", baseEPA: 0.0 },
      look(),
      { down: 2, distance: 1, fieldPosition: 40 },
    );
    if (runEarly === null || runShort === null) throw new Error("expected scores");
    expect(runShort.expectedEPA).toBeGreaterThan(runEarly.expectedEPA);
    expect(runShort.exploits).toContain("short-yardage");
  });
});

describe("offensive-coordinator fail-closed", () => {
  it("missing defensive data or empty candidates → null", () => {
    expect(recommendPlays(candidates(), null, situation)).toBeNull();
    expect(recommendPlays(candidates(), undefined, situation)).toBeNull();
    expect(recommendPlays(candidates(), look(), null)).toBeNull();
    expect(recommendPlays([], look(), situation)).toBeNull();
    expect(recommendPlays(null, look(), situation)).toBeNull();
    expect(recommendPlays(undefined, look(), situation)).toBeNull();
    expect(recommendPlays(candidates(), look({ personnel: "" }), situation)).toBeNull();
    expect(recommendPlays(candidates(), look({ coverage: "" }), situation)).toBeNull();
    expect(recommendPlays(candidates(), look({ blitzRate: 1.4 }), situation)).toBeNull();
    expect(recommendPlays(candidates(), look({ blitzRate: Number.NaN }), situation)).toBeNull();
    expect(recommendPlays(candidates(), look({ boxCount: 0 }), situation)).toBeNull();
    expect(recommendPlays(candidates(), look(), { down: 0, distance: 10, fieldPosition: 25 })).toBeNull();
    expect(recommendPlays(candidates(), look(), { down: 5, distance: 10, fieldPosition: 25 })).toBeNull();
    expect(recommendPlays(candidates(), look(), { down: 1, distance: 0, fieldPosition: 25 })).toBeNull();
    expect(recommendPlays(candidates(), look(), { down: 1, distance: 10, fieldPosition: 120 })).toBeNull();
  });

  it("a single bad candidate fails the whole batch closed", () => {
    const bad: (PlayCandidate | null)[] = [
      { formation: "gun", playType: "run", baseEPA: 0.1 },
      { formation: "gun", playType: "run", baseEPA: Number.NaN },
    ];
    expect(recommendPlays(bad, look(), situation)).toBeNull();

    const missingFields: (PlayCandidate | null)[] = [
      { formation: "", playType: "run", baseEPA: 0.1 },
    ];
    expect(recommendPlays(missingFields, look(), situation)).toBeNull();

    const nullCandidate: (PlayCandidate | null)[] = [null];
    expect(recommendPlays(nullCandidate, look(), situation)).toBeNull();
  });

  it("scorePlay returns null when context is incomplete", () => {
    expect(
      scorePlay({ formation: "gun", playType: "run", baseEPA: 0.1 }, null, situation),
    ).toBeNull();
    expect(scorePlay(null, look(), situation)).toBeNull();
  });
});
