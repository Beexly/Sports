import { describe, it, expect } from "vitest";
import type { DfsPlayer } from "./dfs-slate";
import { leverage } from "./dfs-slate";
import { adviseMode, explainSlate, readPlayer, signalPenalty } from "./dfs-signals";
import { applyToDfs } from "@/lib/signals/apply";
import { EMPTY_CONTEXT } from "@/lib/signals/spine";
import { WEEK2_2026_CONTEXT, WEEK2_2026_CONTEST } from "@/lib/signals/week2-2026";

const mk = (name: string, pos: DfsPlayer["pos"], team: string, opp: string, salary: number, proj: number, own: number): DfsPlayer => ({
  id: name.toLowerCase().replace(/\W+/g, "-"),
  name, pos, team, opp, salary, proj, floor: proj * 0.55, ceiling: proj * 1.6, own,
});

// Real Week 2 2026 DK pricing, real LineStar ownership, real outcome.
const JEFFERSON = mk("Justin Jefferson", "WR", "MIN", "CHI", 7800, 18.6, 0.018); // scored 8.50
const METCALF = mk("DK Metcalf", "WR", "PIT", "NE", 5200, 14.8, 0.013); // scored 6.70
const SCHULTZ = mk("Dalton Schultz", "TE", "HOU", "CIN", 3200, 11.5, 0.156); // the right play
const MCLAURIN = mk("Terry McLaurin", "WR", "WAS", "DAL", 5200, 14.0, 0.051);

describe("Week 2 2026 regression — the lineup that lost", () => {
  const pen = signalPenalty(WEEK2_2026_CONTEXT, "leverage");

  it("L-1: Jefferson is suppressed despite being the lowest-owned WR on the slate", () => {
    const read = readPlayer(JEFFERSON, WEEK2_2026_CONTEXT);
    expect(read.delta).toBeLessThan(0);
    // the contrarian credit `leverage` mode grants is clawed back and then some
    expect(pen(JEFFERSON)).toBeGreaterThan(0);
    expect(pen(JEFFERSON)).toBeGreaterThan(leverage(JEFFERSON) * 6 * 0.5);
  });

  it("L-2: Metcalf is suppressed EVEN THOUGH his role upgrade was real", () => {
    const read = readPlayer(METCALF, WEEK2_2026_CONTEXT);
    const keys = read.effects.map((e) => e.key);
    // both halves are recorded honestly
    expect(keys).toContain("vacated_usage"); // Pittman out, genuine
    expect(keys).toContain("coverage_downgrade"); // Carlton Davis out, genuine
    expect(keys).toContain("low_team_total"); // PIT implied 18.0, governing
    // and the ownership clause still fires, because an environment with a real
    // suppressor in it is not clean just because something good also happened
    expect(pen(METCALF)).toBeGreaterThan(0);
  });

  it("the ownership clause keys on the PRESENCE of drag, not the net read", () => {
    const read = readPlayer(METCALF, WEEK2_2026_CONTEXT);
    const drag = read.effects.reduce((s, e) => s + (e.weight < 0 ? -e.weight : 0), 0);
    expect(drag).toBeGreaterThan(0);
    // a net-based rule would have called this clean and rebuilt the losing lineup
    const netBased = -read.delta;
    expect(pen(METCALF)).toBeGreaterThan(netBased);
  });

  it("BOOSTS the play that was actually right: Schultz gets a negative penalty", () => {
    expect(readPlayer(SCHULTZ, WEEK2_2026_CONTEXT).delta).toBeGreaterThan(0);
    expect(pen(SCHULTZ)).toBeLessThan(0); // negative penalty = boost in `objVal - pen`
  });

  it("a clean-environment player is untouched", () => {
    expect(readPlayer(MCLAURIN, WEEK2_2026_CONTEXT).effects).toHaveLength(0);
    expect(pen(MCLAURIN)).toBe(0);
  });

  it("orders the slate by how far the world moved each player", () => {
    const report = explainSlate([JEFFERSON, METCALF, SCHULTZ, MCLAURIN], WEEK2_2026_CONTEXT);
    const names = report.map((r) => r.player);
    expect(names).toContain("Justin Jefferson");
    expect(names).toContain("Dalton Schultz");
    expect(names).not.toContain("Terry McLaurin");
  });
});

describe("applyToDfs folds the read into the projection band", () => {
  it("suppression lowers the band, a boost raises it", () => {
    const j = applyToDfs(JEFFERSON, WEEK2_2026_CONTEXT);
    expect(j.proj).toBeLessThan(JEFFERSON.proj);
    expect(j.ceiling).toBeLessThan(JEFFERSON.ceiling);
    const s = applyToDfs(SCHULTZ, WEEK2_2026_CONTEXT);
    expect(s.proj).toBeGreaterThan(SCHULTZ.proj);
    expect(s.ceiling).toBeGreaterThan(SCHULTZ.ceiling);
  });

  it("never produces a negative projection", () => {
    const tiny = mk("Tiny", "WR", "MIN", "CHI", 3000, 0.4, 0.01);
    expect(applyToDfs(tiny, WEEK2_2026_CONTEXT).proj).toBeGreaterThanOrEqual(0);
  });

  it("leaves a player alone when nothing is known", () => {
    expect(applyToDfs(JEFFERSON, EMPTY_CONTEXT)).toBe(JEFFERSON);
  });
});

describe("cash mode does not apply the ownership clause", () => {
  it("cash penalty is the plain signed read", () => {
    const cash = signalPenalty(WEEK2_2026_CONTEXT, "cash");
    const read = readPlayer(JEFFERSON, WEEK2_2026_CONTEXT);
    expect(cash(JEFFERSON)).toBeCloseTo(-read.delta, 10);
  });
});

describe("adviseMode — L-3, the objective mismatch", () => {
  it("flags cash mode as wrong for a 75-entry winner-take-all", () => {
    const a = adviseMode(WEEK2_2026_CONTEST, "cash");
    expect(a.mismatch).toBe(true);
    expect(a.recommended).toBe("gpp");
    expect(a.reason).toMatch(/right tail/);
  });

  it("recommends gpp, not leverage, for a small top-heavy field", () => {
    expect(adviseMode(WEEK2_2026_CONTEST, "gpp").mismatch).toBe(false);
    expect(adviseMode(WEEK2_2026_CONTEST, "leverage").mismatch).toBe(true);
  });

  it("recommends leverage only when the field is genuinely large", () => {
    expect(adviseMode({ fieldSize: 200000, placesPaid: 1000, singleEntry: false }, "leverage").recommended).toBe("leverage");
    expect(adviseMode({ fieldSize: 200000, placesPaid: 50000, singleEntry: false }, "cash").recommended).toBe("cash");
  });

  it("recommends cash when most of the field is paid", () => {
    const a = adviseMode({ fieldSize: 100, placesPaid: 50, singleEntry: true }, "leverage");
    expect(a.recommended).toBe("cash");
    expect(a.mismatch).toBe(true);
  });
});
