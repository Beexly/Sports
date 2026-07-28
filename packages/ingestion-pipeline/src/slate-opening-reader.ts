/**
 * THE designated opener-read module (Phase 0.5b).
 *
 * This is the ONLY module permitted to select `pedersenAggregateValue` /
 * `pedersenBlindingSum` from the database. `scripts/guardrails/
 * pedersen-opener-boundary.mjs` enforces that, mirroring how
 * `sealed-holdout-open-scan.mjs` confines the `openHoldout` seal to edge-lab: a
 * cryptographic secret gets exactly one reviewed chokepoint, never an ad-hoc
 * select scattered across route code.
 *
 * It lives beside `freeze-slate-commitments.ts` on purpose — that module MINTS
 * the aggregate, this one OPENS it, and the two ends of the commitment
 * lifecycle should be read together.
 *
 * DIVISION OF LABOUR. Everything this module does is fetch and count. The
 * DECISION belongs to `planSlateOpening` in @sports/crypto, which is pure and
 * exhaustively tested without a database. That split is deliberate: the
 * security boundary must be reviewable and testable without standing up
 * Postgres, and a query is a bad place to hide a policy.
 *
 * THE SETTLEMENT COUNT is the subtle part. `planSlateOpening` requires the
 * pending count to be computed over EXACTLY the covered set — the receipts
 * stamped with this slateKey — because:
 *   - counting a WIDER set (e.g. all picks that day) lets an unrelated pending
 *     pick block a slate that is genuinely finished; and
 *   - counting a NARROWER set opens a live slate early, which is the failure
 *     this whole layer exists to prevent.
 * So the pending query is keyed off `pickProofReceipt.slateKey`, the same
 * stamp the freeze transaction wrote, and not off game dates or pick filters.
 *
 * This module performs NO disclosure of its own. It returns a plan. Whether an
 * ALLOW is ever shown to anyone is the caller's decision, behind its own gate.
 */

import { db } from "@sports/db";
import { planSlateOpening, type SlateOpeningPlan } from "@sports/crypto";

/** Terminal results — a pick with any of these is settled. */
const SETTLED_RESULTS = ["WIN", "LOSS", "PUSH", "VOID"] as const;

/**
 * Load a slate's commitment and decide whether its Pedersen aggregate may be
 * opened. Returns a REFUSE plan (never throws) when the slate is missing,
 * unsettled, openerless, or fails its self-check.
 *
 * A database error is NOT swallowed into a refusal: a REFUSE means "we looked
 * and the answer is no", and an outage must not masquerade as that on an
 * honesty surface. Callers get the rejection and decide how to say "temporarily
 * unavailable" — the same distinction `/api/verify/slate` already draws between
 * 404 and 503.
 */
export async function planSlateOpeningFromDb(slateKey: string): Promise<SlateOpeningPlan> {
  const slate = await db.slateCommitment.findUnique({
    where: { slateKey },
    // The ONE permitted opener select in the codebase. See this module's header.
    select: {
      slateKey: true,
      count: true,
      pedersenAggregateHex: true,
      pedersenAggregateValue: true,
      pedersenBlindingSum: true,
    },
  });

  if (slate === null) {
    return {
      action: "REFUSE",
      reason: "no_opener",
      detail: `no commitment is recorded for slate ${slateKey}`,
    };
  }

  // Pending count over EXACTLY the covered set — keyed off the slateKey stamp
  // the freeze transaction wrote, not off dates or pick filters.
  const pendingPickCount = await db.pickProofReceipt.count({
    where: {
      slateKey,
      pick: { result: { notIn: [...SETTLED_RESULTS] } },
    },
  });

  return planSlateOpening({
    slateKey: slate.slateKey,
    aggregateHex: slate.pedersenAggregateHex,
    aggregateValue: slate.pedersenAggregateValue,
    blindingSum: slate.pedersenBlindingSum,
    // The frozen denominator, from the commitment itself — never a live
    // re-count, which could drift after the population was fixed.
    coveredPickCount: slate.count,
    pendingPickCount,
  });
}
