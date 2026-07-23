/**
 * M6 — online CTI-candidate miner (detection / mining only; self-refinement
 * INPUT, on top of Track A + Track B + the versioned envelope, same branch by
 * owner authorization).
 *
 * WHAT THIS IS. The Formal Foundry proves an inductive invariant over an
 * abstract domain (srqc-projection.ts's `AbstractControlState`). This module
 * mines, from real `control_event_ledger` windows, the abstract states that
 * sit EXACTLY ONE modeled abstract step away from a state the invariant
 * forbids — the raw material a human or LLM uses to STRENGTHEN the invariant
 * (weakest-precondition refinement). It projects a window via the pure
 * `projectWindow`, and for every projected state `s` that is NOT itself a
 * violation, applies the pure one-step successor relation `abstractSuccessors`
 * (mirroring the Next relation of the formal-branch spec
 * `AbstractClaimExposure.tla`). Any successor `{action, next}` with
 * `isIndInvViolation(next) === true` is a candidate counterexample: `s` is a
 * legal state from which one modeled action reaches a proof-forbidden state,
 * so either the runtime can actually be in `s` and step there (a real bug to
 * be fenced), or the invariant needs strengthening to exclude `s`. Each such
 * pair is recorded as a `cti_candidate` row `{ before: s, action, after: next }`.
 *
 * POSTURE (explicit, DO NOT let this drift):
 *   - DETECTION / MINING ONLY. This module writes ONLY `cti_candidate` rows
 *     for human/LLM review. It changes no control-plane behavior, calls no
 *     provider, and `admitUnderSRQC` (srqc-projection.ts) remains always-ADMIT
 *     and is not touched here.
 *   - It NEVER edits, generates, or writes any `.tla` file (or any spec) — the
 *     refinement step it feeds is a HUMAN decision. This module only appends
 *     database rows.
 *   - No ENFORCE path. A candidate row does not gate anything.
 *   - The abstract-successor functions are PURE and TOTAL: no clock, no I/O,
 *     no mutation of their input. They import ONLY types from
 *     srqc-projection.ts and never call back into it.
 *
 * DEDUP / EXACTLY-ONCE. A candidate's row `id` is derived deterministically
 * from a canonical hash of `before + action + after` and inserted
 * `ON CONFLICT (id) DO NOTHING`. Re-running the miner over the same or an
 * overlapping window therefore re-derives the identical id and writes no
 * duplicate — this module adds no other dedup mechanism.
 */

import { createHash } from "node:crypto";

import { readRecentEvents } from "./event-ledger";
import type { ControlEventRow } from "./event-ledger";
import { projectWindow } from "./srqc-projection";
import type {
  AbstractControlState,
  PendingCountClass,
  ProjectableEvent,
} from "./srqc-projection";
import type { ControlSqlClient } from "./control-store";

// ─── The modeled abstract actions (mirror AbstractClaimExposure.tla's Next) ──

/**
 * The abstract actions whose effects this miner steps through — the SAME set
 * the formal-branch spec's Next relation disjuncts over. Kept as a string
 * union so a `cti_candidate.action` value is self-describing to a human
 * reviewer.
 */
export type AbstractAction =
  | "StartPending"
  | "EndPending"
  | "FinalizeAmbiguous"
  | "FinalizeClean"
  | "RejectFp";

// ─── Pure PendingCountClass arithmetic ──────────────────────────────────────

/** ZERO → ONE → GE2, saturating at the top class (GE2 is the join). */
function incPending(p: PendingCountClass): PendingCountClass {
  return p === "ZERO" ? "ONE" : "GE2";
}

/** GE2 → ONE → ZERO, saturating at the bottom class. Abstractly a GE2
 *  decrement lands in ONE (there is provably still ≥1 pending after removing
 *  one of ≥2). */
function decPending(p: PendingCountClass): PendingCountClass {
  return p === "GE2" ? "ONE" : p === "ONE" ? "ZERO" : "ZERO";
}

// ─── Abstract-successor relation (pure, total) ──────────────────────────────

