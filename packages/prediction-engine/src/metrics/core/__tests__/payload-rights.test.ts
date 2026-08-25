import { describe, expect, it } from "vitest";
import { evaluateMetricPayloadRights } from "../payload-rights.js";
import {
  GSE_METRIC_SOURCE_RIGHTS_POLICIES,
  type MetricSourceRightsPermissionSet,
  type MetricSourceRightsPolicy,
} from "../source-rights.js";
import type { MetricPayloadExposure, MetricPayloadField } from "../payload-rights.js";

const policies = GSE_METRIC_SOURCE_RIGHTS_POLICIES;

function field(overrides: Partial<MetricPayloadField> & Pick<MetricPayloadField, "path">): MetricPayloadField {
  return {
    description: "fixture field",
    exposure: "API",
    kind: "DERIVED_METRIC",
    sourceIds: ["nflverse"],
    ...overrides,
  };
}

function policy(overrides: Partial<MetricSourceRightsPolicy> = {}): MetricSourceRightsPolicy {
  const permissions: MetricSourceRightsPermissionSet = {
    contentDisplay: true,
    derivedApi: true,
    derivedMetric: true,
    modelTraining: true,
    rawApi: false,
    storage: true,
    validation: true,
    ...overrides.permissions,
  };
  return {
    attribution: { required: true, text: "Credit Synthetic Source" },
    evidenceRefs: [],
    notes: [],
    permissions,
    registrySourceId: "synthetic-source",
    sourceId: "synthetic-source",
    sourceName: "Synthetic Source",
    status: "approved_api",
    ...overrides,
  };
}

