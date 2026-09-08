import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  formatRepairPlan,
  planGameRepair,
  regradePick,
  summarizeRepairPlan,
  type PickForRepair,
} from "../../../scripts/ops/lib/score-repair";
import type { ScoreMismatch } from "../../../scripts/ops/lib/score-reconciliation";

/**
 * C-254. The repair plan for C-247's contaminated finals. These tests pin the
 * three refusals that make the tool safe to hand an owner: it never invents a
 * grade, it never nets changes out to zero, and it never touches a row the
 * settlement lane owns.
 */
function pick(over: Partial<PickForRepair> = {}): PickForRepair {
  return {
    id: "p1",
    pickType: "MONEYLINE",
    selection: "Yankees ML (-150)",
    line: -150,
    clvLockLine: null,
    isPublished: true,
    result: "WIN",
    ...over,
  };
}

const MISMATCH: ScoreMismatch = {
  gameId: "g1",
  eventId: "espn-1",
  commenceTime: new Date("2026-09-01T23:00:00Z"),
  matchup: "Red Sox at Yankees",
  stored: { home: 5, away: 2 },
  source: { home: 2, away: 5 },
  winnerDiffers: true,
  settledPicks: 1,
};

const GAME = { homeTeamName: "Yankees", awayTeamName: "Red Sox", sportKey: "baseball_mlb" };

describe("regradePick", () => {
  it("flips a moneyline WIN to LOSS when the real winner is the other side", () => {
    const r = regradePick(pick(), "Yankees", "Red Sox", "baseball_mlb", 2, 5);
    expect(r).not.toBeNull();
    expect(r).toMatchObject({ from: "WIN", to: "LOSS", changed: true });
  });

  it("reports changed=false when the repair does not move the result", () => {
    const r = regradePick(pick(), "Yankees", "Red Sox", "baseball_mlb", 9, 1);
    expect(r).toMatchObject({ from: "WIN", to: "WIN", changed: false });
  });

  it("refuses rows the settlement lane owns, rather than grading them", () => {
    for (const result of ["PENDING", "VOID", null]) {
      expect(regradePick(pick({ result }), "Yankees", "Red Sox", "baseball_mlb", 2, 5)).toBeNull();
    }
  });

  it("grades a SPREAD against the captured line, not the pick's own line", () => {
    // clvLockLine is what settlement graded on; ignoring it would re-grade the
    // pick against a line it was never settled against.
    const r = regradePick(
      pick({ pickType: "SPREAD", selection: "Yankees -1.5", line: -2.5, clvLockLine: -1.5, result: "LOSS" }),
      "Yankees",
      "Red Sox",
      "baseball_mlb",
      5,
      2,
    );
    // Yankees win by 3, cover -1.5.
    expect(r).toMatchObject({ from: "LOSS", to: "WIN", changed: true });
  });

  it("marks a non-moneyline pick with no line UNGRADEABLE instead of defaulting it", () => {
    const r = regradePick(
      pick({ pickType: "TOTAL", selection: "Over", line: null, clvLockLine: null, result: "WIN" }),
      "Yankees",
      "Red Sox",
      "baseball_mlb",
      2,
      5,
    );
    expect(r).toHaveProperty("reason");
    expect(r).not.toHaveProperty("to");
  });
});

describe("planGameRepair", () => {
  it("counts published and unpublished changes separately", () => {
    const plan = planGameRepair(MISMATCH, GAME, [
      pick({ id: "a", isPublished: true, result: "WIN" }),
      pick({ id: "b", isPublished: false, result: "WIN" }),
    ]);
    expect(plan.changedCount).toBe(2);
    expect(plan.changedPublishedCount).toBe(1);
  });

  it("SUMS offsetting flips instead of netting them to zero", () => {
    // Two WINs become LOSSes and two LOSSes become WINs. The aggregate win
    // count is unchanged and the record is still wrong four times over. A tool
    // that reported 0 here would be the C-241 defect class all over again.
    const plan = planGameRepair(MISMATCH, GAME, [
      pick({ id: "a", selection: "Yankees ML (-150)", result: "WIN" }),
      pick({ id: "b", selection: "Yankees ML (-150)", result: "WIN" }),
      pick({ id: "c", selection: "Red Sox ML (+130)", result: "LOSS" }),
      pick({ id: "d", selection: "Red Sox ML (+130)", result: "LOSS" }),
    ]);
    expect(plan.changedCount).toBe(4);
    const totals = summarizeRepairPlan([plan]).totals;
    expect(totals.picksChanged).toBe(4);
    expect(totals.picksExamined).toBe(4);
  });

  it("keeps ungradeable picks out of the change count and names them", () => {
    const plan = planGameRepair(MISMATCH, GAME, [
      pick({ id: "a", result: "WIN" }),
      pick({ id: "u", pickType: "TOTAL", selection: "Over", line: null, clvLockLine: null, result: "WIN" }),
    ]);
    expect(plan.changedCount).toBe(1);
    expect(plan.ungradeable).toHaveLength(1);
    expect(plan.ungradeable[0]?.pickId).toBe("u");
  });
});