/**
 * The one-step successors of `s` under the modeled abstract actions, mirroring
 * the effects of `AbstractClaimExposure.tla`'s Next disjuncts. Only ENABLED
 * actions (those whose TLA+ guard holds in `s`) contribute a successor, so the
 * result is the set of abstract states genuinely reachable in one step:
 *
 *   - StartPending      (guard: claim OPEN) — a new attempt goes PENDING:
 *                       pendingCountClass ZERO→ONE→GE2, exposure := HELD,
 *                       fingerprintBound := true.
 *   - EndPending        (guard: pending ONE or GE2) — an attempt leaves
 *                       PENDING: pendingCountClass decrements.
 *   - FinalizeAmbiguous (guard: claim OPEN) — claim TERMINAL, exposure
 *                       AMBIGUOUS_HELD, pending ZERO.
 *   - FinalizeClean     (guard: claim OPEN) — claim TERMINAL, exposure NONE,
 *                       pending ZERO.
 *   - RejectFp          (guard: fingerprintBound — the RejectedImpliesBound
 *                       precondition) — hasRejectedFp := true.
 *
 * Pure and total: constructs new states, never mutates `s`; every input yields
 * a (possibly empty) list; no clock, no I/O.
 */
export function abstractSuccessors(
  s: AbstractControlState,
): ReadonlyArray<{ action: AbstractAction; next: AbstractControlState }> {
  const out: { action: AbstractAction; next: AbstractControlState }[] = [];

  if (s.claimPhase === "OPEN") {
    // StartPending
    out.push({
      action: "StartPending",
      next: {
        ...s,
        pendingCountClass: incPending(s.pendingCountClass),
        exposurePhase: "HELD",
        fingerprintBound: true,
      },
    });
    // FinalizeAmbiguous
    out.push({
      action: "FinalizeAmbiguous",
      next: {
        ...s,
        claimPhase: "TERMINAL",
        exposurePhase: "AMBIGUOUS_HELD",
        pendingCountClass: "ZERO",
      },
    });
    // FinalizeClean
    out.push({
      action: "FinalizeClean",
      next: {
        ...s,
        claimPhase: "TERMINAL",
        exposurePhase: "NONE",
        pendingCountClass: "ZERO",
      },
    });
  }

  // EndPending — enabled whenever something is pending.
  if (s.pendingCountClass !== "ZERO") {
    out.push({
      action: "EndPending",
      next: {
        ...s,
        pendingCountClass: decPending(s.pendingCountClass),
      },
    });
  }

  // RejectFp — enabled only when a fingerprint is bound (RejectedImpliesBound).
  if (s.fingerprintBound) {
    out.push({
      action: "RejectFp",
      next: {
        ...s,
        hasRejectedFp: true,
      },
    });
  }

  return out;
}

/**
 * The negation of the Formal Foundry's inductive invariant over the abstract
 * domain — the EXACT violation condition `admitUnderSRQC` (srqc-projection.ts)
 * already filters on, restated here as a pure predicate so the miner can test
 * SUCCESSOR states without importing the admission stub:
 *
 *   - `pendingCountClass === "GE2"` — two attempts concurrently PENDING on one
 *     invocation (inductive CTI #1 for InvocationClaim,
 *     AtMostOnePendingPerInvocation).
 *   - `hasRejectedFp && !fingerprintBound` — a rejected fingerprint on an
 *     unbound id (RejectedImpliesBound).
 */
export function isIndInvViolation(s: AbstractControlState): boolean {
  return (
    s.pendingCountClass === "GE2" || (s.hasRejectedFp && !s.fingerprintBound)
  );
}

// ─── Candidate mining (pure core) ───────────────────────────────────────────

export interface CtiCandidateRow {
  /** Deterministic, idempotent id — a canonical hash of before+action+after. */
  readonly id: string;
  readonly before: AbstractControlState;
  readonly action: AbstractAction;
  readonly after: AbstractControlState;
}

/** Fixed-field canonical serialization of an abstract state — independent of
 *  object key order, so the derived id is stable across runs. */
function canonicalState(s: AbstractControlState): string {
  return JSON.stringify([
    s.invocationId,
    s.claimPhase,
    s.exposurePhase,
    s.pendingCountClass,
    s.fingerprintBound,
    s.hasRejectedFp,
  ]);
}

/** The deterministic candidate id: sha256 over canonical(before)|action|
 *  canonical(after). A re-run that re-derives the same triple derives the same
 *  id and collides harmlessly under ON CONFLICT DO NOTHING. */
