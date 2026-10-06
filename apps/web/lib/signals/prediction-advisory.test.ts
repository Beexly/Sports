import { describe, it, expect } from "vitest";
import { ADVISORY_ONLY, adviseOnPick, disagreements, toLogRow, type PublishedPick } from "./prediction-advisory";
import { EMPTY_CONTEXT } from "./spine";
import { WEEK2_2026_CONTEXT } from "./week2-2026";

const pick = (over: Partial<PublishedPick> = {}): PublishedPick => ({
  id: "p1",
  selection: "Justin Jefferson",
  team: "MIN",
  opp: "CHI",
  pos: "WR",
  statedProbability: 0.58,
  ...over,
});

describe("advisory only — the boundary that must not move", () => {
  it("is marked advisory at the type level", () => {
    expect(ADVISORY_ONLY).toBe(true);
  });

  it("never reports having been applied to a probability", () => {
    const a = adviseOnPick(pick(), WEEK2_2026_CONTEXT);
    expect(a.appliedToProbability).toBe(false);
  });

  it("returns no adjusted probability field at all", () => {
    const a = adviseOnPick(pick(), WEEK2_2026_CONTEXT) as Record<string, unknown>;
    // producing one would be the first step toward someone using it
    for (const k of ["adjustedProbability", "newProbability", "probability", "confidence"]) {
      expect(a[k]).toBeUndefined();
    }
  });

  it("leaves the engine's stated probability untouched in the log row", () => {
    const p = pick({ statedProbability: 0.58 });
    const row = toLogRow(p, adviseOnPick(p, WEEK2_2026_CONTEXT));
    expect(row.statedProbability).toBe(0.58);
  });
});

describe("stance", () => {
  it("DISAGREES with a pick whose environment the spine reads as bad", () => {
    const a = adviseOnPick(pick(), WEEK2_2026_CONTEXT); // Jefferson, 30 mph gusts
    expect(a.stance).toBe("DISAGREES");
    expect(a.signal.delta).toBeLessThan(0);
    expect(a.reasons.join(" ")).toMatch(/gusts/);
  });

  it("AGREES with a pick the spine reads as well-supported", () => {
    const a = adviseOnPick(pick({ id: "p2", selection: "Dalton Schultz", team: "HOU", opp: "CIN", pos: "TE" }), WEEK2_2026_CONTEXT);
    expect(a.stance).toBe("AGREES");
    expect(a.signal.delta).toBeGreaterThan(0);
  });

  it("is NEUTRAL when nothing is known", () => {
    const a = adviseOnPick(pick(), EMPTY_CONTEXT);
    expect(a.stance).toBe("NEUTRAL");
    expect(a.reasons).toHaveLength(0);
  });

  it("surfaces only the material disagreements", () => {
    const picks = [
      pick(),
      pick({ id: "p2", selection: "Dalton Schultz", team: "HOU", opp: "CIN", pos: "TE" }),
      pick({ id: "p3", selection: "Terry McLaurin", team: "WAS", opp: "DAL", pos: "WR" }),
    ];
    const out = disagreements(picks, WEEK2_2026_CONTEXT);
    expect(out.map((d) => d.pickId)).toEqual(["p1"]);
  });
});
