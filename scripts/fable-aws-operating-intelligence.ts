import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PersonalLearningEvidenceLedgerSchema } from "../apps/web/lib/fable/evidence/schemas";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..");

const REQUIRED_DOCS = [
  { category: "learning", path: "docs/personal/aws/README.md" },
  { category: "learning", path: "docs/personal/aws/AWS_TO_GSE_CROSSWALK.md" },
  { category: "learning", path: "docs/personal/aws/AWS_PORTFOLIO_CASE_STUDY.md" },
  { category: "learning", path: "docs/personal/aws/personal-learning-evidence.example.json" },
  { category: "guardrails", path: "docs/fable/aws/AWS_COST_SECURITY_GATES.md" },
  { category: "guardrails", path: "docs/fable/aws/AWS_OPERATING_INTELLIGENCE_MATRIX.md" },
  { category: "guardrails", path: "docs/fable/aws/AWS_NO_COST_WORKFLOW_BLUEPRINTS.md" },
  { category: "agents", path: "docs/fable/aws/AWS_AGENT_LAB_PLAYBOOK.md" },
  { category: "agents", path: "docs/fable/aws/AWS_BEDROCK_AGENTCORE_PLAN.md" },
  { category: "metrics", path: "docs/fable/aws/AWS_METRICS_AND_MATRICES.md" },
  { category: "pressure", path: "docs/fable/aws/AWS_INCUMBENT_PRESSURE_SYSTEM.md" },
  { category: "pressure", path: "docs/fable/aws/AWS_MICRO_EDGE_FACTORY.md" },
  { category: "data", path: "docs/fable/aws/AWS_LOCAL_DATA_FACTORY.md" },
  { category: "apps", path: "docs/fable/aws/AWS_LOCAL_APP_BLUEPRINTS.md" },
  { category: "machines", path: "docs/fable/aws/AWS_MACHINE_LADDER.md" },
  { category: "techniques", path: "docs/fable/aws/AWS_TECHNIQUE_LEDGER.md" },
  { category: "guardrails", path: "docs/fable/aws/AWS_OPERATING_INTELLIGENCE_RUNBOOK.md" },
] as const;

type RequiredCategory = (typeof REQUIRED_DOCS)[number]["category"];

function readJson(pathFromRoot: string): unknown {
  return JSON.parse(readFileSync(resolve(repoRoot, pathFromRoot), "utf8"));
}

function countDocs(category: RequiredCategory): number {
  return REQUIRED_DOCS.filter((doc) => doc.category === category).length;
}

const missingDocs = REQUIRED_DOCS.filter((doc) => !existsSync(resolve(repoRoot, doc.path)));
const learningEvidence = PersonalLearningEvidenceLedgerSchema.safeParse(
  readJson("docs/personal/aws/personal-learning-evidence.example.json")
);

if (!learningEvidence.success) {
  console.error(`[fable-aws-intel] personal learning evidence failed: ${learningEvidence.error.message}`);
  process.exit(1);
}

if (missingDocs.length > 0) {
  for (const doc of missingDocs) {
    console.error(`[fable-aws-intel] missing ${doc.category}: ${doc.path}`);
  }
  process.exit(1);
}

const evidenceEntries = learningEvidence.data.evidence;
const report = {
  status: "ok",
  generated_at: new Date().toISOString(),
  live_aws_action: false,
  paid_resource_used: false,
  docs_required: REQUIRED_DOCS.length,
  docs_present: REQUIRED_DOCS.length - missingDocs.length,
  category_counts: {
    agents: countDocs("agents"),
    apps: countDocs("apps"),
    data: countDocs("data"),
    guardrails: countDocs("guardrails"),
    learning: countDocs("learning"),
    machines: countDocs("machines"),
    metrics: countDocs("metrics"),
    pressure: countDocs("pressure"),
    techniques: countDocs("techniques"),
  },
  learning_evidence: {
    entries: evidenceEntries.length,
    owner_approved_for_public_use: evidenceEntries.filter((entry) => entry.owner_approved_for_public_use).length,
    no_secrets_confirmed: evidenceEntries.filter((entry) => entry.no_secrets_confirmed).length,
    no_paid_resource_confirmed: evidenceEntries.filter((entry) => entry.no_paid_resource_confirmed).length,
  },
};

console.log(JSON.stringify(report, null, 2));
