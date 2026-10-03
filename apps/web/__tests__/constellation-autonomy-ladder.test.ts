/**
 * Tests for the CONSTELLATION foundation earned-autonomy ladder (A0-A9)
 * (LAB-ONLY / DORMANT, see `lib/constellation/autonomy-ladder.ts`).
 *
 * The load-bearing test in this file is
 * "hard-boundary action kinds are unreachable as auto-approved at every
 * ladder level, including A9" — it is exhaustive over all seven
 * `OwnerOnlyActionKind`s and all ten `AutonomyLevel`s (70 cases), not a
 * spot check.
 */
import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  AUTONOMY_LEVELS,
  DEFAULT_AUTONOMY_LEVEL,
  OWNER_ONLY_ACTION_KINDS,
  classifyAutonomy,
  isOwnerOnlyActionKind,
  type AutonomyLevel,
  type OwnerOnlyActionKind,
} from "@/lib/constellation/autonomy-ladder";
import { buildProofCarryingAction } from "@/lib/constellation/proof-carrying-action";
import type { HumanActor } from "@/lib/auth/actor";
import type { FounderWorkAuthority } from "@/lib/opportunity-engine/founder-command";
import type { VerificationStatus } from "@/lib/constellation/proof-carrying-action";

const ACTOR: HumanActor = {
  actorType: "HUMAN",
  subjectId: "user_1",
  authMethod: "SESSION",
  authorityScope: "ADMIN",
  tenant: null,
  project: null,
  requestId: "req_1",
  runId: null,
  observedAt: new Date("2026-07-22T00:00:00.000Z"),
  emailSnapshot: null,
  policyVersion: "1b",
};

function actionWithKind(actionKind: string) {
  return buildProofCarryingAction({
    actionId: "a1",
    action: { actionKind },
    actor: ACTOR,
    evidence: [{ kind: "ACTOR_RECEIPT", id: "r1", observedAtIso: "2026-07-22T00:00:00.000Z" }],
    authority: "AGENT_INTERNAL",
    reason: "test",
    createdAtIso: "2026-07-22T00:00:00.000Z",
    verificationStatus: "VERIFIED",
  });
}

describe("DEFAULT_AUTONOMY_LEVEL", () => {
  it("is A0 — the most conservative level", () => {
    expect(DEFAULT_AUTONOMY_LEVEL).toBe("A0");
  });
});

