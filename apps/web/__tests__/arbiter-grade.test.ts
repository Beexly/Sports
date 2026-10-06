/**
 * The measurement, tested on its own terms.
 *
 * This is the module that decides what "the arbiter's accuracy" MEANS, so the
 * tests are about the meaning rather than about the shape of a return value.
 *
 * The property that matters most is the one that is easiest to break by
 * accident: an `UNDECIDED` ruling must not be scored as a loss. The arbiter is
 * told it may decline when the two claims do not separate each other, and that
 * permission is worthless the moment declines count as misses, because the
 * cheapest way to improve the reported accuracy would be to ban `UNDECIDED` and
 * force a ruling. The tests below pin the separation so the incentive to keep
 * declining survives.
 *
 * The second property: an unsettled fixture must not count as a win either, or
 * the arbiter would look better the longer the ledger went ungraded.
 *
 * Nothing here touches a database. The grade is a pure function of the stored
 * row, which is what lets a reader re-derive any reported number by hand.
 */

import { describe, expect, it } from "vitest";
import {
  arbiterAccuracy,
  gradeArbiterDecision,
  type ArbiterGrade,
} from "@/lib/arbiter/grade";

describe("gradeArbiterDecision: a ruling that was right", () => {
  it("grades UPHELD when the claim the arbiter upheld won", () => {
    expect(gradeArbiterDecision("UPHOLD_REASONING", "WIN")).toBe("UPHELD");
  });

  it("grades OVERTURNED when the claim the arbiter upheld lost", () => {
    expect(gradeArbiterDecision("UPHOLD_LEGACY", "LOSS")).toBe("OVERTURNED");
  });

  it("does not care which path won the argument, only whether it was right", () => {
    // The two must be symmetric. A grader that scored the reasoning path
    // differently from the legacy one would not be measuring the arbiter; it
    // would be measuring which side of the argument the author preferred.
    expect(gradeArbiterDecision("UPHOLD_REASONING", "WIN")).toBe(
      gradeArbiterDecision("UPHOLD_LEGACY", "WIN"),
    );
    expect(gradeArbiterDecision("UPHOLD_REASONING", "LOSS")).toBe(
      gradeArbiterDecision("UPHOLD_LEGACY", "LOSS"),
    );
  });
});

describe("gradeArbiterDecision: a decline is not a failure", () => {
  it("grades UNDECIDED as NO_RULING whether or not the fixture is settled", () => {
    // Both cases, on purpose. A decline cannot be proved right or wrong, so
    // scoring it either way would put a number in the accuracy column the
    // arbiter did not earn.
    expect(gradeArbiterDecision("UNDECIDED", "WIN")).toBe("NO_RULING");
    expect(gradeArbiterDecision("UNDECIDED", "LOSS")).toBe("NO_RULING");
    expect(gradeArbiterDecision("UNDECIDED", null)).toBe("NO_RULING");
  });

  it("grades a rejected output as NO_RULING, never as a loss", () => {
    // A rejection means no ruling was made. Counting it as a miss would
    // conflate "the arbiter was wrong" with "the arbiter produced nothing",
    // which are different failures with different fixes.
    expect(gradeArbiterDecision(null, "WIN")).toBe("NO_RULING");
    expect(gradeArbiterDecision(null, "LOSS")).toBe("NO_RULING");
  });

  it("grades a push as PUSH, not as a win or a loss", () => {
    // A spread landing exactly on the line settles PUSH: the upheld claim
    // neither won nor lost. Recording that as OVERTURNED would charge the
    // arbiter for an outcome nobody called, on a market where a push is a
    // routine and entirely fair result.
    expect(gradeArbiterDecision("UPHOLD_REASONING", "PUSH")).toBe("PUSH");
    expect(gradeArbiterDecision("UPHOLD_LEGACY", "PUSH")).toBe("PUSH");
  });

  it("keeps a push out of the decided denominator", () => {
    // 2 right, 1 wrong, 1 push, 2 declines. The push decided nothing.
    const summary = arbiterAccuracy([
      "UPHELD",
      "UPHELD",
      "OVERTURNED",
      "PUSH",
      "NO_RULING",
      "NO_RULING",
    ]);
    expect(summary.decided).toBe(3);
    expect(summary.push).toBe(1);
    expect(summary.accuracy).toBeCloseTo(2 / 3);
  });

  it("checks the no-ruling cases before the settled check", () => {
    // An unsettled decline has nothing to wait for: there was never a claim to
    // settle. Getting this order wrong would report declines as "not yet
    // graded" forever and quietly pad the unsettled bucket.
    expect(gradeArbiterDecision("UNDECIDED", null)).not.toBe("NOT_YET_SETTLED");
    expect(gradeArbiterDecision(null, null)).not.toBe("NOT_YET_SETTLED");
  });

  it("keeps NO_RULING distinct from OVERTURNED so a summary can count them apart", () => {
    expect(gradeArbiterDecision("UNDECIDED", "LOSS")).not.toBe(
      gradeArbiterDecision("UPHOLD_LEGACY", "LOSS"),
    );
  });
});