export function deriveCtiCandidateId(input: {
  readonly before: AbstractControlState;
  readonly action: AbstractAction;
  readonly after: AbstractControlState;
}): string {
  return createHash("sha256")
    .update(canonicalState(input.before))
    .update("|")
    .update(input.action)
    .update("|")
    .update(canonicalState(input.after))
    .digest("hex");
}

/**
 * PURE CORE. Given already-projected abstract states, return every candidate:
 * for each state that is NOT itself a violation, each one-step successor that
 * IS a violation. No I/O — used by both the DB job below and the offline
 * mutator, and directly unit-testable. States that are already violations are
 * skipped (the miner surfaces states ONE step from forbidden, not the
 * forbidden states themselves — those are Track B's `formal_incident`).
 */
export function mineCandidatesFromStates(
  states: readonly AbstractControlState[],
): readonly CtiCandidateRow[] {
  const out: CtiCandidateRow[] = [];
  for (const s of states) {
    if (isIndInvViolation(s)) continue;
    for (const { action, next } of abstractSuccessors(s)) {
      if (!isIndInvViolation(next)) continue;
      out.push({
        id: deriveCtiCandidateId({ before: s, action, after: next }),
        before: s,
        action,
        after: next,
      });
    }
  }
  return out;
}

// ─── DB write ───────────────────────────────────────────────────────────────

/** Same rule srqc-projection.ts / formal-receipt-job.ts use to map a raw
 *  ledger row to the minimal projectable shape. Local (the projection's own
 *  helper is private) but kept in sync deliberately. */
function toProjectable(row: ControlEventRow): ProjectableEvent {
  const rawPayload =
    row.payload !== null && typeof row.payload === "object"
      ? (row.payload as Record<string, unknown>)
      : {};
  const invocationId = rawPayload["invocationId"];
  const attemptId = rawPayload["attemptId"];
  const rejectedFingerprint = rawPayload["rejectedFingerprint"];
  return {
    eventType: row.eventType,
    source: row.source,
    sourceId: row.sourceId,
    payload: {
      ...rawPayload,
      ...(typeof invocationId === "string" ? { invocationId } : {}),
      ...(typeof attemptId === "string" ? { attemptId } : {}),
      ...(rejectedFingerprint === true ? { rejectedFingerprint: true } : {}),
    },
  };
}

/**
 * Append one `cti_candidate` row, idempotent on its deterministic id. A repeat
 * call with the same before+action+after is a pure no-op — the ONLY dedup
 * mechanism (no processed_event gate, no window key). Returns whether a NEW
 * row was written.
 */
export async function recordCtiCandidate(
  sql: ControlSqlClient,
  candidate: CtiCandidateRow,
): Promise<boolean> {
  const rows = await sql.query<{ id: string }>(
    `INSERT INTO "cti_candidate" ("id", "before", "action", "after", "status")
     VALUES ($1, $2::jsonb, $3, $4::jsonb, 'open')
     ON CONFLICT ("id") DO NOTHING
     RETURNING "id"`,
    [
      candidate.id,
      JSON.stringify(candidate.before),
      candidate.action,
      JSON.stringify(candidate.after),
    ],
  );
  return rows.length > 0;
}

export interface CtiMinerSummary {
  readonly windowSinceInclusive: string;
  readonly windowUntilExclusive: string;
  readonly eventsExamined: number;
  readonly statesProjected: number;
  /** Candidates found this pass (before dedup — a candidate seen twice in one
   *  window counts once here because it maps to one deterministic id). */
  readonly candidatesFound: number;
  /** Candidates that were NEWLY written this pass (not already present). */
  readonly candidatesWritten: number;
}

/**
 * Run one mining pass over `[sinceInclusive, untilExclusive)`. Reads the ledger
 * window, projects it, mines successor candidates, and writes each idempotently.
 * Pure with respect to everything except the `sql` read/writes. Never swallows
 * a `StoreUnavailable` from `readRecentEvents` — lets it propagate (fail-closed,
 * matching Track B's job).
 */
