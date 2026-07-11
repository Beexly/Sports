/**
 * Agent Foundry — deterministic baseline scanner.
 *
 * Produces findings; never approves. A BLOCK finding pins the manifest in
 * DRAFT/SCANNED — there is no code path that promotes anything. The rule set
 * is deliberately boring: string checks, structure checks, and council
 * cross-checks that run identically everywhere (no network, no clock).
 *
 * Scanner coverage is reported honestly: `rulesRun` lists what ran and
 * `externalScannersAbsent` names what did NOT (a baseline pass is not a
 * safety proof — external scanning is a future, owner-approved adapter).
 */

import { existsSync } from "node:fs";
import { join } from "node:path";
import type { ScanFinding, ScanReport, SkillManifest } from "./types";
import { computeContentHash, SKILL_MANIFESTS } from "./registry";
import { checkSeatAuthority } from "./derive-council-manifests";
import HASH_LEDGER from "./manifest-hashes.json";

const EXTERNAL_ACTION_VERBS =
  /\b(publish|send|email|post|bet|wager|charge|refund|deploy|migrate|delete|purchase)\b/i;

const CREDENTIAL_SHAPES =
  /\b(DATABASE_URL|DIRECT_URL|STRIPE_SECRET_KEY|STRIPE_WEBHOOK_SECRET|ANTHROPIC_API_KEY|THE_ODDS_API_KEY|NEXTAUTH_SECRET|REDIS_URL)\b/;

const INJECTION_PATTERNS: readonly RegExp[] = [
  /ignore (all )?(previous|prior) (instructions|rules)/i,
  /disregard (the )?(system|above)/i,
  /you are now/i,
  /​|‌|‍|⁠/, // zero-width characters
];

const SHELL_OR_WRITE_TOOLS = /\b(shell|bash|exec|write_file|edit_file|fs_write)\b/i;

type Rule = (m: SkillManifest, repoRoot: string) => ScanFinding[];

const f = (
  manifestId: string,
  rule: string,
  severity: ScanFinding["severity"],
  detail: string
): ScanFinding => ({ manifestId, rule, severity, detail });

