/**
 * Graded line versus displayed line (ledger C-143).
 *
 * Settlement grades a SPREAD or TOTAL pick against selectGradingLine's output:
 * clvLockLine when the pick carries one (the line locked at publish), else
 * `line`. The card renders `line`, which the refresh cycle keeps moving while
 * the pick is PENDING. Measured on production 2026-09-07 over 588 published
 * settled TOTAL picks, the two differ on 432 and the difference flips the
 * outcome on 34: a subscriber reading the card computed a different result
 * from the one we published, with no indication on the card.
 *
 * WHICH number is canonical is a founder decision, not an agent one
 * (docs/ops/GRADED_VS_DISPLAYED_LINE_2026-09-08.md). This module changes no
 * grading. It exposes the number the grade used and words the card so the
 * result is reproducible from what the reader sees.
 */
import type { PickResult, PickType } from "@sports/types";

/** Results that assert an outcome and therefore have a line they were graded on. */
const GRADED_RESULTS: ReadonlySet<PickResult> = new Set<PickResult>(["WIN", "LOSS", "PUSH"]);

/**
 * The line to publish as `gradedLine` on the public pick payload.
 *
 * Non-null only on a settled SPREAD or TOTAL: a MONEYLINE grade involves no
 * line, and a PENDING or VOID row has not been graded, so publishing a number
 * there would claim a grade that has not happened. The value is exactly what
 * settlement used (clvLockLine ?? line, the selectGradingLine rule, restated
 * here rather than imported so this display module does not pull the engine
 * into the client bundle); the null-coalesce keeps a genuine 0 lock.
 */
export function publicGradedLine(pick: {
  readonly pickType: PickType;
  readonly result: PickResult;
  readonly line: number;
  readonly clvLockLine: number | null;
}): number | null {
  if (pick.pickType === "MONEYLINE") return null;
  if (!GRADED_RESULTS.has(pick.result)) return null;
  const graded = pick.clvLockLine ?? pick.line;
  return Number.isFinite(graded) ? graded : null;
}

/** Same sign convention the card uses for `line`. */
function fmt(n: number): string {
  return `${n > 0 ? "+" : ""}${n}`;
}

export type GradedLineNote = {
  readonly graded: string;
  readonly shown: string;
  /** Plain-words sentence for the card. */
  readonly text: string;
};

/**
 * The card note, or null when there is nothing to disclose.
 *
 * Rendered only on a settled TOTAL whose graded line is a different number
 * from the displayed one. TOTAL only, for now: it is the market the C-143
 * measurement covers and the only one whose `line` the card shows directly. A
 * SPREAD card shows the chosen side's number inside `selection` while `line`
 * is stored home-perspective, so "shown at Y" needs the side resolved first;
 * that is listed as an open item in the C-143 document rather than guessed at
 * here.
 */
export function gradedLineNote(pick: {
  readonly pickType: PickType;
  readonly result: PickResult;
  readonly line: number;
  readonly gradedLine?: number | null;
}): GradedLineNote | null {
  if (pick.pickType !== "TOTAL") return null;
  if (!GRADED_RESULTS.has(pick.result)) return null;
  const graded = pick.gradedLine;
  if (typeof graded !== "number" || !Number.isFinite(graded)) return null;
  if (graded === pick.line) return null;
  const g = fmt(graded);
  const s = fmt(pick.line);
  return {
    graded: g,
    shown: s,
    text: `Graded at ${g}, the line locked when this pick was published. The ${s} shown above is the line as last refreshed.`,
  };
}
