import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const REPO_ROOT = resolve(__dirname, "..", "..", "..");

function runAwsCompatibilityGuard(): { readonly status: number; readonly stdout: string; readonly stderr: string } {
  const result = spawnSync("node", ["scripts/guardrails/aws-compatibility-index-scan.mjs"], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    timeout: 120_000,
  });

  return {
    status: typeof result.status === "number" ? result.status : 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

describe("AWS compatibility index", () => {
  it("keeps exact docs and infra paths local-only", () => {
    const result = runAwsCompatibilityGuard();

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("[aws-compatibility-index-scan] OK");
    expect(result.stderr).toBe("");
  });

  it("wires the AWS compatibility guard into package scripts", () => {
    const packageJson = readFileSync(resolve(REPO_ROOT, "package.json"), "utf8");

    expect(packageJson).toContain('"guard:aws-compatibility-index"');
    expect(packageJson).toContain("aws-compatibility-index-scan.mjs");
    expect(packageJson).toContain("node scripts/guardrails/aws-compatibility-index-scan.mjs && node scripts/eval-contracts.mjs");
  });

  it("points compatibility files to existing canonical artifacts", () => {
    const manifest = readFileSync(resolve(REPO_ROOT, "infra/aws-shadow/compatibility-manifest.json"), "utf8");
    const requiredReferences = [
      "docs/fable/aws/README.md",
      "docs/fable/aws/AWS_SERVICE_SCORECARD.md",
      "docs/fable/aws/governance-os/SHADOW_CONTROL_TOWER_BLUEPRINT.json",
      "infrastructure/aws/cdk/shadow-control-tower-synth.fixture.json",
    ];

    for (const reference of requiredReferences) {
      expect(manifest).toContain(reference);
      expect(existsSync(resolve(REPO_ROOT, reference))).toBe(true);
    }
  });
});
