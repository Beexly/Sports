/**
 * Arbiter grading: the pure function that makes the arbiter's own accuracy
 * measurable.
 *
 * WHY THIS IS ITS OWN FILE. The measurement has to be checkable by hand. If
 * grading lived beside the Prisma write, the only way to test it would be to
 * mock the database, and a test that mocks the database tests the mock. Keeping
 * the grade a pure function of three inputs means any number reported from the
 * ledger can be re-derived by a reader from the stored row, with no database and
 * no code run.
 *
 * THE RULE THAT MATTERS MOST. An `UNDECIDED` ruling is NOT a loss. The arbiter is
 * told it may decline when the two claims do not separate each other, and that
 * option is worthless the moment declines are scored as misses: the cheapest way
 * to improve the reported accuracy would be to ban `UNDECIDED`, which would make
 * the arbiter worse at the only thing it is for. So declines grade as
 * `NO_RULING`, and that is a separate bucket from `OVERTURNED` in every summary
 * built on top of this.
 *
 * THE SECOND RULE. `NOT_YET_SETTLED` is not a win either. A ruling that has not
 * been graded leaves the accuracy denominator alone. Without that, the longer the
 * ledger went ungraded the better the arbiter would look, which is the wrong
 * incentive in a system whose whole purpose is honest measurement.
 */

/**
 * The five grades, kept distinct. See the mutation note in the test file.
 */
export type ArbiterGrade = "UPHELD" | "OVERTURNED" | "PUSH" | "NO_RULING" | "NOT_YET_SETTLED";

/** The verdicts that can appear in a stored ruling's rationale. */
export type GradableVerdict = "UPHOLD_REASONING" | "UPHOLD_LEGACY" | "UNDECIDED" | null;

/**
 * How the upheld claim actually settled.
 *
 * Modelled on the engine's own `SettlementResult` (settlement.ts) rather than a
 * bare boolean, because a SPREAD that lands exactly on the line settles PUSH:
 * neither the arbiter nor the path it upheld was right, and neither was wrong.
 * Collapsing that into `false` would record every push as an overturned ruling
 * and make the arbiter look wrong for an outcome nobody called.
 *
 * null means "not settled yet".
 */
export type SettledOutcome = "WIN" | "LOSS" | "PUSH" | null;

/**
 * Grade one stored ruling against what the fixture actually did.
 *
 * `settled` is the caller's job because only the caller holds the result: a pick
 * settles against a real score, and this module deliberately does not read the
 * database or take a clock, so a grade can be re-derived later from the stored
 * row alone.
 *
 * Order matters. The two "no ruling" cases are checked BEFORE the settled check,
 * so an unsettled decline is still `NO_RULING` rather than `NOT_YET_SETTLED`:
 * there was never a claim to settle, so there is nothing to wait for.
 */
export function gradeArbiterDecision(
  rulingVerdict: GradableVerdict,
  settled: SettledOutcome,
): ArbiterGrade {
  if (rulingVerdict === null) return "NO_RULING";
  if (rulingVerdict === "UNDECIDED") return "NO_RULING";
  if (settled === null) return "NOT_YET_SETTLED";
  if (settled === "PUSH") return "PUSH";
  return settled === "WIN" ? "UPHELD" : "OVERTURNED";
}

/**
 * Accuracy over a set of graded rulings.
 *
 * `decided` is the denominator: only `UPHELD` and `OVERTURNED` count. Returns
 * null rather than 0 when nothing is decided, because "no graded rulings yet"
 * and "the arbiter is 0% accurate" are different facts and a dashboard that
 * cannot tell them apart will show a zero that nobody earned.
 *
 * `noRuling` is reported alongside rather than folded in, so a reader can see
 * how often the arbiter declined next to how often it was right.
 */
export function arbiterAccuracy(grades: readonly ArbiterGrade[]): {
  readonly decided: number;
  readonly upheld: number;
  readonly overturned: number;
  readonly push: number;
  readonly noRuling: number;
  readonly notYetSettled: number;
  readonly accuracy: number | null;
} {
  const upheld = grades.filter((g) => g === "UPHELD").length;
  const overturned = grades.filter((g) => g === "OVERTURNED").length;
  const push = grades.filter((g) => g === "PUSH").length;
  const noRuling = grades.filter((g) => g === "NO_RULING").length;
  const notYetSettled = grades.filter((g) => g === "NOT_YET_SETTLED").length;
  // A push decided nothing, so it is outside the denominator for the same
  // reason a decline is: counting it as a loss would charge the arbiter for an
  // outcome on which the claim neither won nor lost.
  const decided = upheld + overturned;
  return {
    decided,
    upheld,
    overturned,
    push,
    noRuling,
    notYetSettled,
    accuracy: decided === 0 ? null : upheld / decided,
  };
}
