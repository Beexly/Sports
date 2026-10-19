import { describe, expect, it } from "vitest";
import {
  computeThirdDownTargetShare,
  THIRD_DOWN_TARGET_SHARE_MODEL_VERSION,
  type ThirdDownTargetPlay,
} from "../third-down-target-share.js";

function target(
  partial: Partial<ThirdDownTargetPlay> & { isTarget: boolean },
): ThirdDownTargetPlay {
  return {
    playId: "default",
    teamId: "AAA",
    playerId: "",
    down: 1,
    season: 2026,
    week: 1,
    ...partial,
  };
}

describe("third-down-target-share", () => {
  it("computes expected shares, differential, and shrunk differential", () => {
    const plays: ThirdDownTargetPlay[] = [];

    // Player P1, Team AAA
    // 3rd down: 10 targets
    for (let i = 0; i < 10; i++) {
      plays.push(target({ playerId: "P1", down: 3, isTarget: true }));
    }
    // Other downs: 20 targets
    for (let i = 0; i < 20; i++) {
      plays.push(target({ playerId: "P1", down: 1, isTarget: true }));
    }

    // Player P2, Team AAA
    // 3rd down: 5 targets (which won't meet the floor of 10)
    // To make sure they BOTH meet the floor and we test sum to 1, we will change it to:
    // P1 gets 10 3rd down targets, P2 gets 10 3rd down targets
    for (let i = 0; i < 10; i++) {
      plays.push(target({ playerId: "P2", down: 3, isTarget: true }));
    }
    // Other downs: 20 targets
    for (let i = 0; i < 20; i++) {
      plays.push(target({ playerId: "P2", down: 2, isTarget: true }));
    }

    const results = computeThirdDownTargetShare(plays, "season-to-date", 2026, 2);

    expect(results).toHaveLength(2);

    const p1 = results.find(r => r.playerId === "P1");
    expect(p1).toBeDefined();
    expect(p1?.thirdDownTargets).toBe(10);
    expect(p1?.teamThirdDownTargets).toBe(20);
    expect(p1?.thirdDownShare).toBeCloseTo(10 / 20, 4); // 0.5000

    expect(p1?.otherDownTargets).toBe(20);
    expect(p1?.teamOtherDownTargets).toBe(40);
    expect(p1?.otherDownShare).toBeCloseTo(20 / 40, 4); // 0.5000

    expect(p1?.differential).toBeCloseTo(0, 4); // 0.0000

    const expectedShrunk = 0 * (10 / (10 + 20));
    expect(p1?.shrunkDifferential).toBeCloseTo(expectedShrunk, 4);

    expect(p1?.provenance.modelVersion).toBe(THIRD_DOWN_TARGET_SHARE_MODEL_VERSION);

    // Sum of shares should equal 1 (10/20 + 10/20)
    const p2 = results.find(r => r.playerId === "P2");
    expect((p1?.thirdDownShare ?? 0) + (p2?.thirdDownShare ?? 0)).toBeCloseTo(1, 4);
  });

  it("down conditioning logic assigns downs properly", () => {
    const plays = [
      target({ playerId: "P1", down: 1, isTarget: true }),
      target({ playerId: "P1", down: 2, isTarget: true }),
      target({ playerId: "P1", down: 4, isTarget: true }),
      target({ playerId: "P1", down: 3, isTarget: true }),
    ];
    // Add dummy plays to pass the floor
    for (let i=0; i<10; i++) plays.push(target({ playerId: "P1", down: 3, isTarget: true }));
    for (let i=0; i<20; i++) plays.push(target({ playerId: "P1", down: 1, isTarget: true }));

    const results = computeThirdDownTargetShare(plays, "season-to-date", 2026, 2);
    const p1 = results.find(r => r.playerId === "P1");
    expect(p1?.thirdDownTargets).toBe(11);
    expect(p1?.otherDownTargets).toBe(23);
  });

  it("excludes non-targets from counts", () => {
    const plays = [
      target({ playerId: "P1", down: 3, isTarget: true }),
      target({ playerId: "P1", down: 3, isTarget: false }), // Not a target (e.g., scramble or sack)
      target({ playerId: "", down: 3, isTarget: false }), // Empty receiver
    ];
    // Add dummy plays to pass floor
    for (let i=0; i<10; i++) plays.push(target({ playerId: "P1", down: 3, isTarget: true }));
    for (let i=0; i<30; i++) plays.push(target({ playerId: "P1", down: 1, isTarget: true }));

    const results = computeThirdDownTargetShare(plays, "season-to-date", 2026, 2);
    const p1 = results.find(r => r.playerId === "P1");
    expect(p1?.thirdDownTargets).toBe(11);
  });

  it("point-in-time constraints exclude current and future weeks", () => {
    const plays = [
      target({ playerId: "P1", week: 1, down: 3, isTarget: true }),
      target({ playerId: "P1", week: 2, down: 3, isTarget: true }),
      target({ playerId: "P1", week: 3, down: 3, isTarget: true }), // Excluded
      target({ playerId: "P1", season: 2027, week: 1, down: 3, isTarget: true }), // Excluded
    ];
    // Adding dummy plays in week 1 to pass floor
    for (let i=0; i<10; i++) plays.push(target({ playerId: "P1", week: 1, down: 3, isTarget: true }));
    for (let i=0; i<30; i++) plays.push(target({ playerId: "P1", week: 1, down: 1, isTarget: true }));

    const results = computeThirdDownTargetShare(plays, "season-to-date", 2026, 3);
    const p1 = results.find(r => r.playerId === "P1");

    // Only week 1 and 2 targets are included
    expect(p1?.thirdDownTargets).toBe(12);
  });

  it("rolling window filters distinct games", () => {
    const plays: ThirdDownTargetPlay[] = [];
    // Weeks 1 to 5
    for (let w = 1; w <= 5; w++) {
      for(let i=0; i<5; i++) plays.push(target({ playerId: "P1", week: w, down: 3, isTarget: true }));
      for(let i=0; i<10; i++) plays.push(target({ playerId: "P1", week: w, down: 1, isTarget: true }));
    }
    // Target week is 6. Rolling-4 should include weeks 2, 3, 4, 5
    const results = computeThirdDownTargetShare(plays, "rolling-4", 2026, 6);
    const p1 = results.find(r => r.playerId === "P1");

    // 4 weeks * 5 targets = 20 third down targets
    expect(p1?.thirdDownTargets).toBe(20);
    // 4 weeks * 10 targets = 40 other down targets
    expect(p1?.otherDownTargets).toBe(40);
  });

  it("floors: returns null when targets are short", () => {
    // 9 third down targets, 30 total targets -> null
    let plays: ThirdDownTargetPlay[] = [];
    for(let i=0; i<9; i++) plays.push(target({ playerId: "P1", down: 3, isTarget: true }));
    for(let i=0; i<21; i++) plays.push(target({ playerId: "P1", down: 1, isTarget: true }));

    let results = computeThirdDownTargetShare(plays, "season-to-date", 2026, 2);
    let p1 = results.find(r => r.playerId === "P1");
    expect(p1?.thirdDownShare).toBeNull();
    expect(p1?.thirdDownTargets).toBe(9);

    // 10 third down targets, 29 total targets -> null
    plays = [];
    for(let i=0; i<10; i++) plays.push(target({ playerId: "P1", down: 3, isTarget: true }));
    for(let i=0; i<19; i++) plays.push(target({ playerId: "P1", down: 1, isTarget: true }));

    results = computeThirdDownTargetShare(plays, "season-to-date", 2026, 2);
    p1 = results.find(r => r.playerId === "P1");
    expect(p1?.thirdDownShare).toBeNull();
  });

  it("deterministic output", () => {
    const plays = [
      target({ playerId: "Z", down: 3, isTarget: true }),
      target({ playerId: "A", down: 3, isTarget: true })
    ];
    const results1 = computeThirdDownTargetShare(plays, "season-to-date", 2026, 2);
    const results2 = computeThirdDownTargetShare([...plays].reverse(), "season-to-date", 2026, 2);

    expect(results1[0]?.playerId).toBe("A");
    expect(results1[1]?.playerId).toBe("Z");
    expect(results1).toEqual(results2);
  });
});