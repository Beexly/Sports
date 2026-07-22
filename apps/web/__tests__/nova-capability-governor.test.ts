import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import * as capabilityGovernance from "@/lib/opportunity-engine/capability-governance";
import * as capabilityGovernor from "@/lib/opportunity-engine/capability-governor";
import * as capabilityInventoryModule from "@/lib/opportunity-engine/capability-inventory";
import * as capabilityProvenance from "@/lib/opportunity-engine/capability-provenance";
import * as capabilitySourceSchema from "@/lib/opportunity-engine/capability-source-schema";
import {
  classifyCapabilityTrust,
  detectCapabilityRisk,
  MAX_INSPECTION_CANDIDATES,
  routeCapabilities,
  selectInspectionCandidates,
  type InspectionSelectionInput,
} from "@/lib/opportunity-engine/capability-governor";
import {
  getCapabilityGovernanceRecords,
  type CapabilityGovernanceRecord,
} from "@/lib/opportunity-engine/capability-governance";
import {
  findCapabilitiesByName,
  getCapabilityInventory,
} from "@/lib/opportunity-engine/capability-inventory";

describe("NOVA capability governor", () => {
  it("loads no more than three inspected candidates and never auto-activates them", () => {
    const route = routeCapabilities("GSE_REPOSITORY_IMPLEMENTATION");
    expect(route.selected.length).toBeLessThanOrEqual(3);
    expect(route.selected.map((candidate) => candidate.entry.name)).toEqual([
      "Commit commands",
      "Engineering",
      "Code simplifier",
    ]);
    expect(route.selected.every((candidate) => candidate.disposition === "INSPECT_BEFORE_USE")).toBe(true);
    expect(route.selected.every((candidate) => candidate.executionAuthority === false)).toBe(true);
    expect(route.autoActivationAllowed).toBe(false);
    expect(route.externalActionsAllowed).toBe(false);
  });

  it("prefers bounded first-party or vendor-maintained tools over giant or autonomous bundles", () => {
    const local = routeCapabilities("LOCAL_CODING_CONTINUITY");
    expect(local.selected.map((candidate) => candidate.entry.name)).toEqual([
      "Commit commands",
      "Pr review toolkit",
      "Code simplifier",
    ]);
    expect(local.held.map((candidate) => candidate.entry.name)).toEqual(
      expect.arrayContaining(["Karpathy coder", "Ralph loop", "Self improving agent"]),
    );

    const ecc = findCapabilitiesByName("Ecc").find((entry) => entry.surface === "CLAUDE_PLUGIN");
    expect(ecc).toBeDefined();
    expect(detectCapabilityRisk(ecc!)).toEqual(expect.arrayContaining(["LARGE_BUNDLE", "MASSIVE_BUNDLE"]));
  });

  it("routes observability to a small competitive set rather than loading the whole telemetry catalog", () => {
    const route = routeCapabilities("NOVA_OBSERVABILITY");
    expect(route.selected.map((candidate) => candidate.entry.name)).toEqual([
      "Langfuse",
      "SigNoz",
      "Honeycomb",
    ]);
    expect(route.held.map((candidate) => candidate.entry.name)).toEqual(
      expect.arrayContaining(["Grafana Cloud MCP", "Grafana Assistant", "Posthog", "ClickHouse"]),
    );
  });

  it("uses official AWS candidates but still treats infrastructure work as permission-sensitive", () => {
    const route = routeCapabilities("AWS_ARCHITECTURE_AND_CREDITS");
    expect(route.selected.map((candidate) => candidate.entry.name)).toEqual([
      "AWS Startup Advisor",
      "Aws core",
      "Aws amplify",
    ]);
    for (const candidate of route.selected) {
      expect(candidate.trustTier).toBe("VENDOR_MAINTAINED");
      expect(candidate.riskFlags).toContain("DEPLOYMENT_OR_INFRASTRUCTURE");
      expect(candidate.executionAuthority).toBe(false);
    }
  });

  it("does not infer trust from a plugin name or captured author label alone", () => {
    const official = findCapabilitiesByName("Commit commands").find(
      (entry) => entry.surface === "CLAUDE_PLUGIN",
    );
    const thirdParty = findCapabilitiesByName("Karpathy coder").find(
      (entry) => entry.surface === "CLAUDE_PLUGIN",
    );
    const unknown = findCapabilitiesByName("Buildkite").find(
      (entry) => entry.surface === "CLAUDE_PLUGIN",
    );
    expect(classifyCapabilityTrust(official!)).toBe("PLATFORM_FIRST_PARTY");
    expect(classifyCapabilityTrust(thirdParty!)).toBe("THIRD_PARTY");
    expect(classifyCapabilityTrust(unknown!)).toBe("UNKNOWN_AUTHOR");

    const route = routeCapabilities("GSE_PR_REVIEW");
    expect(route.selected.every((candidate) => candidate.trustEvidence === "CAPTURED_AUTHOR_LABEL_ONLY")).toBe(true);
    expect(route.held.map((candidate) => candidate.entry.name)).toContain("Buildkite");
  });

  it("holds self-modifying and autonomous-loop candidates even when third-party candidates are allowed", () => {
    const route = routeCapabilities("LOCAL_CODING_CONTINUITY", {
      allowThirdPartyCandidates: true,
      maxSelected: 3,
    });
    const ralph = route.held.find((candidate) => candidate.entry.name === "Ralph loop");
    const selfImproving = route.held.find(
      (candidate) => candidate.entry.name === "Self improving agent",
    );
    expect(ralph?.riskFlags).toContain("AUTONOMOUS_LOOP");
    expect(selfImproving?.riskFlags).toContain("SELF_MODIFICATION");
    expect(ralph?.disposition).toBe("HOLD");
    expect(selfImproving?.disposition).toBe("HOLD");
  });
});

