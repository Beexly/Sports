/**
 * PUBLISHED LINE — the number we show the customer AND grade the pick against.
 *
 * WHY THIS EXISTS
 * ---------------
 * `scoreSpreadPick` / `scoreTotalPick` derive a consensus handicap as the plain
 * arithmetic mean of the book numbers. That mean is the right input to the
 * SCORING math (dispersion, edge, fair value all want full precision), but it is
 * the WRONG thing to publish and grade, for two reasons:
 *
 *  1. PUSH becomes structurally unreachable. Settlement pushes a SPREAD only on
 *     `homeMargin + line === 0` and a TOTAL only on `total === line`. Final
 *     margins and totals are integers, so a push requires an integer line — and
 *     the mean of several book numbers is an integer only when EVERY book posted
 *     the identical number. With `MIN_BOOKMAKERS = 2`, one book off the consensus
 *     is enough to erase the push:
 *
 *       books -3,-3,-3,-3,-3,-2.5  → mean -2.9166…  home wins by 3
 *       settlement: 3 + (-2.9166…) = +0.0833… > 0   → WIN
 *       reality at the -3 five of six books posted  → PUSH
 *
 *     Systematically that inflates the numerator AND the win/loss denominator of
 *     the published track record, and pins the record's PUSH column at 0 forever
 *     for spreads and totals.
 *
 *  2. The mean is not a line anyone could have bet. No book was offering
 *     -2.9166…; a customer who followed the pick took -3 or -2.5. Grading against
 *     a number that existed nowhere in the market is not an auditable record.
 *
 * THE RULE
 * --------
 * Publish (and therefore grade at) the POSTED book number nearest the consensus
 * mean. Not a fixed half-point grid — the nearest number a book actually quoted.
 * That is strictly stronger: it is by construction a line a bettor could have
 * taken, and it adapts to whatever grid a sport really uses (NFL/NBA half-points,
 * soccer Asian quarter-lines like -0.75, hockey/baseball ±1.5) with no
 * per-sport configuration and no risk of snapping a genuine quarter-line onto a
 * half-point it never occupied.
 *
 * TIE-BREAK
 * ---------
 * When two posted numbers are exactly equidistant from the mean (e.g. totals
 * 44.5 and 45 → mean 44.75), we publish the one that is WORSE for the side we
 * picked: the higher total for an OVER, the lower for an UNDER, the bigger
 * handicap for whichever team we laid. These are published numbers backing
 * public accuracy claims, so a coin-flip is resolved against us, never for us.
 * The tie-break is decided from the pick's own side at publish time and never
 * from the eventual result.
 *
 * SCOPE — FORWARD ONLY
 * --------------------
 * This changes the number a NEWLY SCORED pick publishes and locks. It cannot
 * re-grade anything already settled: settlement only ever reads a row's stored
 * `clvLockLine` / `line`, and every settlement writer — settle-sport.ts,
 * free-settlement-runner.ts and settle-backfill.ts — writes through an
 * updateMany scoped to `result: "PENDING"`, so a settled row is not a candidate.
 * Rows already locked keep the exact line they were locked at and will grade
 * exactly as they would have before this change.
 *
 * NOT A MODEL CHANGE
 * ------------------
 * Nothing here feeds scoring. Confidence, edge, dispersion, fair value and the
 * ranking probability all still read the raw `avgSpread` / `avgTotal` mean, so
 * no pick's grade or rank moves and MODEL_VERSION is untouched. Only the
 * artifact — the number shown, locked and graded — changes.
 *
 * The historical-replay backfill is unaffected in practice: it synthesises N
 * bookmaker rows that all quote the SAME nflverse closing line, so the mean IS
 * a posted number and the snap is a no-op (see the unit test).
 */

/**
 * Floating-point slack for the equidistance test. Book numbers arrive on coarse
 * grids (0.25 at the finest), so genuine distances differ by far more than this;
 * the epsilon only absorbs representation error in the mean.
 */
const TIE_EPSILON = 1e-9;

/**
 * Snap a consensus average onto the nearest line a book actually posted.
 *
 * @param average      The consensus mean (full precision, as used for scoring).
 * @param postedLines  Every line quoted by the books in this consensus. Duplicates
 *                     are harmless — they neither move nor break the choice.
 * @param worseWhenHigher `true` when a HIGHER number is worse for the side we
 *                     published (OVER totals; a spread where we laid the away
 *                     team, since `line` is stored home-perspective), `false`
 *                     when a LOWER number is worse (UNDER totals; a spread where
 *                     we laid the home team). Only consulted on an exact tie.
 * @returns The posted line to publish, lock and grade against. Falls back to
 *          `average` only when `postedLines` is empty, which the
 *          `MIN_BOOKMAKERS` guard already makes unreachable.
 */
export function snapToPostedLine(
  average: number,
  postedLines: readonly number[],
  worseWhenHigher: boolean,
): number {
  let best: number | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const posted of postedLines) {
    const distance = Math.abs(posted - average);

    if (distance < bestDistance - TIE_EPSILON) {
      best = posted;
      bestDistance = distance;
      continue;
    }

    if (best !== null && Math.abs(distance - bestDistance) <= TIE_EPSILON) {
      // Equidistant — resolve against ourselves (see TIE-BREAK above).
      best = worseWhenHigher ? Math.max(best, posted) : Math.min(best, posted);
      // Keep the tighter of the two distances so later candidates compare fairly.
      bestDistance = Math.min(bestDistance, distance);
    }
  }

  return best ?? average;
}

/**
 * Render a published line for the customer-facing `selection` string.
 *
 * The displayed string and the graded number MUST be the same value — that
 * equality is the whole point of publishing a posted line. A blanket
 * `toFixed(1)` breaks it on any grid finer than half-points (a real soccer
 * -0.75 would display as "-0.8" and grade at -0.75), so keep the conventional
 * one-decimal form when the value sits on the 0.1 grid and render the exact
 * value otherwise.
 */
export function formatPublishedLine(value: number): string {
  // `value * 10` is integral for the .0 / .5 grid every major North American
  // market quotes on, so this preserves today's "-3.0" / "44.5" form exactly.
  const tenths = value * 10;
  if (Math.abs(tenths - Math.round(tenths)) < TIE_EPSILON) {
    return value.toFixed(1);
  }
  return String(value);
}
