/**
 * Fail-closed LLM-judge gate — deterministic harness, R&D/additive only.
 *
 * Ported from arXiv:2606.28570's Agent-4 recipe (LangGraph athlete-profiling
 * pipeline, §3.2.2 per the extraction dossier
 * docs/ops/edge/extraction/2026-08-26-group-batch1.md): an independent judge
 * cross-references generated prose against the deterministic structured
 * payload it was generated from, returns an ENFORCED-schema verdict
 * (confidence 0-100, justification, tagged contradictions with severity),
 * and drives a ONE-bounded-retry loop where the judge's corrections are
 * injected into the regeneration prompt; an invalid or absent judge response
 * is treated as confidence 0 (fail-closed); retry exhaustion terminates in a
 * manual-review BLOCK. The paper's empirical numbers are internally
 * inconsistent (its own extraction says so), so every threshold here is an
 * engineering default explicitly marked UNCALIBRATED — the pattern is
 * adopted on merit, the numbers are not.
 *
 * What is CODE here (this module, all deterministic, no LLM): verdict-schema
 * validation with a closed reject-reason table; the cross-reference check
 * that every cited refId exists in the draft's REAL id inventory; the
 * threshold + blocking-severity decision; the pure retry/refusal-accounting
 * state machine; mechanical retry-feedback assembly; blocker-string shaping
 * for readiness.ts's blockers[] aggregation. What is NOT here and stays
 * founder-gated: the judge prompt/persona, the LLM transport (strict tool
 * use through the claude-api infra), and composing this gate into the live
 * build-draft → persist-draft flow — the same deliberate deferral shipped
 * with relation-claim-guard.ts, because readiness.ts already runs in several
 * production content paths and a new blocker source is never wired blind.
 *
 * ADDITIVE-ONLY BY CONSTRUCTION: JudgeGateOutcome has exactly two kinds —
 * PROCEED (adds nothing) and BLOCK_MANUAL_REVIEW — there is no representable
 * "unblock", so a judge can never clear something compliance or coverage
 * blocked. The judge that errors must never default-approve; every path that
 * is not a valid passing verdict scores as confidence 0.
 *
 * Pure. No I/O. No LLM calls.
 */

import type { ContentDraftRecord } from "./types.js";

export const CONTRADICTION_TAGS = [
  "NUMERIC_CONTRADICTION",
  "TONE_VS_RECORD",
  "UNSUPPORTED_CLAIM",
  "STALENESS_CONFLICT",
  "OMITTED_CAVEAT",
] as const;
export type ContradictionTag = (typeof CONTRADICTION_TAGS)[number];

export const CONTRADICTION_SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export type ContradictionSeverity = (typeof CONTRADICTION_SEVERITIES)[number];

export interface JudgeContradiction {
  readonly tag: ContradictionTag;
  readonly severity: ContradictionSeverity;
  /** Must name a REAL id from the draft's inventory (see draftRefIds) — the cross-reference check. */
  readonly refId: string;
  readonly detail: string;
}

export interface JudgeVerdict {
  readonly confidence: number; // 0..100
  readonly justification: string;
  readonly contradictions: readonly JudgeContradiction[];
}

export type VerdictRejectReason =
  | "NOT_AN_OBJECT"
  | "MISSING_FIELD"
  | "WRONG_TYPE"
  | "CONFIDENCE_NOT_FINITE"
  | "CONFIDENCE_OUT_OF_RANGE"
  | "EMPTY_JUSTIFICATION"
  | "UNKNOWN_TAG"
  | "UNKNOWN_SEVERITY"
  | "UNKNOWN_REF_ID"
  | "EMPTY_DETAIL";

export type VerdictParseResult =
  | { readonly ok: true; readonly verdict: JudgeVerdict }
  | { readonly ok: false; readonly reason: VerdictRejectReason; readonly path: string };

/**
 * Structural validation of an ALREADY-DECODED value. This module never
 * JSON.parses — the transport must deliver an object (a raw string is
 * rejected as NOT_AN_OBJECT), and the parse revalidates regardless of any
 * schema enforcement at the API layer (never trust transport).
 */
