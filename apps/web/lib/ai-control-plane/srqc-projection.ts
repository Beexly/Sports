/**
 * SRQC projection stub (Track A, exactly-once runtime handoff 2026-07-22).
 *
 * This is the SEED of the abstraction function α that a future Self-Refining
 * Quotient Certificate would refine. It is deliberately minimal and PURE: it
 * takes a window of `control_event_ledger` rows (as read by
 * `readRecentEvents`) and folds them into a small abstract state vector of
 * the same shape the Formal Foundry's abstract domain reasons over. It does
 * NOT yet implement a real certificate, and `admitUnderSRQC` always admits —
 * the point of this pass is to force the EVENT SHAPE to be rich enough that a
 * real α can be written later WITHOUT changing the emission surface.
 *
 * Correctness posture: the projection is detection-only and side-effect-free.
 * It cannot, and must not, alter control-plane behavior. Its one job worth
 * testing today is that it can WITNESS the CTI classes the Formal Foundry
 * already closed — most importantly, two attempts left concurrently pending
 * on the same invocation (`pendingCountClass === "GE2"`), the exact shape of
 * inductive CTI #1 for InvocationClaim. If a projection over a real ledger
 * window ever reports GE2, that is a signal the runtime produced a state the
 * proofs forbid — which is the entire reason this surface exists.
 *
 * It consumes the events emitted by control-store.ts:
 *   ATTEMPT_STARTED     (source ai_attempt)   — a DISPATCHED attempt begins
 *   ATTEMPT_FAILED      (source ai_attempt)   — that attempt reached a terminal failure
 *   FINALIZED_SUCCESS   (source ai_invocation)
 *   FINALIZED_FAILED / _AMBIGUOUS / _BUDGET_BLOCKED / _POLICY_BLOCKED
 *                       (source ai_invocation) — the invocation reached terminal
 */

import type { ControlSqlClient } from "./control-store";
import { getActiveSrqcVersion } from "./formal-incident";
import type { ActiveSrqcVersion } from "./formal-incident";
import { classifyPendingCount } from "./quotient-map";

// ─── Abstract domain (the seed of α's codomain) ─────────────────────────────

/** Where the invocation's claim sits. */
export type ClaimPhase = "OPEN" | "TERMINAL";

/** Where any credit/budget exposure sits at the abstract level. */
export type ExposurePhase = "NONE" | "HELD" | "AMBIGUOUS_HELD";

/**
 * How many attempts are concurrently PENDING (started, not yet terminal) on
 * ONE invocation. `GE2` is the forbidden class — `AtMostOnePendingPerInvocation`
 * (InvocationClaim inductive glue) says this can never happen in a reachable
 * state.
 */
export type PendingCountClass = "ZERO" | "ONE" | "GE2";

export interface AbstractControlState {
  readonly invocationId: string;
  readonly claimPhase: ClaimPhase;
  readonly exposurePhase: ExposurePhase;
  readonly pendingCountClass: PendingCountClass;
  /** A request fingerprint has been bound to this id (always true once any
   *  event is seen — every emitted event carries the bound id). */
  readonly fingerprintBound: boolean;
  /** Whether a rejected/conflicting fingerprint was observed for this id.
   *  `RejectedImpliesBound` says this can only be true when the id is bound. */
  readonly hasRejectedFp: boolean;
}

// ─── Projection input ───────────────────────────────────────────────────────

/**
 * The minimal event shape the projection needs — a structural subset of a
 * `control_event_ledger` row (`ControlEventRow` in event-ledger.ts). Kept as
 * its own interface so the projection is unit-testable with synthetic,
 * CTI-shaped windows without a database.
 */
export interface ProjectableEvent {
  readonly eventType: string;
  readonly source: string;
  readonly sourceId: string;
  readonly payload: {
    readonly invocationId?: string;
    readonly attemptId?: string;
    readonly rejectedFingerprint?: boolean;
    readonly [k: string]: unknown;
  };
}

