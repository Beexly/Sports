import { describe, expect, it } from "vitest";

import governanceData from "../../../data/nova/capability-governance-2026-07-22.json";
import {
  CAPABILITY_ROLLBACK_PLANS,
  CAPABILITY_STOP_CONDITION_PROFILES,
  CAPABILITY_VERSION_DRIFT_STATES,
  DRIFT_ELIGIBLE_VERSION_DRIFT_STATES,
  estimateCapabilityContextCost,
  expectedRollbackPlanIdForSurface,
  findCapabilityGovernanceRecord,
  getCapabilityGovernanceRecords,
  PLUGIN_CONTEXT_BASE_TOKENS,
  PLUGIN_CONTEXT_TOKENS_PER_SKILL,
  validateCapabilityGovernanceCoverage,
  validateCapabilityGovernanceDocument,
  validateCapabilityObservedPerformance,
  validateCapabilityPermissionManifest,
  type CapabilityObservedPerformance,
  type CapabilityPermissionManifest,
} from "@/lib/opportunity-engine/capability-governance";
import { getCapabilityInventory } from "@/lib/opportunity-engine/capability-inventory";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

type MutableLedger = Record<string, unknown> & {
  policy: Record<string, unknown>;
  baseline: Record<string, unknown> & { permissionManifest: Record<string, unknown> };
  records: unknown[][];
};

const BASELINE_MANIFEST: CapabilityPermissionManifest = {
  basis: "WORST_CASE_ASSUMPTION_PENDING_INSPECTION",
  network: "ASSUME_UNRESTRICTED",
  allowedHosts: [],
  fileRead: "ASSUME_UNRESTRICTED",
  fileWrite: "ASSUME_UNRESTRICTED",
  externalCommunication: "ASSUME_POSSIBLE",
  secretsAccess: "ASSUME_POSSIBLE",
};

