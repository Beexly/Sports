/**
 * LSRQC KERNEL v1 — skill-augmented CTI check (DENSE ranking signal).
 *
 * WHAT THIS IS. Given a ledger window and the currently-open IndInv proposals
 * (each carrying a forbidden abstract `(before, action)` pair drawn from the
 * cti_candidate triple it was minted from), this measures how many ADDITIONAL
 * near-miss states the STRENGTHENED certificate would catch beyond the baseline
 * IndInv predicate. That delta is a dense signal for RANKING which proposals
 * are worth a human's attention.
 *
 * ██ RANKING ONLY. ██ This function is pure and observational. It MUST NOT
 * change any admit decision and MUST NOT auto-enforce anything — `admitUnderSRQC`
 * (srqc-projection.ts) is unaffected by the presence or absence of proposals,
 * and nothing here activates a version. The augmented count exists solely to
 * order proposals; it never gates control-plane behavior.
 *
 *   ordinary   = projectWindow(events) filtered by the baseline IndInv predicate
 *                (pendingCountClass GE2, or a rejected fingerprint on an unbound
 *                id).
 *   augmented  = ordinary PLUS the near-miss states a proposal's forbidden
 *                (before, action) would additionally catch: a projected state s
 *                that STRUCTURALLY matches a proposal's `before` and whose
 *                one-step successor under that `action` is itself a violation.
 *   delta      = augmented − ordinary ≥ 0.
 *
 * The PURE CORE (`evaluateWindowWithSkills`) takes already-resolved forbidden
 * pairs; the logged DB runner (`runSkillAugmentedCti`) resolves them from the
 * open proposals' linked cti_candidate rows and emits ONE JSON line.
 */

import type { ControlSqlClient } from "./control-store";
import { abstractSuccessors } from "./cti-miner";
import type { AbstractAction } from "./cti-miner";
import { projectWindow } from "./srqc-projection";
import type {
  AbstractControlState,
  ProjectableEvent,
} from "./srqc-projection";
import { BASE_INDS, violationCount } from "./violation-delta";

/** A state violates the baseline IndInv iff `violationCount([s]) > 0`. The
 *  SINGLE source of truth is `BASE_INDS` in violation-delta.ts — no baseline
 *  predicate is duplicated in this module. */
function violatesBaseline(s: AbstractControlState): boolean {
  return violationCount([s], BASE_INDS) > 0;
}

/** A forbidden abstract transition prefix, resolved from a cti_candidate
 *  triple linked to an open proposal: the strengthened predicate forbids taking
 *  `action` out of any state structurally matching `before`. */
export interface ForbiddenPair {
  readonly before: AbstractControlState;
  readonly action: AbstractAction;
}

export interface SkillAugmentedEvaluation {
  readonly violationsOrdinary: number;
  readonly violationsAugmented: number;
  readonly delta: number;
}

/** Structural equality of two abstract states IGNORING invocationId — a
 *  proposal's `before` was captured on a past invocation, so only the abstract
 *  fields are compared against a current window state. */
function structuralMatch(
  a: AbstractControlState,
  b: AbstractControlState,
): boolean {
  return (
    a.claimPhase === b.claimPhase &&
    a.exposurePhase === b.exposurePhase &&
    a.pendingCountClass === b.pendingCountClass &&
    a.fingerprintBound === b.fingerprintBound &&
    a.hasRejectedFp === b.hasRejectedFp
  );
}

/**
 * PURE CORE. Count baseline (ordinary) violations in the window and the count a
 * strengthened certificate would catch (augmented), from already-resolved
 * forbidden pairs. Additive: `violationsAugmented ≥ violationsOrdinary` always,
 * and `delta` is the number of DISTINCT near-miss states the forbidden pairs
 * would additionally catch (each projected state counted at most once). No I/O,
 * no clock, no mutation.
 */