// ---------------------------------------------------------------------------
// Hardened governed selection (S2 directive, 2026-07-22).
// ---------------------------------------------------------------------------

const NOW = "2026-07-22T12:00:00.000Z";
const RUN_ID = "s2-governor-test-run";
const COMMIT_COMMANDS_ID = "claude_plugin:commit-commands";

function select(
  overrides: Partial<InspectionSelectionInput> = {},
): ReturnType<typeof selectInspectionCandidates> {
  return selectInspectionCandidates({
    taskClass: "GSE_REPOSITORY_IMPLEMENTATION",
    generatedAt: NOW,
    runId: RUN_ID,
    ...overrides,
  });
}

function withMutatedRecord(
  capabilityId: string,
  mutate: (record: CapabilityGovernanceRecord) => CapabilityGovernanceRecord,
): readonly CapabilityGovernanceRecord[] {
  return getCapabilityGovernanceRecords().map((record) =>
    record.capabilityId === capabilityId ? mutate(record) : record,
  );
}

function ineligibleFor(
  recommendation: ReturnType<typeof selectInspectionCandidates>,
  capabilityId: string,
) {
  return recommendation.ineligible.find((record) => record.capabilityId === capabilityId);
}

describe("NOVA governed inspection selection — recommendation record shape", () => {
  it("produces a recommendation record only, echoing caller-supplied run identity and time", () => {
    const recommendation = select();
    expect(recommendation.recordKind).toBe("CAPABILITY_INSPECTION_RECOMMENDATION");
    expect(recommendation.schemaVersion).toBe(1);
    expect(recommendation.runId).toBe(RUN_ID);
    expect(recommendation.generatedAt).toBe(NOW);
    expect(recommendation.autoActivationAllowed).toBe(false);
    expect(recommendation.externalActionsAllowed).toBe(false);
    expect(recommendation.activationApiExported).toBe(false);
    expect(recommendation.selectionCap).toBe(MAX_INSPECTION_CANDIDATES);
    expect(recommendation.policy.join(" ")).toContain("fail closed");
  });

  it("contains no callables anywhere in the record — activation cannot ride on the output", () => {
    const seen = new Set<unknown>();
    const assertNoFunctions = (value: unknown, path: string): void => {
      if (typeof value === "function") {
        throw new Error(`recommendation record contains a function at ${path}`);
      }
      if (typeof value !== "object" || value === null || seen.has(value)) return;
      seen.add(value);
      for (const [key, child] of Object.entries(value)) {
        assertNoFunctions(child, `${path}.${key}`);
      }
    };
    expect(() => assertNoFunctions(select(), "record")).not.toThrow();
  });

  it("selects the same governed set as the captured-metadata shortlist when the full baseline ledger applies", () => {
    const recommendation = select();
    expect(recommendation.selected.map((candidate) => candidate.entry.name)).toEqual([
      "Commit commands",
      "Engineering",
      "Code simplifier",
    ]);
    for (const candidate of recommendation.selected) {
      expect(candidate.disposition).toBe("INSPECT_BEFORE_USE");
      expect(candidate.executionAuthority).toBe(false);
      expect(candidate.governance.permissionManifest).not.toBeNull();
      expect(candidate.governance.supplyChainState).toBe("UNREVIEWED");
      expect(candidate.governance.sourceProvenanceHash).toBe(candidate.entry.provenanceHash);
      expect(candidate.stopConditions.length).toBeGreaterThanOrEqual(5);
      expect(candidate.rollbackPlan.id).toBe("DISABLE_PLUGIN_V1");
      expect(candidate.rollbackPlan.ownerActionRequired).toBe(true);
      expect(candidate.contextCostEstimate.measured).toBe(false);
    }
  });
});

