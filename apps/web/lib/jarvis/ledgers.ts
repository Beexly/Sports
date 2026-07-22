/**
 * Agent Council Ledger Store — interactive server-action surface.
 *
 * This "use server" module is the RPC-invokable entry point for the Agent
 * Handoff Ledger (spec §8) and the Subagent Run Ledger (spec §9). Each action
 * resolves a TRUSTED HUMAN admin actor via requireAdminActor() BEFORE any
 * sensitive validation, then delegates to the core implementation in
 * ./ledgers-core.ts. The trusted actor's stable subject id + audit fields are
 * persisted by the core.
 *
 * Auth-BEFORE-validation ordering is deliberate: an unauthenticated or
 * non-admin caller must never learn whether their seat/confidence input was
 * well-formed. requireAdminActor() runs first and is mockable in tests
 * (vi.mock("@/lib/auth")).
 *
 * Background / non-interactive callers (workers, cron) must NOT go through this
 * "use server" surface. They import ./ledgers-core.ts directly and pass a
 * governed SERVICE / SYSTEM actor from serviceActor()/systemActor().
 */

"use server";

import { requireAdminActor } from "@/lib/auth/actor";
import {
  logHandoffAs,
  logSubagentRunAs,
  reviewSubagentRunAs,
  listRecentHandoffs as listRecentHandoffsCore,
  listPendingSubagentReviews as listPendingSubagentReviewsCore,
  LedgerStoreUnavailableError,
  type LogHandoffInput,
  type LogSubagentRunInput,
  type SubagentReviewDecision,
} from "./ledgers-core";

// Re-export the typed error + input types so existing importers of
// "@/lib/jarvis/ledgers" keep working unchanged.
export { LedgerStoreUnavailableError };
export type { LogHandoffInput, LogSubagentRunInput, SubagentReviewDecision };

/**
 * Log a handoff from one council seat to another (interactive admin path).
 * Auth is resolved first; the resulting HUMAN admin actor is the audit actor.
 */
export async function logHandoff(input: LogHandoffInput) {
  const actor = await requireAdminActor();
  return logHandoffAs(actor, input);
}

/**
 * Log a subagent run under a parent seat (interactive admin path).
 */
export async function logSubagentRun(input: LogSubagentRunInput) {
  const actor = await requireAdminActor();
  return logSubagentRunAs(actor, input);
}

/**
 * Record the parent seat's review decision for a subagent run (interactive
 * admin path — reviewing is HUMAN-only).
 */
export async function reviewSubagentRun(
  runId: string,
  reviewerSeat: string,
  decision: SubagentReviewDecision
) {
  const actor = await requireAdminActor();
  return reviewSubagentRunAs(actor, runId, reviewerSeat, decision);
}

/** Returns the most recent handoffs, newest first (admin-gated). */
export async function listRecentHandoffs(limit = 20) {
  await requireAdminActor();
  return listRecentHandoffsCore(limit);
}

/** Returns subagent runs awaiting parent review, newest first (admin-gated). */
export async function listPendingSubagentReviews(limit = 20) {
  await requireAdminActor();
  return listPendingSubagentReviewsCore(limit);
}
