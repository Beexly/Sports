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


/**
 * C-256 (Devin). Two refusals the first version of this tool did not make.
 */
describe("a game with an ungradeable settled pick is refused whole", () => {
  const ungradeablePick = pick({
    id: "u",
    pickType: "TOTAL",
    selection: "Over",
    line: null,
    clvLockLine: null,
    result: "WIN",
  });

  it("refuses rather than correcting the score and leaving the pick behind", () => {
    // The finding: correcting the score while one settled pick keeps its old
    // result manufactures a score-result contradiction, which is the exact
    // defect this tool exists to remove.
    const plan = planGameRepair(MISMATCH, GAME, [pick({ id: "a" }), ungradeablePick]);
    expect(plan.refused).toBe(true);
    expect(plan.refusedReason).toContain("cannot be re-graded");
  });

  it("does not count a refused game's picks as changes", () => {
    const refusedPlan = planGameRepair(MISMATCH, GAME, [pick({ id: "a" }), ungradeablePick]);
    const totals = summarizeRepairPlan([refusedPlan]).totals;
    expect(totals.refused).toBe(1);
    expect(totals.repairable).toBe(0);
    expect(totals.picksChanged).toBe(0);
    expect(totals.publishedPicksChanged).toBe(0);
  });

  it("still repairs a game whose every settled pick can be re-graded", () => {
    const plan = planGameRepair(MISMATCH, GAME, [pick({ id: "a" })]);
    expect(plan.refused).toBe(false);
    expect(summarizeRepairPlan([plan]).totals.repairable).toBe(1);
  });

  it("says REFUSED in the printed plan so an operator cannot miss it", () => {
    const plan = summarizeRepairPlan([planGameRepair(MISMATCH, GAME, [pick({ id: "a" }), ungradeablePick])]);
    const text = formatRepairPlan(plan).join("\n");
    expect(text).toContain("REFUSED");
    expect(text).toContain("(not applied)");
  });
});

describe("write-once records that would keep the old result are named", () => {
  it("flags a settlement snapshot frozen on the pre-repair result", () => {
    const plan = planGameRepair(MISMATCH, GAME, [
      pick({ id: "a", result: "WIN", snapshotSettlementResult: "WIN" }),
    ]);
    expect(plan.staleDerivatives).toHaveLength(1);
    expect(plan.staleDerivatives[0]).toMatchObject({
      pickId: "a",
      kind: "signal_snapshot",
      frozenResult: "WIN",
      correctedResult: "LOSS",
    });
  });

  it("flags an immutable settlement event too, and both together", () => {
    const plan = planGameRepair(MISMATCH, GAME, [
      pick({ id: "a", result: "WIN", snapshotSettlementResult: "WIN", settlementEventResult: "WIN" }),
    ]);
    expect(plan.staleDerivatives.map((d) => d.kind).sort()).toEqual([
      "settlement_event",
      "signal_snapshot",
    ]);
  });

  it("does NOT flag a derivative that already agrees with the corrected result", () => {
    // A pick graded the same way twice leaves nothing contradicting anything,
    // and reporting it would inflate the number an operator is asked to accept.
    const plan = planGameRepair(MISMATCH, GAME, [
      pick({ id: "a", result: "WIN", snapshotSettlementResult: "LOSS" }),
    ]);
    expect(plan.staleDerivatives).toHaveLength(0);
  });

  it("does NOT flag derivatives on a pick whose result is unchanged", () => {
    const plan = planGameRepair(
      { ...MISMATCH, source: { home: 9, away: 1 }, winnerDiffers: false },
      GAME,
      [pick({ id: "a", result: "WIN", snapshotSettlementResult: "WIN" })],
    );
    expect(plan.changedCount).toBe(0);
    expect(plan.staleDerivatives).toHaveLength(0);
  });
});

describe("the runner refuses before writing", () => {
  const runnerSrc = readFileSync(
    resolve(__dirname, "../../../scripts/ops/repair-stored-scores.ts"),
    "utf8",
  );
  const runnerCode = runnerSrc
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((l) => !l.trim().startsWith("//"))
    .join("\n");

  it("will not execute with stale derivatives unless explicitly accepted", () => {
    expect(runnerCode).toMatch(/--accept-stale-derivatives/);
    expect(runnerCode).toMatch(/REFUSING TO EXECUTE/);
  });

  it("skips refused games in the write loop", () => {
    expect(runnerCode).toMatch(/if \(g\.refused\)/);
  });

  it("exits nonzero when any game was refused, so a partial run is not read as success", () => {
    expect(runnerCode).toMatch(/if \(gamesRefused > 0\) process\.exitCode = 1;/);
  });

  it("never re-stamps settledAt, which is the settlement event time", () => {
    // C-258 (Devin). The first version wrote `settledAt: new Date()` on a
    // correction. settledAt is sliced on by daily-truth windows, calibration
    // date ranges, journal and proof ordering and sequential ROI, so
    // re-stamping a pick settled a week ago moves it into today's counts: a
    // second falsification on top of the one being repaired.
    const writes = runnerCode.match(/data:\s*\{[^}]*\}/g) ?? [];
    for (const w of writes) expect(w).not.toContain("settledAt");
  });

  it("still writes only the three documented fields", () => {
    const writes = runnerCode.match(/data:\s*\{[^}]*\}/g) ?? [];
    const allowed = new Set(["homeScore", "awayScore", "result"]);
    for (const w of writes) {
      for (const field of w.match(/(\w+):/g) ?? []) {
        const name = field.slice(0, -1);
        if (name === "data") continue;
        expect(allowed.has(name), name).toBe(true);
      }
    }
  });
});

