/**
 * Tests for the CONSTELLATION foundation Proof-Carrying Action envelope
 * (LAB-ONLY / DORMANT, see `lib/constellation/proof-carrying-action.ts`).
 */
import { describe, expect, it } from "vitest";
import {
  buildProofCarryingAction,
  validateProofCarryingAction,
  type EvidenceRef,
  type ProofCarryingAction,
} from "@/lib/constellation/proof-carrying-action";
import type { HumanActor, ServiceActor } from "@/lib/auth/actor";

const HUMAN_ACTOR: HumanActor = {
  actorType: "HUMAN",
  subjectId: "user_123",
  authMethod: "SESSION",
  authorityScope: "ADMIN",
  tenant: null,
  project: null,
  requestId: "req_1",
  runId: null,
  observedAt: new Date("2026-07-22T12:00:00.000Z"),
  emailSnapshot: "owner@example.com",
  policyVersion: "1b",
};

const SERVICE_ACTOR: ServiceActor = {
  actorType: "SERVICE",
  subjectId: "service:ai-reconciliation",
  authMethod: "SERVICE_CREDENTIAL",
  authorityScope: "SERVICE",
  tenant: null,
  project: null,
  requestId: null,
  runId: "run_1",
  observedAt: new Date("2026-07-22T12:00:00.000Z"),
  emailSnapshot: null,
  policyVersion: "1b",
  operation: "ai:reconcile",
  credentialMethod: "WORKER_PROCESS",
};

interface TestAction {
  readonly actionKind: string;
  readonly detail: string;
}

const ACTOR_RECEIPT_EVIDENCE: EvidenceRef = {
  kind: "ACTOR_RECEIPT",
  id: "receipt_1",
  observedAtIso: "2026-07-22T12:00:00.000Z",
};

const CREDIT_SNAPSHOT_EVIDENCE: EvidenceRef = {
  kind: "CREDIT_GRANT_SNAPSHOT",
  id: "grant_1",
  observedAtIso: "2026-07-22T12:00:00.000Z",
  sourceReceiptId: "receipt_2",
  sourceReceiptHash: "sha256:abc123",
};

function baseParams() {
  return {
    actionId: "action_1",
    action: { actionKind: "TEST_ACTION", detail: "example" } satisfies TestAction,
    actor: HUMAN_ACTOR,
    evidence: [ACTOR_RECEIPT_EVIDENCE],
    authority: "AGENT_INTERNAL" as const,
    reason: "Testing the envelope builder and validator.",
    createdAtIso: "2026-07-22T12:00:01.000Z",
  };
}

describe("buildProofCarryingAction", () => {
  it("constructs an envelope with UNVERIFIED default status", () => {
    const pca = buildProofCarryingAction(baseParams());
    expect(pca.verificationStatus).toBe("UNVERIFIED");
    expect(pca.actionId).toBe("action_1");
    expect(pca.actor).toBe(HUMAN_ACTOR);
    expect(pca.evidence).toHaveLength(1);
  });

  it("honors an explicit verificationStatus", () => {
    const pca = buildProofCarryingAction({
      ...baseParams(),
      evidence: [ACTOR_RECEIPT_EVIDENCE, CREDIT_SNAPSHOT_EVIDENCE],
      verificationStatus: "VERIFIED",
    });
    expect(pca.verificationStatus).toBe("VERIFIED");
  });

  it("is pure — building twice from identical params yields deep-equal, independently-referenced envelopes", () => {
    const params = baseParams();
    const a = buildProofCarryingAction(params);
    const b = buildProofCarryingAction(params);
    expect(a).toEqual(b);
    expect(a).not.toBe(b);
  });

  it("carries a SERVICE actor without modification", () => {
    const pca = buildProofCarryingAction({ ...baseParams(), actor: SERVICE_ACTOR });
    expect(pca.actor.actorType).toBe("SERVICE");
    expect((pca.actor as ServiceActor).operation).toBe("ai:reconcile");
  });
});

