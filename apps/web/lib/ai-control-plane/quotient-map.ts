/**
 * `classifyPendingCount` is the α mapping documented in
 * `formal/abstract/QUOTIENT.md`: it maps the concrete pending-attempt count
 * (a natural number) to the abstract `PendingCountClass` domain
 * `srqc-projection.ts` defines:
 *
 *   count === 0   -> "ZERO"
 *   count === 1   -> "ONE"
 *   count >= 2    -> "GE2"
 *
 * `GE2` is a genuine many-to-one collapse, not a bijection on the count
 * itself — QUOTIENT.md is explicit that two pending attempts, three, four,
 * or the whole attempt pool all map to the single class `GE2`. Nothing
 * downstream reads "exactly 3 pending" differently from "exactly 4
 * pending"; both are the same forbidden event (a second concurrent
 * in-flight attempt on one invocation). The only safety-relevant
 * distinction any proof in this stack draws over the counter is
 * "≤ 1 vs ≥ 2" — collapsing `{2,3,4,...}` into one class loses no
 * distinction the safety argument uses. `GE2` is kept as a first-class
 * value (never normalized away or merged into `ONE`) because it is the
 * exact shape of the forbidden inductive CTI this stack watches for.
 *
 * This is a pure extraction of logic that already lived inline in
 * `projectWindow` — no behavior change. `projectWindow` still computes
 * `pending` itself (a `Set` difference of started vs. terminal attempt
 * ids); this module only names and independently tests the classification
 * step that already existed.
 */

import type { PendingCountClass } from "./srqc-projection";

export function classifyPendingCount(count: number): PendingCountClass {
  return count <= 0 ? "ZERO" : count === 1 ? "ONE" : "GE2";
}