export function parseJudgeVerdict(raw: unknown, validRefIds: ReadonlySet<string>): VerdictParseResult {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return { ok: false, reason: "NOT_AN_OBJECT", path: "" };
  }
  const obj = raw as Record<string, unknown>;

  if (!("confidence" in obj)) return { ok: false, reason: "MISSING_FIELD", path: "confidence" };
  if (typeof obj["confidence"] !== "number") return { ok: false, reason: "WRONG_TYPE", path: "confidence" };
  const confidence = obj["confidence"];
  if (!Number.isFinite(confidence)) return { ok: false, reason: "CONFIDENCE_NOT_FINITE", path: "confidence" };
  if (confidence < 0 || confidence > 100) return { ok: false, reason: "CONFIDENCE_OUT_OF_RANGE", path: "confidence" };

  if (!("justification" in obj)) return { ok: false, reason: "MISSING_FIELD", path: "justification" };
  if (typeof obj["justification"] !== "string") return { ok: false, reason: "WRONG_TYPE", path: "justification" };
  const justification = obj["justification"].trim();
  if (justification.length === 0) return { ok: false, reason: "EMPTY_JUSTIFICATION", path: "justification" };

  if (!("contradictions" in obj)) return { ok: false, reason: "MISSING_FIELD", path: "contradictions" };
  if (!Array.isArray(obj["contradictions"])) return { ok: false, reason: "WRONG_TYPE", path: "contradictions" };

  const contradictions: JudgeContradiction[] = [];
  for (let i = 0; i < obj["contradictions"].length; i++) {
    const c = obj["contradictions"][i] as unknown;
    const path = `contradictions[${i}]`;
    if (typeof c !== "object" || c === null || Array.isArray(c)) return { ok: false, reason: "WRONG_TYPE", path };
    const cc = c as Record<string, unknown>;
    if (typeof cc["tag"] !== "string") return { ok: false, reason: "MISSING_FIELD", path: `${path}.tag` };
    if (!(CONTRADICTION_TAGS as readonly string[]).includes(cc["tag"])) {
      return { ok: false, reason: "UNKNOWN_TAG", path: `${path}.tag` };
    }
    if (typeof cc["severity"] !== "string") return { ok: false, reason: "MISSING_FIELD", path: `${path}.severity` };
    if (!(CONTRADICTION_SEVERITIES as readonly string[]).includes(cc["severity"])) {
      return { ok: false, reason: "UNKNOWN_SEVERITY", path: `${path}.severity` };
    }
    if (typeof cc["refId"] !== "string") return { ok: false, reason: "MISSING_FIELD", path: `${path}.refId` };
    if (!validRefIds.has(cc["refId"])) return { ok: false, reason: "UNKNOWN_REF_ID", path: `${path}.refId` };
    if (typeof cc["detail"] !== "string") return { ok: false, reason: "MISSING_FIELD", path: `${path}.detail` };
    if (cc["detail"].trim().length === 0) return { ok: false, reason: "EMPTY_DETAIL", path: `${path}.detail` };
    contradictions.push({
      tag: cc["tag"] as ContradictionTag,
      severity: cc["severity"] as ContradictionSeverity,
      refId: cc["refId"],
      detail: cc["detail"],
    });
  }

  return { ok: true, verdict: { confidence, justification, contradictions } };
}

