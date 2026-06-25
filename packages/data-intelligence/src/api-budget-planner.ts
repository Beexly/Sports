/**
 * DATA INTELLIGENCE MESH — API Budget Planner.
 *
 * Given a monthly budget and ranked acquisition candidates, decide what to actually pay for — a
 * greedy, priority-first allocation that always takes free decision-relevant sources, never spends
 * on a source that needs legal review, and reports exactly what was deferred and why. Pure +
 * deterministic. Plans only; it authorizes no spend.
 */

import type { Recommendation } from "./acquisition-governor.js";

export interface BudgetCandidate {
  readonly sourceId: string;
  readonly costPerMonth: number;
  readonly priority: number;
  readonly recommendation: Recommendation;
}

export interface BudgetPlan {
  readonly selected: readonly { sourceId: string; costPerMonth: number }[];
  readonly totalCost: number;
  readonly remaining: number;
  readonly deferred: readonly { sourceId: string; reason: string }[];
  readonly note: string;
}

// Recommendations that may consume budget. RIGHTS_REVIEW / DO_NOT_USE / RESEARCH_ONLY cannot.
const PURCHASABLE: ReadonlySet<Recommendation> = new Set<Recommendation>(["USE_NOW", "EXPAND_EXISTING", "ADD_ADAPTER", "PAID_EVALUATION", "ENTERPRISE_DOSSIER"]);

/** Plan a monthly API budget: free first, then highest-priority paid sources that fit. */
export function planApiBudget(candidates: readonly BudgetCandidate[], monthlyBudget: number): BudgetPlan {
  const selected: { sourceId: string; costPerMonth: number }[] = [];
  const deferred: { sourceId: string; reason: string }[] = [];
  let remaining = monthlyBudget;

  // Free candidates first (cost 0), then by priority — so a paid source never crowds out a free one.
  const ordered = [...candidates].sort((a, b) => (a.costPerMonth === 0 ? -1 : 0) - (b.costPerMonth === 0 ? -1 : 0) || b.priority - a.priority);

  for (const c of ordered) {
    if (!PURCHASABLE.has(c.recommendation)) {
      deferred.push({ sourceId: c.sourceId, reason: `${c.recommendation} — not purchasable without review/approval.` });
      continue;
    }
    if (c.costPerMonth <= remaining) {
      selected.push({ sourceId: c.sourceId, costPerMonth: c.costPerMonth });
      remaining = Number((remaining - c.costPerMonth).toFixed(2));
    } else {
      deferred.push({ sourceId: c.sourceId, reason: `Over budget ($${c.costPerMonth}/mo, $${remaining} left).` });
    }
  }

  const totalCost = Number((monthlyBudget - remaining).toFixed(2));
  return {
    selected,
    totalCost,
    remaining: Number(remaining.toFixed(2)),
    deferred,
    note: `Selected ${selected.length} source(s) for $${totalCost}/mo; ${deferred.length} deferred; $${remaining} unspent.`,
  };
}