// These are the EXACT event-type strings control-store.ts emits for a
// terminal invocation transition. `finalizeSuccess` emits the literal
// "FINALIZED_SUCCESS"; `finalizeFailure` emits `'FINALIZED_' || status` with
// status ∈ {FAILED, AMBIGUOUS, BUDGET_BLOCKED, POLICY_BLOCKED}, so the real
// failure event name is FINALIZED_FAILED (NOT FINALIZED_FAILURE). The
// claimInvocation steal/unproven-funds fence also emits FINALIZED_AMBIGUOUS.
// This set must match those emitted names exactly or a settled invocation is
// mis-projected as still OPEN.
const TERMINAL_INVOCATION_EVENTS = new Set([
  "FINALIZED_SUCCESS",
  "FINALIZED_FAILED",
  "FINALIZED_AMBIGUOUS",
  "FINALIZED_BUDGET_BLOCKED",
  "FINALIZED_POLICY_BLOCKED",
]);

function invocationIdOf(e: ProjectableEvent): string | null {
  const fromPayload = e.payload.invocationId;
  if (typeof fromPayload === "string") return fromPayload;
  // ai_invocation-sourced events carry the invocation id as sourceId.
  if (e.source === "ai_invocation") return e.sourceId;
  return null;
}

/**
 * Fold a window of ledger events into per-invocation abstract states. Pure:
 * no clock, no I/O, no mutation of its input. Events for different
 * invocations are projected independently; ordering within an invocation is
 * taken as given by the caller (the ledger is read `ORDER BY createdAt ASC`).
 */
export function projectWindow(
  events: readonly ProjectableEvent[],
): readonly AbstractControlState[] {
  interface Acc {
    claimTerminal: boolean;
    startedAttempts: Set<string>;
    terminalAttempts: Set<string>;
    exposure: ExposurePhase;
    hasRejectedFp: boolean;
  }
  const byInvocation = new Map<string, Acc>();

  const acc = (id: string): Acc => {
    let a = byInvocation.get(id);
    if (a === undefined) {
      a = {
        claimTerminal: false,
        startedAttempts: new Set(),
        terminalAttempts: new Set(),
        exposure: "NONE",
        hasRejectedFp: false,
      };
      byInvocation.set(id, a);
    }
    return a;
  };

  for (const e of events) {
    const invId = invocationIdOf(e);
    if (invId === null) continue;
    const a = acc(invId);

    if (e.eventType === "ATTEMPT_STARTED") {
      const attemptId = e.payload.attemptId ?? e.sourceId;
      a.startedAttempts.add(attemptId);
      if (a.exposure === "NONE") a.exposure = "HELD";
    } else if (e.eventType === "ATTEMPT_FAILED") {
      const attemptId = e.payload.attemptId ?? e.sourceId;
      a.terminalAttempts.add(attemptId);
    } else if (TERMINAL_INVOCATION_EVENTS.has(e.eventType)) {
      a.claimTerminal = true;
      // The success path emits ATTEMPT_STARTED then FINALIZED_SUCCESS for the
      // WINNING attempt — there is no ATTEMPT_FAILED for it — so the winning
      // attempt would otherwise stay in `startedAttempts` and report a
      // spurious ONE-pending on a settled success. finalizeSuccess carries the
      // winning attemptId in its payload; close that attempt here. Degrade
      // gracefully if an older payload lacks it (nothing to close — do not
      // crash).
      if (e.eventType === "FINALIZED_SUCCESS") {
        const winningAttemptId = e.payload.attemptId;
        if (typeof winningAttemptId === "string") {
          a.terminalAttempts.add(winningAttemptId);
        }
      }
      // An AMBIGUOUS terminal is the "held until trusted resolution" state;
      // any other terminal releases the abstract exposure.
      a.exposure =
        e.eventType === "FINALIZED_AMBIGUOUS" ? "AMBIGUOUS_HELD" : "NONE";
    }

    if (e.payload.rejectedFingerprint === true) {
      a.hasRejectedFp = true;
    }
  }

  const out: AbstractControlState[] = [];
  for (const [invocationId, a] of byInvocation) {
    const pending = [...a.startedAttempts].filter(
      (id) => !a.terminalAttempts.has(id),
    ).length;
    const pendingCountClass: PendingCountClass = classifyPendingCount(pending);
    out.push({
      invocationId,
      claimPhase: a.claimTerminal ? "TERMINAL" : "OPEN",
      exposurePhase: a.exposure,
      pendingCountClass,
      fingerprintBound: true,
      hasRejectedFp: a.hasRejectedFp,
    });
  }
  return out;
}

// ─── Admission (SHADOW/ENFORCE; SHADOW default preserves always-ADMIT) ──────

export type SrqcAdmissionDecision = "ADMIT" | "REFUSE";

