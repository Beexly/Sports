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
import { canonicalManifestJson, computeContentHash, SKILL_MANIFESTS } from "./registry";
import { checkSeatAuthority } from "./derive-council-manifests";
import HASH_LEDGER from "./manifest-hashes.json";

// G-7: money-movement and broadcast verbs a tool/artifact name could smuggle
// in (tweet/dm/sell/buy/trade/transfer/withdraw/mint/swap/invoice) block too.
// FIX 2 (external review, supply-chain finding): install/clone/vendor/
// download/upload close a real gap the prior set missed — a manifest naming
// `install_dependency`, `clone_repo`, or `vendor_package` reached APPROVED-
// eligible scans despite the Foundry contract that a manifest never
// authorizes an external action (docs/ai/AGENT_FOUNDRY_POLICY.md).
const EXTERNAL_ACTION_VERBS =
  /\b(publish|send|email|post|bet|wager|charge|refund|deploy|migrate|delete|purchase|tweet|dm|sell|buy|trade|transfer|withdraw|mint|swap|invoice|install|clone|vendor|download|upload)\b/i;

const CREDENTIAL_SHAPES =
  /\b(DATABASE_URL|DIRECT_URL|STRIPE_SECRET_KEY|STRIPE_WEBHOOK_SECRET|ANTHROPIC_API_KEY|THE_ODDS_API_KEY|NEXTAUTH_SECRET|REDIS_URL)\b/;

const INJECTION_PATTERNS: readonly RegExp[] = [
  /ignore (all )?(previous|prior) (instructions|rules)/i,
  /disregard (the )?(system|above)/i,
  /you are now/i,
  /​|‌|‍|⁠/, // zero-width characters
];

// FIX 1 (external review): snake_case/kebab-case tool names hide verbs from
// \b-anchored word matches — "exec_command" does NOT contain a boundary-
// delimited "exec" because "_" is a word character, so `\bexec\b` never
// fires. Normalize every tool name (underscores/hyphens → spaces) before
// ANY verb-shaped rule tests it — applied identically here and in
// no-external-actions below, not just for "exec". CamelCase ("spawnProcess")
// is deliberately NOT split: this scanner does not claim camelCase coverage,
// and an honest "we don't cover this yet" beats a false sense of coverage.
function normalizeToolSurface(text: string): string {
  return text.replace(/[_-]/g, " ").toLowerCase();
}

const SHELL_OR_WRITE_TOOLS = /\b(shell|bash|exec|write file|edit file|fs write)\b/i;

// FIX 2 (external review): a denylist of verbs can only catch verbs someone
// thought to enumerate — this same review found three (install/clone/vendor)
// the prior EXTERNAL_ACTION_VERBS set missed, and the next one will find
// more. The registry's three seed manifests (registry.ts) declare exactly
// five distinct tool names today, and adding a new one already requires a
// reviewed diff — hash-intact forces a manifest-hashes.json ledger update in
// the SAME change (see registry.ts). Requiring the tool name to also be
// added here is therefore not extra process friction, it is that same
// review made to fail CLOSED instead of open: an unrecognized tool name
// blocks regardless of what verb it does or doesn't spell, closing this
// bypass class permanently rather than reactively. This runs alongside (not
// instead of) the denylist above for defense in depth.
const ALLOWED_TOOL_NAMES: ReadonlySet<string> = new Set(
  ["read_file", "grep", "list_files", "run_radar_import", "git_diff_readonly"].map(normalizeToolSurface)
);

/** repoRoot is null when the runtime cannot reach the repository tree
 * (serverless). Rules must then say "unverifiable", never claim absence. */
type Rule = (m: SkillManifest, repoRoot: string | null) => ScanFinding[];

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
    m.allowedTools.some((t) => SHELL_OR_WRITE_TOOLS.test(normalizeToolSurface(t))) && !m.sandboxRequired
      ? [f(m.id, "sandbox-for-shell", "BLOCK", "shell/filesystem-write tool without sandboxRequired")]
      : [],
  "no-credential-references": (m) => {
    const text = JSON.stringify(m);
    return CREDENTIAL_SHAPES.test(text)
      ? [f(m.id, "no-credential-references", "BLOCK", "manifest references a production credential name")]
      : [];
  },
  "no-external-actions": (m) => {
    // snake_case/kebab-case tool names hide verbs from \b — normalize first
    // (FIX 1: shared with sandbox-for-shell via normalizeToolSurface).
    const surfaces = [...m.allowedTools, ...m.allowedOutputArtifacts]
      .map(normalizeToolSurface)
      .join(" ");
    const verbHit = EXTERNAL_ACTION_VERBS.test(surfaces);
    // FIX 2: positive allowlist, independent of the verb denylist above —
    // any tool not on the reviewed list blocks, whether or not it spells a
    // verb this file's authors anticipated.
    const unknownTools = m.allowedTools.filter((t) => !ALLOWED_TOOL_NAMES.has(normalizeToolSurface(t)));
    if (!verbHit && unknownTools.length === 0) return [];
    const reasons: string[] = [];
    if (verbHit) reasons.push("an allowed tool/output names an external action verb");
    if (unknownTools.length > 0) {
      reasons.push(`tool(s) not on the reviewed allowlist: ${unknownTools.join(", ")}`);
    }
    return [f(m.id, "no-external-actions", "BLOCK", reasons.join("; "))];
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
  "sensitive-data-routing": (m) => {
    // G-16: name the offending classes and the actual route; no "owner-approved
    // exception" language — no such exception path exists in this codebase.
    const sensitive = m.allowedInputDataClasses.filter((c) => c.startsWith("sensitive_"));
    return sensitive.length > 0 && m.modelRoute !== "NO_MODEL"
      ? [f(m.id, "sensitive-data-routing", "BLOCK", `sensitive data class(es) ${sensitive.join(", ")} with modelRoute ${m.modelRoute} — sensitive inputs require NO_MODEL (no exception path exists)`)]
      : [];
  },
  "council-authority": (m) => {
    const check = checkSeatAuthority(m);
    return check.ok ? [] : check.problems.map((p) => f(m.id, "council-authority", "BLOCK", p));
  },
  "no-hidden-instructions": (m) => {
    // G-7: scan the WHOLE canonical manifest, not just purpose+prohibitions —
    // injection content or zero-width characters hidden in licenseEvidence,
    // proofSource, tool names, or eval-suite ids are equally damning.
    const text = canonicalManifestJson(m);
    return INJECTION_PATTERNS.some((re) => re.test(text))
      ? [f(m.id, "no-hidden-instructions", "BLOCK", "prompt-injection-shaped content in manifest text")]
      : [];
  },
  "proof-source-exists": (m, repoRoot) => {
    if (repoRoot === null) {
      // Runtime can't see the tree — saying "not found" here would be a
      // false absence claim (the deployed-runtime inversion bug class).
      return [f(m.id, "proof-source-exists", "INFO", `proof source ${m.proofSource} not verifiable from this runtime — verify in CI/dev`)];
    }
    return existsSync(join(repoRoot, m.proofSource))
      ? []
      : [f(m.id, "proof-source-exists", "WARN", `proof source ${m.proofSource} not found in repo`)];
  },
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

export function scanManifest(m: SkillManifest, repoRoot: string | null): ScanReport {
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

export function scanAll(repoRoot: string | null): readonly ScanReport[] {
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
export function canExecute(m: SkillManifest, repoRoot: string | null): boolean {
  if (m.lifecycle !== "APPROVED" || m.humanApprovalRequired) return false;
  return !scanManifest(m, repoRoot).blocked;
}