describe("formatRepairPlan", () => {
  it("states the published damage on its own, never folded into the total", () => {
    const plan = summarizeRepairPlan([
      planGameRepair(MISMATCH, GAME, [
        pick({ id: "a", isPublished: true, result: "WIN" }),
        pick({ id: "b", isPublished: false, result: "WIN" }),
      ]),
    ]);
    const text = formatRepairPlan(plan).join("\n");
    expect(text).toContain("2 of 2 settled pick(s) would change result");
    expect(text).toContain("(1 of them published)");
    expect(text).toContain("WINNER DIFFERS");
  });

  it("says nothing about ungradeable picks when there are none", () => {
    const plan = summarizeRepairPlan([planGameRepair(MISMATCH, GAME, [pick()])]);
    expect(formatRepairPlan(plan).join("\n")).not.toContain("UNGRADEABLE");
  });
});

/**
 * Source-level guards on the runner. The pure planner above cannot see whether
 * the runner is dry-run by default or whether it writes more than it says, and
 * those are the two properties an owner is trusting when they run it.
 */
describe("the runner's write contract", () => {
  const src = readFileSync(
    resolve(__dirname, "../../../scripts/ops/repair-stored-scores.ts"),
    "utf8",
  );
  // Strip comments before asserting on behaviour: the C-241 lesson is that a
  // docblock describing the right thing passes an assertion the code fails.
  const code = src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((l) => !l.trim().startsWith("//"))
    .join("\n");

  it("writes nothing without --execute", () => {
    expect(code).toMatch(/const EXECUTE = process\.argv\.includes\("--execute"\)/);
    // The early return that guards every write below it.
    expect(code).toMatch(/if \(!EXECUTE\) \{[\s\S]*?return;\n\s*\}/);
  });

  it("only ever writes the four fields it documents", () => {
    const writes = code.match(/data:\s*\{[^}]*\}/g) ?? [];
    expect(writes.length).toBeGreaterThan(0);
    const allowed = new Set(["homeScore", "awayScore", "result", "settledAt"]);
    for (const w of writes) {
      for (const field of w.match(/(\w+):/g) ?? []) {
        const name = field.slice(0, -1);
        if (name === "data") continue;
        expect(allowed.has(name)).toBe(true);
      }
    }
  });

  it("never moves a publish flag, deletes, or creates", () => {
    // Narrowed, not weakened. The first draft matched `isPublished:` anywhere
    // and fired on the _count WHERE clause that only READS the flag. The claim
    // being guarded is that no publish flag is ever WRITTEN, so it is asserted
    // where writes live: inside a Prisma `data:` block.
    const writeBlocks = code.match(/data:\s*\{[^}]*\}/g) ?? [];
    expect(writeBlocks.length).toBeGreaterThan(0);
    for (const block of writeBlocks) {
      expect(block).not.toContain("isPublished");
    }
    expect(code).not.toMatch(/\.delete\(|\.deleteMany\(|\.create\(|\.createMany\(/);
  });

  it("applies each game's score and its re-grades in one transaction", () => {
    expect(code).toMatch(/\$transaction\(\[/);
  });

  it("only accepts a source event the scoreboard reports as final", () => {
    expect(code).toMatch(/STATUS_FINAL/);
  });

  it("refuses an unknown sport instead of guessing a scoreboard URL", () => {
    expect(code).toMatch(/abort rather than guess a URL/);
    expect(code).toMatch(/process\.exit\(2\)/);
  });
});