const RULES: Readonly<Record<string, Rule>> = {
  "identity-complete": (m) => {
    const out: ScanFinding[] = [];
    if (!/^\d+\.\d+\.\d+$/.test(m.version)) out.push(f(m.id, "identity-complete", "BLOCK", "version is not semver"));
    if (!m.owningSeatId) out.push(f(m.id, "identity-complete", "BLOCK", "missing owning seat"));
    if (m.contentHash.length !== 64) out.push(f(m.id, "identity-complete", "BLOCK", "missing/short content hash"));
    return out;
  },
  "hash-intact": (m) => {
    // The integrity anchor is the PERSISTED ledger (manifest-hashes.json),
    // not the sealed field: seal() recomputes at load, so a code edit would
    // always self-match. Codex P2 on #77. Three failure modes, all BLOCK:
    const expected = (HASH_LEDGER as Record<string, string>)[`${m.id}@${m.version}`];
    if (!expected) {
      return [f(m.id, "hash-intact", "BLOCK", `no persisted hash for ${m.id}@${m.version} — add it to manifest-hashes.json in the same reviewed diff`)];
    }
    const out: ScanFinding[] = [];
    if (computeContentHash(m) !== expected) {
      out.push(f(m.id, "hash-intact", "BLOCK", "content differs from the persisted hash for this version — bump the version and update manifest-hashes.json"));
    }
    if (m.contentHash !== expected && computeContentHash(m) === expected) {
      out.push(f(m.id, "hash-intact", "BLOCK", "sealed contentHash was mutated after registration"));
    }
    return out;
  },
  "no-wildcard-authority": (m) => {
    const out: ScanFinding[] = [];
    if (m.allowedTools.includes("*")) out.push(f(m.id, "no-wildcard-authority", "BLOCK", 'allowedTools contains "*"'));
    if (m.networkPolicy.mode === "allowlist" && m.networkPolicy.domains.includes("*")) {
      out.push(f(m.id, "no-wildcard-authority", "BLOCK", 'network allowlist contains "*"'));
    }
    return out;
  },
  "sandbox-for-shell": (m) =>
    m.allowedTools.some((t) => SHELL_OR_WRITE_TOOLS.test(t)) && !m.sandboxRequired
      ? [f(m.id, "sandbox-for-shell", "BLOCK", "shell/filesystem-write tool without sandboxRequired")]
      : [],
  "no-credential-references": (m) => {
    const text = JSON.stringify(m);
    return CREDENTIAL_SHAPES.test(text)
      ? [f(m.id, "no-credential-references", "BLOCK", "manifest references a production credential name")]
      : [];
  },
  "no-external-actions": (m) => {
    // snake_case/kebab-case tool names hide verbs from \b — split them first.
    const surfaces = [...m.allowedTools, ...m.allowedOutputArtifacts]
      .join(" ")
      .replace(/[_-]/g, " ");
    return EXTERNAL_ACTION_VERBS.test(surfaces)
      ? [f(m.id, "no-external-actions", "BLOCK", "an allowed tool/output names an external action verb")]
      : [];
  },
  "audit-enabled": (m) =>
    m.auditLogEnabled ? [] : [f(m.id, "audit-enabled", "BLOCK", "audit logging disabled")],
  "prohibitions-declared": (m) =>
    m.prohibitedActions.length >= 1 &&
    m.prohibitedActions.some((p) => /external action/i.test(p))
      ? []
      : [f(m.id, "prohibitions-declared", "BLOCK", "prohibitedActions must exist and forbid external action")],
  "eval-suite-present": (m) =>
    m.evalSuites.length > 0 ? [] : [f(m.id, "eval-suite-present", "WARN", "no eval suite declared")],
  "license-known": (m) =>
    m.licenseEvidence.trim().length > 0 && !/unknown/i.test(m.licenseEvidence)
      ? []
      : [f(m.id, "license-known", "BLOCK", "license evidence missing or unknown")],
  "network-allowlisted": (m) =>
    m.networkPolicy.mode === "none" ||
    (m.networkPolicy.mode === "allowlist" && m.networkPolicy.domains.length > 0)
      ? []
      : [f(m.id, "network-allowlisted", "BLOCK", "network access without a non-empty allowlist")],
  "sensitive-data-routing": (m) =>
    m.allowedInputDataClasses.some((c) => c.startsWith("sensitive_")) && m.modelRoute !== "NO_MODEL"
      ? [f(m.id, "sensitive-data-routing", "BLOCK", "sensitive data class with a model route — requires NO_MODEL or owner-approved exception")]
      : [],
  "council-authority": (m) => {
    const check = checkSeatAuthority(m);
    return check.ok ? [] : check.problems.map((p) => f(m.id, "council-authority", "BLOCK", p));
  },
  "no-hidden-instructions": (m) => {
    const text = `${m.purpose} ${m.prohibitedActions.join(" ")}`;
    return INJECTION_PATTERNS.some((re) => re.test(text))
      ? [f(m.id, "no-hidden-instructions", "BLOCK", "prompt-injection-shaped content in manifest text")]
      : [];
  },
  "proof-source-exists": (m, repoRoot) =>
    existsSync(join(repoRoot, m.proofSource))
      ? []
      : [f(m.id, "proof-source-exists", "WARN", `proof source ${m.proofSource} not found in repo`)],
  "unique-id-version": (m) => {
    const dupes = SKILL_MANIFESTS.filter((x) => x.id === m.id);
    return dupes.length === 1
      ? []
      : [f(m.id, "unique-id-version", "BLOCK", "duplicate manifest id in registry")];
  },
};

export const SCANNER_RULE_IDS: readonly string[] = Object.keys(RULES);

/** External scanners we know exist but have NOT adopted (honest absence). */
export const ABSENT_EXTERNAL_SCANNERS: readonly string[] = [
  "sarif-import (no external SARIF source configured)",
  "dependency-vulnerability-scan (no external skill dependencies exist yet)",
];

export function scanManifest(m: SkillManifest, repoRoot: string): ScanReport {
  const findings = SCANNER_RULE_IDS.flatMap((rule) => RULES[rule]!(m, repoRoot));
  return {
    manifestId: m.id,
    manifestVersion: m.version,
    contentHash: m.contentHash,
    findings,
    blocked: findings.some((x) => x.severity === "BLOCK"),
    rulesRun: SCANNER_RULE_IDS,
    externalScannersAbsent: ABSENT_EXTERNAL_SCANNERS,
  };
}

export function scanAll(repoRoot: string): readonly ScanReport[] {
  return SKILL_MANIFESTS.map((m) => scanManifest(m, repoRoot));
}

/**
 * The one execution guard. Requires ALL of: APPROVED lifecycle (only
 * reachable through an owner-reviewed code change), per-run human approval
 * waived (a second explicit owner decision), AND a clean scan — a manifest
 * with any BLOCK finding can never read as PERMITTED, whatever its
 * lifecycle says (Codex P2 on #77). Nothing in this wave can return true;
 * tests pin it.
 */
export function canExecute(m: SkillManifest, repoRoot: string): boolean {
  if (m.lifecycle !== "APPROVED" || m.humanApprovalRequired) return false;
  return !scanManifest(m, repoRoot).blocked;
}