describe("NOVA governed inspection selection — ranking determinism", () => {
  it("returns deeply identical records for identical inputs", () => {
    expect(select()).toEqual(select());
  });

  it("is insensitive to the order of the supplied governance records", () => {
    const records = getCapabilityGovernanceRecords();
    const reversed = [...records].reverse();
    expect(select({ governanceRecords: reversed })).toEqual(select({ governanceRecords: records }));
  });

  it("ranks by score, then task-fit rank, then capability id — a total, reproducible order", () => {
    const recommendation = select({ allowThirdPartyCandidates: true });
    const scores = recommendation.selected.map((candidate) => candidate.score);
    expect([...scores].sort((a, b) => b - a)).toEqual(scores);
    for (const [index, candidate] of recommendation.selected.entries()) {
      const next = recommendation.selected[index + 1];
      if (next && candidate.score === next.score) {
        expect(
          candidate.taskFitRank < next.taskFitRank ||
            (candidate.taskFitRank === next.taskFitRank &&
              candidate.capabilityId < next.capabilityId),
        ).toBe(true);
      }
    }
  });

  it("never reads a clock: identical output regardless of when it runs, timestamps from the caller only", () => {
    const early = select({ generatedAt: "2026-01-01T00:00:00.000Z" });
    const late = select({ generatedAt: "2027-01-01T00:00:00.000Z" });
    expect(early.selected).toEqual(late.selected);
    expect(early.ineligible).toEqual(late.ineligible);
    expect(early.generatedAt).toBe("2026-01-01T00:00:00.000Z");
    expect(late.generatedAt).toBe("2027-01-01T00:00:00.000Z");
  });
});

