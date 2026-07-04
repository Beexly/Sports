import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { ShadowControlTowerBlueprintSchema, evaluateShadowControlTowerBlueprint } from "./aws-governance-os";

const repoRoot = resolve(__dirname, "..", "..", "..", "..");

function readShadowBlueprint(): unknown {
  return JSON.parse(
    readFileSync(resolve(repoRoot, "docs/fable/aws/governance-os/SHADOW_CONTROL_TOWER_BLUEPRINT.json"), "utf8")
  );
}

describe("FABLE AWS governance OS", () => {
  it("validates the local Shadow Control Tower blueprint", () => {
    const result = evaluateShadowControlTowerBlueprint(readShadowBlueprint());

    expect(result.ok).toBe(true);
    expect(result.issues).toHaveLength(0);
    expect(result.guardrailCount).toBeGreaterThanOrEqual(6);
    expect(result.controlTypeCounts.preventive).toBeGreaterThan(0);
    expect(result.controlTypeCounts.detective).toBeGreaterThan(0);
    expect(result.controlTypeCounts.proactive).toBeGreaterThan(0);
    expect(result.pillarChecks).toHaveLength(6);
    expect(result.pillarChecks.every((check) => check.guardrailIds.length > 0)).toBe(true);
  });

  it("rejects a blueprint that misses Well-Architected pillar coverage", () => {
    const blueprint = ShadowControlTowerBlueprintSchema.parse(readShadowBlueprint());
    const result = evaluateShadowControlTowerBlueprint({
      ...blueprint,
      guardrails: blueprint.guardrails.map((guardrail) => ({ ...guardrail, pillar: "security" as const })),
    });

    expect(result.ok).toBe(false);
    expect(result.issues.join("\n")).toContain("missing Well-Architected pillar guardrail");
  });
});
