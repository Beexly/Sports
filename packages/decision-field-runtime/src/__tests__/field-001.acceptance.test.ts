/**
 * FIELD 001 — the heartbeat acceptance test (the Phase-0 gate).
 *
 * If this whole organism cycle does not run end to end and produce a proven, claim-bounded WATCH card
 * with a Why-not, a Source Race, a propose-only plan, and a Conscience snapshot — Phases 1–1D do not
 * proceed. Everything here is deterministic.
 */

import { describe, it, expect } from "vitest";
import {
  runDecisionFieldFrame,
  field001Input,
  field001WithoutRoleInput,
  assertBoundedAutonomy,
  type AutonomousAction,
  type OperatingPlan,
} from "../index.js";

describe("Field 001 — the heartbeat runs end to end", () => {
  const frame = runDecisionFieldFrame(field001Input);

  it("runs the whole cycle and emits exactly one card", () => {
    expect(frame.frameId).toBe("field-001");
    expect(frame.emittedCards).toHaveLength(1);
    expect(frame.suppressedCards).toHaveLength(0);
  });

  it("races the two market observers and names the winner + laggard", () => {
    const propRace = frame.sourceRaces.find((r) => r.factType === "player_prop");
    expect(propRace).toBeDefined();
    expect(propRace!.winner).toBe("the_odds_api");
    expect(propRace!.laggards).toContain("sportsgameodds");
    expect(propRace!.sources[1]!.latencyMs).toBeGreaterThan(0);
  });

  it("light cone excludes the future injury fact and the card is PARTIAL", () => {
    expect(frame.proof.futureLeakedCount).toBe(1);
    expect(frame.facts.pointInTime).toHaveLength(frame.facts.rawSeen.length - 1);
    expect(frame.facts.futureLeaked[0]!.factId).toBe("f_future_injury");
    expect(frame.emittedCards[0]!.lightConeStatus).toBe("PARTIAL");
  });

  it("field stress is high enough to surface a card", () => {
    expect(frame.fieldStress[0]!.stress).toBeGreaterThan(0.4);
    expect(frame.fieldStress[0]!.absorbed).toBe(false);
  });

  it("caps the card at WATCH (not an ADD) — the stat contract + ghost bind it", () => {
    const card = frame.emittedCards[0]!;
    expect(card.maxPermittedStrength).toBe("WATCH");
    expect(card.decisionState).toBe("ROLE_UP_FANTASY_LATE");
    expect(card.routeTo).toBe("GAMEPLAN");
  });

  it("claim-bounds the card: role SUPPORTED, fantasy-late BLOCKED", () => {
    const card = frame.emittedCards[0]!;
    const role = card.claims.find((c) => c.claimId === "role")!;
    const fantasy = card.claims.find((c) => c.claimId === "fantasy_late")!;
    expect(role.proofStatus).toBe("SUPPORTED");
    expect(fantasy.proofStatus).toBe("BLOCKED");
  });

  it("prosecutes the card — warns (ghost resemblance) but does not fail", () => {
    const card = frame.emittedCards[0]!;
    expect(card.prosecution.anyFail).toBe(false);
    expect(card.prosecution.anyWarn).toBe(true);
    const ghost = card.prosecution.verdicts.find((v) => v.prosecutor === "Ghost")!;
    expect(ghost.verdict).toBe("WARN");
  });

  it("the card front answers all five questions, including Why-not", () => {
    const card = frame.emittedCards[0]!;
    expect(card.whatChanged.length).toBeGreaterThan(0);
    expect(card.whatItMeans.length).toBeGreaterThan(0);
    expect(card.whatToDo.toLowerCase()).toContain("watch");
    expect(card.whyNot.toLowerCase()).toContain("watch");
    expect(card.receiptRef).toBe("receipt:field-001:player:dell");
    expect(card.proofDrawer.whyNot.length).toBeGreaterThan(0);
    expect(card.proofDrawer.sourceRaceSummary).toContain("the_odds_api");
  });

  it("names a missed observation (no fantasy snapshot) and an over-observation (weather)", () => {
    expect(frame.missedObservations.some((m) => m.missingFactGroup === "fantasy_belief_snapshot")).toBe(true);
    expect(frame.overObservations.some((o) => o.factType === "weather")).toBe(true);
  });

  it("the Conscience snapshot records compression and detection advantage", () => {
    expect(frame.conscience.factToDecisionCompression).toBeGreaterThan(0);
    expect(frame.conscience.detectionTimeAdvantageMs).toBeGreaterThan(0);
    expect(frame.conscience.missedObservationCount).toBeGreaterThanOrEqual(1);
    expect(frame.conscience.overObservationCount).toBeGreaterThanOrEqual(1);
  });

  it("proposes the next move but executes nothing — bounded autonomy holds", () => {
    const plan = frame.autonomyPlan;
    expect(plan.proposedActions.length).toBeGreaterThan(0);
    for (const a of plan.proposedActions) expect(a.status).toBe("PROPOSED");
    const forbidden = plan.proposedActions.filter((a) =>
      ["PUBLISH_CARD", "SPEND", "ROSTER_WRITE", "FLIP_GATE"].includes(a.type),
    );
    expect(forbidden).toHaveLength(0);
    expect(() => assertBoundedAutonomy(plan)).not.toThrow();
    // It does propose evaluating a paid source to fill the gap (OVI demand) — review-gated, not executed.
    expect(plan.proposedActions.some((a) => a.type === "PROPOSE_PAID_SOURCE")).toBe(true);
  });
});

describe("Field 001 — determinism guard", () => {
  it("removing the role facts downgrades the card to suppression", () => {
    const frame = runDecisionFieldFrame(field001WithoutRoleInput);
    expect(frame.emittedCards).toHaveLength(0);
    expect(frame.suppressedCards.length).toBeGreaterThanOrEqual(1);
    expect(frame.suppressedCards[0]!.maxPermittedStrength).toBe("INFO_ONLY");
  });
});

describe("Bounded autonomy — a forged executed action is rejected", () => {
  const base = runDecisionFieldFrame(field001Input).autonomyPlan;

  it("throws if any action is not PROPOSED", () => {
    const forged = { ...base.proposedActions[0]!, status: "EXECUTED" } as unknown as AutonomousAction;
    const plan: OperatingPlan = { ...base, proposedActions: [forged] };
    expect(() => assertBoundedAutonomy(plan)).toThrow(/PROPOSED/);
  });

  it("throws if an owner-gated action is forged as SELF", () => {
    const forged = {
      id: "forge",
      type: "PUBLISH_CARD",
      subject: "publish a card",
      rationale: "should never be SELF",
      status: "PROPOSED",
      authority: "SELF",
      reversible: false,
    } as unknown as AutonomousAction;
    const plan: OperatingPlan = { frameId: "x", proposedActions: [forged], ownerApprovalsNeeded: [], note: "" };
    expect(() => assertBoundedAutonomy(plan)).toThrow();
  });
});