describe("NOVA governed inspection selection — the cap of three", () => {
  it("never selects more than three candidates even with more eligible", () => {
    const recommendation = select({
      taskClass: "LOCAL_CODING_CONTINUITY",
      allowThirdPartyCandidates: true,
    });
    const eligibleCount =
      recommendation.selected.length +
      recommendation.held.filter((candidate) => candidate.disposition === "INSPECT_BEFORE_USE").length;
    expect(eligibleCount).toBeGreaterThan(3);
    expect(recommendation.selected.length).toBe(3);
  });

  it("honors a smaller requested cap and reports unselected eligible candidates as held", () => {
    const two = select({ maxSelected: 2 });
    expect(two.selected).toHaveLength(2);
    const zero = select({ maxSelected: 0 });
    expect(zero.selected).toHaveLength(0);
    expect(zero.held.some((candidate) => candidate.disposition === "INSPECT_BEFORE_USE")).toBe(true);
  });

  it("refuses any request for more than three — the caller may request less authority, never more", () => {
    expect(() => select({ maxSelected: 4 })).toThrow(RangeError);
    expect(() => select({ maxSelected: 100 })).toThrow(RangeError);
    expect(() => select({ maxSelected: -1 })).toThrow(RangeError);
    expect(() => select({ maxSelected: 1.5 })).toThrow(RangeError);
  });

  it("rejects malformed run identity, timestamps, and task classes outright", () => {
    expect(() => select({ generatedAt: "yesterday-ish" })).toThrow(TypeError);
    expect(() => select({ generatedAt: "" })).toThrow(TypeError);
    expect(() => select({ runId: "   " })).toThrow(TypeError);
    expect(() =>
      select({ taskClass: "TOTALLY_NEW_TASK" as unknown as InspectionSelectionInput["taskClass"] }),
    ).toThrow(TypeError);
  });
});

