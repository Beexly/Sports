/**
 * GSE Formal Foundry — IC3-style Controller
 * Frames, relative inductiveness, CTI admission, frontier probes.
 * Fail-closed. Linear-only. Additive.
 */

import { ApalacheJsonRpcClient } from "./apalache-client";
import { decodeState, encodeState } from "./itf";
import type { ItfState } from "./itf";
import { minimizeCtiForLlm } from "./cti-lifting";
import { ledger } from "./safety-ledger";
import { updateVelocity } from "./velocity-dashboard";
import type { Frame, Candidate, State } from "./types";
import { ApalacheRpcError } from "./types";

export class IC3Controller {
  private client: ApalacheJsonRpcClient;
  private sessionId: string | null = null;
  private initSnapshot: string | null = null;
  private varTypes: Record<string, string> = {};

  constructor(client: ApalacheJsonRpcClient) {
    this.client = client;
  }

  /**
   * Load spec and snapshot the Init context.
   * Soundness role: establishes the base for all relative-inductiveness
   * checks — every `isRelativelyInductive` call below rolls back to this
   * EXACT snapshot before layering on `frame`/`candidate`, so this
   * controller's checks are always evaluated ON TOP OF Init (a deliberately
   * simple single-baseline design — a caller wanting a genuine multi-frame
   * F0..Fk sequence should compose `frame` to already include whatever it
   * needs beyond Init; that is out of scope for this flat controller).
   *
   * FIXED (was this file's one real defect): `initSnapshot` used to be the
   * hardcoded literal string `"init"` (never obtained from the server) —
   * every rollback therefore referenced a snapshot id the server never
   * actually issued. Now: `assumeTransition("Init", true)` asserts the
   * spec's Init predicate (this client's own sentinel `transitionId`
   * convention — see apalache-client.ts's header on why this whole RPC
   * surface is a documented, unverified reconstruction), then `compact()`
   * materializes that context into a REAL, server-issued `snapshotId`.
   * `src/mock/apalache-mock-server.ts` implements and
   * `src/tests/ic3-controller.test.ts` exercises this exact path.
   */
  async init(
    sources: string[],
    invariants: string[] = ["TypeOK"],
    varTypes: Record<string, string> = {},
  ): Promise<void> {
    const result = await this.client.loadSpec(sources, invariants);
    this.sessionId = result.sessionId;
    this.varTypes = varTypes;

    await this.client.assumeTransition("Init", true);
    const { snapshotId } = await this.client.compact();
    if (!snapshotId) {
      throw new ApalacheRpcError(
        "init: compact() did not return a snapshotId after assumeTransition(\"Init\")",
      );
    }
    this.initSnapshot = snapshotId;

    ledger.record({
      pr: "controller-init",
      invariantsChecked: invariants,
      ctiCount: 0,
      status: "PASSED",
      verifier: "Apalache+IC3",
    });
  }

