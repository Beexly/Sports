import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { buildFableSourceRegistry } from "../source-registry";
import {
  validateAwsGateDefaults,
  validateAwsDecisionEngineDefaults,
  validateClaimLedger,
  validateFableSourceRegistryEntries,
  validateGithubVisibility,
} from "./validators";
import { buildForensicDemoReport } from "./forensic-demo";

const repoRoot = resolve(__dirname, "..", "..", "..", "..", "..");

function readJson(pathFromRoot: string): unknown {
  return JSON.parse(readFileSync(resolve(repoRoot, pathFromRoot), "utf8"));
}

describe("FABLE evidence harness", () => {
  it("validates the checked-in claim evidence ledger", () => {
    const result = validateClaimLedger(readJson("docs/fable/evidence/CLAIM_EVIDENCE_LEDGER.json"));

    expect(result.ok).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it("rejects a proven claim without evidence", () => {
    const result = validateClaimLedger({
      claims: [
        {
          claim_id: "bad",
          claim_type: "model-performance claim",
          command_proving_it: "none",
          cost_risk: "none",
          data_source_used: "none",
          evidence_files: [],
          evidence_line_or_test_path: "none",
          exact_claim_text: "unsupported model gain",
          legal_source_risk: "none",
          next_action: "downgrade",
          owner_decision_needed: false,
          security_risk: "none",
          source_file_or_prompt_section: "test",
          status: "proven",
          test_result: "none",
        },
      ],
      generated_at: "2026-07-03T00:00:00.000Z",
      schema_version: "fable-claim-evidence-ledger-v1",
      scope_note: "test",
    });

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain("proven-without-evidence");
  });

  it("validates source registry and AWS default gates", () => {
    expect(validateFableSourceRegistryEntries(buildFableSourceRegistry()).ok).toBe(true);
    expect(validateAwsGateDefaults().ok).toBe(true);
    expect(validateAwsDecisionEngineDefaults().ok).toBe(true);
  });

  it("validates GitHub navigation paths", () => {
    const index = readFileSync(resolve(repoRoot, "docs/fable/INDEX.md"), "utf8");
    const readme = readFileSync(resolve(repoRoot, "README.md"), "utf8");
    const result = validateGithubVisibility(index, readme);

    expect(result.ok).toBe(true);
  });

  it("builds the fixture-only forensic demo report", () => {
    const fixture = readJson("docs/fable/demo/fixture-public-forensic.json");
    const report = buildForensicDemoReport(fixture);

    expect(report.fixture_id).toBe("fixture-nfl-public-001");
    expect(report.uncertainty_flag).toBe(true);
    expect(report.would_not_claim).toContain("betting edge");
    expect(existsSync(resolve(repoRoot, "docs/fable/demo/PUBLIC_DATA_FORENSIC_REPORT.md"))).toBe(true);
  });
});
