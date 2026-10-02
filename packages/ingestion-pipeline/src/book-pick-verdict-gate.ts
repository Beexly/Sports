/**
 * Book-pick authorization. A reasoning trace may open a signal slate.
 * It does not mint a book pick unless the verdict is the explicit
 * authorization below.
 *
 * ASSOCIATION_ONLY is a slate conclusion, not a pick. WITHHELD,
 * INSUFFICIENT, and INVALID are refusals. A missing verdict is a
 * refusal. Nothing in this file invents a probability or a 0.5.
 *
 * No producer emits GROUNDED yet. Do not seed it as a fallback.
 */

export const BOOK_PICK_AUTHORIZATION = "GROUNDED" as const;

export interface BookPickVerdictGate {
  readonly publishable: boolean;
  readonly reasonCode:
    | "TRACE_VERDICT_GROUNDED"
    | "TRACE_VERDICT_WITHHELD"
    | "TRACE_VERDICT_INSUFFICIENT"
    | "TRACE_VERDICT_INVALID"
    | "TRACE_VERDICT_ASSOCIATION_ONLY"
    | "TRACE_VERDICT_ABSENT"
    | "TRACE_VERDICT_UNKNOWN";
  readonly reason: string;
}

export function bookPickVerdictGate(verdict: string | null | undefined): BookPickVerdictGate {
  if (verdict === BOOK_PICK_AUTHORIZATION) {
    return {
      publishable: true,
      reasonCode: "TRACE_VERDICT_GROUNDED",
      reason: "reasoning trace authorized this book pick",
    };
  }
  if (verdict === "WITHHELD") {
    return {
      publishable: false,
      reasonCode: "TRACE_VERDICT_WITHHELD",
      reason: "reasoning trace withheld its conclusion",
    };
  }
  if (verdict === "INSUFFICIENT") {
    return {
      publishable: false,
      reasonCode: "TRACE_VERDICT_INSUFFICIENT",
      reason: "reasoning trace found no usable premise",
    };
  }
  if (verdict === "INVALID") {
    return {
      publishable: false,
      reasonCode: "TRACE_VERDICT_INVALID",
      reason: "reasoning trace verdict is invalid",
    };
  }
  if (verdict === "ASSOCIATION_ONLY") {
    return {
      publishable: false,
      reasonCode: "TRACE_VERDICT_ASSOCIATION_ONLY",
      reason: "association-only trace is not a book pick",
    };
  }
  if (verdict == null || verdict === "") {
    return {
      publishable: false,
      reasonCode: "TRACE_VERDICT_ABSENT",
      reason: "no reasoning-trace verdict was produced; refusal, not a default",
    };
  }
  return {
    publishable: false,
    reasonCode: "TRACE_VERDICT_UNKNOWN",
    reason: "unrecognized reasoning-trace verdict; refusal, not a default",
  };
}