describe("NOVA capability governance ledger data", () => {
  it("validates the shipped ledger document exactly as committed", () => {
    expect(validateCapabilityGovernanceDocument(governanceData)).toEqual([]);
  });

  it("covers every captured inventory entry exactly once with a matching pinned hash", () => {
    const records = getCapabilityGovernanceRecords();
    const inventory = getCapabilityInventory();
    expect(records).toHaveLength(inventory.length);
    expect(records).toHaveLength(293);
    expect(validateCapabilityGovernanceCoverage(records, inventory)).toEqual([]);
  });

  it("declares only honest baseline facts: worst-case scopes, unreviewed supply chain, unmonitored drift, zero observations", () => {
    const records = getCapabilityGovernanceRecords();
    for (const record of records) {
      expect(record.permissionManifest).toEqual(BASELINE_MANIFEST);
      expect(record.supplyChainState).toBe("UNREVIEWED");
      expect(record.versionDriftState).toBe("UNMONITORED_SINCE_CAPTURE");
      expect(record.maintenanceOwner).toBe("owner:founder");
      expect(record.observedPerformance).toEqual({
        state: "NO_OBSERVATIONS",
        runsObserved: 0,
        successes: 0,
        failures: 0,
        lastObservedAt: null,
      });
    }
  });

  it("bans the self-certifying no-drift value from the drift vocabulary", () => {
    expect([...CAPABILITY_VERSION_DRIFT_STATES].sort()).toEqual([
      "STALE_CAPTURE",
      "UNKNOWN",
      "UNMONITORED_SINCE_CAPTURE",
      "UPDATE_OBSERVED",
    ]);
    expect(CAPABILITY_VERSION_DRIFT_STATES.has("NONE_OBSERVED_SINCE_CAPTURE")).toBe(false);
    // Only real monitoring observations are drift-eligible; absence of
    // monitoring (UNMONITORED_SINCE_CAPTURE) fails closed like UNKNOWN.
    expect([...DRIFT_ELIGIBLE_VERSION_DRIFT_STATES].sort()).toEqual([
      "STALE_CAPTURE",
      "UPDATE_OBSERVED",
    ]);
    expect(DRIFT_ELIGIBLE_VERSION_DRIFT_STATES.has("UNMONITORED_SINCE_CAPTURE")).toBe(false);
    expect(DRIFT_ELIGIBLE_VERSION_DRIFT_STATES.has("UNKNOWN")).toBe(false);
  });

  it("pins each record's rollback plan to the capability's surface", () => {
    const records = getCapabilityGovernanceRecords();
    const entriesById = new Map(getCapabilityInventory().map((entry) => [entry.id, entry]));
    for (const record of records) {
      const entry = entriesById.get(record.capabilityId);
      expect(entry).toBeDefined();
      expect(record.rollbackPlanId).toBe(expectedRollbackPlanIdForSurface(entry!.surface));
    }
  });

  it("finds records by capability id and returns undefined for unknown ids", () => {
    const record = findCapabilityGovernanceRecord("claude_plugin:commit-commands");
    expect(record?.capabilityId).toBe("claude_plugin:commit-commands");
    expect(findCapabilityGovernanceRecord("claude_plugin:does-not-exist")).toBeUndefined();
  });

  it("rejects a ledger document with drift, duplicates, or unknown content", () => {
    const doc = clone(governanceData) as MutableLedger;
    doc.smuggled = true;
    doc.policy.autoActivationAllowed = true;
    doc.records.push([...doc.records[0]!] as unknown[]);
    const lastIndex = doc.records.length - 1;
    const errors = validateCapabilityGovernanceDocument(doc);
    expect(errors).toContain(
      "document.smuggled: unexpected key — the governance ledger may not carry unvalidated content.",
    );
    expect(errors).toContain("policy.autoActivationAllowed: must be exactly false.");
    expect(errors).toContain(
      `records[${lastIndex}][0]: duplicate governance record for ${String(doc.records[0]![0])}.`,
    );
  });

  it("rejects malformed record tuples, hashes, and unknown rollback plans", () => {
    const doc = clone(governanceData) as MutableLedger;
    doc.records[0] = ["only-an-id"];
    doc.records[1] = [String(doc.records[1]![0]), "sha256:wrong-scheme", "DISABLE_PLUGIN_V1"];
    doc.records[2] = [String(doc.records[2]![0]), String(doc.records[2]![1]), "UNINSTALL_EVERYTHING_V9"];
    const errors = validateCapabilityGovernanceDocument(doc);
    expect(errors).toContain(
      "records[0]: must be a 3-item [capabilityId, sourceProvenanceHash, rollbackPlanId] tuple.",
    );
    expect(errors).toContain("records[1][1]: sourceProvenanceHash must match fnv1a64:<16 hex>.");
    expect(errors).toContain("records[2][2]: unknown rollback plan UNINSTALL_EVERYTHING_V9.");
  });

  it("detects coverage failures: orphans, missing coverage, and hash drift", () => {
    const inventory = getCapabilityInventory();
    const records = getCapabilityGovernanceRecords();
    const first = inventory[0]!;

    const withoutFirst = records.filter((record) => record.capabilityId !== first.id);
    expect(validateCapabilityGovernanceCoverage(withoutFirst, inventory)).toEqual([
      `${first.id}: inventory entry has no governance record.`,
    ]);

    const orphan = { ...records[0]!, capabilityId: "claude_plugin:phantom-capability" };
    expect(validateCapabilityGovernanceCoverage([...withoutFirst, orphan], inventory)).toEqual([
      "claude_plugin:phantom-capability: governance record has no matching inventory entry.",
      `${first.id}: inventory entry has no governance record.`,
    ]);

    const drifted = records.map((record) =>
      record.capabilityId === first.id
        ? { ...record, sourceProvenanceHash: "fnv1a64:0000000000000000" }
        : record,
    );
    expect(validateCapabilityGovernanceCoverage(drifted, inventory)).toEqual([
      `${first.id}: pinned provenance hash does not match the captured inventory record.`,
    ]);
  });
});

