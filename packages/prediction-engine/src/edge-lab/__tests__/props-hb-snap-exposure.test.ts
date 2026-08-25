import { describe, expect, it } from "vitest";
import {
  SNAP_EXPOSURE_METHOD_TAG,
  expectedSnapsNext,
  pooledSnapShare,
  snapShare,
  type SnapSample,
  type SnapsNext,
} from "../props-hb-snap-exposure.js";

describe("snapShare", () => {
  it("is player/team and refuses 0-snap rows as talent", () => {
    const r = snapShare({ playerSnaps: 45, teamOffSnaps: 70 });
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error("expected ok");
    expect(r.share).toBeCloseTo(45 / 70, 12);
    expect(SNAP_EXPOSURE_METHOD_TAG).toBe("props_hb_snap_exposure_v1");
    expect(snapShare({ playerSnaps: 0, teamOffSnaps: 70 }).ok).toBe(false);
    expect(snapShare({ playerSnaps: 10, teamOffSnaps: 0 }).ok).toBe(false);
  });

  it("tags the refuse reason: zero_team, zero_player", () => {
    const zeroTeam = snapShare({ playerSnaps: 10, teamOffSnaps: 0 });
    expect(zeroTeam.ok).toBe(false);
    if (zeroTeam.ok) throw new Error("expected refusal");
    expect(zeroTeam.refuse).toBe("zero_team");
    expect(zeroTeam.share).toBeNull();
    expect(zeroTeam.priced).toBe(false);
    expect(zeroTeam.methodTag).toBe(SNAP_EXPOSURE_METHOD_TAG);

    const zeroPlayer = snapShare({ playerSnaps: 0, teamOffSnaps: 70 });
    expect(zeroPlayer.ok).toBe(false);
    if (zeroPlayer.ok) throw new Error("expected refusal");
    expect(zeroPlayer.refuse).toBe("zero_player");
    expect(zeroPlayer.share).toBeNull();
  });

  it("refuses playerSnaps > teamOffSnaps as bad (contradictory, not clamped)", () => {
    const r = snapShare({ playerSnaps: 80, teamOffSnaps: 70 });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("expected refusal");
    expect(r.refuse).toBe("bad");
    expect(r.share).toBeNull();
    expect(r.priced).toBe(false);
  });

  it("accepts playerSnaps === teamOffSnaps as share 1 (boundary, not > )", () => {
    const r = snapShare({ playerSnaps: 70, teamOffSnaps: 70 });
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error("expected ok");
    expect(r.share).toBe(1);
  });

  it("refuses NaN / Infinity / negative inputs as bad — never imputes", () => {
    const poisoned: readonly SnapSample[] = [
      { playerSnaps: Number.NaN, teamOffSnaps: 70 },
      { playerSnaps: 45, teamOffSnaps: Number.NaN },
      { playerSnaps: Number.POSITIVE_INFINITY, teamOffSnaps: 70 },
      { playerSnaps: 45, teamOffSnaps: Number.POSITIVE_INFINITY },
      { playerSnaps: -1, teamOffSnaps: 70 },
      { playerSnaps: 45, teamOffSnaps: -70 },
    ];
    for (const s of poisoned) {
      const r = snapShare(s);
      expect(r.ok).toBe(false);
      if (r.ok) throw new Error("expected refusal");
      expect(r.refuse).toBe("bad");
      expect(r.share).toBeNull();
      expect(r.priced).toBe(false);
    }
  });

  it("carries priced:false on the ok branch too", () => {
    const r = snapShare({ playerSnaps: 45, teamOffSnaps: 70 });
    expect(r.priced).toBe(false);
  });
});