export function evaluateWindowWithSkills(
  events: readonly ProjectableEvent[],
  _activeVersion: number | null,
  forbiddenPairs: readonly ForbiddenPair[],
): SkillAugmentedEvaluation {
  const projected = projectWindow(events);
  const violationsOrdinary = violationCount(projected, BASE_INDS);

  let additional = 0;
  for (const s of projected) {
    if (violatesBaseline(s)) continue; // already counted as ordinary
    const successors = abstractSuccessors(s);
    const caught = forbiddenPairs.some(
      (pair) =>
        structuralMatch(s, pair.before) &&
        successors.some(
          (step) =>
            step.action === pair.action && violatesBaseline(step.next),
        ),
    );
    if (caught) additional += 1;
  }

  const violationsAugmented = violationsOrdinary + additional;
  return {
    violationsOrdinary,
    violationsAugmented,
    delta: violationsAugmented - violationsOrdinary,
  };
}

interface ProposalRow {
  readonly ctiCandidateIds: unknown;
}

interface CtiTripleRow {
  readonly before: unknown;
  readonly action: string;
}

function toAbstractState(value: unknown): AbstractControlState | null {
  if (value === null || typeof value !== "object") return null;
  const s = value as Record<string, unknown>;
  const {
    invocationId,
    claimPhase,
    exposurePhase,
    pendingCountClass,
    fingerprintBound,
    hasRejectedFp,
  } = s;
  if (
    typeof invocationId !== "string" ||
    typeof claimPhase !== "string" ||
    typeof exposurePhase !== "string" ||
    typeof pendingCountClass !== "string" ||
    typeof fingerprintBound !== "boolean" ||
    typeof hasRejectedFp !== "boolean"
  ) {
    return null;
  }
  return {
    invocationId,
    claimPhase: claimPhase as AbstractControlState["claimPhase"],
    exposurePhase: exposurePhase as AbstractControlState["exposurePhase"],
    pendingCountClass:
      pendingCountClass as AbstractControlState["pendingCountClass"],
    fingerprintBound,
    hasRejectedFp,
  };
}

const KNOWN_ACTIONS: ReadonlySet<AbstractAction> = new Set<AbstractAction>([
  "StartPending",
  "EndPending",
  "FinalizeAmbiguous",
  "FinalizeClean",
  "RejectFp",
]);

/**
 * LOGGED DB RUNNER. Resolve the forbidden pairs from every open proposal's
 * linked cti_candidate rows, run the pure `evaluateWindowWithSkills`, and emit
 * ONE JSON line `{ kind:"srqc_skill_delta", ... }`. Ranking-only — it computes
 * and logs a delta and returns the evaluation; it changes NO admit decision.
 */
export async function runSkillAugmentedCti(
  sql: ControlSqlClient,
  events: readonly ProjectableEvent[],
  activeVersion: number | null,
): Promise<SkillAugmentedEvaluation> {
  const proposals = await sql.query<ProposalRow>(
    `SELECT "ctiCandidateIds" FROM "ind_inv_proposal" WHERE "status" = 'open'`,
    [],
  );

  const candidateIds = new Set<string>();
  for (const p of proposals) {
    if (Array.isArray(p.ctiCandidateIds)) {
      for (const id of p.ctiCandidateIds) {
        if (typeof id === "string") candidateIds.add(id);
      }
    }
  }

  const forbiddenPairs: ForbiddenPair[] = [];
  if (candidateIds.size > 0) {
    const ids = [...candidateIds];
    const triples = await sql.query<CtiTripleRow>(
      `SELECT "before", "action" FROM "cti_candidate" WHERE "id" = ANY($1::text[])`,
      [ids],
    );
    for (const t of triples) {
      const before = toAbstractState(t.before);
      if (before !== null && KNOWN_ACTIONS.has(t.action as AbstractAction)) {
        forbiddenPairs.push({ before, action: t.action as AbstractAction });
      }
    }
  }

  const evaluation = evaluateWindowWithSkills(
    events,
    activeVersion,
    forbiddenPairs,
  );

  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify({
      kind: "srqc_skill_delta",
      srqcVersion: activeVersion,
      violationsOrdinary: evaluation.violationsOrdinary,
      violationsAugmented: evaluation.violationsAugmented,
      delta: evaluation.delta,
      at: new Date().toISOString(),
    }),
  );

  return evaluation;
}
