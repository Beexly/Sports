/**
 * Agent Foundry — manifest registry + content hashing.
 *
 * Manifests live in code, so every change is a reviewed commit — that IS the
 * approval channel. `contentHash` is computed, never hand-written: authors
 * declare `contentHash: ""` in AUTHORED and the registry seals it, so a
 * stored-hash/recomputed-hash mismatch can only mean post-registration
 * tampering.
 *
 * Seed manifests are deliberately narrow, first-party, and non-executing:
 * every one is DRAFT or SCANNED, `humanApprovalRequired: true`, no network,
 * no external action. Nothing here can run anything — the Foundry governs
 * packages; a runner (sandboxed, owner-gated) is a separate future
 * workstream.
 */

import { createHash } from "node:crypto";
import type { ManifestLifecycle, SkillManifest } from "./types";

/** Feature flag — default OFF. */
export function isFoundryEnabled(): boolean {
  return process.env["AGENT_FOUNDRY_ENABLED"] === "true";
}

/** Canonical JSON: sorted keys, hash field zeroed — deterministic. */
export function canonicalManifestJson(m: SkillManifest): string {
  const clone: Record<string, unknown> = { ...m, contentHash: "" };
  const sorted = Object.keys(clone)
    .sort()
    .reduce<Record<string, unknown>>((acc, k) => {
      acc[k] = clone[k];
      return acc;
    }, {});
  return JSON.stringify(sorted);
}

export function computeContentHash(m: SkillManifest): string {
  return createHash("sha256").update(canonicalManifestJson(m), "utf8").digest("hex");
}

function seal(m: SkillManifest): SkillManifest {
  return { ...m, contentHash: computeContentHash(m) };
}

/** Lifecycles a manifest may hold in code without an owner approval trail. */
export const PRE_APPROVAL_LIFECYCLES: readonly ManifestLifecycle[] = [
  "DRAFT",
  "SCANNED",
  "OWNER_REVIEW",
];

// ─── Seed manifests (first-party, narrow, non-executing) ─────────────────────

const AUTHORED: readonly SkillManifest[] = [
  {
    id: "repo-truth-auditor",
    version: "0.1.0",
    contentHash: "",
    owningSeatId: "quality-officer",
    purpose:
      "Compare capability-registry/doc claims against code evidence and produce a contradiction " +
      "ledger (claim, source, contradicting evidence, correct truth, owner action). Read-only.",
    risk: "LOW",
    allowedInputDataClasses: ["public_repo_code", "internal_docs"],
    allowedOutputArtifacts: ["markdown_report", "structured_json"],
    allowedTools: ["read_file", "grep", "list_files"],
    networkPolicy: { mode: "none" },
    sandboxRequired: false,
    modelRoute: "PLAN_FRONTIER",
    budgetCeilingUsd: 5,
    runtimeCeilingMinutes: 30,
    prohibitedActions: [
      "Edit any file",
      "Promote any capability status",
      "Claim a capability is wired without runtime evidence",
      "Any external action",
    ],
    humanApprovalRequired: true,
    evalSuites: ["truth-audit-fixture-suite"],
    licenseEvidence: "First-party; no external material embedded.",
    auditLogEnabled: true,
    lifecycle: "DRAFT",
    proofSource: "handoff/claude/frontier-intelligence-fabric-2026-07-11/03_CONTRADICTION_LEDGER.md",
  },
  {
    id: "resource-radar-evaluator",
    version: "0.1.0",
    contentHash: "",
    owningSeatId: "tal",
    purpose:
      "Evaluate a founder-verified radar snapshot: normalize identities, apply the adoption " +
      "policy caps, and draft adoption dossiers for owner review. Never installs anything.",
    risk: "LOW",
    allowedInputDataClasses: ["public_repo_code", "internal_docs"],
    allowedOutputArtifacts: ["dossier", "structured_json"],
    allowedTools: ["read_file", "run_radar_import"],
    networkPolicy: { mode: "none" },
    sandboxRequired: false,
    modelRoute: "EXTRACT_STRUCTURED",
    budgetCeilingUsd: 3,
    runtimeCeilingMinutes: 15,
    prohibitedActions: [
      "Install, clone, or vendor any external repository",
      "Promote a disposition",
      "Override a blocked risk condition",
      "Any external action",
    ],
    humanApprovalRequired: true,
    evalSuites: ["radar-invariant-suite"],
    licenseEvidence: "First-party; consumes founder-verified CSV snapshots only.",
    auditLogEnabled: true,
    lifecycle: "DRAFT",
    proofSource: "apps/web/__tests__/resource-radar.test.ts",
  },
  {
    id: "independent-diff-reviewer",
    version: "0.1.0",
    contentHash: "",
    owningSeatId: "ai-ops-officer",
    purpose:
      "Read-only adversarial review of a proposed diff: hunt for leakage, gate bypasses, hidden " +
      "behavior changes, and duplicate systems. Produces findings; never edits or approves.",
    risk: "MEDIUM",
    allowedInputDataClasses: ["public_repo_code"],
    allowedOutputArtifacts: ["markdown_report", "structured_json"],
    allowedTools: ["read_file", "grep", "git_diff_readonly"],
    networkPolicy: { mode: "none" },
    sandboxRequired: false,
    modelRoute: "VERIFY_INDEPENDENT",
    budgetCeilingUsd: 5,
    runtimeCeilingMinutes: 20,
    prohibitedActions: [
      "Edit any file",
      "Approve or merge anything",
      "Review its own author's output as if independent",
      "Any external action",
    ],
    humanApprovalRequired: true,
    evalSuites: ["diff-review-fixture-suite"],
    licenseEvidence: "First-party; no external material embedded.",
    auditLogEnabled: true,
    lifecycle: "DRAFT",
    proofSource: "handoff/claude/frontier-intelligence-fabric-2026-07-11/09_ACCEPTANCE_MATRIX.md",
  },
];

export const SKILL_MANIFESTS: readonly SkillManifest[] = AUTHORED.map(seal);

export function getManifest(id: string): SkillManifest | undefined {
  return SKILL_MANIFESTS.find((m) => m.id === id);
}

/**
 * The one execution guard. Nothing in this wave can return true: APPROVED
 * requires an owner-reviewed code change, and even then the runner (not yet
 * built) re-checks. Tests pin that all seeds return false.
 */
export function canExecute(m: SkillManifest): boolean {
  return m.lifecycle === "APPROVED" && !m.humanApprovalRequired;
}
