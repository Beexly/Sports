/**
 * Arbiter decision ledger: every ruling, recorded, gradeable later.
 *
 * WHY THIS EXISTS. The arbiter is only worth running if its own accuracy can be
 * measured, and an accuracy measurement needs three things the model output does
 * not carry on its own:
 *
 *   1. The two claims as they were when the ruling was made, so the ruling can
 *      be re-read later without trusting the prompt that produced it.
 *   2. A pointer to the fixture (`gameId`, `pickId`s) so the settled result can
 *      be joined in after the game finishes.
 *   3. A slot to write that settled outcome into once it is known.
 *
 * All three exist on `jarvis_decisions`, which is why this writes there and
 * nowhere else. It is the repo's decision ledger: `evidence` (Json) carries the
 * two claims, `alternatives_rejected` names the claim that lost, `source_refs`
 * carries the fixture pointers, and `outcome` is the nullable column the
 * settlement grade is written into later. Inventing a new table for this would
 * mean a migration, and the ledger already has the exact shape.
 *
 * EVERY DISAGREEMENT GETS A ROW, INCLUDING THE UNDECIDED ONES. A ledger that
 * only stores confident rulings is a ledger with survivorship bias: it would
 * report the arbiter's accuracy over the cases it found easy and hide the ones
 * it found hard, which is precisely the number you need in order to decide
 * whether to keep running it. Rejected and UNDECIDED rows are written with the
 * same shape, `status` carrying the disposition.
 *
 * ROWS ARE APPEND-ONLY. The arbiter never updates or deletes a stored ruling,
 * because a decision that can be silently edited is not a record. The ONE write
 * that updates anything is `gradeArbiterDecision`, and it only ever fills the
 * `outcome` column from null to a settled grade: the ruling itself is immutable.
 * That is what makes the ledger auditable after the fact.
 *
 * FAIL-OPEN ON THE DB, NEVER ON THE RULING. If the ledger write fails the
 * caller is told (`persisted: false`) so the discrepancy is visible in logs and
 * metrics; the arbiter does not pretend a decision it could not record was
 * recorded. There is no retry loop here on purpose: a silent retry storm against
 * the ledger would hide the outage that caused it.
 */

import { db } from "@sports/db";
import { createJarvisDecision } from "@/lib/jarvis/memory/decisions";
import type { Disagreement } from "./disagreement";
import type { RulingOutcome } from "./verdict";
// Imported as a VALUE-less type binding, not only re-exported: `gradeStoredDecision`
// below annotates its parameter with it, and a re-export alone does not bring the
// name into this module's scope. `export type { ... } from "./grade"` re-publishes
// the type for importers without binding it here.
import type { ArbiterGrade } from "./grade";

/** The `decision_type` every arbiter row carries, so the set is queryable. */
export const ARBITER_DECISION_TYPE = "path-disagreement-adjudication";

/**
 * Disposition of a stored ruling.
 *
 * `open`      accepted and awaiting settlement (the gradable population)
 * `undecided` the arbiter declined; awaiting settlement, and counted separately
 * `rejected`  the output failed validation; it never became a ruling at all
 */
export type ArbiterRowStatus = "open" | "undecided" | "rejected";

export type RecordArbiterDecisionInput = {
  readonly gameId: string;
  readonly disagreement: Disagreement;
  readonly outcome: RulingOutcome;
  /** The model id that produced the ruling, for audit and for cost attribution. */
  readonly modelName: string;
  readonly decidedAt: Date;
};

export type RecordArbiterDecisionResult = {
  /** False when the ledger write failed. The ruling is then NOT recorded. */
  readonly persisted: boolean;
  /** The stored row id when persisted. */
  readonly decisionId: string | null;
  /** Why the write failed, when it did. Surfaced, never swallowed. */
  readonly error: string | null;
};

function statusFor(outcome: RulingOutcome): ArbiterRowStatus {
  if (outcome.verdict === null) return "rejected";
  if (outcome.verdict === "UNDECIDED") return "undecided";
  return "open";
}

/**
 * The `outcome` slot is filled at settlement time and is the whole point of the
 * row. Until then it stays null, and a null outcome is what marks a ruling as
 * not yet gradable rather than as wrong.
 */