describe("NOVA governed inspection selection — fail-closed disqualification", () => {
  it("selects nothing when no governance records exist at all", () => {
    const recommendation = select({ governanceRecords: [] });
    expect(recommendation.selected).toEqual([]);
    expect(recommendation.held).toEqual([]);
    expect(recommendation.ineligible.length).toBeGreaterThan(0);
    for (const record of recommendation.ineligible) {
      expect(record.reasons).toEqual(["NO_GOVERNANCE_RECORD"]);
      expect(record.failClosed).toBe(true);
    }
  });

  it("disqualifies a capability with a missing permission manifest", () => {
    const recommendation = select({
      governanceRecords: withMutatedRecord(COMMIT_COMMANDS_ID, (record) => ({
        ...record,
        permissionManifest: null,
      })),
    });
    expect(ineligibleFor(recommendation, COMMIT_COMMANDS_ID)?.reasons).toEqual([
      "MISSING_PERMISSION_MANIFEST",
    ]);
    expect(
      recommendation.selected.some((candidate) => candidate.capabilityId === COMMIT_COMMANDS_ID),
    ).toBe(false);
    // The rest of the population still selects — fail closed is per capability.
    expect(recommendation.selected.length).toBeGreaterThan(0);
  });

  it("disqualifies a capability whose manifest fails structural validation", () => {
    const recommendation = select({
      governanceRecords: withMutatedRecord(COMMIT_COMMANDS_ID, (record) => ({
        ...record,
        permissionManifest: {
          ...record.permissionManifest!,
          network: "FULL_ACCESS" as never,
        },
      })),
    });
    expect(ineligibleFor(recommendation, COMMIT_COMMANDS_ID)?.reasons).toEqual([
      "INVALID_PERMISSION_MANIFEST",
    ]);
  });

  it("disqualifies an unknown supply-chain state — declared UNKNOWN and unrecognized strings alike", () => {
    for (const state of ["UNKNOWN", "TOTALLY_FINE_TRUST_ME"]) {
      const recommendation = select({
        governanceRecords: withMutatedRecord(COMMIT_COMMANDS_ID, (record) => ({
          ...record,
          supplyChainState: state as CapabilityGovernanceRecord["supplyChainState"],
        })),
      });
      expect(ineligibleFor(recommendation, COMMIT_COMMANDS_ID)?.reasons).toEqual([
        "UNKNOWN_SUPPLY_CHAIN_STATE",
      ]);
    }
  });

  it("disqualifies an unknown version-drift state", () => {
    const recommendation = select({
      governanceRecords: withMutatedRecord(COMMIT_COMMANDS_ID, (record) => ({
        ...record,
        versionDriftState: "UNKNOWN",
      })),
    });
    expect(ineligibleFor(recommendation, COMMIT_COMMANDS_ID)?.reasons).toEqual([
      "UNKNOWN_VERSION_DRIFT_STATE",
    ]);
  });

  it("keeps observed-update drift eligible — that is exactly what inspection is for", () => {
    const recommendation = select({
      governanceRecords: withMutatedRecord(COMMIT_COMMANDS_ID, (record) => ({
        ...record,
        versionDriftState: "UPDATE_OBSERVED",
      })),
    });
    expect(ineligibleFor(recommendation, COMMIT_COMMANDS_ID)).toBeUndefined();
    const candidate = recommendation.selected.find(
      (item) => item.capabilityId === COMMIT_COMMANDS_ID,
    );
    expect(candidate?.reasons).toContain("version drift state UPDATE_OBSERVED");
  });

  it("disqualifies a missing or malformed provenance hash", () => {
    for (const hash of ["", "not-a-hash", "sha256:abcdef0123456789"]) {
      const recommendation = select({
        governanceRecords: withMutatedRecord(COMMIT_COMMANDS_ID, (record) => ({
          ...record,
          sourceProvenanceHash: hash,
        })),
      });
      expect(ineligibleFor(recommendation, COMMIT_COMMANDS_ID)?.reasons).toEqual([
        "MISSING_PROVENANCE_HASH",
      ]);
    }
  });

  it("disqualifies a well-formed but drifted provenance hash", () => {
    const recommendation = select({
      governanceRecords: withMutatedRecord(COMMIT_COMMANDS_ID, (record) => ({
        ...record,
        sourceProvenanceHash: "fnv1a64:0123456789abcdef",
      })),
    });
    expect(ineligibleFor(recommendation, COMMIT_COMMANDS_ID)?.reasons).toEqual([
      "PROVENANCE_HASH_MISMATCH",
    ]);
  });

  it("disqualifies unknown stop-condition profiles and rollback plans", () => {
    const recommendation = select({
      governanceRecords: withMutatedRecord(COMMIT_COMMANDS_ID, (record) => ({
        ...record,
        stopConditionProfile: "MYSTERY_PROFILE" as never,
        rollbackPlanId: "UNINSTALL_EVERYTHING_V9" as never,
      })),
    });
    expect(ineligibleFor(recommendation, COMMIT_COMMANDS_ID)?.reasons).toEqual([
      "UNKNOWN_STOP_CONDITION_PROFILE",
      "UNKNOWN_ROLLBACK_PLAN",
    ]);
  });

  it("disqualifies fabricated observed-performance claims", () => {
    const recommendation = select({
      governanceRecords: withMutatedRecord(COMMIT_COMMANDS_ID, (record) => ({
        ...record,
        observedPerformance: {
          state: "NO_OBSERVATIONS",
          runsObserved: 40,
          successes: 40,
          failures: 0,
          lastObservedAt: null,
        },
      })),
    });
    expect(ineligibleFor(recommendation, COMMIT_COMMANDS_ID)?.reasons).toEqual([
      "MALFORMED_OBSERVED_PERFORMANCE",
    ]);
  });

  it("disqualifies a record whose observed-performance field is missing entirely", () => {
    const recommendation = select({
      governanceRecords: withMutatedRecord(COMMIT_COMMANDS_ID, (record) => ({
        ...record,
        observedPerformance: undefined as never,
      })),
    });
    expect(ineligibleFor(recommendation, COMMIT_COMMANDS_ID)?.reasons).toEqual([
      "MALFORMED_OBSERVED_PERFORMANCE",
    ]);
    // The malformed record disqualifies only its own capability.
    expect(recommendation.selected.length).toBeGreaterThan(0);
  });

  it("disqualifies a capability with duplicate governance records", () => {
    const records = getCapabilityGovernanceRecords();
    const duplicate = records.find((record) => record.capabilityId === COMMIT_COMMANDS_ID);
    expect(duplicate).toBeDefined();
    const recommendation = select({ governanceRecords: [...records, duplicate!] });
    expect(ineligibleFor(recommendation, COMMIT_COMMANDS_ID)?.reasons).toContain(
      "DUPLICATE_GOVERNANCE_RECORD",
    );
  });

  it("accumulates every violated rule instead of stopping at the first", () => {
    const recommendation = select({
      governanceRecords: withMutatedRecord(COMMIT_COMMANDS_ID, (record) => ({
        ...record,
        permissionManifest: null,
        supplyChainState: "UNKNOWN",
        sourceProvenanceHash: "",
      })),
    });
    expect(ineligibleFor(recommendation, COMMIT_COMMANDS_ID)?.reasons).toEqual([
      "MISSING_PERMISSION_MANIFEST",
      "UNKNOWN_SUPPLY_CHAIN_STATE",
      "MISSING_PROVENANCE_HASH",
    ]);
  });

  it("reports task preferences that resolve to no captured inventory entry", () => {
    const inventory = getCapabilityInventory().filter(
      (entry) => entry.id !== COMMIT_COMMANDS_ID,
    );
    const recommendation = select({ inventory });
    expect(recommendation.unresolvedPreferences).toContain("Commit commands");
    expect(
      recommendation.selected.some((candidate) => candidate.capabilityId === COMMIT_COMMANDS_ID),
    ).toBe(false);
  });

  it("still hard-holds autonomous and self-modifying capabilities even with full governance records", () => {
    const recommendation = select({
      taskClass: "LOCAL_CODING_CONTINUITY",
      allowThirdPartyCandidates: true,
    });
    const ralph = recommendation.held.find((candidate) => candidate.entry.name === "Ralph loop");
    const selfImproving = recommendation.held.find(
      (candidate) => candidate.entry.name === "Self improving agent",
    );
    expect(ralph?.disposition).toBe("HOLD");
    expect(ralph?.riskFlags).toContain("AUTONOMOUS_LOOP");
    expect(selfImproving?.disposition).toBe("HOLD");
    expect(selfImproving?.riskFlags).toContain("SELF_MODIFICATION");
  });
});

