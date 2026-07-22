/**
 * ============================================================================
 * DORMANT / LAB-ONLY — Wave 3 batch (Decision-A-independent pieces).
 * NOT wired into production. Pure, deterministic, no side effects, no I/O.
 * ============================================================================
 *
 * Event projection + ConstInit emitter.
 *
 *  - `projectWindow`  : pure function projecting a window of REAL observed
 *    control-plane records (events.ts, mirroring contracts.ts AiAttemptSummary
 *    + credit-admission.ts reservation records) into the abstract state shape
 *    of `formal/live-sports/LiveModelDispatchUnderAmbiguity.tla` (abstract-state.ts).
 *
 *  - `emitConstInit` : pure function rendering a projected AbstractState as a
 *    TLA+ ConstInit-style CONSTANTS + `ConstInit` fragment (a string) suitable
 *    for feeding a bounded model-check of the observed state against that
 *    spec's invariants. Observed ids are renamed to stable symbolic TLA+ model
 *    values (inv1.., att1.., act1.., fp1..) with a legend, so the output is
 *    always valid TLA+ regardless of what the real ids look like.
 *
 * Both are deterministic: same input -> byte-identical output.
 */

import {
  AbstractState,
  AttemptOutcome,
  InvocationStatus,
  NO_FP,
  NO_INV,
  NO_OWNER,
  ReleaseReason,
  ReservationState,
} from "./abstract-state.js";
import {
  ObservedAttempt,
  ObservedAttemptStatus,
  ObservedReservationState,
  ObservedWindow,
} from "./events.js";

// --------------------------------------------------------------------------
// Mapping tables (single source of truth for the real->abstract correspondence)
// --------------------------------------------------------------------------

/** AiAttemptSummary.status -> spec attemptOutcome. TIMEOUT and AMBIGUOUS both
 * map to the spec's "Ambiguous" (unknown provider-side charge state). */
function outcomeOf(status: ObservedAttemptStatus): AttemptOutcome {
  switch (status) {
    case "DISPATCHED":
      return "Pending";
    case "SUCCEEDED":
      return "Succeeded";
    case "FAILED":
      return "Failed";
    case "TIMEOUT":
    case "AMBIGUOUS":
      return "Ambiguous";
  }
}

/** credit reservation record state -> spec CreditReservation `state`. */
function reservationStateOf(
  s: ObservedReservationState | undefined,
): ReservationState {
  switch (s) {
    case undefined:
      return "Unstarted";
    case "HELD":
      return "HELD";
    case "PROVISIONALLY_SETTLED":
    case "RECONCILED":
      return "SETTLED";
    case "RELEASED":
      return "RELEASED";
    case "REFUSED":
      return "REFUSED";
  }
}

// --------------------------------------------------------------------------
// Projection
// --------------------------------------------------------------------------

const HELD_OR_SETTLED: ReadonlySet<ReservationState> = new Set([
  "HELD",
  "SETTLED",
]);
const EVER_ADMITTED: ReadonlySet<ReservationState> = new Set([
  "HELD",
  "SETTLED",
  "RELEASED",
]);

function sortedUnique(values: Iterable<string>): string[] {
  return [...new Set(values)].sort();
}

/**
 * Project a window of observed records into ONE composed abstract snapshot in
 * the spec's variables. Faithful to the real ids (the emitter handles TLA+
 * renaming). Deterministic: all record keys and universe sets are sorted.
 */