function titleFor(disagreement: Disagreement): string {
  return (
    `Arbiter ${disagreement.kind} on ${disagreement.reasoning.pickType}: ` +
    `"${disagreement.reasoning.selection}" vs "${disagreement.legacy.selection}"`
  );
}

function summaryFor(
  disagreement: Disagreement,
  outcome: RulingOutcome,
  modelName: string,
): string {
  if (outcome.verdict === null) {
    return (
      `Arbiter output rejected (${outcome.rejection}). No ruling was recorded for ` +
      `this ${disagreement.kind.toLowerCase()}; the disagreement stands unresolved.`
    );
  }
  return (
    `Arbiter ${outcome.verdict} at confidence ${outcome.confidence} via ${modelName}. ` +
    `The ${disagreement.kind === "SIDE_CONFLICT" ? "reasoning" : "legacy"} claim was ` +
    `${outcome.verdict === "UPHOLD_REASONING" ? "upheld" : "set aside"}.`
  );
}

/**
 * Rationale: the model's own words when it produced a usable ruling, and the
 * parser's reason when it did not. A rejected row's rationale is the rejection
 * code, so a reader can tell "the model declined" from "the model emitted
 * something we refused to store" without cross-referencing the logs.
 */
function rationaleFor(outcome: RulingOutcome): string {
  if (outcome.verdict === null) return `REJECTED: ${outcome.rejection}`;
  return outcome.reasoning;
}

/**
 * The rejected claim, named. An arbiter that upholds the reasoning path has
 * rejected the legacy one; writing that down is what lets a later reader ask
 * "how often did it overturn the legacy path, and was that right" without
 * re-deriving the pair from the evidence blob.
 */
function rejectedAlternativeFor(
  disagreement: Disagreement,
  outcome: RulingOutcome,
): Record<string, unknown> {
  if (outcome.verdict === null) {
    return { note: "No ruling was reached, so no alternative was rejected." };
  }
  if (outcome.verdict === "UNDECIDED") {
    return {
      note: "Neither claim was rejected: the arbiter declined to choose.",
      both: [disagreement.reasoning.pickId, disagreement.legacy.pickId],
    };
  }
  const rejected =
    outcome.verdict === "UPHOLD_REASONING" ? disagreement.legacy : disagreement.reasoning;
  return {
    pickId: rejected.pickId,
    path: rejected.path,
    selection: rejected.selection,
    confidence: rejected.confidence,
    bookmakerCount: rejected.bookmakerCount,
  };
}

/** The two claims exactly as the arbiter saw them, so the ruling is re-readable. */
function evidenceFor(disagreement: Disagreement, modelName: string): Record<string, unknown> {
  return {
    kind: disagreement.kind,
    magnitude: disagreement.magnitude,
    sameSide: disagreement.sameSide,
    modelName,
    reasoningClaim: disagreement.reasoning,
    legacyClaim: disagreement.legacy,
  };
}

/** Fixture pointers, so settlement can be joined in later. */
function sourceRefsFor(
  gameId: string,
  disagreement: Disagreement,
  modelName: string,
): Record<string, unknown> {
  return {
    gameId,
    reasoningPickId: disagreement.reasoning.pickId,
    legacyPickId: disagreement.legacy.pickId,
    modelName,
    schema: "arbiter-decision.v1",
  };
}

const INFRA_REJECTION = /^(?:BUDGET_REFUSED|NO_API_KEY|TRANSPORT_.+)$/;

/**
 * Identity of a pair that already has a terminal ruling.
 *
 * Returns null when the row is not an arbiter source-ref, or when the only
 * thing stored is an infrastructure refusal. Those refusals spent no successful
 * adjudication (budget, missing key, transport) and must be retried. A content
 * rejection did spend a call and is terminal: paying again would buy the same
 * refusal.
 */
export function terminalArbiterPairKey(row: {
  readonly status: string;
  readonly rationale: string;
  readonly source_refs: unknown;
}): string | null {
  if (!row.source_refs || typeof row.source_refs !== "object") return null;
  const refs = row.source_refs as {
    reasoningPickId?: unknown;
    legacyPickId?: unknown;
    schema?: unknown;
  };
  if (refs.schema !== "arbiter-decision.v1") return null;
  if (typeof refs.reasoningPickId !== "string" || typeof refs.legacyPickId !== "string") {
    return null;
  }
  if (row.status === "rejected") {
    const rationale = row.rationale ?? "";
    const code = rationale.startsWith("REJECTED: ") ? rationale.slice("REJECTED: ".length) : "";
    if (INFRA_REJECTION.test(code)) return null;
  }
  return `${refs.reasoningPickId}|${refs.legacyPickId}`;
}

