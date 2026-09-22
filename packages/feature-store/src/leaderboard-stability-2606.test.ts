import { describe, expect, it } from "vitest";
import {
  auditWeek,
  gammaHat,
  stabilityAuditAdopt,
  type RankedPick,
} from "./leaderboard-stability-2606.js";

describe("leaderboard stability", () => {
  it("gamma-hat fires when a cluster systematically prefers excluded picks", () => {
    // top-5 prefix: cluster "dogs" averages +3 vs prefix average ~0 -> gamma 3
    const picks: RankedPick[] = [
      { cluster: "dogs", profit: 3 },
      { cluster: "dogs", profit: 3 },
      { cluster: "favs", profit: -2 },
      { cluster: "favs", profit: -2 },
      { cluster: "favs", profit: -2 },
    ];
    const r = gammaHat(picks, 5);
    expect(r.cluster).toBe("dogs");
    expect(r.gammaHat).toBeCloseTo(3, 9);
    expect(r.violated).toBe(true);
  });

  it("gamma-hat is quiet when clusters agree", () => {
    const picks: RankedPick[] = [
      { cluster: "a", profit: 1 },
      { cluster: "b", profit: 1 },
      { cluster: "a", profit: 1 },
    ];
    expect(gammaHat(picks, 3).violated).toBe(false);
  });

  it("auditWeek checks k = 1..5 and flags any violation", () => {
    const picks: RankedPick[] = [
      { cluster: "x", profit: 5 },
      { cluster: "y", profit: -4 },
    ];
    const a = auditWeek("2024-01", picks);
    expect(a.byK.length).toBe(5);
    expect(a.violated).toBe(true);
  });

  it("adoption needs >=15% violating weeks", () => {
    const mk = (v: boolean, w: string) => ({ week: w, byK: [], violated: v });
    const audits = [...Array.from({ length: 3 }, (_, i) => mk(true, `w${i}`)), ...Array.from({ length: 17 }, (_, i) => mk(false, `c${i}`))];
    const r = stabilityAuditAdopt(audits);
    expect(r.violationShare).toBeCloseTo(0.15, 9);
    expect(r.adopt).toBe(true);
    const few = [...Array.from({ length: 2 }, (_, i) => mk(true, `v${i}`)), ...Array.from({ length: 18 }, (_, i) => mk(false, `n${i}`))];
    expect(stabilityAuditAdopt(few).adopt).toBe(false); // 10% < 15%
  });

  it("handles empty input", () => {
    expect(gammaHat([], 3)).toEqual({ k: 3, gammaHat: 0, cluster: "", violated: false });
    expect(gammaHat([{ cluster: "a", profit: 1 }], 0).violated).toBe(false);
    const a = auditWeek("w", []);
    expect(a.violated).toBe(false);
    expect(stabilityAuditAdopt([]).adopt).toBe(false);
  });
});
