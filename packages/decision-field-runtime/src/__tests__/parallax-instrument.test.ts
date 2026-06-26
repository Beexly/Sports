/**
 * PROJECT PARALLAX — adversarial proof of the reality instrument (Pass 8).
 *
 * Each test is an attack the instrument must survive. These are the behaviours that let a skeptic say
 * "I can see exactly why it is not pretending": point-in-time honesty, conservation, valid intervention,
 * fail-closed authority, deterministic replay, and learning that never moves on a single outcome.
 */

import { describe, it, expect } from "vitest";
import {
  lightCone,
  observerArena,
  disagreement,
  redistribute,
  shareTotal,
  conservationResidual,
  forkWR1Availability,
  wr2Boundary,
  wr2Read,
  buildDecisionObject,
  creditVerdict,
  PARALLAX_FIXTURE,
  FIXTURE_AUTHORITY,
  type PFact,
} from "../parallax-instrument.js";

const FACTS = PARALLAX_FIXTURE.facts;
const BELIEFS = PARALLAX_FIXTURE.beliefs;
const Q = PARALLAX_FIXTURE.quantity;

describe("Time model — point-in-time knowability (A2)", () => {
  it("the light cone excludes future facts at every tick", () => {
    expect(lightCone(FACTS, 0).map((f) => f.id)).toEqual([]); // nothing knowable Monday
    expect(lightCone(FACTS, 1).map((f) => f.id).sort()).toEqual(["f1", "f4"]); // Wed: practice + route rate
    expect(lightCone(FACTS, 2).map((f) => f.id)).toContain("f2"); // Fri: designation appears
    expect(lightCone(FACTS, 3).map((f) => f.id)).toContain("f3"); // Sun: inactive appears
    expect(lightCone(FACTS, 1).some((f) => f.id === "f3")).toBe(false); // the Sunday inactive is NOT knowable Wed
  });

  it("a future fact cannot change an earlier decision — the Wed object is invariant to Sunday facts", () => {
    const wed = buildDecisionObject({ id: "d", at: 1, facts: FACTS, beliefs: BELIEFS, quantity: Q, authority: FIXTURE_AUTHORITY });
    const wedWithFutureFactInjected = buildDecisionObject({
      id: "d",
      at: 1,
      // inject an extra Sunday fact; it must not enter the Wed light cone
      facts: [...FACTS, { id: "f9", subject: "WR1", kind: "inactive", value: true, observedAt: 3, source: "x", rights: "PUBLIC" } as PFact],
      beliefs: BELIEFS,
      quantity: Q,
      authority: FIXTURE_AUTHORITY,
    });
    expect(wed.replayDigest).toBe(wedWithFutureFactInjected.replayDigest);
    expect(wed.state).toBe(wedWithFutureFactInjected.state);
  });
});

describe("Observer model — disagreement is surfaced, never averaged (A3)", () => {
  it("the arena reflects only beliefs knowable at T", () => {
    expect(observerArena(BELIEFS, Q, 0).map((b) => b.observer).sort()).toEqual(["BOOK", "CROWD", "FANTASY"]); // GSE arrives Fri
    expect(observerArena(BELIEFS, Q, 2).map((b) => b.observer)).toContain("GSE");
  });
  it("disagreement is a real spread, not a collapsed mean", () => {
    const arena = observerArena(BELIEFS, Q, 2);
    expect(disagreement(arena)).toBeCloseTo(56 - 44, 5); // GSE 56 vs CROWD 44
  });
});

describe("Counterfactual — valid intervention + conservation (A3)", () => {
  it("forking WR1 out conserves total target share to machine precision", () => {
    const f = forkWR1Availability(0, lightCone(FACTS, 3));
    expect(f.ok).toBe(true);
    if (!f.ok) return;
    expect(f.conservationResidual).toBeLessThan(1e-9);
    expect(shareTotal(f.shareAfter)).toBeCloseTo(shareTotal(f.shareBefore), 9);
    expect(f.teamPassAttempts.before).toBe(f.teamPassAttempts.after); // team attempts conserved
  });

  it("redistribute is a pure conservation operation", () => {
    const base = { A: 0.5, B: 0.3, C: 0.2 };
    const after = redistribute(base, "A", { B: 0.6, C: 0.4 });
    expect(conservationResidual(base, after)).toBeLessThan(1e-9);
    expect(after.A).toBe(0);
  });

  it("every counterfactual reports its changed assumptions", () => {
    const f = forkWR1Availability(0, lightCone(FACTS, 3));
    expect(f.ok).toBe(true);
    if (f.ok) expect(f.changedAssumptions.length).toBeGreaterThanOrEqual(2);
  });

  it("propagated outputs carry an interval, never a bare point", () => {
    const f = forkWR1Availability(0, lightCone(FACTS, 3));
    if (f.ok) {
      expect(f.projection.interval[0]).toBeLessThan(f.projection.point);
      expect(f.projection.interval[1]).toBeGreaterThan(f.projection.point);
    }
  });
});