/**
 * Persist one arbiter decision. Returns `persisted: false` with the error rather
 * than throwing, so a caller adjudicating a batch of fixtures can finish the
 * batch and report exactly how many rulings failed to record.
 */
export async function recordArbiterDecision(
  input: RecordArbiterDecisionInput,
): Promise<RecordArbiterDecisionResult> {
  const { disagreement, outcome } = input;
  const status = statusFor(outcome);

  try {
    const row = await createJarvisDecision({
      decision_title: titleFor(disagreement).slice(0, 200),
      decision_summary: summaryFor(disagreement, outcome, input.modelName).slice(0, 2000),
      decision_type: ARBITER_DECISION_TYPE,
      rationale: rationaleFor(outcome).slice(0, 4000),
      owner: `arbiter:${input.modelName}`,
      decision_date: input.decidedAt,
      evidence: evidenceFor(disagreement, input.modelName),
      alternatives_rejected: rejectedAlternativeFor(disagreement, outcome),
      source_refs: sourceRefsFor(input.gameId, disagreement, input.modelName),
      status,
    });

    return { persisted: true, decisionId: row.id, error: null };
  } catch (error) {
    return {
      persisted: false,
      decisionId: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/** One stored ruling, read back for scoring. */
export type ArbiterDecisionRow = {
  readonly id: string;
  readonly decision_date: Date;
  readonly status: string;
  readonly outcome: string | null;
  readonly evidence: unknown;
  readonly source_refs: unknown;
};

/**
 * Stored arbiter rulings in a date window, newest first.
 *
 * The query is on `jarvis_decisions`, which is one row per ruling and carries no
 * duplicate-per-contest hazard, so there is no cap here. That is also why this
 * module never queries `games` or `gate_decisions`: those two tables hold about
 * 2.5 rows per real contest with nothing tombstoned, which is why
 * `fixture-query-inventory` exists. A ledger of decisions does not have that
 * shape and does not need the guard's attention.
 */
export async function loadArbiterDecisions(
  since: Date,
  until: Date = new Date(),
): Promise<ArbiterDecisionRow[]> {
  return db.jarvisDecision.findMany({
    where: {
      decision_type: ARBITER_DECISION_TYPE,
      decision_date: { gte: since, lt: until },
    },
    orderBy: { decision_date: "desc" },
    select: {
      id: true,
      decision_date: true,
      status: true,
      outcome: true,
      evidence: true,
      source_refs: true,
    },
  });
}

/**
 * How a stored ruling scored once the fixture settled.
 *
 * Re-exported from `./grade` rather than redefined here, so the DB module and
 * the offline reader cannot drift on what a grade MEANS. The implementation and
 * its full rationale live in the pure module, which needs no database to test.
 */
export { gradeArbiterDecision, arbiterAccuracy } from "./grade";
export type { ArbiterGrade, GradableVerdict } from "./grade";

/**
 * Fill the `outcome` column on a stored ruling once the fixture settles.
 *
 * This is the ONLY mutation this module performs, and it is deliberately narrow:
 * it writes a settled grade and moves `open`/`undecided` to `resolved`. It never
 * touches the verdict, the reasoning, or the evidence, so the ruling that was
 * recorded at decision time is still readable verbatim afterwards. A ledger
 * whose ruling can be rewritten after the result is known cannot audit anything.
 *
 * `where: { id, outcome: null }` makes it idempotent: a re-run cannot overwrite
 * a grade that has already been written.
 */
export async function gradeStoredDecision(
  decisionId: string,
  grade: ArbiterGrade,
  detail: string,
): Promise<boolean> {
  const result = await db.jarvisDecision.updateMany({
    where: { id: decisionId, outcome: null },
    data: { outcome: `${grade}: ${detail}`.slice(0, 2000), status: "resolved" },
  });
  return result.count > 0;
}
