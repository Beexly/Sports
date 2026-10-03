import { describe, expect, it } from "vitest";
import {
  metricSourceRightsPoliciesFromRegistry,
  metricSourceRightsPolicyFromRegistryEntry,
  type MetricSourceRightsRegistryEntry,
} from "../source-rights-registry-adapter.js";
import type {
  MetricSourceRightsPermissionSet,
  MetricSourceRightsStatus,
} from "../source-rights.js";

const APPROVED_STATUSES = [
  "approved_open_license",
  "approved_api",
  "approved_public_logged_off",
  "approved_written_permission",
] as const satisfies readonly MetricSourceRightsStatus[];

const NON_APPROVED_STATUSES = [
  "manual_research_only",
  "permission_required",
  "blocked_technical_controls",
  "vendor_candidate",
  "excluded",
] as const satisfies readonly MetricSourceRightsStatus[];

const ALL_STATUSES = [
  ...APPROVED_STATUSES,
  ...NON_APPROVED_STATUSES,
] as const satisfies readonly MetricSourceRightsStatus[];

const ZERO_PERMISSIONS: MetricSourceRightsPermissionSet = {
  contentDisplay: false,
  derivedApi: false,
  derivedMetric: false,
  modelTraining: false,
  rawApi: false,
  storage: false,
  validation: false,
};

function registryEntry(
  status: MetricSourceRightsStatus,
  overrides: Partial<MetricSourceRightsRegistryEntry> = {},
): MetricSourceRightsRegistryEntry {
  return {
    attribution_required: true,
    attribution_text: "Credit the source",
    commercial_display_allowed: true,
    derived_analytics_allowed: true,
    evidence_urls: ["https://example.test/evidence"],
    model_training_allowed: true,
    notes: "synthetic registry entry",
    source_id: "synthetic-source",
    source_name: "Synthetic Source",
    status,
    storage_allowed: true,
    ...overrides,
  };
}