/**
 * Admission mode (M5, first enforcement-capable step).
 *
 * SHADOW (the default): compute the projection and surface any violations in
 * `.violations`, but ALWAYS return `ADMIT` — byte-for-byte the same behavior
 * as the pre-M5 always-admit stub. Every existing caller that does not pass a
 * mode gets SHADOW and is therefore unaffected.
 *
 * ENFORCE: return `REFUSE` when (and only when) the projection surfaces at
 * least one violation; otherwise `ADMIT`. ENFORCE is NOT the default and is
 * reachable in this repo ONLY through the clearly-labeled lab helper below
 * (`evaluateSrqcAdmissionForLab`), which itself only selects ENFORCE when the
 * `SRQC_ENFORCE=1` env flag is set. No production/public/readiness path resolves
 * this mode, so the live system stays always-ADMIT unless someone explicitly
 * opts a lab environment into ENFORCE.
 */
export type SrqcMode = "SHADOW" | "ENFORCE";

export interface SrqcAdmissionResult {
  readonly decision: SrqcAdmissionDecision;
  /** The projected abstract states the decision was based on. */
  readonly projected: readonly AbstractControlState[];
  /** Abstract states that violate a Formal Foundry invariant, if any. Empty
   *  in every reachable state — a non-empty list is a real signal, surfaced
   *  for a certificate / incident emitter to act on. In SHADOW it does NOT
   *  change the decision; in ENFORCE a non-empty list REFUSEs. */
  readonly violations: readonly AbstractControlState[];
  /** The SrqcVersion.version active when this decision was computed, or null
   *  when no active certificate exists / none was supplied. Observability
   *  only — the decision does not depend on it (KERNEL v1 addition, layered
   *  on top of the M5 admission core without changing its behavior). */
  readonly srqcVersion: number | null;
}

/** The IndInv negation predicate — the EXACT condition cti-miner.ts's
 *  `isIndInvViolation` filters on, and the EXACT condition
 *  `admitUnderSRQC`'s ENFORCE branch REFUSEs on. Exported (no behavior
 *  change) so other pure observers of a projected window — e.g. W1's shadow
 *  metrics — can reuse the identical predicate instead of re-deriving it. */
export function isViolation(s: AbstractControlState): boolean {
  return (
    s.pendingCountClass === "GE2" || (s.hasRejectedFp && !s.fingerprintBound)
  );
}

/**
 * `admitUnderSRQC` — pure admission decision over a ledger window.
 *
 * It computes the projection every time so the event shape is exercised and
 * any GE2 (forbidden two-Pending) window is surfaced in `violations`.
 *
 * The `mode` argument (defaulting to SHADOW) decides whether a violation is
 * merely reported or actually refused:
 *   - SHADOW (default) ALWAYS returns `ADMIT`, even when `violations` is
 *     non-empty — detection-only, byte-identical to the pre-M5 stub. This is
 *     what every caller that omits `mode` gets.
 *   - ENFORCE returns `REFUSE` iff there is at least one violation, else
 *     `ADMIT`.
 *
 * This function is PURE: it never reads `process.env` or any ambient config.
 * Mode selection from the environment happens at exactly one call site — the
 * lab helper `evaluateSrqcAdmissionForLab` below — never here.
 *
 * `active` (KERNEL v1 addition) is an OPTIONAL certificate reference used
 * ONLY to stamp `srqcVersion` on the result for observability — it never
 * affects the decision. Existing one-arg and two-arg callers keep compiling
 * unchanged (`mode` defaults to SHADOW, `active` defaults to null →
 * `srqcVersion: null`).
 */
export function admitUnderSRQC(
  events: readonly ProjectableEvent[],
  mode: SrqcMode = "SHADOW",
  active: ActiveSrqcVersion | null = null,
): SrqcAdmissionResult {
  const projected = projectWindow(events);
  const violations = projected.filter(isViolation);
  const decision: SrqcAdmissionDecision =
    mode === "ENFORCE" && violations.length > 0 ? "REFUSE" : "ADMIT";
  return {
    decision,
    projected,
    violations,
    srqcVersion: active?.version ?? null,
  };
}

// ─── Lab wiring (the ONE place ENFORCE can be reached) ──────────────────────

/**
 * Minimal structural view of the environment the lab wiring reads. Kept narrow
 * (only the one flag it consults) so it is satisfied by both `process.env` and
 * a synthetic test object without pulling in the full `NodeJS.ProcessEnv`.
 */
