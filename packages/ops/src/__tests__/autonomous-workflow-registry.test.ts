import { describe, expect, it } from "vitest";
import {
  AUTONOMOUS_WORKFLOW_REGISTRY,
  ENTITY_GOVERNANCE_RECORD,
  summarizeAutonomyCoverage,
  validateAutonomousWorkflowRegistry,
} from "../autonomous-workflow-registry.js";

describe("Autonomous Workflow & Entity Governance Registry", () => {
  it("pins GALAXY SPORTS NETWORK LLC active entity and $0 GSI Texas SOS cure", () => {
    expect(ENTITY_GOVERNANCE_RECORD.operatingEntityName).toBe("GALAXY SPORTS NETWORK LLC");
    expect(ENTITY_GOVERNANCE_RECORD.operatingEntityFilingId).toBe("TX SOS #0806617184");
    expect(ENTITY_GOVERNANCE_RECORD.researchDivisionFilingId).toBe("TX SOS #15043440630001");
    expect(ENTITY_GOVERNANCE_RECORD.researchDivisionCureFeeUsd).toBe(0);
    expect(ENTITY_GOVERNANCE_RECORD.clinicalToSportsWeight).toBe(0);
    expect(ENTITY_GOVERNANCE_RECORD.realMoneyStakeCleared).toBe(false);
  });

  it("validates all 9 autonomous workflows enforce fail-closed gates and zero paid spend", () => {
    const validation = validateAutonomousWorkflowRegistry(AUTONOMOUS_WORKFLOW_REGISTRY);
    expect(validation.valid).toBe(true);
    expect(validation.violations).toEqual([]);
    expect(validation.totalWorkflows).toBe(9);

    const summary = summarizeAutonomyCoverage();
    expect(summary.allZeroPaidCost).toBe(true);
    expect(summary.byDomain.gsi).toBeGreaterThanOrEqual(1);
    expect(summary.byDomain["dual-use"]).toBeGreaterThanOrEqual(2);
    expect(summary.byDomain.platform).toBeGreaterThanOrEqual(4);
  });
});