describe("metricSourceRightsPolicyFromRegistryEntry", () => {
  it("covers every MetricSourceRightsStatus", () => {
    expect(ALL_STATUSES).toHaveLength(9);
  });

  it("zeroes every permission for non-approved statuses even when registry flags are true", () => {
    for (const status of NON_APPROVED_STATUSES) {
      const policy = metricSourceRightsPolicyFromRegistryEntry(registryEntry(status));

      expect(policy.status, status).toBe(status);
      expect(policy.permissions, status).toEqual(ZERO_PERMISSIONS);
    }
  });

  it("never grants rawApi, including on fully-flagged approved statuses", () => {
    for (const status of ALL_STATUSES) {
      const policy = metricSourceRightsPolicyFromRegistryEntry(registryEntry(status));
      expect(policy.permissions.rawApi, status).toBe(false);
    }
  });

  it("maps approved statuses with all flags set to derived, display, training, storage, and validation", () => {
    for (const status of APPROVED_STATUSES) {
      const policy = metricSourceRightsPolicyFromRegistryEntry(registryEntry(status));

      expect(policy.permissions, status).toEqual({
        contentDisplay: true,
        derivedApi: true,
        derivedMetric: true,
        modelTraining: true,
        rawApi: false,
        storage: true,
        validation: true,
      });
    }
  });

  it("grants derivedApi for open/licensed/written statuses even when commercial display is false", () => {
    const openLicense = metricSourceRightsPolicyFromRegistryEntry(
      registryEntry("approved_open_license", { commercial_display_allowed: false }),
    );
    const api = metricSourceRightsPolicyFromRegistryEntry(
      registryEntry("approved_api", { commercial_display_allowed: false }),
    );
    const written = metricSourceRightsPolicyFromRegistryEntry(
      registryEntry("approved_written_permission", { commercial_display_allowed: false }),
    );

    expect(openLicense.permissions.contentDisplay).toBe(false);
    expect(openLicense.permissions.derivedMetric).toBe(true);
    expect(openLicense.permissions.derivedApi).toBe(true);
    expect(api.permissions.derivedApi).toBe(true);
    expect(written.permissions.derivedApi).toBe(true);
  });

  it("does not treat approved_public_logged_off as open/licensed for derivedApi", () => {
    const noDisplay = metricSourceRightsPolicyFromRegistryEntry(
      registryEntry("approved_public_logged_off", { commercial_display_allowed: false }),
    );
    const withDisplay = metricSourceRightsPolicyFromRegistryEntry(
      registryEntry("approved_public_logged_off"),
    );

    expect(noDisplay.permissions.derivedMetric).toBe(true);
    expect(noDisplay.permissions.contentDisplay).toBe(false);
    expect(noDisplay.permissions.derivedApi).toBe(false);
    expect(withDisplay.permissions.derivedApi).toBe(true);
  });

  it("requires derived_analytics_allowed for derivedMetric, derivedApi, and validation", () => {
    const policy = metricSourceRightsPolicyFromRegistryEntry(
      registryEntry("approved_open_license", { derived_analytics_allowed: false }),
    );

    expect(policy.permissions.derivedMetric).toBe(false);
    expect(policy.permissions.derivedApi).toBe(false);
    expect(policy.permissions.validation).toBe(false);
    expect(policy.permissions.contentDisplay).toBe(true);
    expect(policy.permissions.storage).toBe(true);
  });

  it("requires storage_allowed for validation even when derived analytics are allowed", () => {
    const policy = metricSourceRightsPolicyFromRegistryEntry(
      registryEntry("approved_api", { storage_allowed: false }),
    );

    expect(policy.permissions.derivedMetric).toBe(true);
    expect(policy.permissions.storage).toBe(false);
    expect(policy.permissions.validation).toBe(false);
  });

  it("maps modelTraining and contentDisplay independently from the registry flags", () => {
    const policy = metricSourceRightsPolicyFromRegistryEntry(
      registryEntry("approved_written_permission", {
        commercial_display_allowed: false,
        model_training_allowed: false,
      }),
    );

    expect(policy.permissions.modelTraining).toBe(false);
    expect(policy.permissions.contentDisplay).toBe(false);
    expect(policy.permissions.derivedMetric).toBe(true);
    expect(policy.permissions.derivedApi).toBe(true);
  });

  it("copies attribution, evidence refs, and the non-clearance note regardless of status", () => {
    const policy = metricSourceRightsPolicyFromRegistryEntry(
      registryEntry("excluded", {
        attribution_required: true,
        attribution_text: "Do not use",
        evidence_urls: ["https://example.test/excluded"],
        notes: "activation bypass",
        source_id: "siriusxm-activator",
        source_name: "SiriusXM activator",
      }),
    );

    expect(policy.sourceId).toBe("siriusxm-activator");
    expect(policy.registrySourceId).toBe("siriusxm-activator");
    expect(policy.sourceName).toBe("SiriusXM activator");
    expect(policy.attribution).toEqual({ required: true, text: "Do not use" });
    expect(policy.evidenceRefs).toEqual([
      "apps/web/lib/scraping/source-rights-registry.ts#siriusxm-activator",
      "https://example.test/excluded",
    ]);
    expect(policy.notes).toEqual([
      "Generated from the canonical web source-rights registry fixture; this is not legal clearance.",
      "activation bypass",
    ]);
    expect(policy.permissions).toEqual(ZERO_PERMISSIONS);
  });
});

describe("metricSourceRightsPoliciesFromRegistry", () => {
  it("maps every entry and sorts by sourceId", () => {
    const policies = metricSourceRightsPoliciesFromRegistry([
      registryEntry("approved_api", { source_id: "zeta", source_name: "Zeta" }),
      registryEntry("excluded", { source_id: "alpha", source_name: "Alpha" }),
    ]);

    expect(policies.map((policy) => policy.sourceId)).toEqual(["alpha", "zeta"]);
    expect(policies[0]?.permissions).toEqual(ZERO_PERMISSIONS);
    expect(policies[1]?.permissions.derivedApi).toBe(true);
  });
});
