/**
 * Jarvis Scribe — pure functions over ScribeEntry.
 *
 * The Scribe is how every agent and session leaves a durable, structured
 * note. This module does NO I/O at runtime: it creates, validates,
 * redacts, and formats entries. Writing the markdown to the vault is the
 * caller's responsibility (a human or an approved job).
 *
 * Trust rules:
 *   - Never store secrets. Anything that looks like key/secret/token/
 *     password/credential material is replaced with "[REDACTED]".
 *   - Ids are deterministic from source + type + createdAt — no randomness.
 *   - No external imports. Only scribe-types.ts types are used.
 */

import type {
  ScribeEntry,
  ScribeProject,
  ScribeProtocol,
  ScribeRiskLevel,
  ScribeEntryType,
} from "./scribe-types";

// ─── Secret redaction ─────────────────────────────────────────────────────────

/** Field-name shapes that indicate secret material (key=..., token: ...). */
const SECRET_ASSIGNMENT_PATTERN =
  /\b((?:api[_-]?)?(?:key|secret|token|password|credential)s?)\b(\s*[:=]\s*)(["']?)[^\s"',;]+\3/gi;

/** Raw token shapes that should never appear in a note. */
const SECRET_VALUE_PATTERNS: readonly RegExp[] = [
  /\bsk-[A-Za-z0-9_-]{8,}\b/g, // provider API keys
  /\bBearer\s+[A-Za-z0-9._~+/-]+=*/gi, // bearer tokens
  /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9._-]+\b/g, // JWTs
];

// Replaces anything that looks like secret material in free text with "[REDACTED]".
export function redactSecretsFromText(text: string): string {
  let out = text.replace(SECRET_ASSIGNMENT_PATTERN, "$1$2[REDACTED]");
  for (const pattern of SECRET_VALUE_PATTERNS) {
    out = out.replace(pattern, "[REDACTED]");
  }
  return out;
}

// ─── Id generation ────────────────────────────────────────────────────────────

// Deterministic scribe id from source + type + createdAt. No randomness, no clock.
export function generateScribeId(
  source: string,
  type: string,
  createdAt: string
): string {
  const stamp = createdAt.replace(/[:.TZ-]/g, "");
  const safeSource = source.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return `scribe-${safeSource}-${type.toLowerCase()}-${stamp}`;
}

// ─── Entry creation ───────────────────────────────────────────────────────────

// Creates a ScribeEntry with a deterministic id. The caller provides createdAt.
export function createScribeEntry(
  fields: Omit<ScribeEntry, "id"> & { createdAt: string }
): ScribeEntry {
  return {
    ...fields,
    id: generateScribeId(fields.source ?? "unknown", fields.type, fields.createdAt),
    summary: fields.summary !== undefined ? redactSecretsFromText(fields.summary) : undefined,
    details: fields.details === undefined ? undefined : redactSecretsFromText(fields.details),
  };
}

// ─── Validation ───────────────────────────────────────────────────────────────

const VALID_TYPES: readonly ScribeEntryType[] = [
  "OBSERVATION",
  "DECISION",
  "PROMPT",
  "ACTION_PROPOSAL",
  "HANDOFF",
  "RESULT",
  "RISK",
  "MEMORY",
  "TODO",
];

const VALID_PROJECTS: readonly ScribeProject[] = [
  "GSE",
  "GSN",
  "AIRWAVE",
  "JARVIS",
  "DESIGN",
  "OPS",
];

const VALID_RISK_LEVELS: readonly ScribeRiskLevel[] = [
  "LOW",
  "MEDIUM",
  "HIGH",
  "CRITICAL",
];

// Validates required fields and enum values. Returns all errors, not just the first.
export function validateScribeEntry(entry: ScribeEntry): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!entry.id || entry.id.trim() === "") errors.push("id is required");
  if (!entry.createdAt || entry.createdAt.trim() === "") {
    errors.push("createdAt is required");
  }
  if (!entry.source || entry.source.trim() === "") errors.push("source is required");
  if (!entry.actor || entry.actor.trim() === "") errors.push("actor is required");
  if (!entry.title || entry.title.trim() === "") errors.push("title is required");
  if (!entry.summary || entry.summary.trim() === "") errors.push("summary is required");
  if (!VALID_TYPES.includes(entry.type)) errors.push(`unknown type: ${entry.type}`);
  if (entry.project !== undefined && !VALID_PROJECTS.includes(entry.project)) {
    errors.push(`unknown project: ${entry.project}`);
  }
  if (entry.riskLevel !== undefined && !VALID_RISK_LEVELS.includes(entry.riskLevel)) {
    errors.push(`unknown riskLevel: ${entry.riskLevel}`);
  }
  if (!Array.isArray(entry.tags)) errors.push("tags must be an array");
  if (entry.relatedFiles !== undefined && !Array.isArray(entry.relatedFiles)) errors.push("relatedFiles must be an array");
  if (entry.relatedRoutes !== undefined && !Array.isArray(entry.relatedRoutes)) errors.push("relatedRoutes must be an array");

  return { valid: errors.length === 0, errors };
}

// ─── Redaction ────────────────────────────────────────────────────────────────