export interface SrqcEnvLike {
  readonly SRQC_ENFORCE?: string;
  readonly [key: string]: string | undefined;
}

/**
 * PURE sync logged admit (KERNEL v1 addition). Identical to `admitUnderSRQC`
 * (same pure projection + decision, no env, no I/O beyond ONE structured log)
 * — it emits a single `console.info` `{kind:"srqc_admit",...}` line and
 * returns the result. Use it where the caller already has the active
 * certificate in hand (no DB load); `admitUnderSRQCWithVersion` below is the
 * DB-loading async convenience. Logging is the only side effect; the decision
 * remains SHADOW-ADMIT by default and ENFORCE (lab-only) REFUSE-iff-violation.
 */
export function admitUnderSRQCLogged(
  events: readonly ProjectableEvent[],
  mode: SrqcMode = "SHADOW",
  active: ActiveSrqcVersion | null = null,
): SrqcAdmissionResult {
  const result = admitUnderSRQC(events, mode, active);
  const violationPending = result.violations.some(
    (s) => s.pendingCountClass === "GE2",
  );
  // eslint-disable-next-line no-console
  console.info(
    JSON.stringify({
      kind: "srqc_admit",
      decision: result.decision,
      mode,
      srqcVersion: result.srqcVersion,
      violationCount: result.violations.length,
      violationPending,
    }),
  );
  return result;
}

/**
 * Resolve the SRQC admission mode from the environment. ENFORCE ONLY when the
 * explicit opt-in flag `SRQC_ENFORCE=1` is present; SHADOW (⇒ always-ADMIT)
 * for every other value, including unset. This is the sole reader of the flag
 * on the lab/tooling path — it is NEVER called by the production / C1–C8
 * admission path (the pure core above takes an already-resolved `mode`).
 */
export function resolveSrqcModeFromEnv(
  env: SrqcEnvLike = process.env,
): SrqcMode {
  return env.SRQC_ENFORCE === "1" ? "ENFORCE" : "SHADOW";
}

/**
 * LAB-ONLY admission entry point.
 *
 * DANGER / SCOPE: this is the ONLY function in the repo through which the
 * ENFORCE (REFUSE-capable) path can be reached, and it is deliberately NOT
 * imported by any production route, worker, cron, executor, or C1–C8
 * readiness gate — verified by grep at commit time. It exists so a lab
 * operator can exercise real enforcement behind `SRQC_ENFORCE=1` without
 * touching any user-facing path.
 *
 * Because `resolveSrqcModeFromEnv` returns SHADOW unless `SRQC_ENFORCE=1`, the
 * default posture even of THIS helper is always-ADMIT; a REFUSE can only occur
 * in a lab environment that has explicitly set the flag AND fed it a window
 * that projects a violation.
 */
export function evaluateSrqcAdmissionForLab(
  events: readonly ProjectableEvent[],
  env: SrqcEnvLike = process.env,
): SrqcAdmissionResult {
  const mode = resolveSrqcModeFromEnv(env);
  return admitUnderSRQC(events, mode);
}

// ─── DB-backed admission with version stamping + structured logging ────────
// (KERNEL v1 addition, layered on top of the M5 admission core.)

/**
 * Lab/observability admission: load the active certificate version, run the
 * pure `admitUnderSRQC`, and emit ONE structured JSON log line stamped with
 * that version. I/O lives HERE (the `sql` read + the log), never in the pure
 * core. Default mode SHADOW. This is deliberately NOT wired into any C1–C8 /
 * production readiness path — same posture as `evaluateSrqcAdmissionForLab`
 * and the rest of the detection-only SRQC surface.
 */
export async function admitUnderSRQCWithVersion(
  sql: ControlSqlClient,
  events: readonly ProjectableEvent[],
  mode: SrqcMode = "SHADOW",
): Promise<SrqcAdmissionResult> {
  const active = await getActiveSrqcVersion(sql);
  const result = admitUnderSRQC(events, mode, active);
  const violationKinds = [
    ...new Set(
      result.violations.map((s) =>
        s.pendingCountClass === "GE2" ? "GE2_PENDING" : "REJECTED_FP_UNBOUND",
      ),
    ),
  ];
  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify({
      kind: "srqc_admit",
      srqcVersion: result.srqcVersion,
      mode,
      decision: result.decision,
      violationKinds,
      at: new Date().toISOString(),
    }),
  );
  return result;
}