describe("pooledSnapShare", () => {
  it("is the snap-weighted ratio of pooled totals, hand-computed", () => {
    // ok rows only: (50 + 48) / (65 + 62) = 98 / 127
    const s = pooledSnapShare([
      { playerSnaps: 50, teamOffSnaps: 65 },
      { playerSnaps: 48, teamOffSnaps: 62 },
    ]);
    expect(s).not.toBeNull();
    expect(s).toBeCloseTo(98 / 127, 12);
    expect(s).toBeCloseTo(0.7716535433070866, 12);
  });

  it("returns null for an empty sample — the honest week-1 answer", () => {
    expect(pooledSnapShare([])).toBeNull();
  });

  it("returns null when every row is refused (all healthy-scratch rows)", () => {
    expect(
      pooledSnapShare([
        { playerSnaps: 0, teamOffSnaps: 70 },
        { playerSnaps: 0, teamOffSnaps: 65 },
        { playerSnaps: 0, teamOffSnaps: 62 },
      ]),
    ).toBeNull();
  });

  it("returns null when every row is refused for zero_team", () => {
    expect(
      pooledSnapShare([
        { playerSnaps: 12, teamOffSnaps: 0 },
        { playerSnaps: 9, teamOffSnaps: 0 },
      ]),
    ).toBeNull();
  });

  it("returns null when every row is poisoned (NaN) — never imputes a share", () => {
    expect(
      pooledSnapShare([
        { playerSnaps: Number.NaN, teamOffSnaps: 70 },
        { playerSnaps: 45, teamOffSnaps: Number.NaN },
      ]),
    ).toBeNull();
  });

  it("drops refused rows from BOTH numerator and denominator", () => {
    // The 0-snap row and the NaN row must not enter the pool at all:
    // pool stays (50 + 48) / (65 + 62) = 98/127, not 98/197 and not NaN.
    const s = pooledSnapShare([
      { playerSnaps: 50, teamOffSnaps: 65 },
      { playerSnaps: 0, teamOffSnaps: 70 },
      { playerSnaps: Number.NaN, teamOffSnaps: 60 },
      { playerSnaps: 48, teamOffSnaps: 62 },
    ]);
    expect(s).not.toBeNull();
    expect(Number.isFinite(s as number)).toBe(true);
    expect(s).toBeCloseTo(98 / 127, 12);
  });

  it("never exceeds 1, because playerSnaps > teamOffSnaps rows are refused", () => {
    const s = pooledSnapShare([
      { playerSnaps: 80, teamOffSnaps: 70 },
      { playerSnaps: 60, teamOffSnaps: 70 },
    ]);
    expect(s).toBeCloseTo(60 / 70, 12);
    expect(s as number).toBeLessThanOrEqual(1);
  });
});