export function projectWindow(window: ObservedWindow): AbstractState {
  const claimOwner: Record<string, string> = {};
  const invocationFp: Record<string, string> = {};
  const invocationStatus: Record<string, InvocationStatus> = {};
  const dispatched: Record<string, boolean> = {};
  const attemptOf: Record<string, string> = {};
  const attemptOutcome: Record<string, AttemptOutcome> = {};
  const state: Record<string, ReservationState> = {};
  const releaseReason: Record<string, ReleaseReason> = {};
  const releaseBy: Record<string, string> = {};
  const rejectedPairs: Array<readonly [string, string]> = [];

  const actorSet = new Set<string>(window.trustedActors);
  const fingerprintSet = new Set<string>();

  let reserved = 0;
  let admittedCount = 0;

  // Sort invocations by id for deterministic accumulation order.
  const invocations = [...window.invocations].sort((a, b) =>
    a.invocationId < b.invocationId ? -1 : a.invocationId > b.invocationId ? 1 : 0,
  );

  for (const inv of invocations) {
    const id = inv.invocationId;
    claimOwner[id] = inv.owner ?? NO_OWNER;
    if (inv.owner) actorSet.add(inv.owner);

    const fp = inv.requestFingerprint;
    invocationFp[id] = fp === "" ? NO_FP : fp;
    if (fp !== "") fingerprintSet.add(fp);

    // rejectedRequests: <<inv, fp>> for each conflicting fingerprint seen.
    for (const rfp of sortedUnique(inv.rejectedFingerprints ?? [])) {
      rejectedPairs.push([id, rfp]);
      if (rfp !== "") fingerprintSet.add(rfp);
    }

    // Derive invocationStatus from the attempt outcomes, matching Resolve:
    // any Ambiguous freezes -> "Ambiguous"; else any Succeeded -> "Terminal";
    // otherwise still "Open".
    let anyAmbiguous = false;
    let anySucceeded = false;

    // Sort attempts by id for deterministic accumulation.
    const attempts = [...inv.attempts].sort((a, b) =>
      a.attemptId < b.attemptId ? -1 : a.attemptId > b.attemptId ? 1 : 0,
    );

    for (const att of attempts) {
      const aid = att.attemptId;
      const outcome = outcomeOf(att.status);
      attemptOutcome[aid] = outcome;
      attemptOf[aid] = id;
      // "has this attempt EVER triggered a real external dispatch": providerUsed
      // is null until transport actually dispatched (contracts.ts §B.2).
      dispatched[aid] = att.providerUsed !== null;

      const rs = reservationStateOf(att.reservationState);
      state[aid] = rs;

      const hold = att.heldMinorUnits ?? window.requestCostMinorUnits;
      if (HELD_OR_SETTLED.has(rs)) reserved += hold;
      if (EVER_ADMITTED.has(rs)) admittedCount += 1;

      // releaseReason / releaseBy: prefer an explicit trusted-actor signal;
      // otherwise infer a clean-failure release from a Failed+RELEASED attempt.
      if (att.releasedByActor) {
        releaseReason[aid] = "TrustedAmbiguousResolution";
        releaseBy[aid] = att.releasedByActor;
        actorSet.add(att.releasedByActor);
      } else if (rs === "RELEASED" && outcome === "Failed") {
        releaseReason[aid] = "CleanFailure";
        releaseBy[aid] = NO_OWNER;
      } else {
        releaseReason[aid] = "NotReleased";
        releaseBy[aid] = NO_OWNER;
      }

      if (outcome === "Ambiguous") anyAmbiguous = true;
      if (outcome === "Succeeded") anySucceeded = true;
    }

    invocationStatus[id] = anyAmbiguous
      ? "Ambiguous"
      : anySucceeded
        ? "Terminal"
        : "Open";
  }

  // Deterministic universe sets.
  const invocationIds = sortedUnique(invocations.map((i) => i.invocationId));
  const attemptIds = sortedUnique(Object.keys(attemptOf));
  const actors = [...actorSet].sort();
  const fingerprints = [...fingerprintSet].sort();

  // rejectedRequests sorted for determinism.
  const rejectedRequests = [...rejectedPairs].sort((a, b) =>
    a[0] !== b[0] ? (a[0] < b[0] ? -1 : 1) : a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0,
  );

  return {
    claimOwner,
    invocationFp,
    dispatched,
    attemptOf,
    attemptOutcome,
    invocationStatus,
    rejectedRequests,
    reserved,
    state,
    admittedCount,
    releaseReason,
    releaseBy,
    verifiedBalance: window.verifiedBalanceMinorUnits,
    requestCost: window.requestCostMinorUnits,
    trustedActors: [...window.trustedActors].sort(),
    invocations: invocationIds,
    attempts: attemptIds,
    fingerprints,
    actors,
  };
}

// --------------------------------------------------------------------------
// ConstInit emitter
// --------------------------------------------------------------------------

/** Assign stable symbolic TLA+ model-value names to sorted real ids. */
function symbolicNames(prefix: string, ids: readonly string[]): Map<string, string> {
  const m = new Map<string, string>();
  ids.forEach((id, i) => m.set(id, `${prefix}${i + 1}`));
  return m;
}

/** Render a TLA+ set literal `{a, b}` (or `{}`). */
function tlaSet(members: readonly string[]): string {
  return members.length === 0 ? "{}" : `{${members.join(", ")}}`;
}

/**
 * Render a TLA+ function literal over `domain`. Each observed domain key is
 * rendered through `keyFn` (to its symbolic model value) and each value through
 * `valueFn`. Empty domain -> `[ x \in {} |-> FALSE ]` (a valid empty function).
 */
function tlaFunction(
  domain: readonly string[],
  keyFn: (key: string) => string,
  valueFn: (key: string) => string,
): string {
  if (domain.length === 0) return "[ x \\in {} |-> FALSE ]";
  return `(${domain.map((k) => `${keyFn(k)} :> ${valueFn(k)}`).join(" @@ ")})`;
}

