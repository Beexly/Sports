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
 * DECIDED (founder, delegated 2026-09-08 via the launch orchestrator, recorded
 * in docs/ops/GRADED_VS_DISPLAYED_LINE_2026-09-08.md): the line that GRADES is
 * unchanged - clvLockLine when present, the line the customer saw at publish.
 * What changes is DISPLAY: on a settled pick the graded line is the PRIMARY
 * number, labelled "Graded at X", and the later refreshed line appears only as
 * secondary context when the two differ. This module changes no grading; it
 * words that display so the published result is reproducible from the card.
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

export type GradedLineDisplay = {
  /** The graded line, formatted with the card's sign convention. */
  readonly graded: string;
  /** The later refreshed line, formatted; null when it is the same number. */
  readonly shown: string | null;
  /** Primary line-slot text on a settled row. */
  readonly primaryText: string;
  /** Secondary context, or null when there is no second number to give. */
  readonly secondaryText: string | null;
};

/**
 * The settled-row line slot, or null when this row has no graded line to lead
 * with (so the caller keeps rendering the live line as it always has).
 *
 * Applied to TOTAL. A SPREAD card renders no `line` at all - the chosen side's
 * number lives inside `selection`, and `line` is stored home-perspective, so
 * leading with it would contradict the selection on an away-favoured pick. The
 * decision is therefore already satisfied for SPREAD in the sense that no
 * second, later number is shown next to it; whether the stored `selection`
 * string itself can drift after publish was NOT established in this session,
 * and that question is ledger row C-264, not a guess made here.
 */
export function gradedLineDisplay(pick: {
  readonly pickType: PickType;
  readonly result: PickResult;
  readonly line: number;
  readonly gradedLine?: number | null;
}): GradedLineDisplay | null {
  if (pick.pickType !== "TOTAL") return null;
  if (!GRADED_RESULTS.has(pick.result)) return null;
  const graded = pick.gradedLine;
  if (typeof graded !== "number" || !Number.isFinite(graded)) return null;
  const g = fmt(graded);
  const differs = graded !== pick.line && Number.isFinite(pick.line);
  const s = differs ? fmt(pick.line) : null;
  return {
    graded: g,
    shown: s,
    primaryText: `Graded at ${g}`,
    secondaryText: s === null ? null : `Line as last refreshed: ${s}`,
  };
}