export async function runCtiMinerPass(
  sql: ControlSqlClient,
  input: { readonly sinceInclusive: Date; readonly untilExclusive: Date },
): Promise<CtiMinerSummary> {
  const rows = await readRecentEvents(sql, {
    sinceInclusive: input.sinceInclusive,
    untilExclusive: input.untilExclusive,
  });
  const states = projectWindow(rows.map(toProjectable));
  const candidates = mineCandidatesFromStates(states);

  // Distinct ids only — a window could in principle project two identical
  // states (different invocations coincide) and yield the same candidate id;
  // ON CONFLICT makes the second insert a no-op regardless, but de-duping here
  // keeps candidatesWritten honest.
  const seen = new Set<string>();
  let candidatesWritten = 0;
  for (const candidate of candidates) {
    if (seen.has(candidate.id)) continue;
    seen.add(candidate.id);
    if (await recordCtiCandidate(sql, candidate)) candidatesWritten += 1;
  }

  return {
    windowSinceInclusive: input.sinceInclusive.toISOString(),
    windowUntilExclusive: input.untilExclusive.toISOString(),
    eventsExamined: rows.length,
    statesProjected: states.length,
    candidatesFound: seen.size,
    candidatesWritten,
  };
}

/**
 * Default mining window: 26 hours — the SAME cadence rationale as Track B's
 * formal-receipt job (once-daily cron + 2h overlap buffer, overlap is cheap
 * because writes are idempotent on the deterministic candidate id).
 */
const DEFAULT_WINDOW_MS = 26 * 60 * 60 * 1000;

/**
 * Production entry point (mirrors `runFormalReceiptPassProduction`): builds the
 * fail-closed SQL seam from the real Prisma client and runs one pass over the
 * trailing window. Detection-only — writes only `cti_candidate` rows.
 */
export async function runCtiMinerPassProduction(
  options: { readonly windowMs?: number; readonly now?: () => Date } = {},
): Promise<CtiMinerSummary> {
  const [{ prismaSqlClient }, dbModule] = await Promise.all([
    import("./control-store"),
    import("@sports/db"),
  ]);
  const now = (options.now ?? ((): Date => new Date()))();
  const windowMs = options.windowMs ?? DEFAULT_WINDOW_MS;
  return runCtiMinerPass(prismaSqlClient(dbModule.db), {
    sinceInclusive: new Date(now.getTime() - windowMs),
    untilExclusive: now,
  });
}

// ─── Offline adversarial mutator (TEST / OFFLINE ONLY) ──────────────────────

/**
 * OFFLINE / TEST-ONLY adversarial mining. Given a raw window of projectable
 * events, generate perturbed orderings (reorderings and single-event
 * duplications) of that window, re-project EACH, and mine candidates from the
 * union — surfacing candidate counterexamples that a benign, in-order
 * projection would not reach. This is a pure, in-memory exploration harness for
 * spec-refinement research; it performs NO I/O, is NOT called by any production
 * path, and — like the rest of this module — NEVER edits a spec. It is exported
 * only so tests / offline tooling can drive it.
 *
 * `maxPerturbations` bounds the adjacent-swap + duplication perturbations so
 * the harness is total and cheap on any window.
 */
export function mineCandidatesFromWindowOffline(
  events: readonly ProjectableEvent[],
  options: { readonly maxPerturbations?: number } = {},
): readonly CtiCandidateRow[] {
  const maxPerturbations = options.maxPerturbations ?? 32;

  const windows: ProjectableEvent[][] = [events.slice()];
  // Adjacent swaps.
  for (let i = 0; i + 1 < events.length && windows.length < maxPerturbations; i++) {
    const swapped = events.slice();
    const a = swapped[i];
    const b = swapped[i + 1];
    if (a !== undefined && b !== undefined) {
      swapped[i] = b;
      swapped[i + 1] = a;
      windows.push(swapped);
    }
  }
  // Single-event duplications.
  for (let i = 0; i < events.length && windows.length < maxPerturbations; i++) {
    const dup = events.slice();
    const e = events[i];
    if (e !== undefined) {
      dup.splice(i, 0, e);
      windows.push(dup);
    }
  }

  const byId = new Map<string, CtiCandidateRow>();
  for (const w of windows) {
    for (const c of mineCandidatesFromStates(projectWindow(w))) {
      if (!byId.has(c.id)) byId.set(c.id, c);
    }
  }
  return [...byId.values()];
}
