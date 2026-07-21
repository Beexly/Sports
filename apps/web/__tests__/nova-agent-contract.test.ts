import { describe, expect, it } from "vitest";

import {
  buildNovaCouncilPacket,
  buildNovaReviewRoute,
  decideNovaAction,
  NOVA_AGENT_PROFILE,
  NOVA_ALLOWED_ACTIONS,
  NOVA_FORBIDDEN_ACTIONS,
  NOVA_SUBAGENTS,
} from "@/lib/jarvis/nova-agent";

describe("NOVA governed agent contract", () => {
  it("declares designed read-only/draft-only authority rather than active external autonomy", () => {
    expect(NOVA_AGENT_PROFILE.runtimeStatus).toBe("DESIGNED");
    expect(NOVA_AGENT_PROFILE.runMode).toBe("SCHEDULED_READ_ONLY_DRAFT_ONLY");
    expect(NOVA_AGENT_PROFILE.externalActions).toBe(false);
    expect(NOVA_AGENT_PROFILE.canInstall).toBe(false);
    expect(NOVA_AGENT_PROFILE.canMerge).toBe(false);
    expect(NOVA_AGENT_PROFILE.canDeploy).toBe(false);
    expect(NOVA_AGENT_PROFILE.canPublish).toBe(false);
    expect(NOVA_AGENT_PROFILE.canSpend).toBe(false);
    expect(NOVA_AGENT_PROFILE.canContactThirdParties).toBe(false);
    expect(NOVA_AGENT_PROFILE.canModifyGovernance).toBe(false);
  });

  it("keeps allowed and forbidden actions disjoint", () => {
    const overlap = NOVA_ALLOWED_ACTIONS.filter((action) =>
      (NOVA_FORBIDDEN_ACTIONS as readonly string[]).includes(action),
    );
    expect(overlap).toEqual([]);
  });

  it("allows only an explicitly allowlisted public metadata fetch", () => {
    expect(decideNovaAction("FETCH_ALLOWLISTED_PUBLIC_METADATA").allowed).toBe(false);
    expect(
      decideNovaAction("FETCH_ALLOWLISTED_PUBLIC_METADATA", { sourceAllowlisted: true }).allowed,
    ).toBe(true);
  });

  it("requires deterministic captured input for replay", () => {
    expect(decideNovaAction("RUN_DETERMINISTIC_REPLAY").allowed).toBe(false);
    expect(decideNovaAction("RUN_DETERMINISTIC_REPLAY", { deterministicInput: true }).allowed).toBe(
      true,
    );
  });

  it("requires owner approval, isolation, and zero-cash policy for a local experiment", () => {
    expect(
      decideNovaAction("RUN_OWNER_APPROVED_LOCAL_EXPERIMENT", {
        ownerApproved: true,
        isolatedEnvironment: true,
        zeroCashOnly: false,
      }).allowed,
    ).toBe(false);
    expect(
      decideNovaAction("RUN_OWNER_APPROVED_LOCAL_EXPERIMENT", {
        ownerApproved: true,
        isolatedEnvironment: true,
        zeroCashOnly: true,
      }).allowed,
    ).toBe(true);
  });

  it.each(NOVA_FORBIDDEN_ACTIONS)("denies forbidden action %s", (action) => {
    const decision = decideNovaAction(action);
    expect(decision.allowed).toBe(false);
    expect(decision.externalActionsAllowed).toBe(false);
  });

  it("prevents every NOVA subagent from approving its own output or acting externally", () => {
    expect(NOVA_SUBAGENTS).toHaveLength(5);
    for (const subagent of NOVA_SUBAGENTS) {
      expect(subagent.mayApproveOwnOutput).toBe(false);
      expect(subagent.externalActions).toBe(false);
    }
  });

  it("routes critical risk events for immediate independent review", () => {
    const route = buildNovaReviewRoute("SECURITY", 100);
    expect(route.immediate).toBe(true);
    expect(route.reviewers).toContain("JARVIS");
    expect(route.reviewers).toContain("TAL");
    expect(route.reviewers).toContain("GAUGE");
    expect(route.ownerDecisionRequired).toBe(true);
    expect(route.externalActionsAllowed).toBe(false);
  });

  it("routes economic changes through METER and BOBBY", () => {
    const route = buildNovaReviewRoute("CREDIT_PROGRAM", 72);
    expect(route.reviewers).toContain("METER");
    expect(route.reviewers).toContain("BOBBY");
  });

  it("builds a draft council packet without converting estimates into credits or revenue", () => {
    const packet = buildNovaCouncilPacket({
      packetId: "nova-packet-1",
      eventClass: "CREDIT_PROGRAM",
      urgency: 72,
      title: "Official startup program changed",
      verifiedFacts: ["The official program page changed."],
      assumptions: ["GSE may qualify."],
      unknowns: ["Eligibility has not been confirmed."],
      projectIds: ["GSE", "XXX"],
      estimatedValueUsd: 100_000,
      nextSmallestTest: "Verify eligibility requirements against current company state.",
    });

    expect(packet.status).toBe("DRAFT");
    expect(packet.estimatedValueUsd).toBe(100_000);
    expect(packet.realizedRevenueUsd).toBe(0);
    expect(packet.usableCreditsUsd).toBe(0);
    expect(packet.externalActionsAllowed).toBe(false);
    expect(packet.route.ownerDecisionRequired).toBe(true);
  });
});