describe("NOVA capability permission manifests and performance records", () => {
  it("accepts the baseline worst-case manifest and rejects incoherent host allowlists", () => {
    expect(validateCapabilityPermissionManifest(BASELINE_MANIFEST)).toEqual([]);
    expect(
      validateCapabilityPermissionManifest({
        ...BASELINE_MANIFEST,
        network: "ALLOWLISTED_HOSTS",
        allowedHosts: [],
      }),
    ).toEqual(["network ALLOWLISTED_HOSTS requires at least one allowed host."]);
    expect(
      validateCapabilityPermissionManifest({ ...BASELINE_MANIFEST, allowedHosts: ["api.example.com"] }),
    ).toEqual(["allowedHosts must be empty unless network is ALLOWLISTED_HOSTS."]);
  });

  it("rejects unknown scope values instead of guessing", () => {
    const bad = {
      ...BASELINE_MANIFEST,
      network: "FULL_ACCESS",
      fileWrite: "EVERYWHERE",
    } as unknown as CapabilityPermissionManifest;
    const errors = validateCapabilityPermissionManifest(bad);
    expect(errors).toContain("unknown network scope: FULL_ACCESS");
    expect(errors).toContain("unknown fileWrite scope: EVERYWHERE");
  });

  it("only accepts honest observed-performance records", () => {
    const none: CapabilityObservedPerformance = {
      state: "NO_OBSERVATIONS",
      runsObserved: 0,
      successes: 0,
      failures: 0,
      lastObservedAt: null,
    };
    expect(validateCapabilityObservedPerformance(none)).toEqual([]);

    expect(
      validateCapabilityObservedPerformance({ ...none, runsObserved: 5, successes: 5 }),
    ).toEqual(["NO_OBSERVATIONS requires zero runs and a null lastObservedAt."]);

    expect(
      validateCapabilityObservedPerformance({
        state: "OBSERVED",
        runsObserved: 2,
        successes: 2,
        failures: 1,
        lastObservedAt: "2026-07-22T00:00:00.000Z",
      }),
    ).toEqual(["successes + failures cannot exceed runsObserved."]);

    expect(
      validateCapabilityObservedPerformance({
        state: "OBSERVED",
        runsObserved: 0,
        successes: 0,
        failures: 0,
        lastObservedAt: "2026-07-22T00:00:00.000Z",
      }),
    ).toEqual(["OBSERVED requires at least one recorded run."]);
  });
});

describe("NOVA capability context-cost estimates and stop/rollback structures", () => {
  it("estimates plugin context cost with the declared heuristic and never claims measurement", () => {
    const estimate = estimateCapabilityContextCost({ surface: "CLAUDE_PLUGIN", skillCount: 13 });
    expect(estimate.basis).toBe("SKILL_COUNT_HEURISTIC_V1");
    expect(estimate.estimatedTokens).toBe(
      PLUGIN_CONTEXT_BASE_TOKENS + 13 * PLUGIN_CONTEXT_TOKENS_PER_SKILL,
    );
    expect(estimate.measured).toBe(false);
    expect(estimate.assumption).toContain("no measurement has been taken");
  });

  it("reports non-plugin surfaces as honestly unmeasured", () => {
    for (const surface of ["CLAUDE_CONNECTOR", "CLAUDE_SKILL", "CHATGPT_APP", "CHATGPT_SKILL"] as const) {
      const estimate = estimateCapabilityContextCost({ surface });
      expect(estimate.basis).toBe("UNMEASURED_SURFACE");
      expect(estimate.estimatedTokens).toBeNull();
      expect(estimate.measured).toBe(false);
    }
  });

  it("defines structured stop conditions with escalation responses, not prose-only guidance", () => {
    const profile = CAPABILITY_STOP_CONDITION_PROFILES.DEFAULT_CAPABILITY_V1;
    expect(profile.length).toBeGreaterThanOrEqual(5);
    const codes = profile.map((condition) => condition.code);
    expect(codes).toContain("UNDECLARED_NETWORK_ATTEMPT");
    expect(codes).toContain("PERMISSION_ESCALATION_REQUEST");
    expect(codes).toContain("SOURCE_DRIFT_DETECTED");
    expect(codes).toContain("OWNER_STOP_ORDER");
    for (const condition of profile) {
      expect(["UNLOAD_CAPABILITY", "HALT_TASK_AND_ESCALATE_TO_OWNER"]).toContain(
        condition.requiredResponse,
      );
      expect(condition.trigger.length).toBeGreaterThan(10);
    }
  });

  it("requires owner action for every rollback plan and maps each surface to exactly one plan", () => {
    for (const plan of Object.values(CAPABILITY_ROLLBACK_PLANS)) {
      expect(plan.ownerActionRequired).toBe(true);
      expect(plan.dataLossRisk).toBe("NONE_EXPECTED");
      expect(plan.steps.length).toBeGreaterThanOrEqual(2);
      for (const surface of plan.appliesToSurfaces) {
        expect(expectedRollbackPlanIdForSurface(surface)).toBe(plan.id);
      }
    }
  });
});