describe("expectedSnapsNext", () => {
  it("is ZIP at injury-out and at 0 team snaps", () => {
    const s = pooledSnapShare([
      { playerSnaps: 50, teamOffSnaps: 65 },
      { playerSnaps: 48, teamOffSnaps: 62 },
    ]);
    expect(s).not.toBeNull();

    const live = expectedSnapsNext(s, 68, false);
    expect(live.ok).toBe(true);
    if (!live.ok) throw new Error("expected ok");
    // 98/127 × 68 = 6664/127 = 52.47244094488189
    expect(live.expected).toBeCloseTo((98 / 127) * 68, 12);
    expect(live.expected).toBeCloseTo(52.47244094488189, 10);

    const out = expectedSnapsNext(s, 68, true);
    expect(out.ok).toBe(true);
    if (!out.ok) throw new Error("expected ok");
    expect(out.expected).toBe(0);

    const noSnaps = expectedSnapsNext(s, 0, false);
    expect(noSnaps.ok).toBe(true);
    if (!noSnaps.ok) throw new Error("expected ok");
    expect(noSnaps.expected).toBe(0);
  });

  it("multiplies share × team snaps against hand-computed values", () => {
    const cases: readonly { share: number; team: number; expected: number }[] = [
      { share: 0.5, team: 64, expected: 32 },
      { share: 0.25, team: 60, expected: 15 },
      { share: 1, team: 70, expected: 70 },
      { share: 0, team: 70, expected: 0 },
    ];
    for (const c of cases) {
      const r = expectedSnapsNext(c.share, c.team, false);
      expect(r.ok).toBe(true);
      if (!r.ok) throw new Error("expected ok");
      expect(r.expected).toBeCloseTo(c.expected, 12);
    }
  });

  // ATTACK: null share on the week-1/rookie path must refuse, not throw.
  it("refuses no_pooled_share on the week-1/rookie path instead of throwing", () => {
    expect(() => expectedSnapsNext(null, 68, false)).not.toThrow();
    const r = expectedSnapsNext(null, 68, false);
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("expected refusal");
    expect(r.refuse).toBe("no_pooled_share");
    expect(r.expected).toBeNull();
    expect(r.priced).toBe(false);
    expect(r.methodTag).toBe(SNAP_EXPOSURE_METHOD_TAG);
  });

  it("refuses no_pooled_share when pooledSnapShare returned null (empty pool)", () => {
    const s = pooledSnapShare([]);
    expect(s).toBeNull();
    const r = expectedSnapsNext(s, 68, false);
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("expected refusal");
    expect(r.refuse).toBe("no_pooled_share");
  });

  // ATTACK: injuryOut true + share null ⇒ ok 0, NOT a refusal.
  it("returns ok 0 for an out player with no history — a known 0, not missing data", () => {
    const r = expectedSnapsNext(null, 68, true);
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error("expected ok");
    expect(r.expected).toBe(0);
    expect(r.priced).toBe(false);
    expect(r.methodTag).toBe(SNAP_EXPOSURE_METHOD_TAG);
  });

  it("keeps injuryOut ahead of every input guard (the ZIP hurdle short-circuits)", () => {
    // Card: injuryOut === true ⇒ ok expected 0 (the ZIP hurdle).
    for (const [share, team] of [
      [1.03, 68],
      [Number.NaN, 68],
      [0.6, Number.NaN],
      [0.6, -1],
    ] as const) {
      const r = expectedSnapsNext(share, team, true);
      expect(r.ok).toBe(true);
      if (!r.ok) throw new Error("expected ok");
      expect(r.expected).toBe(0);
    }
  });

  // ATTACK: share > 1 was silently accepted pre-card.
  it("refuses bad_share for share > 1 (the >1 hole closes here)", () => {
    const r = expectedSnapsNext(1.03, 68, false);
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("expected refusal");
    expect(r.refuse).toBe("bad_share");
    expect(r.expected).toBeNull();
    expect(r.priced).toBe(false);
    // Pre-card this returned 1.03 × 68 = 70.04, a share above 100% of team snaps.
    expect(r).not.toHaveProperty("expected", 70.04);
  });

  it("accepts share exactly 1 and refuses the first value above it", () => {
    const atOne = expectedSnapsNext(1, 68, false);
    expect(atOne.ok).toBe(true);
    if (!atOne.ok) throw new Error("expected ok");
    expect(atOne.expected).toBe(68);

    const justOver = expectedSnapsNext(1 + Number.EPSILON, 68, false);
    expect(justOver.ok).toBe(false);
    if (justOver.ok) throw new Error("expected refusal");
    expect(justOver.refuse).toBe("bad_share");
  });

  it("refuses bad_share for NaN / Infinity / negative share", () => {
    for (const share of [
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
      -0.01,
      -1,
    ]) {
      const r = expectedSnapsNext(share, 68, false);
      expect(r.ok).toBe(false);
      if (r.ok) throw new Error("expected refusal");
      expect(r.refuse).toBe("bad_share");
      expect(r.expected).toBeNull();
      expect(r.priced).toBe(false);
    }
  });

  it("refuses bad_team_snaps for NaN / Infinity / negative team snaps", () => {
    for (const team of [
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
      -1,
    ]) {
      const r = expectedSnapsNext(0.6, team, false);
      expect(r.ok).toBe(false);
      if (r.ok) throw new Error("expected refusal");
      expect(r.refuse).toBe("bad_team_snaps");
      expect(r.expected).toBeNull();
      expect(r.priced).toBe(false);
    }
  });

  it("prefers the share refusal over the team-snaps refusal when both are poisoned", () => {
    const r = expectedSnapsNext(Number.NaN, Number.NaN, false);
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("expected refusal");
    expect(r.refuse).toBe("bad_share");
  });

  it("returns ok 0 for a bye/zero-snap opponent week (0 is data, not a refusal)", () => {
    const r = expectedSnapsNext(0.6, 0, false);
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error("expected ok");
    expect(r.expected).toBe(0);
    expect(r.priced).toBe(false);
  });

  // ATTACK: priced:false present on BOTH branches of the union.
  it("stamps priced:false and the method tag on both branches", () => {
    const results: readonly SnapsNext[] = [
      expectedSnapsNext(0.6, 68, false),
      expectedSnapsNext(0.6, 68, true),
      expectedSnapsNext(0.6, 0, false),
      expectedSnapsNext(null, 68, false),
      expectedSnapsNext(1.5, 68, false),
      expectedSnapsNext(0.6, Number.NaN, false),
    ];
    let okCount = 0;
    let refusedCount = 0;
    for (const r of results) {
      expect(r.priced).toBe(false);
      expect(r.methodTag).toBe(SNAP_EXPOSURE_METHOD_TAG);
      if (r.ok) {
        okCount += 1;
        expect(typeof r.expected).toBe("number");
      } else {
        refusedCount += 1;
        expect(r.expected).toBeNull();
      }
    }
    expect(okCount).toBe(3);
    expect(refusedCount).toBe(3);
  });

  // ATTACK: batch survival over a 100-player slate with 3 null-share rookies.
  it("survives a 100-row slate with 3 null-share rookies: 97 numbers, 3 refusals", () => {
    const slate: readonly (number | null)[] = Array.from({ length: 100 }, (_, i) =>
      i === 7 || i === 42 || i === 91 ? null : 0.5,
    );

    // Under the OLD contract this loop died at i === 7 with a RangeError, so the
    // whole batch produced nothing. Under the refuse union it completes.
    const out: SnapsNext[] = [];
    expect(() => {
      for (const share of slate) {
        out.push(expectedSnapsNext(share, 64, false));
      }
    }).not.toThrow();

    expect(out).toHaveLength(100);
    const priced = out.filter((r): r is Extract<SnapsNext, { ok: true }> => r.ok);
    const refused = out.filter((r): r is Extract<SnapsNext, { ok: false }> => !r.ok);
    expect(priced).toHaveLength(97);
    expect(refused).toHaveLength(3);
    for (const r of priced) expect(r.expected).toBe(32); // 0.5 × 64
    for (const r of refused) expect(r.refuse).toBe("no_pooled_share");
    // The rookies land at exactly the seeded indices — no reordering, no drop.
    expect(out.map((r, i) => (r.ok ? -1 : i)).filter((i) => i >= 0)).toEqual([7, 42, 91]);
  });

  it("is total across a poisoned mixed slate — every input yields a record, none throws", () => {
    const inputs: readonly (readonly [number | null, number, boolean])[] = [
      [0.5, 64, false],
      [null, 64, false],
      [null, 64, true],
      [Number.NaN, 64, false],
      [1.4, 64, false],
      [-0.2, 64, false],
      [0.5, Number.NaN, false],
      [0.5, -3, false],
      [0.5, 0, false],
      [0.5, Number.POSITIVE_INFINITY, false],
    ];
    const reasons: (string | "ok")[] = [];
    expect(() => {
      for (const [share, team, out] of inputs) {
        const r = expectedSnapsNext(share, team, out);
        reasons.push(r.ok ? "ok" : r.refuse);
      }
    }).not.toThrow();
    expect(reasons).toEqual([
      "ok",
      "no_pooled_share",
      "ok",
      "bad_share",
      "bad_share",
      "bad_share",
      "bad_team_snaps",
      "bad_team_snaps",
      "ok",
      "bad_team_snaps",
    ]);
  });

  // ATTACK: no throw remains in the function body.
  it("never throws for any input in the cross product of edge values", () => {
    const shares: readonly (number | null)[] = [
      null,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
      -1,
      -0,
      0,
      0.5,
      1,
      1.0001,
      1e9,
    ];
    const teams: readonly number[] = [
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
      -1,
      0,
      1,
      68,
      1e9,
    ];
    for (const share of shares) {
      for (const team of teams) {
        for (const injuryOut of [true, false]) {
          expect(() => expectedSnapsNext(share, team, injuryOut)).not.toThrow();
          const r = expectedSnapsNext(share, team, injuryOut);
          expect(r.priced).toBe(false);
          if (r.ok) {
            expect(Number.isFinite(r.expected)).toBe(true);
          } else {
            expect(r.expected).toBeNull();
            expect(["no_pooled_share", "bad_share", "bad_team_snaps"]).toContain(r.refuse);
          }
        }
      }
    }
  });

  it("is pure — repeated calls with the same inputs return identical records", () => {
    const a = expectedSnapsNext(0.75, 64, false);
    const b = expectedSnapsNext(0.75, 64, false);
    expect(a).toEqual(b);
    const x = expectedSnapsNext(null, 64, false);
    const y = expectedSnapsNext(null, 64, false);
    expect(x).toEqual(y);
  });
});