describe("Refusal — missing facts and invalid interventions are refused, not faked (A2/A3)", () => {
  it("cannot fork WR1-out before the status is knowable (no silent imputation)", () => {
    const f = forkWR1Availability(0, lightCone(FACTS, 1)); // Wed: only practice LP, no designation/inactive
    expect(f.ok).toBe(false);
    if (!f.ok) expect(f.reason).toBe("MISSING_REQUIRED_FACT");
  });

  it("the Wed object refuses the fork and lands in NEEDS_LIVE_DATA", () => {
    const wed = buildDecisionObject({ id: "d", at: 1, facts: FACTS, beliefs: BELIEFS, quantity: Q, authority: FIXTURE_AUTHORITY, intervention: { kind: "PLAYER_OUT", subject: "WR1", snapProbability: 0 } });
    expect(wed.refusal?.refused).toBe(true);
    expect(wed.state).toBe("NEEDS_LIVE_DATA");
  });

  it("conditioning on a realized outcome is rejected as an invalid intervention", () => {
    const obj = buildDecisionObject({ id: "d", at: 3, facts: FACTS, beliefs: BELIEFS, quantity: Q, authority: FIXTURE_AUTHORITY, intervention: { kind: "INVALID_CONDITION_ON_OUTCOME", subject: "WR2" } });
    expect(obj.refusal?.refused).toBe(true);
    expect(obj.state).toBe("DATA_CONFLICT");
  });

  it("an out-of-range snap probability is rejected", () => {
    const f = forkWR1Availability(1.5, lightCone(FACTS, 3));
    expect(f.ok).toBe(false);
    if (!f.ok) expect(f.reason).toBe("INVALID_INTERVENTION");
  });
});

describe("Authority — fixture mode can never reach action/public (A1/A4)", () => {
  it("on FIXTURE data the claim is capped at INFO_ONLY and SOURCE_REALITY is binding", () => {
    const obj = buildDecisionObject({ id: "d", at: 3, facts: FACTS, beliefs: BELIEFS, quantity: Q, authority: FIXTURE_AUTHORITY, intervention: { kind: "PLAYER_OUT", subject: "WR1", snapProbability: 0 }, desiredStrength: "PUBLIC_ACTION" });
    expect(obj.authority.ceiling).toBe("INFO_ONLY");
    expect(obj.claimStrength).toBe("INFO_ONLY"); // desired PUBLIC_ACTION met with the meet
    expect(obj.bindingLayers).toContain("SOURCE_REALITY");
  });

  it("the fork moves the OBSERVED read but never the permitted strength", () => {
    const out = buildDecisionObject({ id: "d", at: 3, facts: FACTS, beliefs: BELIEFS, quantity: Q, authority: FIXTURE_AUTHORITY, intervention: { kind: "PLAYER_OUT", subject: "WR1", snapProbability: 0 } });
    expect(out.state).toBe("ROLE_UP_FANTASY_LATE"); // observation changed (WR1 fully out → WR2 role up)
    expect(out.claimStrength).toBe("INFO_ONLY"); // expression did NOT
  });
});

describe("Decision boundary — the action flips at a knowable x* (the Possibility Surface)", () => {
  it("WR2's read is PASS when WR1 plays and flips as WR1's snap probability drops", () => {
    const cone = lightCone(FACTS, 3);
    const baseline = forkWR1Availability(1, cone);
    expect(baseline.ok).toBe(true);
    if (baseline.ok) expect(wr2Read(baseline.projection.point)).toBe("PASS");
    const b = wr2Boundary(cone);
    expect(b.fromRead).toBe("PASS");
    expect(b.flipsAt).not.toBeNull();
    expect(b.flipsAt!).toBeGreaterThan(0);
    expect(b.flipsAt!).toBeLessThan(1);
    expect(b.toRead).not.toBe("PASS");
  });
});

describe("Replay + lifecycle — deterministic, autopsy-hooked (§4/§7)", () => {
  it("the same inputs yield the same Decision Object (deterministic replay digest)", () => {
    const a = buildDecisionObject({ id: "d", at: 3, facts: FACTS, beliefs: BELIEFS, quantity: Q, authority: FIXTURE_AUTHORITY, intervention: { kind: "PLAYER_OUT", subject: "WR1", snapProbability: 0 } });
    const b = buildDecisionObject({ id: "d", at: 3, facts: FACTS, beliefs: BELIEFS, quantity: Q, authority: FIXTURE_AUTHORITY, intervention: { kind: "PLAYER_OUT", subject: "WR1", snapProbability: 0 } });
    expect(a.replayDigest).toBe(b.replayDigest);
  });
  it("every Decision Object carries an autopsy hook (no decision skips the lifecycle)", () => {
    const obj = buildDecisionObject({ id: "d", at: 3, facts: FACTS, beliefs: BELIEFS, quantity: Q, authority: FIXTURE_AUTHORITY });
    expect(obj.autopsyHook.settlesAtTick).toBe(3);
    expect(obj.autopsyHook.protocol).toMatch(/no single-result weight move/);
  });
});

describe("Learning — no credit from a single outcome alone (A5)", () => {
  it("a correct refusal is scored as a win, not a blank", () => {
    expect(creditVerdict({ refused: true, claimedAbove: false, realizedYards: 30, lineWasBeaten: false, forkSupportedClaim: false })).toBe("CORRECTLY_REFUSED");
  });
  it("beating the line is EARNED only when the fork supported the claim; else LUCKY", () => {
    expect(creditVerdict({ refused: false, claimedAbove: true, realizedYards: 70, lineWasBeaten: true, forkSupportedClaim: true })).toBe("EARNED");
    expect(creditVerdict({ refused: false, claimedAbove: true, realizedYards: 70, lineWasBeaten: true, forkSupportedClaim: false })).toBe("LUCKY");
  });
});
