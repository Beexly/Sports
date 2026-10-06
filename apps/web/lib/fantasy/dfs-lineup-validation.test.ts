import { describe, it, expect } from "vitest";
import { optimizeOne, type OptOpts } from "./dfs-optimizer";
import { DFS_SLATE, SALARY_CAP, type DfsPlayer } from "./dfs-slate";
import {
  validateLineup,
  validateOptimizerInput,
  athleteKey,
} from "./dfs-lineup-validation";

const base = (over: Partial<OptOpts> = {}): OptOpts => ({
  mode: "gpp",
  stack: false,
  locks: new Set(),
  excludes: new Set(),
  ...over,
});

/** A known-legal lineup: the solver's own optimum must validate clean. */
function solverLineup(opts: OptOpts): DfsPlayer[] {
  const lu = optimizeOne(opts, undefined, DFS_SLATE);
  if (!lu) throw new Error("fixture slate produced no lineup");
  return lu;
}

describe("dfs-lineup-validation — independent of the solver", () => {
  it("accepts the solver's own optimum on the fixture slate", () => {
    expect(validateLineup(solverLineup(base()), base(), DFS_SLATE)).toEqual([]);
  });

  it("accepts a stacked optimum when stacking was requested", () => {
    const opts = base({ stack: true });
    expect(validateLineup(solverLineup(opts), opts, DFS_SLATE)).toEqual([]);
  });

  it("rejects an over-cap lineup", () => {
    const lu = solverLineup(base());
    const rich = { ...lu[0]!, salary: SALARY_CAP };
    expect(validateLineup([rich, ...lu.slice(1)], base(), DFS_SLATE).map((i) => i.code)).toContain("OVER_CAP");
  });

  it("rejects the same athlete twice under distinct row ids", () => {
    const lu = solverLineup(base());
    const twin = { ...lu[1]!, id: `${lu[1]!.id}-x` };
    expect(athleteKey(twin)).toBe(athleteKey(lu[1]!));
    // Twin leads off while the original still plays: one athlete, two slots.
    expect(validateLineup([twin, ...lu.slice(1)], base(), DFS_SLATE).map((i) => i.code)).toContain(
      "DUPLICATE_ATHLETE",
    );
  });

  it("rejects a faded player in the lineup", () => {
    const lu = solverLineup(base());
    const opts = base({ excludes: new Set([lu[0]!.id]) });
    expect(validateLineup(lu, opts, DFS_SLATE).map((i) => i.code)).toContain("EXCLUDED_PRESENT");
  });

  it("rejects a lineup missing its pinned player", () => {
    const lu = solverLineup(base());
    const swapped = solverLineup(base({ excludes: new Set([lu[0]!.id]) }));
    const opts = base({ locks: new Set([lu[0]!.id]) });
    expect(validateLineup(swapped, opts, DFS_SLATE).map((i) => i.code)).toContain("LOCK_MISSING");
  });

  it("rejects non-finite values", () => {
    const lu = solverLineup(base());
    const bad = { ...lu[2]!, proj: Number.NaN };
    expect(validateLineup([lu[0]!, lu[1]!, bad, ...lu.slice(3)], base(), DFS_SLATE).map((i) => i.code)).toContain(
      "NONFINITE_VALUE",
    );
  });

  it("rejects an unstacked lineup when stacking was requested", () => {
    // Starve every QB team of pass catchers: no legal lineup can stack, so the
    // unconstrained optimum must fail the stack check.
    const qbTeams = new Set(DFS_SLATE.filter((p) => p.pos === "QB").map((p) => p.team));
    const starved = new Set(
      DFS_SLATE.filter((p) => (p.pos === "WR" || p.pos === "TE") && qbTeams.has(p.team)).map((p) => p.id),
    );
    const lu = solverLineup(base({ excludes: starved }));
    expect(validateLineup(lu, base({ stack: true }), DFS_SLATE).map((i) => i.code)).toContain("STACK_UNSATISFIED");
  });
});

describe("validateOptimizerInput — refuse before solving", () => {
  it("flags lock/exclude conflicts instead of silently dropping the lock", () => {
    const issues = validateOptimizerInput(base({ locks: new Set(["dqb1"]), excludes: new Set(["dqb1"]) }), DFS_SLATE);
    expect(issues.map((i) => i.code)).toContain("LOCK_MISSING");
  });

  it("flags locked ids absent from the slate", () => {
    const issues = validateOptimizerInput(base({ locks: new Set(["ghost"]) }), DFS_SLATE);
    expect(issues.map((i) => i.code)).toContain("LOCK_MISSING");
  });

  it("flags a slate listing one athlete twice", () => {
    const twin: DfsPlayer = { ...DFS_SLATE[0]!, id: "dqb1-copy" };
    const issues = validateOptimizerInput(base(), [...DFS_SLATE, twin]);
    expect(issues.map((i) => i.code)).toContain("DUPLICATE_ATHLETE");
  });

  it("passes clean input", () => {
    expect(validateOptimizerInput(base(), DFS_SLATE)).toEqual([]);
  });
});
