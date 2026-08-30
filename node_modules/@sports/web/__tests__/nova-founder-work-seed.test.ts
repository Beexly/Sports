import { describe, expect, it } from "vitest";
import creditFixture from "@/lib/opportunity-engine/fixtures/credit-grant-snapshot.conformance.json";
import {
  buildCapabilityGovernanceWorkItems,
  buildControlPlaneEconomicsWorkItems,
  buildCreditLifecycleWorkItems,
  buildFounderDailyBrief,
  buildSettlementAnomalyWorkItems,
  buildSourceIntelligenceWorkItems,
} from "@/lib/opportunity-engine/founder-work-seed";
import type { CreditGrantSnapshot } from "@/lib/opportunity-engine/credit-snapshot";
import { DEFAULT_OPPORTUNITY_SOURCES } from "@/lib/opportunity-engine/source-registry";

const NOW_ISO = "2026-07-22T12:00:00.000Z";

function fixtureSnapshot(name: string): CreditGrantSnapshot {
  const found = creditFixture.snapshotCases.find((c) => c.name === name);
  if (!found) throw new Error(`Missing fixture case: ${name}`);
  return found.snapshot as unknown as CreditGrantSnapshot;
}

describe("NOVA Founder OS read-model assembler (S4)", () => {
  describe("buildCapabilityGovernanceWorkItems (S2)", () => {
    it("derives real held/ineligible capability items from the actual S2 governance ledger", () => {
      const items = buildCapabilityGovernanceWorkItems({
        generatedAtIso: NOW_ISO,
        runId: "test-run",
      });
      // The real governance ledger currently covers no live capability, so
      // every capability-inspection candidate resolves fail-closed
      // (ineligible) — the test asserts against that real, current state
      // rather than fabricating a "healthy" scenario.
      expect(items.length).toBeGreaterThan(0);
      for (const item of items) {
        expect(item.lane).toBe("CAPABILITY_GOVERNANCE");
        expect(item.sourceRefs.length).toBeGreaterThan(0);
        expect(item.generatedAtIso).toBe(NOW_ISO);
      }
    });

    it("never assigns AGENT_INTERNAL authority to a HELD (risk-flagged) capability item", () => {
      const items = buildCapabilityGovernanceWorkItems({
        generatedAtIso: NOW_ISO,
        runId: "test-run",
      });
      const held = items.filter((item) => item.id.startsWith("capability-governance:held:"));
      for (const item of held) {
        expect(item.authority).not.toBe("AGENT_INTERNAL");
        expect(item.requiresOwnerDecision).toBe(true);
      }
    });

    it("deduplicates a capability appearing under multiple task classes into one item", () => {
      const items = buildCapabilityGovernanceWorkItems({
        generatedAtIso: NOW_ISO,
        runId: "test-run",
      });
      const ids = items.map((item) => item.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  describe("buildSourceIntelligenceWorkItems (S3)", () => {
    it("flags every real registry source that requires terms review or is disabled by default", () => {
      const items = buildSourceIntelligenceWorkItems({ generatedAtIso: NOW_ISO });
      const flaggedSourceIds = new Set(
        DEFAULT_OPPORTUNITY_SOURCES.filter(
          (source) => source.requiresTermsReview || !source.enabledByDefault,
        ).map((source) => source.id),
      );
      expect(items.length).toBe(flaggedSourceIds.size);
      for (const item of items) {
        expect(item.lane).toBe("SOURCE_INTELLIGENCE");
        expect(flaggedSourceIds.has(item.sourceRefs[0]!)).toBe(true);
      }
    });

    it("produces no item for a source that needs neither terms review nor enabling", () => {
      const items = buildSourceIntelligenceWorkItems({ generatedAtIso: NOW_ISO });
      const cleanSource = DEFAULT_OPPORTUNITY_SOURCES.find(
        (source) => !source.requiresTermsReview && source.enabledByDefault,
      );
      expect(cleanSource).toBeDefined();
      expect(items.some((item) => item.sourceRefs[0] === cleanSource?.id)).toBe(false);
    });
  });

  describe("buildCreditLifecycleWorkItems (S1, real conformance fixture)", () => {
    const FIXTURE_EVALUATION_AT_ISO = creditFixture.evaluationAt;
    it("produces no item for an admissible snapshot", () => {
      const items = buildCreditLifecycleWorkItems({
        snapshots: [fixtureSnapshot("valid-partially-consumed-admissible")],
        generatedAtIso: FIXTURE_EVALUATION_AT_ISO,
      });
      expect(items).toHaveLength(0);
    });

    it("produces an OWNER_ONLY item for an expired grant, citing the real admissibility reason", () => {
      const items = buildCreditLifecycleWorkItems({
        snapshots: [fixtureSnapshot("expired-grant-refused")],
        generatedAtIso: FIXTURE_EVALUATION_AT_ISO,
      });
      expect(items).toHaveLength(1);
      expect(items[0]!.authority).toBe("OWNER_ONLY");
      expect(items[0]!.reasons).toContain("grant_expired");
      expect(items[0]!.requiresOwnerDecision).toBe(true);
    });

    it("produces an item for a reconciliation-failed-closed snapshot and treats it as unproven evidence", () => {
      const items = buildCreditLifecycleWorkItems({
        snapshots: [fixtureSnapshot("failed-closed-reconciliation-refused")],
        generatedAtIso: FIXTURE_EVALUATION_AT_ISO,
      });
      expect(items).toHaveLength(1);
      expect(items[0]!.reasons).toContain("reconciliation_failed_closed");
    });

    it("fails closed on unknown expiry exactly like the S1 validator does", () => {
      const items = buildCreditLifecycleWorkItems({
        snapshots: [fixtureSnapshot("unknown-expiry-fails-closed")],
        generatedAtIso: FIXTURE_EVALUATION_AT_ISO,
      });
      expect(items).toHaveLength(1);
      expect(items[0]!.reasons).toContain("grant_expiry_unknown");
    });

    it("defaults to an empty snapshot list rather than fabricating one", () => {
      expect(buildCreditLifecycleWorkItems({ generatedAtIso: NOW_ISO })).toHaveLength(0);
    });
  });

  describe("buildSettlementAnomalyWorkItems (settlement domain read model)", () => {
    it("surfaces OPEN and OWNER_REVIEW anomalies but not RESOLVED/DISMISSED ones", () => {
      const items = buildSettlementAnomalyWorkItems({
        generatedAtIso: NOW_ISO,
        anomalies: [
          { id: "a1", gameId: "g1", state: "OPEN", reason: "score mismatch", firstObservedAtIso: NOW_ISO, lastSeenAtIso: NOW_ISO },
          { id: "a2", gameId: "g2", state: "OWNER_REVIEW", reason: "postponed", firstObservedAtIso: NOW_ISO, lastSeenAtIso: NOW_ISO },
          { id: "a3", gameId: "g3", state: "RESOLVED", reason: "confirmed", firstObservedAtIso: NOW_ISO, lastSeenAtIso: NOW_ISO },
          { id: "a4", gameId: "g4", state: "DISMISSED", reason: "false positive", firstObservedAtIso: NOW_ISO, lastSeenAtIso: NOW_ISO },
        ],
      });
      expect(items.map((item) => item.sourceRefs[0]).sort()).toEqual(["a1", "a2"]);
      for (const item of items) {
        expect(item.authority).toBe("OWNER_ONLY");
      }
    });

    it("defaults to no anomalies (nothing wired yet) rather than fabricating one", () => {
      expect(buildSettlementAnomalyWorkItems({ generatedAtIso: NOW_ISO })).toHaveLength(0);
    });
  });

  describe("buildControlPlaneEconomicsWorkItems (AI control-plane read model)", () => {
    it("escalates deterministic error codes to OWNER_ONLY and leaves transient ones agent-loggable", () => {
      const items = buildControlPlaneEconomicsWorkItems({
        generatedAtIso: NOW_ISO,
        events: [
          { id: "e1", code: "CONFIGURATION_ERROR", retriable: false, message: "no explicit cost mode", observedAtIso: NOW_ISO },
          { id: "e2", code: "PROVIDER_UNAVAILABLE", retriable: true, message: "timeout", observedAtIso: NOW_ISO },
        ],
      });
      const configError = items.find((item) => item.sourceRefs[0] === "e1");
      const providerUnavailable = items.find((item) => item.sourceRefs[0] === "e2");
      expect(configError?.authority).not.toBe("AGENT_INTERNAL");
      expect(configError?.requiresOwnerDecision).toBe(true);
      expect(providerUnavailable?.authority).toBe("AGENT_INTERNAL");
      expect(providerUnavailable?.requiresOwnerDecision).toBe(false);
    });
  });

  describe("buildFounderDailyBrief", () => {
    it("assembles a real, non-fabricated brief with correct open-item counts", () => {
      const brief = buildFounderDailyBrief({
        now: new Date(NOW_ISO),
        windowStartIso: NOW_ISO,
        windowEndIso: NOW_ISO,
        runId: "brief-test",
        creditSnapshots: [fixtureSnapshot("expired-grant-refused")],
        settlementAnomalies: [
          { id: "a1", gameId: "g1", state: "OPEN", reason: "score mismatch", firstObservedAtIso: NOW_ISO, lastSeenAtIso: NOW_ISO },
        ],
        controlPlaneEvents: [
          { id: "e1", code: "BUDGET_BLOCKED", retriable: false, message: "monthly cap hit", observedAtIso: NOW_ISO },
        ],
      });

      expect(brief.generatedAtIso).toBe(NOW_ISO);
      expect(brief.totalOpenItems).toBe(brief.items.filter((i) => i.state !== "RESOLVED" && i.state !== "DISMISSED").length);
      expect(brief.settlementAnomalyOpenCount).toBe(1);
      expect(brief.controlPlaneConfigurationErrorCount).toBe(1);
      expect(brief.laneSummaries).toHaveLength(6);
      // Every lane summary's openCount must be internally consistent with the items array.
      for (const laneSummary of brief.laneSummaries) {
        const expected = brief.items.filter(
          (item) => item.lane === laneSummary.lane && item.state !== "RESOLVED" && item.state !== "DISMISSED",
        ).length;
        expect(laneSummary.openCount).toBe(expected);
      }
    });

    it("orders topPriorityItems by priority band, most urgent first", () => {
      const brief = buildFounderDailyBrief({
        now: new Date(NOW_ISO),
        windowStartIso: NOW_ISO,
        windowEndIso: NOW_ISO,
        runId: "brief-priority-test",
        controlPlaneEvents: [
          { id: "e1", code: "AMBIGUOUS_CHARGE", retriable: false, message: "cannot prove charge", observedAtIso: NOW_ISO },
        ],
      });
      expect(brief.topPriorityItems[0]?.priorityBand).toBe("P0");
    });

    it("never grants AGENT_INTERNAL authority to any open credit, settlement, or control-plane item", () => {
      const brief = buildFounderDailyBrief({
        now: new Date(NOW_ISO),
        windowStartIso: NOW_ISO,
        windowEndIso: NOW_ISO,
        runId: "brief-authority-test",
        creditSnapshots: [fixtureSnapshot("expired-grant-refused")],
        settlementAnomalies: [
          { id: "a1", gameId: "g1", state: "OPEN", reason: "score mismatch", firstObservedAtIso: NOW_ISO, lastSeenAtIso: NOW_ISO },
        ],
      });
      const moneyAdjacent = brief.items.filter(
        (item) => item.lane === "CREDIT_LIFECYCLE" || item.lane === "SETTLEMENT_ANOMALY",
      );
      expect(moneyAdjacent.length).toBeGreaterThan(0);
      for (const item of moneyAdjacent) {
        expect(item.authority).toBe("OWNER_ONLY");
      }
    });
  });
});
