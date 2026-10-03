import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  GSE_METRIC_SOURCE_RIGHTS_POLICIES,
  GSE_METRIC_SOURCE_RIGHTS_REGISTRY_FIXTURES,
  evaluateMetricPayloadRights,
  evaluateMetricSourceRights,
  metricSourceRightsPoliciesFromRegistry,
  metricSourceRightsPolicy,
  sourceRightsEnvelopeFromPolicy,
  type MetricPayloadField,
} from "../core/index.js";

const policies = GSE_METRIC_SOURCE_RIGHTS_POLICIES;

// Repo root, found by walking up from this file's directory (or the cwd when the
// runner provides no __dirname) until the unique root marker is hit:
// tsconfig.base.json exists ONLY at the repo root. process.cwd() alone made the
// run cwd-dependent — it passed in CI and failed from the repo root. The walk
// converges to the same root from any directory inside the repo; the control
// assertions in the tests keep a wrong root from passing vacuously.
function findRepoRoot(): string {
  let dir = typeof __dirname === "string" ? __dirname : process.cwd();
  for (let depth = 0; depth < 20; depth += 1) {
    if (existsSync(resolve(dir, "tsconfig.base.json"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error(
    "repo root not found: no ancestor directory contains tsconfig.base.json",
  );
}

const REPO_ROOT = findRepoRoot();

describe("metric source and payload rights", () => {
  it("keeps metric source fixtures aligned with the canonical web registry source ids", () => {
    const registryPath = resolve(REPO_ROOT, "apps/web/lib/scraping/source-rights-registry.ts");
    const registrySource = readFileSync(registryPath, "utf8");
    const canonicalIds = [...registrySource.matchAll(/source_id:\s*"([^"]+)"/g)].map((match) => match[1]);
    const fixtureIds = GSE_METRIC_SOURCE_RIGHTS_REGISTRY_FIXTURES.map((entry) => entry.source_id);

    // Controls: a wrong root would ENOENT above, but a stale registry or an empty
    // fixture list would make the comparison vacuously pass (both arrays empty).
    expect(canonicalIds.length, "registry matched zero source_id entries").toBeGreaterThan(0);
    expect(fixtureIds.length, "fixture registry is empty").toBeGreaterThan(0);

    expect(fixtureIds).toEqual(canonicalIds);
  });

  it("generates conservative metric source policies from registry-shaped fixtures", () => {
    const generated = metricSourceRightsPoliciesFromRegistry(GSE_METRIC_SOURCE_RIGHTS_REGISTRY_FIXTURES);
    const nflverse = metricSourceRightsPolicy(generated, "nflverse");
    const espn = metricSourceRightsPolicy(generated, "espn-public-api");
    const blocked = metricSourceRightsPolicy(generated, "siriusxm-activator");

    expect(nflverse?.permissions.modelTraining).toBe(true);
    expect(nflverse?.permissions.derivedApi).toBe(true);
    expect(nflverse?.permissions.rawApi).toBe(false);
    expect(espn?.permissions.derivedMetric).toBe(true);
    expect(espn?.permissions.derivedApi).toBe(false);
    expect(espn?.permissions.modelTraining).toBe(false);
    expect(blocked?.permissions.derivedMetric).toBe(false);
    expect(blocked?.permissions.storage).toBe(false);
  });

  it("allows nflverse modeling, validation, and derived exposure with attribution", () => {
    const modeling = evaluateMetricSourceRights({
      policies,
      sourceIds: ["nflverse"],
      use: "model_training",
    });
    const validation = evaluateMetricSourceRights({
      policies,
      sourceIds: ["nflverse"],
      use: "validation",
    });
    const derivedApi = evaluateMetricSourceRights({
      policies,
      sourceIds: ["nflverse"],
      use: "derived_api",
    });

    expect(modeling.allowed).toBe(true);
    expect(validation.allowed).toBe(true);
    expect(derivedApi.allowed).toBe(true);
    expect(derivedApi.requiredAttribution).toEqual([
      expect.stringContaining("Data from nflverse"),
    ]);
  });

  it("blocks The Odds API raw API exposure while allowing derived market payloads", () => {
    const rawApi = evaluateMetricSourceRights({
      policies,
      sourceIds: ["the-odds-api"],
      use: "raw_api",
    });
    const derivedApi = evaluateMetricSourceRights({
      policies,
      sourceIds: ["the-odds-api"],
      use: "derived_api",
    });

    expect(rawApi.allowed).toBe(false);
    expect(rawApi.violations[0]).toContain("blocks raw API exposure");
    expect(derivedApi.allowed).toBe(true);
  });

  it("maps source policies into metric asset source-rights envelopes", () => {
    const nflversePolicy = metricSourceRightsPolicy(policies, "nflverse");

    expect(nflversePolicy).not.toBeNull();
    if (nflversePolicy === null) return;

    const envelope = sourceRightsEnvelopeFromPolicy(nflversePolicy);

    expect(envelope.sourceId).toBe("nflverse");
    expect(envelope.mayUseForModeling).toBe(true);
    expect(envelope.mayValidateAgainst).toBe(true);
    expect(envelope.mayExposeDerived).toBe(true);
    expect(envelope.mayExposeRaw).toBe(false);
    expect(envelope.attributionRequired).toContain("nflverse");
  });

  it("blocks raw odds fields from API payloads", () => {
    const fields: readonly MetricPayloadField[] = [
      {
        description: "Market gravity score derived from licensed odds movement.",
        exposure: "API",
        kind: "DERIVED_METRIC",
        path: "marketGravity.score",
        sourceIds: ["the-odds-api"],
      },
      {
        description: "Raw sportsbook price copied from provider feed.",
        exposure: "API",
        kind: "RAW_SOURCE_VALUE",
        path: "odds.bookmakers[0].markets[0].outcomes[0].price",
        sourceIds: ["the-odds-api"],
      },
    ];

    const decision = evaluateMetricPayloadRights({ exposure: "API", fields, policies });

    expect(decision.allowed).toBe(false);
    expect(decision.violations[0]).toContain("raw source value");
    expect(decision.violations[0]).toContain("the-odds-api");
  });

  it("allows derived API payloads when the source permits derived exposure", () => {
    const fields: readonly MetricPayloadField[] = [
      {
        description: "Market gravity score derived from licensed odds movement.",
        exposure: "API",
        kind: "DERIVED_METRIC",
        path: "marketGravity.score",
        sourceIds: ["the-odds-api"],
      },
    ];

    const decision = evaluateMetricPayloadRights({ exposure: "API", fields, policies });

    expect(decision.allowed).toBe(true);
    expect(decision.violations).toEqual([]);
  });

  it("fails closed when a payload field references an unknown source policy", () => {
    const fields: readonly MetricPayloadField[] = [
      {
        description: "Unclear market signal with no source policy.",
        exposure: "API",
        kind: "DERIVED_METRIC",
        path: "mystery.signal",
        sourceIds: ["unknown-vendor"],
      },
    ];

    const decision = evaluateMetricPayloadRights({ exposure: "API", fields, policies });

    expect(decision.allowed).toBe(false);
    expect(decision.violations[0]).toContain("missing source-rights policy");
  });
});