describe("gradeArbiterDecision: an unsettled fixture is not a verdict", () => {
  it("grades NOT_YET_SETTLED when an accepted ruling has no result yet", () => {
    expect(gradeArbiterDecision("UPHOLD_REASONING", null)).toBe("NOT_YET_SETTLED");
    expect(gradeArbiterDecision("UPHOLD_LEGACY", null)).toBe("NOT_YET_SETTLED");
  });
});

describe("arbiterAccuracy: the denominator is the decided set", () => {
  it("returns null, not zero, when nothing has been decided", () => {
    // "No graded rulings yet" and "the arbiter is 0% accurate" are different
    // facts. A dashboard that cannot tell them apart shows a zero nobody earned.
    const summary = arbiterAccuracy([]);
    expect(summary.accuracy).toBeNull();
    expect(summary.decided).toBe(0);
  });

  it("returns null when every row is a decline or an unsettled ruling", () => {
    const summary = arbiterAccuracy(["NO_RULING", "NOT_YET_SETTLED", "NO_RULING"]);
    expect(summary.accuracy).toBeNull();
    expect(summary.decided).toBe(0);
    expect(summary.noRuling).toBe(2);
    expect(summary.notYetSettled).toBe(1);
  });

  it("excludes declines and unsettled rows from the denominator", () => {
    const withPadding = arbiterAccuracy([
      "UPHELD",
      "OVERTURNED",
      "UPHELD",
      "NO_RULING",
      "NOT_YET_SETTLED",
      "NO_RULING",
    ]);
    const bare = arbiterAccuracy(["UPHELD", "OVERTURNED", "UPHELD"]);

    expect(withPadding.accuracy).toBeCloseTo(2 / 3);
    expect(withPadding.accuracy).toBe(bare.accuracy);
    expect(withPadding.decided).toBe(3);
  });

  it("reports 0% honestly when every decided ruling was wrong", () => {
    const summary = arbiterAccuracy(["OVERTURNED", "OVERTURNED"]);
    expect(summary.accuracy).toBe(0);
    expect(summary.decided).toBe(2);
  });

  it("reports 100% honestly when every decided ruling was right", () => {
    const summary = arbiterAccuracy(["UPHELD", "UPHELD"]);
    expect(summary.accuracy).toBe(1);
  });

  it("keeps the decline count visible next to the accuracy", () => {
    // A reader must be able to see that a 100% accuracy came from two decided
    // rulings out of nine attempts, without opening the raw rows.
    const summary = arbiterAccuracy([
      "UPHELD",
      "UPHELD",
      "NO_RULING",
      "NO_RULING",
      "NO_RULING",
      "NO_RULING",
      "NO_RULING",
      "NOT_YET_SETTLED",
      "NOT_YET_SETTLED",
    ]);
    expect(summary.accuracy).toBe(1);
    expect(summary.decided).toBe(2);
    expect(summary.noRuling).toBe(5);
    expect(summary.notYetSettled).toBe(2);
  });

  it("accounts for every row it was given, so nothing disappears silently", () => {
    const rows: ArbiterGrade[] = [
      "UPHELD",
      "OVERTURNED",
      "NO_RULING",
      "NOT_YET_SETTLED",
      "PUSH",
    ];
    const summary = arbiterAccuracy(rows);
    const total =
      summary.upheld +
      summary.overturned +
      summary.push +
      summary.noRuling +
      summary.notYetSettled;
    expect(total).toBe(rows.length);
    expect(summary.push).toBe(1);
  });
});

/**
 * MUTATION CONTROL. The plausible regression here is collapsing the grade
 * vocabulary to a boolean, which would make the "a decline is not a failure"
 * tests pass by silently counting declines as losses. These two assertions are
 * what that collapse breaks, and they are why the vocabulary is five-valued.
 */
describe("grading mutation control", () => {
  it("a boolean grader would score a decline as a loss, which is wrong", () => {
    // Same fixture outcome, opposite arbiter behaviour. The grade must differ.
    const declined = gradeArbiterDecision("UNDECIDED", "WIN");
    const upheldAndWon = gradeArbiterDecision("UPHOLD_LEGACY", "WIN");
    expect(declined).not.toBe(upheldAndWon);
    expect(declined).toBe("NO_RULING");
  });

  it("a grader that counted declines as misses would understate this arbiter", () => {
    // 3 decided, 2 right, plus 2 declines. A collapse would report 2/5 = 40%.
    // The honest number is 2/3.
    const grades: ArbiterGrade[] = [
      "UPHELD",
      "UPHELD",
      "OVERTURNED",
      "NO_RULING",
      "NO_RULING",
    ];
    const honest = arbiterAccuracy(grades);
    const collapsed = honest.upheld / grades.length;
    expect(honest.accuracy).toBeCloseTo(2 / 3);
    expect(collapsed).toBeCloseTo(0.4);
  });

  it("the grade vocabulary stays five-valued, not collapsed", () => {
    const observed = new Set([
      gradeArbiterDecision("UPHOLD_REASONING", "WIN"),
      gradeArbiterDecision("UPHOLD_REASONING", "LOSS"),
      gradeArbiterDecision("UPHOLD_REASONING", "PUSH"),
      gradeArbiterDecision("UNDECIDED", "WIN"),
      gradeArbiterDecision("UPHOLD_LEGACY", null),
    ]);
    expect(observed.size).toBe(5);
  });
});