describe("hard-boundary owner-only action kinds — structurally unreachable as auto-approved at EVERY ladder level", () => {
  it("is OWNER_ONLY_ALWAYS for all 7 owner-only kinds x all 10 levels (exhaustive, 70 cases)", () => {
    let casesChecked = 0;
    for (const kind of OWNER_ONLY_ACTION_KINDS) {
      for (const level of AUTONOMY_LEVELS) {
        // Stack the deck maximally in favor of auto-approval — verified
        // evidence, AGENT_INTERNAL authority (the most permissive
        // authority this classifier ever auto-approves) — to prove even
        // the most favorable non-hard-boundary conditions still can't
        // move the needle for a hard-boundary kind.
        const pca = actionWithKind(kind);
        const decision = classifyAutonomy(pca, level);
        expect(decision).toBe("OWNER_ONLY_ALWAYS");
        casesChecked += 1;
      }
    }
    expect(casesChecked).toBe(OWNER_ONLY_ACTION_KINDS.length * AUTONOMY_LEVELS.length);
    expect(casesChecked).toBe(70);
  });

  it("is OWNER_ONLY_ALWAYS at A9 specifically for every hard-boundary kind, even with AGENT_THEN_OWNER authority", () => {
    for (const kind of OWNER_ONLY_ACTION_KINDS) {
      const pca = buildProofCarryingAction({
        actionId: "a1",
        action: { actionKind: kind },
        actor: ACTOR,
        evidence: [{ kind: "ACTOR_RECEIPT", id: "r1", observedAtIso: "2026-07-22T00:00:00.000Z" }],
        authority: "AGENT_THEN_OWNER",
        reason: "test",
        createdAtIso: "2026-07-22T00:00:00.000Z",
        verificationStatus: "VERIFIED",
      });
      expect(classifyAutonomy(pca, "A9")).toBe("OWNER_ONLY_ALWAYS");
    }
  });

  it("property: for any hard-boundary kind, any level, any authority, any verification status — always OWNER_ONLY_ALWAYS", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...OWNER_ONLY_ACTION_KINDS),
        fc.constantFrom(...AUTONOMY_LEVELS),
        fc.constantFrom<FounderWorkAuthority>("AGENT_INTERNAL", "OWNER_ONLY", "AGENT_THEN_OWNER"),
        fc.constantFrom<VerificationStatus>("UNVERIFIED", "EVIDENCE_ATTACHED", "VERIFIED", "REJECTED"),
        (kind, level, authority, verificationStatus) => {
          const pca = buildProofCarryingAction({
            actionId: "a1",
            action: { actionKind: kind },
            actor: ACTOR,
            evidence: [{ kind: "ACTOR_RECEIPT", id: "r1", observedAtIso: "2026-07-22T00:00:00.000Z" }],
            authority,
            reason: "test",
            createdAtIso: "2026-07-22T00:00:00.000Z",
            verificationStatus,
          });
          expect(classifyAutonomy(pca, level)).toBe("OWNER_ONLY_ALWAYS");
        },
      ),
      { numRuns: 500 },
    );
  });

  it("isOwnerOnlyActionKind agrees with OWNER_ONLY_ACTION_KINDS membership for arbitrary strings", () => {
    fc.assert(
      fc.property(fc.string(), (s) => {
        const expected = (OWNER_ONLY_ACTION_KINDS as readonly string[]).includes(s);
        expect(isOwnerOnlyActionKind(s)).toBe(expected);
      }),
    );
  });
});

describe("A0 — fully manual", () => {
  it("never auto-approves a non-hard-boundary AGENT_INTERNAL action even when fully verified", () => {
    const pca = actionWithKind("READ_ONLY_REPORT_GENERATION");
    expect(classifyAutonomy(pca, "A0")).toBe("NEEDS_OWNER_CONFIRMATION");
  });

  it("never auto-approves a non-hard-boundary AGENT_THEN_OWNER action", () => {
    const pca = buildProofCarryingAction({
      actionId: "a1",
      action: { actionKind: "PROPOSE_PICK_ADJUSTMENT" },
      actor: ACTOR,
      evidence: [{ kind: "ACTOR_RECEIPT", id: "r1", observedAtIso: "2026-07-22T00:00:00.000Z" }],
      authority: "AGENT_THEN_OWNER",
      reason: "test",
      createdAtIso: "2026-07-22T00:00:00.000Z",
      verificationStatus: "VERIFIED",
    });
    expect(classifyAutonomy(pca, "A0")).toBe("NEEDS_OWNER_CONFIRMATION");
  });
});

