import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  AWS_LOCAL_FIXTURE_TYPES,
  AwsLocalFixtureLibrarySchema,
  WELL_ARCHITECTED_PILLARS,
  validateAwsLocalFixtureLibrary,
} from "./aws-local-fixtures";

const repoRoot = resolve(__dirname, "..", "..", "..", "..");

function readFixtureLibrary(): unknown {
  return JSON.parse(readFileSync(resolve(repoRoot, "docs/fable/aws/fixtures/AWS_LOCAL_FIXTURE_LIBRARY.json"), "utf8"));
}

describe("AWS local fixture library", () => {
  it("validates all no-cost AWS mock and refusal fixtures", () => {
    const result = validateAwsLocalFixtureLibrary(readFixtureLibrary());

    expect(result.ok).toBe(true);
    expect(result.issues).toHaveLength(0);
    expect(result.fixtureCount).toBeGreaterThanOrEqual(AWS_LOCAL_FIXTURE_TYPES.length);
    for (const pillar of WELL_ARCHITECTED_PILLARS) {
      expect(result.pillarCoverage[pillar]).toBe(true);
    }
  });

  it("rejects live or paid fixture claims", () => {
    const library = AwsLocalFixtureLibrarySchema.parse(readFixtureLibrary());
    const result = validateAwsLocalFixtureLibrary({
      ...library,
      fixtures: library.fixtures.map((fixture, index) =>
        index === 0 ? { ...fixture, success_metrics: ["paid resource works"] } : fixture
      ),
    });

    expect(result.ok).toBe(false);
    expect(result.issues.join("\n")).toContain("success metrics must stay local and no-cost");
  });
});
