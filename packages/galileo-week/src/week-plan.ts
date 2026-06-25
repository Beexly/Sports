/**
 * GALILEO WEEK — the `--plan` dry-run (zero spend).
 *
 * Before any paid call, print exactly what we would buy and what it costs. Reuses the mesh's
 * `planApiBudget` (free first, never buys a review-gated source, reports what it defers). It
 * AUTHORIZES NO SPEND — it returns a plan for the owner to approve. Pure + deterministic.
 */

import { planApiBudget, type BudgetCandidate, type BudgetPlan } from "@sports/data-intelligence";

export interface GalileoWeekPlan {
  readonly budget: BudgetPlan;
  readonly spendsNothing: true;
  readonly note: string;
}

/** Dry-run the week's acquisition budget. Owner approval + keys are required to actually execute. */
export function planGalileoWeek(candidates: readonly BudgetCandidate[], monthlyBudget: number): GalileoWeekPlan {
  const budget = planApiBudget(candidates, monthlyBudget);
  return {
    budget,
    spendsNothing: true,
    note: `${budget.note} This is a dry-run preview — no key is read, no call is made, nothing is purchased. Owner approval required to execute.`,
  };
}