// Returns a copy of the entry with secret-looking material replaced by "[REDACTED]".
export function redactScribeEntry(entry: ScribeEntry): ScribeEntry {
  return {
    ...entry,
    title: redactSecretsFromText(entry.title),
    summary: entry.summary !== undefined ? redactSecretsFromText(entry.summary) : undefined,
    details: entry.details === undefined ? undefined : redactSecretsFromText(entry.details),
    nextAction:
      entry.nextAction === undefined
        ? undefined
        : redactSecretsFromText(entry.nextAction),
  };
}

// ─── Markdown formatting ──────────────────────────────────────────────────────

function yamlList(items: readonly string[]): string {
  return `[${items.map((i) => JSON.stringify(i)).join(", ")}]`;
}

// Renders an entry as an Obsidian-compatible markdown note with YAML frontmatter.
export function formatScribeEntryAsMarkdown(entry: ScribeEntry): string {
  const safe = redactScribeEntry(entry);

  const frontmatter = [
    "---",
    `id: ${safe.id}`,
    `created: ${safe.createdAt}`,
    ...(safe.source ? [`source: ${safe.source}`] : []),
    ...(safe.actor ? [`actor: ${safe.actor}`] : []),
    ...(safe.agent ? [`agent: ${safe.agent}`] : []),
    ...(safe.taskId ? [`taskId: ${safe.taskId}`] : []),
    ...(safe.project ? [`project: ${safe.project}`] : []),
    `type: ${safe.type}`,
    ...(safe.approvalStatus ? [`approval: ${safe.approvalStatus}`] : []),
    ...(safe.visibility ? [`visibility: ${safe.visibility}`] : []),
    ...(safe.riskLevel ? [`risk: ${safe.riskLevel}`] : []),
    `tags: ${yamlList(safe.tags)}`,
    "---",
  ].join("\n");

  const sections: string[] = [
    frontmatter,
    "",
    `# ${safe.title}`,
    "",
    safe.summary ?? "",
  ];

  if (safe.details) {
    sections.push("", "## Details", "", safe.details);
  }
  if (safe.relatedFiles && safe.relatedFiles.length > 0) {
    sections.push("", "## Related files", "", ...safe.relatedFiles!.map((f) => `- \`${f}\``));
  }
  if (safe.relatedRoutes && safe.relatedRoutes.length > 0) {
    sections.push("", "## Related routes", "", ...safe.relatedRoutes!.map((r) => `- \`${r}\``));
  }
  if (safe.nextAction) {
    sections.push("", "## Next action", "", safe.nextAction);
  }

  return sections.join("\n") + "\n";
}

// ─── Per-agent protocol ───────────────────────────────────────────────────────

const REQUIRED_FIELDS: readonly string[] = [
  "source",
  "actor",
  "project",
  "type",
  "title",
  "summary",
  "riskLevel",
  "visibility",
  "approvalStatus",
];

/** Field names that must never be written into a scribe entry. */
const FORBIDDEN_FIELDS: readonly string[] = [
  "apiKey",
  "secret",
  "token",
  "password",
  "credential",
  "envValue",
];

const AGENT_DEFAULT_PROJECTS: Readonly<Record<string, ScribeProject>> = {
  jarvis: "JARVIS",
  scout: "GSE",
  tal: "GSE",
  sarah: "GSE",
  ava: "GSN",
  bobby: "GSE",
  owner: "OPS",
  claude: "JARVIS",
  codex: "JARVIS",
};

// Returns the scribe protocol (defaults + invariants) for a given agent id.
export function buildScribeProtocolForAgent(agentId: string): ScribeProtocol {
  const key = agentId.toLowerCase();
  return {
    agentId,
    defaultProject: AGENT_DEFAULT_PROJECTS[key] ?? "JARVIS",
    defaultVisibility: "INTERNAL",
    requiredFields: REQUIRED_FIELDS,
    forbiddenFields: FORBIDDEN_FIELDS,
    outputPath: "docs/ai/jarvis/scribe/",
  };
}

// ─── Summaries ────────────────────────────────────────────────────────────────

// Compact owner-facing summary: counts by type plus the highest-risk entries.
export function summarizeScribeEntries(entries: readonly ScribeEntry[]): string {
  if (entries.length === 0) {
    return "Scribe is empty. No entries recorded yet — agents write here as they work.";
  }

  const byType = new Map<string, number>();
  for (const e of entries) {
    byType.set(e.type, (byType.get(e.type) ?? 0) + 1);
  }
  const typeParts = Array.from(byType.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([type, n]) => `${n} ${type}`);

  const highRisk = entries.filter(
    (e) => e.riskLevel === "HIGH" || e.riskLevel === "CRITICAL"
  ).length;
  const pending = entries.filter((e) => e.approvalStatus === "PENDING").length;

  const riskNote = highRisk > 0 ? ` ${highRisk} high/critical-risk.` : "";
  const pendingNote = pending > 0 ? ` ${pending} awaiting approval.` : "";

  return `${entries.length} scribe entr${entries.length === 1 ? "y" : "ies"}: ${typeParts.join(", ")}.${riskNote}${pendingNote}`;
}