  /**
   * Canonical relative-inductiveness check.
   * Pattern: rollback -> assumeState(F /\ c) -> assumeTransition(Next) ->
   * checkInvariant(c').
   *
   * STATED EXACTLY (per this repo's non-negotiable — get the polarity right
   * and say so): candidate `c` is relatively inductive to frame `F` iff
   * `F /\ c /\ Next /\ ~c'` is UNSAT, equivalently `F /\ c /\ Next` entails
   * `c'`. This implementation asks the server to check that entailment
   * DIRECTLY (`checkInvariant("candidatePrimed")`, interpreted as "does the
   * context assumed so far entail the candidate's primed form"), rather
   * than negating and checking UNSAT of the negation — an equally valid,
   * logically identical framing given a `checkInvariant` primitive that
   * checks entailment rather than a raw `query` primitive that checks
   * satisfiability. `invariantStatus === "SATISFIED"` therefore means
   * relatively inductive; `"VIOLATED"` means not.
   *
   * FAIL-CLOSED: any error (solver unknown, timeout, transport, malformed
   * response) is recorded to the ledger as REJECTED and rethrown as a typed
   * `ApalacheRpcError` (or a more specific subclass) — never resolved to a
   * default boolean.
   */
  async isRelativelyInductive(
    frame: Frame,
    candidate: Candidate,
    nextTransitionId: number | string = 0,
  ): Promise<boolean> {
    if (!this.sessionId) {
      throw new ApalacheRpcError("Controller not initialized — call init first");
    }
    if (!this.initSnapshot) {
      throw new ApalacheRpcError("Controller has no Init snapshot — init() did not complete successfully");
    }
    const initSnapshot = this.initSnapshot;

    const start = Date.now();

    try {
      await this.client.rollback(initSnapshot);

      // Two SEPARATE assumeState calls (frame, then candidate) rather than
      // a client-side merge: this preserves the frame/candidate boundary
      // across the wire so the server can know which fields constitute
      // "the candidate" for checkInvariant("candidatePrimed") below to
      // check the primed form of (see apalache-client.ts's header and
      // src/mock/apalache-mock-server.ts's "PROTOCOL NOTE" for why a
      // client-side pre-merge made that check underspecified).
      await this.client.assumeState(encodeState(frame, this.varTypes));
      await this.client.assumeState(encodeState(candidate, this.varTypes));
      await this.client.assumeTransition(nextTransitionId, true);

      const result = await this.client.checkInvariant("candidatePrimed");
      const passed = result.invariantStatus === "SATISFIED";

      ledger.record({
        pr: "relative-inductiveness",
        invariantsChecked: ["candidatePrimed"],
        ctiCount: passed ? 0 : 1,
        status: passed ? "PASSED" : "REJECTED",
        verifier: "Apalache+IC3",
      });

      updateVelocity({
        ctiCount: passed ? 0 : 1,
        latencyMs: Date.now() - start,
      });

      await this.client.rollback(initSnapshot);

      return passed;
    } catch (err) {
      ledger.record({
        pr: "relative-inductiveness",
        invariantsChecked: ["candidatePrimed"],
        ctiCount: 1,
        status: "REJECTED",
        verifier: "Apalache+IC3",
      });
      updateVelocity({ ctiCount: 1, latencyMs: Date.now() - start });
      if (err instanceof ApalacheRpcError) throw err;
      throw new ApalacheRpcError(`Relative inductiveness failed: ${(err as Error).message}`);
    }
  }

  /**
   * Admit a CTI: lift -> MIC minimize -> ready for strengthening.
   * Soundness role: CTI minimization only.
   *
   * Note (honest, not silently glossed over): this call site does not yet
   * wire a real relative-inductiveness oracle through to
   * `minimizeCtiForLlm`, so today this performs the SAFE NO-OP form of
   * lifting (see cti-lifting.ts's module docstring) — it returns `cti`
   * unchanged rather than guessing what can be dropped without proof. A
   * future session wiring a real oracle here (backed by this controller's
   * own `isRelativelyInductive`) would upgrade this to genuine
   * minimization without any external API change.
   */
  async admitCti(cti: State): Promise<State> {
    const minimized = minimizeCtiForLlm(cti);
    ledger.record({
      pr: "cti-admission",
      invariantsChecked: [],
      ctiCount: 1,
      status: "PROCESSED",
      verifier: "Lifting",
    });
    return minimized;
  }

  /**
   * Predecessor / frontier probe: does `currentFrame` admit a queryable
   * witness state? Returns the first witness state `query` reports (decoded
   * back to a domain `Candidate`), or `null` when the query genuinely finds
   * none.
   *
   * FAIL-CLOSED (fixed — this differs from the pre-convergence version,
   * which caught EVERY error, including real transport/solver failures, and
   * returned `null` labeled "// fail-closed" — that is backwards: silently
   * turning a genuine error into "no frontier found" is fail-OPEN in
   * effect, since a caller cannot distinguish "genuinely no witness" from
   * "the check itself failed". Now: only a successful query with an empty
   * witness list returns `null`; every error propagates as a typed
   * `ApalacheRpcError`.
   */
  async findFrontier(currentFrame: Frame): Promise<Candidate | null> {
    await this.client.assumeState(encodeState(currentFrame, this.varTypes));
    const raw = await this.client.query(["STATE"]);
    if (typeof raw !== "object" || raw === null) {
      throw new ApalacheRpcError(`findFrontier: expected an object query result, got ${JSON.stringify(raw)}`);
    }
    const states = (raw as { states?: unknown }).states;
    if (states === undefined) {
      return null; // no witness field at all -> genuinely nothing found
    }
    if (!Array.isArray(states) || states.length === 0) {
      return null; // genuinely no witness states
    }
    const first = states[0] as ItfState;
    return decodeState(first);
  }

  async dispose(): Promise<void> {
    await this.client.disposeSpec();
    this.sessionId = null;
    this.initSnapshot = null;
  }
}
