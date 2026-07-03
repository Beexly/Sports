import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { scanUnsupportedFableClaims } from "../apps/web/lib/fable/claim-scanner";
import { buildFableSourceRegistry } from "../apps/web/lib/fable/source-registry";
import {
  validateAwsGateDefaults,
  validateAwsDecisionEngineDefaults,
  validateClaimLedger,
  validateFableSourceRegistryEntries,
  validateGithubVisibility,
  validatePersonalLearningEvidence,
  type EvidenceValidationIssue,
} from "../apps/web/lib/fable/evidence/validators";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..");

function readText(pathFromRoot: string): string {
  return readFileSync(resolve(repoRoot, pathFromRoot), "utf8");
}

function readJson(pathFromRoot: string): unknown {
  return JSON.parse(readText(pathFromRoot));
}

function collectFiles(dirFromRoot: string, extension: string): readonly string[] {
  const root = resolve(repoRoot, dirFromRoot);
  if (!existsSync(root)) return [];
  return readdirSync(root).flatMap((entry) => {
    const fullPath = resolve(root, entry);
    const relativePath = `${dirFromRoot}/${entry}`.replace(/\\/g, "/");
    if (statSync(fullPath).isDirectory()) return collectFiles(relativePath, extension);
    return entry.endsWith(extension) ? [relativePath] : [];
  });
}

function validateClaims(): readonly EvidenceValidationIssue[] {
  const ledger = validateClaimLedger(readJson("docs/fable/evidence/CLAIM_EVIDENCE_LEDGER.json"));
  const scanFiles = [
    ...collectFiles("docs/fable", ".md"),
    ...collectFiles("apps/web/lib/fable", ".ts"),
  ].filter((filePath) => !filePath.endsWith(".test.ts") && !filePath.endsWith("claim-scanner.ts"));
  const scanIssues = scanFiles.flatMap((filePath) =>
    scanUnsupportedFableClaims(readText(filePath)).map((hit) => ({
      code: "unsupported-claim-text",
      message: `${hit.phrase}: ${hit.snippet}`,
      path: `${filePath}:${hit.line}`,
      severity: "error" as const,
    }))
  );
  return [...ledger.issues, ...scanIssues];
}

function validateSources(): readonly EvidenceValidationIssue[] {
  return validateFableSourceRegistryEntries(buildFableSourceRegistry()).issues;
}

function validateVisibility(): readonly EvidenceValidationIssue[] {
  return validateGithubVisibility(readText("docs/fable/INDEX.md"), readText("README.md")).issues;
}

function validateAws(): readonly EvidenceValidationIssue[] {
  return [...validateAwsGateDefaults().issues, ...validateAwsDecisionEngineDefaults().issues];
}

function validateLearning(): readonly EvidenceValidationIssue[] {
  return validatePersonalLearningEvidence(readJson("docs/personal/aws/personal-learning-evidence.example.json")).issues;
}

function runMode(mode: string): readonly EvidenceValidationIssue[] {
  if (mode === "claims") return validateClaims();
  if (mode === "sources") return validateSources();
  if (mode === "aws-gates") return validateAws();
  if (mode === "learning") return validateLearning();
  if (mode === "visibility") return validateVisibility();
  return [...validateClaims(), ...validateSources(), ...validateAws(), ...validateLearning(), ...validateVisibility()];
}

const mode = process.argv[2] ?? "all";
const issues = runMode(mode);

if (issues.length > 0) {
  for (const issue of issues) {
    console.error(`[${issue.severity}] ${issue.code} ${issue.path}: ${issue.message}`);
  }
  process.exit(1);
}

console.log(`[fable-evidence] OK - ${mode}`);