describe("NOVA S2 structural no-activation guarantees", () => {
  const S2_MODULES: ReadonlyArray<readonly [string, Record<string, unknown>]> = [
    ["capability-provenance", capabilityProvenance],
    ["capability-source-schema", capabilitySourceSchema],
    ["capability-inventory", capabilityInventoryModule],
    ["capability-governance", capabilityGovernance],
    ["capability-governor", capabilityGovernor],
  ];

  it("exports no activation, enablement, installation, or execution API from any S2 module", () => {
    const bannedNamePattern = /activat|enable|install|execu|deploy|launch|connectCapability|turnOn/i;
    for (const [moduleName, moduleNamespace] of S2_MODULES) {
      const exportNames = Object.keys(moduleNamespace);
      expect(exportNames.length).toBeGreaterThan(0);
      for (const exportName of exportNames) {
        expect(
          bannedNamePattern.test(exportName),
          `${moduleName} exports "${exportName}" which looks like an activation API`,
        ).toBe(false);
      }
    }
  });

  it("uses no clocks and no randomness anywhere in the S2 modules — timestamps are parameters", () => {
    const libDir = join(__dirname, "../lib/opportunity-engine");
    for (const file of [
      "capability-provenance.ts",
      "capability-source-schema.ts",
      "capability-inventory.ts",
      "capability-governance.ts",
      "capability-governor.ts",
    ]) {
      const source = readFileSync(join(libDir, file), "utf8");
      expect(source, `${file} must not read the clock`).not.toMatch(/\bDate\.now\s*\(/);
      expect(source, `${file} must not construct wall-clock dates`).not.toMatch(/new\s+Date\s*\(\s*\)/);
      expect(source, `${file} must not use randomness`).not.toMatch(/\bMath\.random\s*\(/);
      expect(source, `${file} must not touch Prisma`).not.toMatch(
        /@prisma\/client|PrismaClient|from ["'][^"']*\/db["']/,
      );
    }
  });
});