describe("validateProofCarryingAction", () => {
  it("accepts a well-formed UNVERIFIED envelope", () => {
    const pca = buildProofCarryingAction(baseParams());
    const result = validateProofCarryingAction(pca);
    expect(result.valid).toBe(true);
  });

  it("accepts a well-formed VERIFIED envelope backed by evidence", () => {
    const pca = buildProofCarryingAction({
      ...baseParams(),
      evidence: [ACTOR_RECEIPT_EVIDENCE, CREDIT_SNAPSHOT_EVIDENCE],
      verificationStatus: "VERIFIED",
    });
    expect(validateProofCarryingAction(pca).valid).toBe(true);
  });

  it("rejects VERIFIED with zero evidence refs", () => {
    const pca = buildProofCarryingAction({
      ...baseParams(),
      evidence: [],
      verificationStatus: "VERIFIED",
    });
    const result = validateProofCarryingAction(pca);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.issues).toContain("VERIFIED_WITHOUT_EVIDENCE");
    }
  });

  it("rejects an empty actionId", () => {
    const pca = buildProofCarryingAction({ ...baseParams(), actionId: "  " });
    const result = validateProofCarryingAction(pca);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.issues).toContain("ACTION_ID_EMPTY");
  });

  it("rejects an empty reason (never a vague envelope)", () => {
    const pca = buildProofCarryingAction({ ...baseParams(), reason: "" });
    const result = validateProofCarryingAction(pca);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.issues).toContain("REASON_EMPTY");
  });

  it("rejects a malformed actor (empty subjectId)", () => {
    const pca = buildProofCarryingAction({
      ...baseParams(),
      actor: { ...HUMAN_ACTOR, subjectId: "" },
    });
    const result = validateProofCarryingAction(pca);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.issues).toContain("ACTOR_MALFORMED");
  });

  it("rejects an unrecognized authority value", () => {
    const pca = {
      ...buildProofCarryingAction(baseParams()),
      authority: "SOMETHING_ELSE" as unknown as ProofCarryingAction<TestAction>["authority"],
    };
    const result = validateProofCarryingAction(pca);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.issues).toContain("AUTHORITY_INVALID");
  });

  it("rejects an invalid createdAtIso", () => {
    const pca = buildProofCarryingAction({ ...baseParams(), createdAtIso: "not-a-date" });
    const result = validateProofCarryingAction(pca);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.issues).toContain("CREATED_AT_INVALID");
  });

  it("rejects an evidence ref with an unrecognized kind", () => {
    const pca = buildProofCarryingAction({
      ...baseParams(),
      evidence: [{ kind: "NOT_A_REAL_KIND", id: "x", observedAtIso: "2026-07-22T12:00:00.000Z" } as unknown as EvidenceRef],
    });
    const result = validateProofCarryingAction(pca);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.issues).toContain("EVIDENCE_KIND_INVALID");
  });

  it("rejects an evidence ref with an empty id", () => {
    const pca = buildProofCarryingAction({
      ...baseParams(),
      evidence: [{ ...ACTOR_RECEIPT_EVIDENCE, id: "" }],
    });
    const result = validateProofCarryingAction(pca);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.issues).toContain("EVIDENCE_ID_EMPTY");
  });

  it("rejects a CREDIT_GRANT_SNAPSHOT evidence ref missing sourceReceiptId", () => {
    const pca = buildProofCarryingAction({
      ...baseParams(),
      evidence: [{ ...CREDIT_SNAPSHOT_EVIDENCE, sourceReceiptId: "" }],
    });
    const result = validateProofCarryingAction(pca);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.issues).toContain("EVIDENCE_FIELD_EMPTY");
  });

  it("rejects an evidence ref with an invalid observedAtIso", () => {
    const pca = buildProofCarryingAction({
      ...baseParams(),
      evidence: [{ ...ACTOR_RECEIPT_EVIDENCE, observedAtIso: "bogus" }],
    });
    const result = validateProofCarryingAction(pca);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.issues).toContain("EVIDENCE_OBSERVED_AT_INVALID");
  });

  it("accumulates multiple issues at once rather than short-circuiting on the first", () => {
    const pca = buildProofCarryingAction({
      ...baseParams(),
      actionId: "",
      reason: "",
      evidence: [],
      verificationStatus: "VERIFIED",
    });
    const result = validateProofCarryingAction(pca);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.issues).toEqual(
        expect.arrayContaining(["ACTION_ID_EMPTY", "REASON_EMPTY", "VERIFIED_WITHOUT_EVIDENCE"]),
      );
    }
  });

  it("never touches a database or network — is a pure function of its argument", () => {
    // Calling it 1000 times with the same input must be deterministic and
    // side-effect-free; this is a smoke proxy for purity (no timers, no I/O
    // mocks required, no async).
    const pca = buildProofCarryingAction(baseParams());
    const results = Array.from({ length: 1000 }, () => validateProofCarryingAction(pca));
    expect(results.every((r) => r.valid === true)).toBe(true);
  });
});
