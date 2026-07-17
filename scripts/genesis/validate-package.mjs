#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const errors = [];
const warnings = [];

function pathOf(relativePath) {
  return resolve(root, relativePath);
}

function requireFile(relativePath) {
  if (!existsSync(pathOf(relativePath))) {
    errors.push(`missing required file: ${relativePath}`);
    return false;
  }
  return true;
}

function read(relativePath) {
  return readFileSync(pathOf(relativePath), "utf8");
}

function parseJson(relativePath) {
  try {
    return JSON.parse(read(relativePath));
  } catch (error) {
    errors.push(`invalid JSON in ${relativePath}: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

const requiredFiles = [
  ".claude/commands/gse-autopilot.md",
  ".claude/commands/genesis-next.md",
  "GENESIS_START_HERE.md",
  "docs/genesis/CANON_MANIFEST.json",
  "docs/genesis/CLOUD_CAPABILITY_MESH.md",
  "docs/genesis/CODEBASE_TWIN_SPEC.md",
  "docs/genesis/COMPLETE_CANON.md",
  "docs/genesis/CONTINUOUS_EXECUTION_CONTRACT.md",
  "docs/genesis/DECISIONS.md",
  "docs/genesis/EXPANSION_ATLAS.md",
  "docs/genesis/FIRST_BUILD_CONTRACT.md",
  "docs/genesis/META_COMPILER_SPEC.md",
  "docs/genesis/ORIGIN_SOURCE_MAP.md",
  "docs/genesis/PACKAGE_INVENTORY.md",
  "docs/genesis/PLATFORM_ECOSYSTEM_MAP.md",
  "docs/genesis/README.md",
  "docs/genesis/SOURCE_LEDGER.md",
  "docs/genesis/SOURCE_LEDGER_EXTENDED.md",
  "docs/genesis/WORK_QUEUE.md",
  "docs/genesis/atlas/01-intelligence-and-science.md",
  "docs/genesis/atlas/02-data-process-world-and-privacy.md",
  "docs/genesis/atlas/03-provenance-causality-product-and-epistemics.md",
  "docs/genesis/atlas/04-evolution-verification-and-human-ai.md",
  "docs/genesis/atlas/05-metrology-context-execution-and-resilience.md",
  "docs/genesis/atlas/06-cloud-supply-chain-and-institutional-intelligence.md",
  "docs/genesis/fixtures/capability-candidates.example.json",
  "docs/genesis/fixtures/internal-brief.contract.json",
];

for (const file of requiredFiles) requireFile(file);

const manifest = requireFile("docs/genesis/CANON_MANIFEST.json")
  ? parseJson("docs/genesis/CANON_MANIFEST.json")
  : null;
const capabilityFixture = requireFile("docs/genesis/fixtures/capability-candidates.example.json")
  ? parseJson("docs/genesis/fixtures/capability-candidates.example.json")
  : null;
const contractFixture = requireFile("docs/genesis/fixtures/internal-brief.contract.json")
  ? parseJson("docs/genesis/fixtures/internal-brief.contract.json")
  : null;

const allowedStates = new Set([
  "PRESERVED_RND",
  "BOUND_DOCTRINE",
  "READY",
  "BLOCKED_BY_DEPENDENCY",
  "RESEARCH_ONLY",
  "OWNER_GATE",
  "SHADOW",
  "IMPLEMENTED",
  "SUPERSEDED",
]);

if (manifest) {
  if (manifest.publicProduct !== "Galaxy Sports Edge") {
    errors.push("CANON_MANIFEST publicProduct must remain Galaxy Sports Edge");
  }
  if (manifest.internalProgram !== "Galaxy Genesis") {
    errors.push("CANON_MANIFEST internalProgram must remain Galaxy Genesis");
  }
  if (manifest.currentWorkstream !== "GX-000") {
    errors.push("CANON_MANIFEST currentWorkstream must remain GX-000 until the first verified implementation receipt updates it");
  }
  if (!Array.isArray(manifest.systems) || manifest.systems.length === 0) {
    errors.push("CANON_MANIFEST systems must be a non-empty array");
  } else {
    const ids = new Set();
    const queue = requireFile("docs/genesis/WORK_QUEUE.md") ? read("docs/genesis/WORK_QUEUE.md") : "";
    for (const [index, system] of manifest.systems.entries()) {
      const prefix = `CANON_MANIFEST systems[${index}]`;
      if (!system || typeof system !== "object") {
        errors.push(`${prefix} must be an object`);
        continue;
      }
      for (const field of ["id", "name", "domain", "status", "workstream"]) {
        if (typeof system[field] !== "string" || system[field].trim() === "") {
          errors.push(`${prefix}.${field} must be a non-empty string`);
        }
      }
      if (typeof system.id === "string") {
        if (ids.has(system.id)) errors.push(`duplicate CANON_MANIFEST system id: ${system.id}`);
        ids.add(system.id);
      }
      if (!allowedStates.has(system.status)) {
        errors.push(`${prefix}.status is outside the allowed vocabulary: ${String(system.status)}`);
      }
      if (!Array.isArray(system.dependencies)) {
        errors.push(`${prefix}.dependencies must be an array`);
      } else if (system.dependencies.some((value) => typeof value !== "string")) {
        errors.push(`${prefix}.dependencies must contain strings only`);
      }
      if (!Array.isArray(system.canonicalDocs) || system.canonicalDocs.length === 0) {
        errors.push(`${prefix}.canonicalDocs must be a non-empty array`);
      } else {
        for (const doc of system.canonicalDocs) {
          if (typeof doc !== "string" || doc.trim() === "") {
            errors.push(`${prefix}.canonicalDocs must contain non-empty strings`);
          } else if (!existsSync(pathOf(doc))) {
            errors.push(`${prefix} references missing canonical document: ${doc}`);
          }
        }
      }
      const workstreamIds = typeof system.workstream === "string"
        ? system.workstream.match(/\b(?:GX|HF)-\d{3}\b/g) ?? []
        : [];
      for (const workstreamId of workstreamIds) {
        if (!queue.includes(workstreamId)) {
          warnings.push(`${system.id} references ${workstreamId}, which is not yet listed verbatim in WORK_QUEUE.md`);
        }
      }
    }
  }
}

if (capabilityFixture && !Array.isArray(capabilityFixture) && !Array.isArray(capabilityFixture.capabilities)) {
  warnings.push("capability candidate fixture is valid JSON but does not expose an array at the root or under capabilities");
}

if (contractFixture && typeof contractFixture !== "object") {
  errors.push("internal brief contract fixture must be a JSON object");
}

if (requireFile("docs/genesis/CONTINUOUS_EXECUTION_CONTRACT.md") && requireFile(".claude/commands/gse-autopilot.md")) {
  const continuousContract = read("docs/genesis/CONTINUOUS_EXECUTION_CONTRACT.md");
  const autopilot = read(".claude/commands/gse-autopilot.md");
  const requiredLoopTerms = [
    "REVIEW",
    "FREEZE CONTRACT",
    "CODE",
    "INDEPENDENT REVIEW",
    "IMPROVE",
    "POLISH",
    "CONTINUE",
  ];
  for (const term of requiredLoopTerms) {
    if (!continuousContract.includes(term)) errors.push(`continuous execution contract is missing loop term: ${term}`);
    if (!autopilot.includes(term)) errors.push(`gse-autopilot command is missing loop term: ${term}`);
  }
  for (const invariant of [
    "finish the current queue before branch/PR reconciliation",
    "Queue-drain law",
    "Never claim an unrun command",
    "Do not begin `/genesis-reconcile inventory` yet",
  ]) {
    if (!continuousContract.includes(invariant) && !autopilot.includes(invariant)) {
      errors.push(`continuous execution package is missing invariant: ${invariant}`);
    }
  }
}

const canonConcepts = [
  "Evidence Missions",
  "Adaptive Cognitive Sharding",
  "SportsIR",
  "Four clocks",
  "Reality Compiler",
  "Evidence Mesh",
  "Source Genome",
  "Consensus Illusion Detector",
  "Unknownness Map",
  "Branching Reality",
  "Galaxy Multiverse",
  "Reality Receipts",
  "Intelligence Contracts",
  "Galaxy Metacortex",
  "Codebase Twin",
  "Value-of-Information Router",
  "Robust Decision Layer",
  "GitHub Software Genome",
  "Hugging Face Neural Foundry",
  "Hub Genome",
  "Capability Firewall",
  "Galaxy Combine",
  "Model Franchise",
  "Shadow League",
  "Failure Atlas",
  "Research Grid",
  "Adapter Constellation",
  "Latent Sports Atlas",
  "Time-Series Shadow League",
  "Multimodal Scene Lab",
  "Edge Cortex",
  "Space Forge",
  "Hugging Face Reflex",
  "Galaxy Commons",
  "Research Cortex",
  "Unknown-Unknown Radar",
  "Red Queen Laboratory",
  "Causal Constitution",
  "Scientific Law Foundry",
  "Negative Knowledge",
  "Science-to-Product Compiler",
  "Model Ecology",
  "Agent Civilization",
  "Product Twin",
  "Decision Twin",
  "Galaxy Twin",
  "Dynasty Studio",
  "Private Intelligence Federation",
  "Edge Swarm",
  "Assumption Graph",
  "Galaxy Metrology Institute",
  "Context Compiler",
  "Plan Superoptimizer",
  "Hardware-Aware Execution Compiler",
  "Resilience and Chaos Twin",
  "Rights, Artifact, and Policy Drift Reflex",
  "Multi-Cloud Capability Mesh",
  "Cognitive Observability Fabric",
  "Quality-Diversity Research Archive",
  "Cybernetic Governor",
  "Coherence and Entropy Governor",
  "Capability Recombinator",
  "Global Consistency and Contextuality Lab",
  "Sports Economy and Institutional Twin",
];

if (requireFile("docs/genesis/COMPLETE_CANON.md")) {
  const canon = read("docs/genesis/COMPLETE_CANON.md");
  for (const concept of canonConcepts) {
    if (!canon.includes(concept)) errors.push(`COMPLETE_CANON is missing accepted concept: ${concept}`);
  }
}

const requiredOrigins = [
  "XiaoYouChR/Ghost-Downloader-3",
  "NikolaiT/GoogleScraper",
  "zh-google-styleguide/zh-google-styleguide",
  "googleapis/google-api-php-client",
  "gtoderici/sports-1m-dataset",
  "ScrapingBee/google-sports-results-api",
  "sindresorhus/awesome",
  "Azure/azure-quickstart-templates",
  "MicrosoftDocs/azure-docs",
  "PostHog/posthog",
  "google/googletest",
  "hashicorp/terraform-provider-aws",
  "open-guides/og-aws",
  "aws/aws-cli",
  "async-aws/aws",
  "aws/aws-cdk",
  "awsdocs/aws-doc-sdk-examples",
  "donnemartin/awesome-aws",
];

if (requireFile("docs/genesis/ORIGIN_SOURCE_MAP.md")) {
  const origins = read("docs/genesis/ORIGIN_SOURCE_MAP.md");
  for (const origin of requiredOrigins) {
    if (!origins.includes(origin)) errors.push(`ORIGIN_SOURCE_MAP is missing founder-supplied origin: ${origin}`);
  }
}

if (warnings.length > 0) {
  console.warn(`Galaxy Genesis package warnings (${warnings.length}):`);
  for (const warning of warnings) console.warn(`- ${warning}`);
}

if (errors.length > 0) {
  console.error(`Galaxy Genesis package validation FAILED (${errors.length}):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Galaxy Genesis package validation PASSED");
console.log(`- required files: ${requiredFiles.length}`);
console.log(`- canon systems: ${manifest?.systems?.length ?? 0}`);
console.log(`- preserved concepts: ${canonConcepts.length}`);
console.log(`- founder-supplied origins: ${requiredOrigins.length}`);
console.log("- continuous queue-first campaign: validated");
console.log("- current implementation workstream: GX-000");