/** Markdown H1/H2 heading → stable slug, mirroring common slug conventions. */
function headingSlug(heading: string): string {
  return heading
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

/**
 * The draft's REAL id inventory — the namespace a verdict's refIds must live
 * in. Deterministic pure string processing over the existing
 * ContentDraftRecord shape: `section:<slug>` per markdown H1/H2 of
 * draftBody, `source:<sourceLabel>`, `pick:<id>`, `promo:<id>`,
 * `brief:<id>`. A verdict citing an id outside this set is itself invalid
 * (fails closed) — a judge cannot ground a contradiction in a section that
 * does not exist.
 */
export function draftRefIds(draft: ContentDraftRecord): ReadonlySet<string> {
  const ids = new Set<string>();
  for (const line of draft.draftBody.split("\n")) {
    const m = /^#{1,2}\s+(.+)$/.exec(line.trim());
    if (m) ids.add(`section:${headingSlug(m[1]!)}`);
  }
  for (const s of draft.sources) ids.add(`source:${s.sourceLabel}`);
  for (const id of draft.relatedPickIds) ids.add(`pick:${id}`);
  for (const id of draft.relatedPromotionIds) ids.add(`promo:${id}`);
  for (const id of draft.relatedBriefIds) ids.add(`brief:${id}`);
  return ids;
}

export interface JudgeGatePolicy {
  /** Pass floor on confidence. UNCALIBRATED default 70 (the paper's flow constant, adopted on engineering merit only). */
  readonly confidenceThreshold: number;
  /** Bounded retries after the first attempt. Default 1 (the paper's single bounded retry). */
  readonly maxRetries: number;
  /** Severities that veto even a confidence-100 verdict. Default HIGH + CRITICAL. */
  readonly blockingSeverities: ReadonlySet<ContradictionSeverity>;
}

export const DEFAULT_JUDGE_GATE_POLICY: JudgeGatePolicy = {
  confidenceThreshold: 70,
  maxRetries: 1,
  blockingSeverities: new Set(["HIGH", "CRITICAL"]),
};

/** Threshold + blocking-severity decision. A blocking-severity contradiction vetoes regardless of the scalar. */
export function decideJudgeVerdict(
  verdict: JudgeVerdict,
  policy: JudgeGatePolicy,
): { readonly pass: boolean; readonly blocking: readonly JudgeContradiction[] } {
  const blocking = verdict.contradictions.filter((c) => policy.blockingSeverities.has(c.severity));
  return { pass: verdict.confidence >= policy.confidenceThreshold && blocking.length === 0, blocking };
}

export type JudgeAttemptReport =
  | { readonly kind: "VERDICT"; readonly raw: unknown }
  | { readonly kind: "TIMEOUT" }
  | { readonly kind: "REFUSAL" }
  | { readonly kind: "TRANSPORT_ERROR"; readonly detail?: string };

export interface JudgeLoopAccounting {
  readonly attemptsUsed: number;
  readonly invalidVerdicts: number;
  readonly timeouts: number;
  readonly refusals: number;
  readonly transportErrors: number;
}

export type JudgeGateOutcome =
  | {
      readonly kind: "PROCEED";
      readonly verdict: JudgeVerdict;
      /** LOW/MEDIUM contradictions surface as notes, never blockers. */
      readonly notes: readonly string[];
      readonly accounting: JudgeLoopAccounting;
    }
  | {
      readonly kind: "BLOCK_MANUAL_REVIEW";
      readonly cause: "RETRY_EXHAUSTED" | "INVALID_VERDICT" | "JUDGE_UNAVAILABLE" | "BLOCKING_CONTRADICTION";
      readonly blockers: readonly string[];
      readonly accounting: JudgeLoopAccounting;
    };
// Deliberately NO outcome kind that unblocks/clears anything — additive-only by construction.

export interface JudgeAttemptRecord {
  readonly attempt: number;
  readonly reportKind: JudgeAttemptReport["kind"];
  readonly parse: VerdictParseResult | null;
}

export interface JudgeLoopState {
  readonly policy: JudgeGatePolicy;
  readonly accounting: JudgeLoopAccounting;
  readonly history: readonly JudgeAttemptRecord[];
  readonly outcome: JudgeGateOutcome | null;
}

/** Throws RangeError on an invalid policy — same guard convention as relation-claim-guard. */
export function initJudgeLoop(policy: Partial<JudgeGatePolicy> = {}): JudgeLoopState {
  const merged: JudgeGatePolicy = {
    confidenceThreshold: policy.confidenceThreshold ?? DEFAULT_JUDGE_GATE_POLICY.confidenceThreshold,
    maxRetries: policy.maxRetries ?? DEFAULT_JUDGE_GATE_POLICY.maxRetries,
    blockingSeverities: policy.blockingSeverities ?? DEFAULT_JUDGE_GATE_POLICY.blockingSeverities,
  };
  if (!Number.isFinite(merged.confidenceThreshold) || merged.confidenceThreshold < 0 || merged.confidenceThreshold > 100) {
    throw new RangeError(`initJudgeLoop: confidenceThreshold must be in [0,100], got ${merged.confidenceThreshold}`);
  }
  if (!Number.isInteger(merged.maxRetries) || merged.maxRetries < 0) {
    throw new RangeError(`initJudgeLoop: maxRetries must be a non-negative integer, got ${merged.maxRetries}`);
  }
  return {
    policy: merged,
    accounting: { attemptsUsed: 0, invalidVerdicts: 0, timeouts: 0, refusals: 0, transportErrors: 0 },
    history: [],
    outcome: null,
  };
}

function blockerLine(c: JudgeContradiction): string {
  return `Judge contradiction [${c.tag}/${c.severity}] at ${c.refId}: ${c.detail}`;
}

/**
 * Record one LLM attempt (as reported by the caller) into the loop. Pure —
 * returns the next state. Throws on recording into a terminal state (the
 * refuse-don't-fix posture). Every non-passing path scores exactly like
 * confidence 0 and consumes one attempt from the 1 + maxRetries budget.
 */
export function recordJudgeAttempt(
  state: JudgeLoopState,
  report: JudgeAttemptReport,
  validRefIds: ReadonlySet<string>,
): JudgeLoopState {
  if (state.outcome !== null) {
    throw new Error("recordJudgeAttempt: loop already terminal — a decided gate is never re-driven");
  }
  const attempt = state.accounting.attemptsUsed + 1;
  const budget = 1 + state.policy.maxRetries;

  let parse: VerdictParseResult | null = null;
  let acc: JudgeLoopAccounting = { ...state.accounting, attemptsUsed: attempt };
  let passVerdict: JudgeVerdict | null = null;
  let blockingNow: readonly JudgeContradiction[] = [];
  let lastFailure: "invalid" | "unavailable" | "belowThreshold" | "blockingContradiction" | null = null;

  if (report.kind === "VERDICT") {
    parse = parseJudgeVerdict(report.raw, validRefIds);
    if (!parse.ok) {
      acc = { ...acc, invalidVerdicts: acc.invalidVerdicts + 1 };
      lastFailure = "invalid";
    } else {
      const decision = decideJudgeVerdict(parse.verdict, state.policy);
      if (decision.pass) {
        passVerdict = parse.verdict;
      } else {
        blockingNow = decision.blocking;
        lastFailure = decision.blocking.length > 0 ? "blockingContradiction" : "belowThreshold";
      }
    }
  } else {
    if (report.kind === "TIMEOUT") acc = { ...acc, timeouts: acc.timeouts + 1 };
    else if (report.kind === "REFUSAL") acc = { ...acc, refusals: acc.refusals + 1 };
    else acc = { ...acc, transportErrors: acc.transportErrors + 1 };
    lastFailure = "unavailable";
  }

  const record: JudgeAttemptRecord = { attempt, reportKind: report.kind, parse };
  const history = [...state.history, record];

  if (passVerdict !== null) {
    const notes = passVerdict.contradictions.map((c) => `Judge note [${c.tag}/${c.severity}] at ${c.refId}: ${c.detail}`);
    return {
      ...state,
      accounting: acc,
      history,
      outcome: { kind: "PROCEED", verdict: passVerdict, notes, accounting: acc },
    };
  }

  if (attempt >= budget) {
    const anyValidVerdict = history.some((h) => h.parse?.ok === true);
    const cause =
      lastFailure === "blockingContradiction"
        ? "BLOCKING_CONTRADICTION"
        : lastFailure === "invalid"
          ? "INVALID_VERDICT"
          : !anyValidVerdict && acc.invalidVerdicts === 0
            ? "JUDGE_UNAVAILABLE"
            : "RETRY_EXHAUSTED";
    const blockers =
      blockingNow.length > 0
        ? blockingNow.map(blockerLine)
        : [`Judge gate blocked (${cause.toLowerCase()}): ${attempt} attempt(s) used without a passing verdict — manual review required.`];
    return {
      ...state,
      accounting: acc,
      history,
      outcome: { kind: "BLOCK_MANUAL_REVIEW", cause, blockers, accounting: acc },
    };
  }

  return { ...state, accounting: acc, history };
}

/**
 * The caller's next move: CALL_JUDGE (first ask, or a plain re-ask after an
 * invalid/unavailable attempt), RETRY_WITH_FEEDBACK (a valid-but-failing
 * verdict exists — inject its corrections into the regeneration prompt), or
 * DONE with the terminal outcome.
 */
export function nextJudgeStep(
  state: JudgeLoopState,
): { readonly kind: "CALL_JUDGE"; readonly attempt: number } | { readonly kind: "RETRY_WITH_FEEDBACK"; readonly attempt: number; readonly feedback: string } | { readonly kind: "DONE"; readonly outcome: JudgeGateOutcome } {
  if (state.outcome !== null) return { kind: "DONE", outcome: state.outcome };
  const attempt = state.accounting.attemptsUsed + 1;
  for (let i = state.history.length - 1; i >= 0; i--) {
    const h = state.history[i]!;
    if (h.parse?.ok) {
      return { kind: "RETRY_WITH_FEEDBACK", attempt, feedback: buildRetryFeedback(h.parse.verdict) };
    }
  }
  return { kind: "CALL_JUDGE", attempt };
}

/** Deterministic mechanical assembly of the judge's corrections (the surrounding regeneration prompt is founder-gated prompt design, not this). */
export function buildRetryFeedback(verdict: JudgeVerdict): string {
  const lines = [verdict.justification];
  for (const c of verdict.contradictions) lines.push(`[${c.tag}/${c.severity}] ${c.refId}: ${c.detail}`);
  return lines.join("\n");
}

/** Blocker lines shaped for readiness.ts's blockers[] aggregation. Empty for PROCEED — the gate only ever ADDS blockers. */
export function judgeBlockerStrings(outcome: JudgeGateOutcome): readonly string[] {
  return outcome.kind === "PROCEED" ? [] : outcome.blockers;
}