describe("evaluateMetricPayloadRights", () => {
  it("blocks a field whose exposure rank is below the requested exposure", () => {
    const cases: readonly {
      fieldExposure: MetricPayloadExposure;
      requested: MetricPayloadExposure;
      blocked: boolean;
    }[] = [
      { blocked: false, fieldExposure: "INTERNAL", requested: "INTERNAL" },
      { blocked: true, fieldExposure: "INTERNAL", requested: "CONTENT" },
      { blocked: true, fieldExposure: "INTERNAL", requested: "API" },
      { blocked: false, fieldExposure: "CONTENT", requested: "INTERNAL" },
      { blocked: false, fieldExposure: "CONTENT", requested: "CONTENT" },
      { blocked: true, fieldExposure: "CONTENT", requested: "API" },
      { blocked: false, fieldExposure: "API", requested: "INTERNAL" },
      { blocked: false, fieldExposure: "API", requested: "CONTENT" },
      { blocked: false, fieldExposure: "API", requested: "API" },
    ];

    for (const row of cases) {
      const decision = evaluateMetricPayloadRights({
        exposure: row.requested,
        fields: [
          field({
            exposure: row.fieldExposure,
            kind: "DERIVED_METRIC",
            path: "rank.field",
          }),
        ],
        policies,
      });

      if (row.blocked) {
        expect(decision.allowed, `${row.fieldExposure} vs ${row.requested}`).toBe(false);
        expect(decision.blockedFields).toEqual(["rank.field"]);
        expect(decision.approvedFields).toEqual([]);
        expect(decision.violations).toEqual([
          `rank.field: field exposure ${row.fieldExposure} is below requested ${row.requested}`,
        ]);
      } else {
        expect(decision.allowed, `${row.fieldExposure} vs ${row.requested}`).toBe(true);
        expect(decision.approvedFields).toEqual(["rank.field"]);
        expect(decision.blockedFields).toEqual([]);
      }
    }
  });

  it("blocks PROTECTED_WEIGHT fields outside INTERNAL review", () => {
    const internal = evaluateMetricPayloadRights({
      exposure: "INTERNAL",
      fields: [
        field({
          exposure: "INTERNAL",
          kind: "PROTECTED_WEIGHT",
          path: "weights.lineMovement",
        }),
      ],
      policies,
    });
    const content = evaluateMetricPayloadRights({
      exposure: "CONTENT",
      fields: [
        field({
          exposure: "CONTENT",
          kind: "PROTECTED_WEIGHT",
          path: "weights.lineMovement",
        }),
      ],
      policies,
    });
    const api = evaluateMetricPayloadRights({
      exposure: "API",
      fields: [
        field({
          exposure: "API",
          kind: "PROTECTED_WEIGHT",
          path: "weights.lineMovement",
        }),
      ],
      policies,
    });

    expect(internal.allowed).toBe(true);
    expect(internal.approvedFields).toEqual(["weights.lineMovement"]);
    expect(content.allowed).toBe(false);
    expect(content.violations).toEqual([
      "weights.lineMovement: protected weights cannot be exposed outside internal review",
    ]);
    expect(api.allowed).toBe(false);
    expect(api.violations).toEqual([
      "weights.lineMovement: protected weights cannot be exposed outside internal review",
    ]);
  });

  it("emits both rank and protected-weight violations when an INTERNAL weight is requested at API", () => {
    const decision = evaluateMetricPayloadRights({
      exposure: "API",
      fields: [
        field({
          exposure: "INTERNAL",
          kind: "PROTECTED_WEIGHT",
          path: "weights.hidden",
        }),
      ],
      policies,
    });

    expect(decision.allowed).toBe(false);
    expect(decision.blockedFields).toEqual(["weights.hidden"]);
    expect(decision.violations).toEqual([
      "weights.hidden: field exposure INTERNAL is below requested API",
      "weights.hidden: protected weights cannot be exposed outside internal review",
    ]);
  });

  it("blocks RAW_SOURCE_VALUE only on API payloads", () => {
    const api = evaluateMetricPayloadRights({
      exposure: "API",
      fields: [
        field({
          exposure: "API",
          kind: "RAW_SOURCE_VALUE",
          path: "odds.price",
          sourceIds: ["the-odds-api"],
        }),
      ],
      policies,
    });
    const content = evaluateMetricPayloadRights({
      exposure: "CONTENT",
      fields: [
        field({
          exposure: "CONTENT",
          kind: "RAW_SOURCE_VALUE",
          path: "odds.price",
          sourceIds: ["the-odds-api"],
        }),
      ],
      policies,
    });
    const internal = evaluateMetricPayloadRights({
      exposure: "INTERNAL",
      fields: [
        field({
          exposure: "INTERNAL",
          kind: "RAW_SOURCE_VALUE",
          path: "odds.price",
          sourceIds: ["the-odds-api"],
        }),
      ],
      policies,
    });

    expect(api.allowed).toBe(false);
    expect(api.violations).toEqual([
      "odds.price: raw source value from the-odds-api cannot be exposed through metric API payloads",
    ]);
    expect(content.allowed).toBe(true);
    expect(content.approvedFields).toEqual(["odds.price"]);
    expect(internal.allowed).toBe(true);
    expect(internal.approvedFields).toEqual(["odds.price"]);
  });

  it("always blocks UNSUPPORTED_PROBABILITY_CLAIM fields", () => {
    const exposures: readonly MetricPayloadExposure[] = ["INTERNAL", "CONTENT", "API"];

    for (const exposure of exposures) {
      const decision = evaluateMetricPayloadRights({
        exposure,
        fields: [
          field({
            exposure,
            kind: "UNSUPPORTED_PROBABILITY_CLAIM",
            path: "win.probability",
          }),
        ],
        policies,
      });

      expect(decision.allowed, exposure).toBe(false);
      expect(decision.blockedFields).toEqual(["win.probability"]);
      expect(decision.violations).toEqual([
        "win.probability: unsupported probability claims cannot be exposed through metric payloads",
      ]);
    }
  });

  it("dedupes requiredAttribution across fields that share a source", () => {
    const decision = evaluateMetricPayloadRights({
      exposure: "API",
      fields: [
        field({ path: "metrics.expectedYac.score" }),
        field({
          kind: "PUBLIC_DRIVER",
          path: "metrics.expectedYac.drivers.space",
        }),
      ],
      policies,
    });

    expect(decision.allowed).toBe(true);
    expect(decision.approvedFields).toEqual([
      "metrics.expectedYac.score",
      "metrics.expectedYac.drivers.space",
    ]);
    expect(decision.requiredAttribution).toEqual([
      "Data from nflverse (https://github.com/nflverse), CC-BY-4.0",
    ]);
  });

  it("keeps requiredAttribution unique when two sources share the same attribution text", () => {
    const shared = "Credit Shared Source";
    const localPolicies = [
      policy({
        attribution: { required: true, text: shared },
        registrySourceId: "alpha",
        sourceId: "alpha",
        sourceName: "Alpha",
      }),
      policy({
        attribution: { required: true, text: shared },
        registrySourceId: "beta",
        sourceId: "beta",
        sourceName: "Beta",
      }),
    ];

    const decision = evaluateMetricPayloadRights({
      exposure: "API",
      fields: [
        field({ path: "alpha.score", sourceIds: ["alpha"] }),
        field({ path: "beta.score", sourceIds: ["beta"] }),
      ],
      policies: localPolicies,
    });

    expect(decision.allowed).toBe(true);
    expect(decision.requiredAttribution).toEqual([shared]);
  });

  it("approves derived, public-driver, and aggregate fields when source rights clear", () => {
    const decision = evaluateMetricPayloadRights({
      exposure: "API",
      fields: [
        field({ kind: "DERIVED_METRIC", path: "marketGravity.score", sourceIds: ["the-odds-api"] }),
        field({ kind: "PUBLIC_DRIVER", path: "marketGravity.drivers.move", sourceIds: ["the-odds-api"] }),
        field({
          kind: "AGGREGATE_SUMMARY",
          path: "marketGravity.band",
          sourceIds: ["the-odds-api"],
        }),
      ],
      policies,
    });

    expect(decision.allowed).toBe(true);
    expect(decision.blockedFields).toEqual([]);
    expect(decision.violations).toEqual([]);
    expect(decision.approvedFields).toEqual([
      "marketGravity.score",
      "marketGravity.drivers.move",
      "marketGravity.band",
    ]);
    expect(decision.requiredAttribution).toEqual([]);
  });

  it("blocks a field whose source policy denies the mapped use", () => {
    const decision = evaluateMetricPayloadRights({
      exposure: "API",
      fields: [
        field({
          path: "fallback.espnSignal",
          sourceIds: ["espn-public-api"],
        }),
      ],
      policies,
    });

    expect(decision.allowed).toBe(false);
    expect(decision.blockedFields).toEqual(["fallback.espnSignal"]);
    expect(decision.violations).toEqual([
      "fallback.espnSignal: espn-public-api blocks derived API exposure",
    ]);
  });

  it("treats PROVIDER_IDENTIFIER API fields as raw API use, which registry policies deny", () => {
    const decision = evaluateMetricPayloadRights({
      exposure: "API",
      fields: [
        field({
          kind: "PROVIDER_IDENTIFIER",
          path: "odds.bookmakerId",
          sourceIds: ["the-odds-api"],
        }),
      ],
      policies,
    });

    expect(decision.allowed).toBe(false);
    expect(decision.blockedFields).toEqual(["odds.bookmakerId"]);
    expect(decision.violations).toEqual(["odds.bookmakerId: the-odds-api blocks raw API exposure"]);
  });

  it("keeps allowed true only when every field is approved", () => {
    const decision = evaluateMetricPayloadRights({
      exposure: "API",
      fields: [
        field({ path: "marketGravity.score", sourceIds: ["the-odds-api"] }),
        field({
          kind: "RAW_SOURCE_VALUE",
          path: "odds.price",
          sourceIds: ["the-odds-api"],
        }),
      ],
      policies,
    });

    expect(decision.allowed).toBe(false);
    expect(decision.approvedFields).toEqual(["marketGravity.score"]);
    expect(decision.blockedFields).toEqual(["odds.price"]);
  });
});