describe("progressive earned autonomy for non-hard-boundary actions", () => {
  it("AGENT_INTERNAL + VERIFIED auto-approves from A1 upward, but not at A0", () => {
    const pca = actionWithKind("CAPABILITY_INVENTORY_REFRESH");
    expect(classifyAutonomy(pca, "A0")).toBe("NEEDS_OWNER_CONFIRMATION");
    for (const level of AUTONOMY_LEVELS.slice(1)) {
      expect(classifyAutonomy(pca, level)).toBe("AUTO_APPROVED");
    }
  });

  it("AGENT_INTERNAL without VERIFIED evidence never auto-approves, at any level", () => {
    const pca = buildProofCarryingAction({
      actionId: "a1",
      action: { actionKind: "CAPABILITY_INVENTORY_REFRESH" },
      actor: ACTOR,
      evidence: [],
      authority: "AGENT_INTERNAL",
      reason: "test",
      createdAtIso: "2026-07-22T00:00:00.000Z",
      verificationStatus: "UNVERIFIED",
    });
    for (const level of AUTONOMY_LEVELS) {
      expect(classifyAutonomy(pca, level)).toBe("NEEDS_OWNER_CONFIRMATION");
    }
  });

  it("AGENT_THEN_OWNER + VERIFIED only auto-approves from A6 upward", () => {
    const pca = buildProofCarryingAction({
      actionId: "a1",
      action: { actionKind: "PROPOSE_REVENUE_OPPORTUNITY" },
      actor: ACTOR,
      evidence: [{ kind: "ACTOR_RECEIPT", id: "r1", observedAtIso: "2026-07-22T00:00:00.000Z" }],
      authority: "AGENT_THEN_OWNER",
      reason: "test",
      createdAtIso: "2026-07-22T00:00:00.000Z",
      verificationStatus: "VERIFIED",
    });
    const belowFloor: readonly AutonomyLevel[] = ["A0", "A1", "A2", "A3", "A4", "A5"];
    const atOrAboveFloor: readonly AutonomyLevel[] = ["A6", "A7", "A8", "A9"];
    for (const level of belowFloor) {
      expect(classifyAutonomy(pca, level)).toBe("NEEDS_OWNER_CONFIRMATION");
    }
    for (const level of atOrAboveFloor) {
      expect(classifyAutonomy(pca, level)).toBe("AUTO_APPROVED");
    }
  });

  it("business-classified OWNER_ONLY authority never auto-approves at any level, even for a non-hard-boundary kind", () => {
    const pca = buildProofCarryingAction({
      actionId: "a1",
      action: { actionKind: "CREDIT_LIFECYCLE_TRANSITION" },
      actor: ACTOR,
      evidence: [{ kind: "ACTOR_RECEIPT", id: "r1", observedAtIso: "2026-07-22T00:00:00.000Z" }],
      authority: "OWNER_ONLY",
      reason: "test",
      createdAtIso: "2026-07-22T00:00:00.000Z",
      verificationStatus: "VERIFIED",
    });
    for (const level of AUTONOMY_LEVELS) {
      expect(classifyAutonomy(pca, level)).toBe("NEEDS_OWNER_CONFIRMATION");
    }
  });
});

// Compile-time structural check: this is not a runtime assertion, but a
// type-level one. If AutonomyDecisionFor ever regressed to allow
// "AUTO_APPROVED" for a literal OwnerOnlyActionKind, this file would fail
// to type-check (and therefore fail `tsc --noEmit` / `vitest run`'s
// transform step) rather than merely fail an assertion.
function _typeLevelProof(pca: ReturnType<typeof buildProofCarryingAction<{ readonly actionKind: "CODE_MERGE" }>>) {
  const decision = classifyAutonomy(pca, "A9");
  // If this ever widened to include "AUTO_APPROVED", the following line
  // would still compile (harmless) — the real proof is that `decision`'s
  // inferred type contains ONLY "OWNER_ONLY_ALWAYS". Guard it with an
  // exhaustive switch that would fail to compile if a new member appeared.
  switch (decision) {
    case "OWNER_ONLY_ALWAYS":
      return decision;
    default: {
      const _exhaustive: never = decision;
      return _exhaustive;
    }
  }
}
void _typeLevelProof;

describe("OwnerOnlyActionKind coverage matches the documented seven kinds exactly", () => {
  it("has exactly these 7 kinds — CODE_MERGE, PRODUCTION_DEPLOY, BILLING_CHANGE, PAYMENT_ACCOUNT_CHANGE, EXTERNAL_OUTREACH, PRODUCTION_DATA_MIGRATION, PRODUCTION_SECRET_CHANGE", () => {
    const expected: readonly OwnerOnlyActionKind[] = [
      "CODE_MERGE",
      "PRODUCTION_DEPLOY",
      "BILLING_CHANGE",
      "PAYMENT_ACCOUNT_CHANGE",
      "EXTERNAL_OUTREACH",
      "PRODUCTION_DATA_MIGRATION",
      "PRODUCTION_SECRET_CHANGE",
    ];
    expect([...OWNER_ONLY_ACTION_KINDS].sort()).toEqual([...expected].sort());
  });
});