/**
 * Emit a deterministic TLA+ ConstInit-style fragment (CONSTANTS + `ConstInit`)
 * for the projected state, valid for a bounded TLC check against
 * LiveModelDispatchUnderAmbiguity.tla's invariants.
 */
export function emitConstInit(s: AbstractState): string {
  const invName = symbolicNames("inv", s.invocations);
  const attName = symbolicNames("att", s.attempts);
  const actName = symbolicNames("act", s.actors);
  const fpName = symbolicNames("fp", s.fingerprints);

  // Resolve an observed id to its symbolic model value, keeping sentinels as
  // the STRING sentinels the spec uses (IC!NoOwner == "NoOwner", etc.).
  const inv = (id: string): string =>
    id === NO_INV ? `"${NO_INV}"` : (invName.get(id) ?? `"${id}"`);
  const act = (id: string): string =>
    id === NO_OWNER ? `"${NO_OWNER}"` : (actName.get(id) ?? `"${id}"`);
  const fp = (id: string): string =>
    id === NO_FP ? `"${NO_FP}"` : (fpName.get(id) ?? `"${id}"`);
  // Domain keys are always real ids present in the universe, so they always
  // have a symbolic model value (no sentinel fallback needed).
  const invKey = (id: string): string => invName.get(id) ?? `"${id}"`;
  const attKey = (id: string): string => attName.get(id) ?? `"${id}"`;

  const lines: string[] = [];
  lines.push(
    "\\* ============================================================",
    "\\* AUTO-GENERATED ConstInit projection - DO NOT EDIT BY HAND.",
    "\\* Projected from observed AI-control-plane records by",
    "\\* formal-heartbeat/src/projection.ts (dormant / lab-only).",
    "\\* Feed to TLC as a ConstInit / state override to check the",
    "\\* observed composed state against the invariants of",
    "\\* LiveModelDispatchUnderAmbiguity.tla.",
    "\\* ============================================================",
    "\\* LEGEND (symbolic model value -> observed id):",
  );
  for (const [id, sym] of invName) lines.push(`\\*   ${sym} -> "${id}"`);
  for (const [id, sym] of attName) lines.push(`\\*   ${sym} -> "${id}"`);
  for (const [id, sym] of actName) lines.push(`\\*   ${sym} -> "${id}"`);
  for (const [id, sym] of fpName) lines.push(`\\*   ${sym} -> "${id}"`);

  lines.push(
    "CONSTANTS",
    `  Invocations = ${tlaSet([...invName.values()])}`,
    `  Attempts = ${tlaSet([...attName.values()])}`,
    `  Fingerprints = ${tlaSet([...fpName.values()])}`,
    `  Actors = ${tlaSet([...actName.values()])}`,
    `  TrustedActors = ${tlaSet(s.trustedActors.map((a) => act(a)))}`,
    `  VerifiedBalance = ${s.verifiedBalance}`,
    `  RequestCost = ${s.requestCost}`,
    "",
    "ConstInit ==",
    `  /\\ claimOwner = ${tlaFunction(s.invocations, invKey, (i) => act(s.claimOwner[i] ?? NO_OWNER))}`,
    `  /\\ invocationFp = ${tlaFunction(s.invocations, invKey, (i) => fp(s.invocationFp[i] ?? NO_FP))}`,
    `  /\\ dispatched = ${tlaFunction(s.attempts, attKey, (a) => (s.dispatched[a] ? "TRUE" : "FALSE"))}`,
    `  /\\ attemptOf = ${tlaFunction(s.attempts, attKey, (a) => inv(s.attemptOf[a] ?? NO_INV))}`,
    `  /\\ attemptOutcome = ${tlaFunction(s.attempts, attKey, (a) => `"${s.attemptOutcome[a] ?? "Pending"}"`)}`,
    `  /\\ invocationStatus = ${tlaFunction(s.invocations, invKey, (i) => `"${s.invocationStatus[i] ?? "Open"}"`)}`,
    `  /\\ rejectedRequests = ${s.rejectedRequests.length === 0 ? "{}" : `{${s.rejectedRequests.map(([i, f]) => `<<${inv(i)}, ${fp(f)}>>`).join(", ")}}`}`,
    `  /\\ reserved = ${s.reserved}`,
    `  /\\ state = ${tlaFunction(s.attempts, attKey, (a) => `"${s.state[a] ?? "Unstarted"}"`)}`,
    `  /\\ admittedCount = ${s.admittedCount}`,
    `  /\\ releaseReason = ${tlaFunction(s.attempts, attKey, (a) => `"${s.releaseReason[a] ?? "NotReleased"}"`)}`,
    `  /\\ releaseBy = ${tlaFunction(s.attempts, attKey, (a) => act(s.releaseBy[a] ?? NO_OWNER))}`,
  );

  return lines.join("\n") + "\n";
}
