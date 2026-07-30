/**
 * Method continuity for self-CLV — refuse when open/close fair probs were
 * produced by different de-vig methods or model versions.
 *
 * Why: CLV that mixes multiplicative_devig_v1 open with shin_v2 close is not
 * the same quantity. Honesty requires matching methodTag + modelVersion on
 * both legs (or an explicit cross-method research flag that still refuses
 * public publish).
 *
 * Law: refuse-default · measurement > narrative · one SoT for marketFairProb
 */

import { computeClvPoints, publishableClvSummary, type ClvInput } from "./compute";

/** Canonical method tags for fair probability construction. */
export type FairMethodTag =
  | "multiplicative_devig_v1"
  | "two_way_devig_v1"
  | "median_consensus_v1"
  | "model_prior_v1"
  | "prediction_market_raw_v1"
  | "shin_devig_v1"
  | "unknown";

export interface MethodTaggedFair {
  readonly q: number;
  readonly methodTag: FairMethodTag | string;
  readonly modelVersion: string;
  readonly asOf?: string;
  readonly sourceId?: string;
}

export type MethodContinuityOk = {
  readonly ok: true;
  readonly methodTag: string;
  readonly modelVersion: string;
  readonly openQ: number;
  readonly closeQ: number;
};

export type MethodContinuityRefuse = {
  readonly ok: false;
  readonly code:
    | "method_mismatch"
    | "model_version_mismatch"
    | "missing_method_tag"
    | "missing_model_version"
    | "prob_out_of_range";
  readonly error: string;
  readonly openMethod?: string;
  readonly closeMethod?: string;
  readonly openModelVersion?: string;
  readonly closeModelVersion?: string;
};

/**
 * Assert open and close fair probs share methodTag + modelVersion.
 */
export function assertMethodContinuity(
  open: MethodTaggedFair,
  close: MethodTaggedFair,
): MethodContinuityOk | MethodContinuityRefuse {
  if (!open.methodTag?.trim() || !close.methodTag?.trim()) {
    return {
      ok: false,
      code: "missing_method_tag",
      error: "methodTag required on both open and close fair probs",
      openMethod: open.methodTag,
      closeMethod: close.methodTag,
    };
  }
  if (!open.modelVersion?.trim() || !close.modelVersion?.trim()) {
    return {
      ok: false,
      code: "missing_model_version",
      error: "modelVersion required on both open and close fair probs",
      openModelVersion: open.modelVersion,
      closeModelVersion: close.modelVersion,
    };
  }
  if (
    ![open.q, close.q].every((x) => Number.isFinite(x) && x > 0 && x < 1)
  ) {
    return {
      ok: false,
      code: "prob_out_of_range",
      error: "open/close q must be in (0,1)",
    };
  }
  if (open.methodTag !== close.methodTag) {
    return {
      ok: false,
      code: "method_mismatch",
      error: `methodTag open=${open.methodTag} ≠ close=${close.methodTag}`,
      openMethod: open.methodTag,
      closeMethod: close.methodTag,
    };
  }
  if (open.modelVersion !== close.modelVersion) {
    return {
      ok: false,
      code: "model_version_mismatch",
      error: `modelVersion open=${open.modelVersion} ≠ close=${close.modelVersion}`,
      openModelVersion: open.modelVersion,
      closeModelVersion: close.modelVersion,
    };
  }
  return {
    ok: true,
    methodTag: open.methodTag,
    modelVersion: open.modelVersion,
    openQ: open.q,
    closeQ: close.q,
  };
}

export type ContinuousClvResult =
  | {
      ok: true;
      clv: number;
      methodTag: string;
      modelVersion: string;
      openQ: number;
      closeQ: number;
      interpretation: string;
      side: ClvInput["side"];
    }
  | MethodContinuityRefuse
  | { ok: false; code: "same_price"; error: string };

/**
 * Self-CLV only when method continuity holds. Receipts that touch marketFairProb
 * must carry the same methodTag/modelVersion on open and close legs.
 */
export function computeContinuousClv(input: {
  open: MethodTaggedFair;
  close: MethodTaggedFair;
  side: ClvInput["side"];
}): ContinuousClvResult {
  const cont = assertMethodContinuity(input.open, input.close);
  if (!cont.ok) return cont;
  const clv = computeClvPoints({
    openQ: cont.openQ,
    closeQ: cont.closeQ,
    side: input.side,
  });
  if (!clv.ok) {
    return { ok: false, code: clv.code, error: clv.error };
  }
  return {
    ok: true,
    clv: clv.clv,
    methodTag: cont.methodTag,
    modelVersion: cont.modelVersion,
    openQ: cont.openQ,
    closeQ: cont.closeQ,
    interpretation: clv.interpretation,
    side: input.side,
  };
}

/**
 * Public CLV claim only when continuity holds on every row AND n ≥ nMin.
 */
export function publishableContinuousClv(
  rows: readonly ContinuousClvResult[],
  nMin = 50,
): {
  publishable: boolean;
  n: number;
  mean?: number;
  reason: string;
  methodTag?: string;
  modelVersion?: string;
} {
  const okRows = rows.filter((r): r is Extract<ContinuousClvResult, { ok: true }> => r.ok);
  if (okRows.length === 0) {
    return { publishable: false, n: 0, reason: "no continuous CLV rows" };
  }
  // All ok rows must share methodTag/modelVersion for a single public claim.
  const methodTag = okRows[0]!.methodTag;
  const modelVersion = okRows[0]!.modelVersion;
  for (const r of okRows) {
    if (r.methodTag !== methodTag || r.modelVersion !== modelVersion) {
      return {
        publishable: false,
        n: okRows.length,
        reason: "cohort method/modelVersion not uniform — refuse public CLV",
      };
    }
  }
  const pub = publishableClvSummary(
    okRows.map((r) => ({ clv: r.clv })),
    nMin,
  );
  return {
    ...pub,
    methodTag,
    modelVersion,
  };
}


/** Alias used by handoff / CLV call sites — refuse if methods diverge. */
export const sameMethodOrRefuse = assertMethodContinuity;
