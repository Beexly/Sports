/**
 * Post-gate certificate minting (WS3) — ATTACH-ONLY, opt-in, derived.
 *
 * `certificateFromGateCandidate` landed in #220 as a pure transform with no
 * production consumer. This module is that consumer, wired at the one place
 * the real gate runs (`evaluateBoardGate` in gate-consumer.ts) — with the
 * boundaries that make it safe:
 *
 *   - STRICTLY POST-GATE. Certificates are derived FROM a completed
 *     `BoardGateEvaluation`. Nothing here runs before, beside, or instead of
 *     `applySelectiveGate`; a certificate can only describe a decision the
 *     gate already made. selective-gate.ts remains the sole FIRE/NO_BET
 *     authority.
 *   - ATTACH-ONLY. The return value is an in-memory array for the caller that
 *     asked. There is NO ledger writer, NO persistence, NO PUBLISH_LEDGER
 *     path here (PRODUCT_CASCADE_MAP §4 blocks that until a real consumer of
 *     FiredDecision exists) — and none may be added to this file.
 *   - OPT-IN. `evaluateBoardGate` stays sync and byte-identical for every
 *     existing caller; hashing is async, so certification is a separate call
 *     a consumer makes deliberately.
 *
 * Exclusion strings passed to the bridge reuse the exact vocabulary
 * `mapExclusionToReasons` already understands ("width", "lcb", "sample
 *  floor"), so every outcome code maps to a typed NoBetReasonCode rather than
 * GATE_OTHER.
 */

import {
  certificateFromGateCandidate,
  type GateCandidateView,
} from "@sports/prediction-engine/src/certificate/gate-certificate-bridge.js";
import type { DecisionCertificate } from "@sports/prediction-engine/src/certificate/decision-certificate.js";
import type { FiredDecision } from "@sports/prediction-engine/src/edge-lab/selective-gate.js";
import type { BoardGateEvaluation, GateOutcome } from "./gate-consumer";

/** A certificate paired with the outcome it describes. */
export interface CertifiedGateOutcome {
  readonly outcome: GateOutcome;
  readonly certificate: DecisionCertificate;
}

/**
 * Parse market + modelVersion out of a stratum key.
 *
 * `stratumOf` builds keys as `sportName|pickType|modelVersion` (modelVersion
 * segment absent when unknown). This is the inverse for the two fields the
 * certificate schema requires. An unparseable stratum falls back to the whole
 * string as market and "unknown" as modelVersion — a certificate must always
 * say something true, and "unknown" is true.
 */
function parseStratum(stratum: string): { market: string; modelVersion: string } {
  const parts = stratum.split("|");
  if (parts.length >= 2) {
    return { market: parts[1]!, modelVersion: parts[2] ?? "unknown" };
  }
  return { market: stratum, modelVersion: "unknown" };
}

/** Exclusion phrases per outcome code, in the vocabulary the mapper knows. */
const EXCLUSIONS_FOR_CODE: Record<string, readonly string[]> = {
  NO_BET_LCB: ["lcb"],
  NO_BET_WIDTH: ["width"],
  INSUFFICIENT_CALIBRATION: ["sample floor"],
};

/**
 * Derive one DecisionCertificate per gate outcome, content-hashed.
 *
 * `firedById` supplies the interval/price detail for FIRE rows — pass
 * `evaluation.report.decisions` (the gate's own record). Outcomes with code
 * NOT_EVALUATED_MISSING_INPUTS get a NO_BET certificate whose exclusions are
 * the row's actual missing-input strings, so the reason codes reflect what
 * really blocked it.
 */
export async function certifyBoardGateEvaluation(
  evaluation: BoardGateEvaluation,
  opts: { verifyPathPrefix?: string } = {},
): Promise<CertifiedGateOutcome[]> {
  const firedById = new Map<string, FiredDecision>();
  for (const d of evaluation.report.decisions) firedById.set(d.rowId, d);

  const out: CertifiedGateOutcome[] = [];
  for (const outcome of evaluation.outcomes) {
    const { market, modelVersion } = parseStratum(outcome.stratum);
    const fired = outcome.code === "FIRE" ? firedById.get(outcome.rowId) : undefined;

    const view: GateCandidateView = {
      eventId: outcome.rowId,
      market,
      stratumKey: outcome.stratum,
      modelVersion,
      admitted: outcome.code === "FIRE",
      fired: outcome.code === "FIRE",
      ...(fired
        ? {
            interval: {
              lo: fired.interval.lower,
              hi: fired.interval.upper,
              method: fired.multiprobSource,
            },
            ...(fired.obtainableDecimalPrice !== undefined
              ? { priceDecimal: fired.obtainableDecimalPrice }
              : {}),
          }
        : {
            exclusions:
              outcome.code === "NOT_EVALUATED_MISSING_INPUTS"
                ? // The reason string carries "Missing: x, y." — hand the
                  // mapper the raw phrase; unrecognized inputs map to
                  // GATE_OTHER, which is the truthful catch-all here.
                  [outcome.reason]
                : EXCLUSIONS_FOR_CODE[outcome.code] ?? [outcome.reason],
          }),
    };

    const certificate = await certificateFromGateCandidate(view, {
      hash: true,
      ...(opts.verifyPathPrefix !== undefined
        ? { verifyPathPrefix: opts.verifyPathPrefix }
        : {}),
    });
    out.push({ outcome, certificate });
  }
  return out;
}
