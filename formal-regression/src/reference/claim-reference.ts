/**
 * REFERENCE / TEST-DOUBLE IMPLEMENTATION — NOT production code.
 *
 * A small, self-contained in-memory reimplementation of the claim/dispatch
 * semantics formalized in W2-02's `InvocationClaim.tla`
 * (AtMostOneClaimOwner, AtMostOneExternalDispatchPerAttempt,
 * SameIdDifferentFingerprintNeverExecutes, AmbiguousAttemptStopsFallback).
 * This exists ONLY as a second, independent oracle to run the exact same
 * property tests against — it is deliberately much smaller than the real
 * `control-store.ts` (no lease expiry, no fenced steal, no BLOCKED
 * reclaim). The primary subject under test in this harness is the REAL,
 * unmodified `control-store.ts` (see `../adapters/in-memory-control-sql.ts`
 * + `../tests/invocation-claim.real.property.test.ts`); this reference
 * model is a cross-check, not a replacement.
 */

export type Outcome = "Pending" | "Succeeded" | "Failed" | "Ambiguous";
export type InvocationStatus = "Open" | "Ambiguous" | "Terminal";

interface Invocation {
  owner: string | null;
  fingerprint: string | null;
  status: InvocationStatus;
}

interface Attempt {
  invocationId: string | null;
  dispatched: boolean;
  outcome: Outcome;
}

export class ReferenceClaimStore {
  private readonly invocations = new Map<string, Invocation>();
  private readonly attempts = new Map<string, Attempt>();
  readonly rejectedRequests = new Set<string>(); // `${invId}#${fp}`

  private inv(id: string): Invocation {
    let row = this.invocations.get(id);
    if (!row) {
      row = { owner: null, fingerprint: null, status: "Open" };
      this.invocations.set(id, row);
    }
    return row;
  }

  /** Mirrors ClaimOwner(actor, inv, fp). Synchronous: models one atomic DB round trip. */
  claim(actor: string, invocationId: string, fingerprint: string): "claimed" | "conflict" | "in-progress" {
    const row = this.inv(invocationId);
    if (row.status !== "Open") return "in-progress";
    if (row.owner !== null) return "in-progress";
    if (row.fingerprint === null) {
      row.fingerprint = fingerprint;
      row.owner = actor;
      return "claimed";
    }
    if (row.fingerprint === fingerprint) {
      row.owner = actor;
      return "claimed";
    }
    this.rejectedRequests.add(`${invocationId}#${fingerprint}`);
    return "conflict";
  }

  release(actor: string, invocationId: string): void {
    const row = this.inv(invocationId);
    if (row.owner === actor && row.status === "Open") row.owner = null;
  }

  /** Mirrors Dispatch(actor, inv, att): at most once per attempt id, ever. */
  dispatch(actor: string, invocationId: string, attemptId: string): boolean {
    const row = this.inv(invocationId);
    if (row.owner !== actor || row.status !== "Open") return false;
    let att = this.attempts.get(attemptId);
    if (att && (att.dispatched || att.invocationId !== null)) return false; // already used
    for (const other of this.attempts.values()) {
      if (other.invocationId === invocationId && other.outcome === "Pending") return false;
    }
    att = { invocationId, dispatched: true, outcome: "Pending" };
    this.attempts.set(attemptId, att);
    return true;
  }

  resolve(attemptId: string, outcome: Exclude<Outcome, "Pending">): void {
    const att = this.attempts.get(attemptId);
    if (!att || att.outcome !== "Pending") return;
    att.outcome = outcome;
    if (att.invocationId === null) return;
    const inv = this.inv(att.invocationId);
    inv.status = outcome === "Ambiguous" ? "Ambiguous" : outcome === "Succeeded" ? "Terminal" : "Open";
  }

  wasEverDispatched(attemptId: string): boolean {
    return this.attempts.get(attemptId)?.dispatched ?? false;
  }

  owner(invocationId: string): string | null {
    return this.invocations.get(invocationId)?.owner ?? null;
  }

  status(invocationId: string): InvocationStatus {
    return this.inv(invocationId).status;
  }
}
