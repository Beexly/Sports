import { describe, expect, it } from "vitest";
import { liftState, liftTrace, micDrop, minimizeCtiForLlm } from "../cti-lifting.js";
import type { State } from "../types.js";

describe("micDrop / liftState — safe-by-default (no oracle = no-op, cannot weaken a true CTI)", () => {
  it("micDrop with no oracle drops nothing", () => {
    const state: State = { a: 1, b: 2, c: 3 };
    expect(micDrop(state)).toEqual(state);
  });

  it("liftState with no oracle is a pure pass-through (regression test: no longer tags _lifted/_liftedAt)", () => {
    const state: State = { status: "HELD", reserved: 0 };
    const lifted = liftState(state);
    expect(lifted).toEqual(state);
    expect(lifted).not.toHaveProperty("_lifted");
    expect(lifted).not.toHaveProperty("_liftedAt");
  });

  it("minimizeCtiForLlm with no oracle returns the CTI unchanged", () => {
    const cti: State = { attempt: "t4", state: "HELD", reserved: 0 };
    expect(minimizeCtiForLlm(cti)).toEqual(cti);
  });
});

describe("micDrop — real oracle-driven generalization", () => {
  it("drops every field an always-true oracle allows", () => {
    const state: State = { a: 1, b: 2, c: 3 };
    expect(micDrop(state, () => true)).toEqual({});
  });

  it("keeps exactly the load-bearing field for a property depending on one variable", () => {
    // property: "a >= 5" — only `a` matters; b, c, d are debris.
    const state: State = { a: 5, b: 999, c: "noise", d: true };
    const isStillValid = (partial: Partial<State>) => typeof partial.a === "number" && partial.a >= 5;
    const lifted = micDrop(state, isStillValid, ["b", "c", "d", "a"]);
    expect(lifted).toEqual({ a: 5 });
  });

  it(
    "REAL CTI (this repo's credit-budget CTI #2, transcribed verbatim from " +
      "formal/credit-budget/INDUCTIVE_STRENGTHENING_LOG.md, branch labs/constellation-wave3-inductive): " +
      "drops the three debris attempt fields, keeps the load-bearing t4/reserved pair",
    () => {
      // State 1 (verbatim): state = (t1:>"Unstarted" @@ t2:>"Unstarted" @@
      // t3:>"Unstarted" @@ t4:>"HELD"), admittedCount=1, reserved=0. The
      // log's own diagnosis: "A phantom hold: t4 is HELD while reserved=0
      // ... the candidate has no predicate relating reserved to the
      // committed set" — t1/t2/t3 are explicitly named debris.
      const cti: State = {
        "state.t1": "Unstarted",
        "state.t2": "Unstarted",
        "state.t3": "Unstarted",
        "state.t4": "HELD",
        admittedCount: 1,
        reserved: 0,
      };
      // Oracle encodes the log's OWN documented diagnosis: the bug (Release
      // driving reserved negative) reproduces iff state.t4="HELD" and
      // reserved=0 are BOTH still pinned; t1/t2/t3 are irrelevant. Stands
      // in for a real relative-inductiveness re-check (apalache-client.ts)
      // in production — this test verifies the ALGORITHM given a
      // ground-truth oracle, not that it invents one from nothing.
      const reproduces = (partial: Partial<State>) =>
        "state.t4" in partial &&
        "reserved" in partial &&
        partial["state.t4"] === "HELD" &&
        partial["reserved"] === 0;
      const lifted = micDrop(cti, reproduces, [
        "state.t1",
        "state.t2",
        "state.t3",
        "admittedCount",
        "state.t4",
        "reserved",
      ]);
      expect(lifted).toEqual({ "state.t4": "HELD", reserved: 0 });
      expect(Object.keys(cti).length).toBe(6);
      expect(Object.keys(lifted).length).toBe(2); // genuine, measured reduction
    },
  );

  it("result is order-dependent when multiple locally-minimal cubes exist (documented caveat, demonstrated not just claimed)", () => {
    // property: "a present-and->=1 OR b present-and->=1"
    const state: State = { a: 1, b: 1 };
    const isStillValid = (partial: Partial<State>) => {
      const aOk = "a" in partial && typeof partial.a === "number" && partial.a >= 1;
      const bOk = "b" in partial && typeof partial.b === "number" && partial.b >= 1;
      return aOk || bOk;
    };
    const droppedAFirst = micDrop(state, isStillValid, ["a", "b"]);
    const droppedBFirst = micDrop(state, isStillValid, ["b", "a"]);
    expect(droppedAFirst).toEqual({ b: 1 });
    expect(droppedBFirst).toEqual({ a: 1 });
    expect(droppedAFirst).not.toEqual(droppedBFirst);
  });
});

describe("liftTrace", () => {
  it("with no oracle, every state in the trace passes through unchanged", () => {
    const states: State[] = [{ x: 1, noise: "a" }, { x: 2, noise: "b" }];
    expect(liftTrace(states)).toEqual(states);
  });

  it("with a per-index oracle, drops debris at every step", () => {
    const states: State[] = [{ x: 1, noise: "a" }, { x: 2, noise: "b" }];
    const isStillValid = (_i: number, partial: Partial<State>) => !("noise" in partial);
    const lifted = liftTrace(states, isStillValid);
    expect(lifted).toEqual([{ x: 1 }, { x: 2 }]);
  });
});