/**
 * C-260 (Devin, #720). `calculatePickResult` fails loud on an unknown pickType
 * but is fail-OPEN on the selection: `selectionIsHomeSide` returns a bare
 * boolean, so a selection matching NEITHER team grades as the AWAY side, and a
 * TOTAL that does not literally begin "OVER" grades as under. Live settlement
 * survives that because the selection was validated when the pick was written;
 * this tool re-grades an existing row directly, so nothing vouches for the
 * string and a fallback would overwrite a stored result with an invented one.
 *
 * The bar these tests set: refuse, and refuse the WHOLE GAME, rather than
 * grade on a fallback reading.
 */
describe("a selection the grader would only resolve by falling back is refused", () => {
  const NEITHER = pick({ id: "n", selection: "Dodgers ML (-150)" });
  const LOWER_TOTAL = pick({ id: "t", pickType: "TOTAL", selection: "over 8.5", line: 8.5 });

  it("refuses a MONEYLINE selection naming neither team, instead of grading it away", () => {
    const r = regradePick(NEITHER, "Yankees", "Red Sox", "baseball_mlb", 2, 5);
    // Away won 5-2. The fallback reading would have called this a WIN.
    expect(r).toMatchObject({ pickId: "n" });
    expect(r).not.toHaveProperty("to");
    expect((r as { reason: string }).reason).toContain("matches neither");
  });

  it("refuses a SPREAD selection naming neither team", () => {
    const r = regradePick(
      pick({ id: "s", pickType: "SPREAD", selection: "Dodgers -1.5", line: -1.5 }),
      "Yankees",
      "Red Sox",
      "baseball_mlb",
      2,
      5,
    );
    expect((r as { reason: string }).reason).toContain("matches neither");
  });

  it("refuses an ambiguous selection that resolves to BOTH sides", () => {
    // Degenerate data: identical team names. The engine's most-specific rule
    // has no winner here, so there is no defensible side to grade.
    const r = regradePick(pick({ id: "b" }), "Yankees", "Yankees", "baseball_mlb", 2, 5);
    expect((r as { reason: string }).reason).toContain("BOTH");
  });

  it("refuses a lower-case TOTAL rather than normalising it", () => {
    // Normalising would grade this OVER, while production settlement graded it
    // UNDER on the same string. Refusing is the only reading that cannot
    // disagree with how the pick was settled the first time.
    const r = regradePick(LOWER_TOTAL, "Yankees", "Red Sox", "baseball_mlb", 6, 6);
    expect((r as { reason: string }).reason).toContain("neither OVER nor UNDER");
  });

  it("refuses a leading-space TOTAL, because the grader reads the raw string", () => {
    const r = regradePick(
      pick({ id: "w", pickType: "TOTAL", selection: " OVER 8.5", line: 8.5 }),
      "Yankees",
      "Red Sox",
      "baseball_mlb",
      6,
      6,
    );
    expect((r as { reason: string }).reason).toContain("neither OVER nor UNDER");
  });

  it("still grades every selection the engine resolves unambiguously", () => {
    // The guard must refuse fallbacks WITHOUT narrowing what already worked.
    for (const [selection, home, away] of [
      ["Yankees ML (-150)", "Yankees", "Red Sox"],
      ["Red Sox ML (+130)", "Yankees", "Red Sox"],
      ["Yankees", "Yankees", "Red Sox"],
    ] as const) {
      const r = regradePick(pick({ selection }), home, away, "baseball_mlb", 2, 5);
      expect(r, `${selection} was refused`).not.toHaveProperty("reason");
    }
    for (const selection of ["OVER 8.5", "UNDER 8.5"]) {
      const r = regradePick(
        pick({ pickType: "TOTAL", selection, line: 8.5 }),
        "Yankees",
        "Red Sox",
        "baseball_mlb",
        2,
        5,
      );
      expect(r, `${selection} was refused`).not.toHaveProperty("reason");
    }
  });

  it("refuses the WHOLE GAME when one settled pick carries such a selection", () => {
    // C-256's rule holds: correcting the score while leaving that pick on its
    // old result is the contradiction the tool exists to remove.
    const plan = planGameRepair(MISMATCH, GAME, [pick({ id: "a" }), NEITHER]);
    expect(plan.refused).toBe(true);
    expect(summarizeRepairPlan([plan]).totals.repairable).toBe(0);
  });
});
