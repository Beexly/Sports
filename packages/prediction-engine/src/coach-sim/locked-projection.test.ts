import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  lockCoachProjection,
  lockTuesdayCoachBaseline,
  applyCadenceInjuryOverlay,
  applyInjuryOverlay,
  verifyCoachMindsetUnchanged,
} from "./locked-projection.js";
import { PROB_PER_POINT } from "../constants.js";
import { sealLock } from "../public-baseline/cadence.js";
import {
  assertTauSealed,
  makeNextScoreSamples,
  recoverTau,
  type FourthDownDecisionSample,
} from "../2309-00756-inverse-mdp-fourth-down.js";

describe("locked-projection: immutable Tuesday v1.0 coach mindset + dynamic injury overlay", () => {
  const baseCoachInput = {
    homeTeam: "ATL",
    awayTeam: "SF",
    week: 7,
    coachSupport: 0.78,
    neutralPassRate: 0.57,
    staffAggression: 0.64,
    staffAggressionAway: 0.69,
    shadows: [{ wr: "Drake London", shadowRate: 0.62 }],
  };

  const awayTargets = [
    { playerId: "Mike Evans", role: "WR1" as const, baseShare: 0.26 },
    { playerId: "George Kittle", role: "TE" as const, baseShare: 0.25 },
    { playerId: "Brandin Cooks", role: "WR2" as const, baseShare: 0.16 },
    { playerId: "Jordan Watkins", role: "SLOT" as const, baseShare: 0.14 },
  ];

  it("seals coachMindsetHash at Tuesday v1.0 and keeps it byte-for-byte identical when Friday v3.0 scratches starters", () => {
    const v1 = lockTuesdayCoachBaseline(
      baseCoachInput,
      { homeTargets: [], awayTargets },
      "2026-10-20T09:00:00.000Z",
    );
    expect(v1.cadenceLock.version).toBe("v1.0");
    expect(v1.coachMindsetHash).toHaveLength(64);
    expect(v1.coachTau).toBe(0.5);
    expect(v1.coachTauSource).toBe("prior");

    const v3 = applyCadenceInjuryOverlay(v1, {
      version: "v3.0",
      recordedAtIso: "2026-10-23T21:30:00.000Z",
      inactivePlayerIds: ["Mike Evans"],
      homeInjuryPointsDelta: 0,
      awayInjuryPointsDelta: -1.5,
    });

    expect(v3.cadenceLock.version).toBe("v3.0");
    expect(verifyCoachMindsetUnchanged(v1, v3)).toBe(true);
    expect(v3.coachMindsetHash).toBe(v1.coachMindsetHash);
    expect(assertTauSealed(v1.coachTau, v3.coachTau)).toBe(true);

    const kittleV1 = v1.awayTargetAllocations.find((t) => t.playerId === "George Kittle")!;
    const kittleV3 = v3.awayTargetAllocations.find((t) => t.playerId === "George Kittle")!;
    const cooksV1 = v1.awayTargetAllocations.find((t) => t.playerId === "Brandin Cooks")!;
    const cooksV3 = v3.awayTargetAllocations.find((t) => t.playerId === "Brandin Cooks")!;
    expect(kittleV3.share).toBeGreaterThan(kittleV1.share);
    expect(cooksV3.share).toBeGreaterThan(cooksV1.share);
    expect(v3.awayTargetAllocations.find((t) => t.playerId === "Mike Evans")).toBeUndefined();
  });

  it("recovers tau from observed 4th-down decisions and keeps it sealed across the overlay", () => {
    const state = {
      yardLine: 35,
      yardsToGo: 4,
      scoreDiff: -3,
      timeRemainingSec: 120,
      isHome: true,
    };
    const decisions: FourthDownDecisionSample[] = [
      {
        values: [
          { state, action: "go", samples: makeNextScoreSamples([[7, 0.4], [0, 0.6]]) },
          { state, action: "kick", samples: makeNextScoreSamples([[3, 0.7], [0, 0.3]]) },
        ],
        observedAction: "go",
      },
    ];
    const { tau } = recoverTau(decisions);

    const v1 = lockTuesdayCoachBaseline(
      { ...baseCoachInput, fourthDownDecisions: decisions },
      { homeTargets: [], awayTargets },
      "2026-10-20T09:00:00.000Z",
    );
    expect(v1.coachTauSource).toBe("recovered");
    expect(v1.coachTau).toBe(tau);

    const v2 = applyInjuryOverlay(v1, {
      version: "v2.0",
      recordedAtIso: "2026-10-21T22:00:00.000Z",
      inactivePlayerIds: [],
      homeInjuryPointsDelta: -1.0,
      awayInjuryPointsDelta: -0.5,
    });
    expect(assertTauSealed(v1.coachTau, v2.coachTau)).toBe(true);
    expect(v2.coachMindsetHash).toBe(v1.coachMindsetHash);
  });

  it("preserves backward-compatible lockCoachProjection", () => {
    const res = lockCoachProjection(baseCoachInput);
    expect(res.inputHash).toBeTruthy();
  });

  it("keeps injuryDropOff out of the backward-compatible inputHash and accepts a pinned lockedAt", () => {
    const pinned = "2026-10-20T09:00:00.000Z";
    const a = lockCoachProjection({ ...baseCoachInput, injuryDropOff: 0 }, pinned);
    const b = lockCoachProjection({ ...baseCoachInput, injuryDropOff: 0 }, pinned);
    const c = lockCoachProjection({ ...baseCoachInput, injuryDropOff: 9 }, pinned);

    // Wall-clock must not leak into the lock when the caller pins a time.
    expect(a.lockedAt).toBe(pinned);

    // Identical inputs must reproduce the identical identity hash.
    expect(a.inputHash).toBe(b.inputHash);

    // Injury state is an execution weight, not coach identity. A different
    // injuryDropOff must not change the inputHash — otherwise the "sealed"
    // projection is not reproducible across injury revisions.
    expect(c.inputHash).toBe(a.inputHash);
  });

  it("keeps the locked projection numbers injury-independent so the hash truly identifies the sealed projection", () => {
    const pinned = "2026-10-20T09:00:00.000Z";
    const healthy = lockCoachProjection({ ...baseCoachInput, injuryDropOff: 0 }, pinned);
    const hurt = lockCoachProjection({ ...baseCoachInput, injuryDropOff: 9 }, pinned);

    // The sealed projection is the coach's identity and must be reproducible
    // across injury revisions. Injury is applied as an execution weight on top
    // of the lock (see applyCadenceInjuryOverlay), never baked into the lock.
    // If these diverge while inputHash stays equal, the hash stops identifying
    // the projection and a receipt keyed on inputHash cannot detect the change.
    expect(hurt.inputHash).toBe(healthy.inputHash);
    expect(hurt.marginMean).toBe(healthy.marginMean);
    expect(hurt.scoreMean).toBe(healthy.scoreMean);
    expect(hurt.winProbHome).toBe(healthy.winProbHome);
  });

  it("converts injury margin shifts to win probability at the canonical 0.033 points-per-probability rate", () => {
    const v1 = lockTuesdayCoachBaseline(
      baseCoachInput,
      { homeTargets: [], awayTargets },
      "2026-10-20T09:00:00.000Z",
    );
    // Pin a known baseline so the assertion isolates the slope itself. The pin
    // must be applied through the seal: mutating winProbHome on a sealed lock is
    // the exact crafted-lock case applyInjuryOverlay now rejects.
    const pinnedAt = "2026-10-20T09:00:00.000Z";
    const baseline = {
      ...v1,
      winProbHome: 0.5,
      cadenceLock: sealLock(
        "v1.0",
        {
          coachMindsetHash: v1.coachMindsetHash,
          coachTau: v1.coachTau,
          scoreMean: v1.scoreMean,
          marginMean: v1.marginMean,
          winProbHome: 0.5,
        },
        pinnedAt,
        pinnedAt,
      ),
    };
    const v3 = applyInjuryOverlay(baseline, {
      version: "v3.0",
      recordedAtIso: "2026-10-23T21:30:00.000Z",
      inactivePlayerIds: [],
      homeInjuryPointsDelta: 1,
      awayInjuryPointsDelta: 0,
    });
    // 0.5 + 1 pt * 0.033 = 0.533. The overlay must use the same
    // points-to-win-probability slope as mind-reasoning's PROB_PER_POINT.
    expect(v3.winProbHome).toBeCloseTo(0.5 + PROB_PER_POINT, 4);
  });

  it("rejects an injury overlay on a lock whose seal no longer matches its payload", () => {
    const v1 = lockTuesdayCoachBaseline(
      baseCoachInput,
      { homeTargets: [], awayTargets },
      "2026-10-20T09:00:00.000Z",
    );
    // Crafted lock: tau moved without resealing. The internal hash<->tau check
    // would recompute the hash from the same crafted tau and pass, so the seal
    // check at the top of the overlay is the only thing that catches this.
    const crafted = { ...v1, coachTau: 0.31 };
    expect(() =>
      applyInjuryOverlay(crafted, {
        version: "v3.0",
        recordedAtIso: "2026-10-23T21:30:00.000Z",
        inactivePlayerIds: [],
      }),
    ).toThrow(/seal does not match its payload/);
  });

  it("refuses to stack an injury overlay on anything but a v1.0 baseline", () => {
    const v1 = lockTuesdayCoachBaseline(
      baseCoachInput,
      { homeTargets: [], awayTargets },
      "2026-10-20T09:00:00.000Z",
    );
    const v3 = applyCadenceInjuryOverlay(v1, {
      version: "v3.0",
      recordedAtIso: "2026-10-23T21:30:00.000Z",
      inactivePlayerIds: [],
      awayInjuryPointsDelta: -1.5,
    });
    expect(() =>
      applyInjuryOverlay(v3, {
        version: "v4.0",
        recordedAtIso: "2026-10-25T17:00:00.000Z",
        inactivePlayerIds: [],
      }),
    ).toThrow(/must be applied to a v1\.0 Tuesday baseline/);
  });

  it("shares ONE points-to-win-probability slope with mind-reasoning instead of duplicating the literal", () => {
    // Two paths convert margin points into win probability: the situational HFA
    // prior in mind-reasoning.ts and this injury overlay. They must speak the
    // same units. Before this invariant the agreement was enforced only by a
    // comment ("Must match mind-reasoning's PROB_PER_POINT"): the literal 0.033
    // sat in locked-projection.ts and a separate local const sat in
    // mind-reasoning.ts. Tuning one silently left the other on the old slope,
    // so the two surfaces disagreed about what a point is worth. Assert a single
    // exported binding is consumed by both, and that neither re-declares it.
    expect(PROB_PER_POINT).toBe(0.033);

    const projection = readFileSync(
      new URL("./locked-projection.ts", import.meta.url),
      "utf8",
    );
    const mind = readFileSync(
      new URL("../reasoning/mind-reasoning.ts", import.meta.url),
      "utf8",
    );

    // Both consume the shared constant.
    expect(projection).toMatch(/PROB_PER_POINT/);
    expect(mind).toMatch(/PROB_PER_POINT/);

    // Neither carries a second definition of the slope.
    expect(projection).not.toMatch(/\bconst PROB_PER_POINT\s*=/);
    expect(mind).not.toMatch(/\bconst PROB_PER_POINT\s*=/);

    // The overlay arithmetic must multiply by the constant, not a bare literal.
    expect(projection).not.toMatch(/netMarginShift \* 0\.033/);
  });
});
