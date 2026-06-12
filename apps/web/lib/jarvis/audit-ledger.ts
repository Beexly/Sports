/**
 * Jarvis Audit Ledger — typed audit events with an honest wiring status.
 *
 * Pure functions, no I/O. Entries are created and formatted here; persistence
 * is not wired — picks are versioned and the settlement ledger is canonical,
 * but there is NO unified audit store for agent/tool actions yet, and
 * buildAuditLedgerStatus() says exactly that.
 */

export type AuditEventType =
  | "SENSE_EVENT"
  | "INTERPRET_EVENT"
  | "DECISION_PROPOSED"
  | "ACTION_APPROVED"
  | "ACTION_REJECTED"
  | "ACTION_COMPLETED"
  | "MEMORY_WRITTEN"
  | "PROMPT_CREATED"
  | "AGENT_HANDOFF"
  | "TOOL_USED"
  | "ERROR"
  | "IMPROVEMENT_PROPOSED";

export interface AuditEntry {
  readonly id: string;
  readonly eventType: AuditEventType;
  readonly timestamp: string;
  readonly actor: string;
  readonly agentId?: string;
  readonly actionId?: string;
  readonly summary: string;
  readonly outcome: "SUCCESS" | "FAILURE" | "PENDING" | "CANCELLED";
  readonly details?: string;
  readonly riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  readonly requiresReview: boolean;
  readonly scribeEntryId?: string;
}

// ─── Creation ─────────────────────────────────────────────────────────────────

// Creates an audit entry with a deterministic id from eventType + actor + timestamp.
export function createAuditEntry(fields: Omit<AuditEntry, "id">): AuditEntry {
  const stamp = fields.timestamp.replace(/[:.TZ-]/g, "");
  const safeActor = fields.actor.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return {
    ...fields,
    id: `audit-${fields.eventType.toLowerCase()}-${safeActor}-${stamp}`,
  };
}

// ─── Formatting ───────────────────────────────────────────────────────────────

// Renders an entry as a markdown note with frontmatter for the vault audit folder.
export function formatAuditEntryAsMarkdown(entry: AuditEntry): string {
  const frontmatter = [
    "---",
    `id: ${entry.id}`,
    `event: ${entry.eventType}`,
    `timestamp: ${entry.timestamp}`,
    `actor: ${entry.actor}`,
    ...(entry.agentId ? [`agent: ${entry.agentId}`] : []),
    ...(entry.actionId ? [`action: ${entry.actionId}`] : []),
    ...(entry.scribeEntryId ? [`scribe: ${entry.scribeEntryId}`] : []),
    `outcome: ${entry.outcome}`,
    `risk: ${entry.riskLevel}`,
    `requiresReview: ${entry.requiresReview}`,
    "---",
  ].join("\n");

  const sections: string[] = [
    frontmatter,
    "",
    `# ${entry.eventType} — ${entry.outcome}`,
    "",
    entry.summary,
  ];
  if (entry.details) {
    sections.push("", "## Details", "", entry.details);
  }
  return sections.join("\n") + "\n";
}

// ─── Status ───────────────────────────────────────────────────────────────────

export interface AuditLedgerStatus {
  readonly totalEntries: number;
  readonly pendingReview: number;
  readonly lastEventAt: string | null;
  readonly isWired: boolean;
  readonly truth: string;
}

// Honest ledger posture: no persistent unified audit store exists yet.
export function buildAuditLedgerStatus(): AuditLedgerStatus {
  return {
    totalEntries: 0,
    pendingReview: 0,
    lastEventAt: null,
    isWired: false,
    truth:
      "No unified audit store is wired. Picks are versioned and the settlement " +
      "ledger is canonical, but agent actions, approvals, and tool calls have no " +
      "automated trail. Manual entries live in docs/ai/jarvis/vault/08-audit/. " +
      "Next step: persist AuditEntry rows and write one on every action-queue transition.",
  };
}

// ─── Owner summary ────────────────────────────────────────────────────────────

// Compact owner-facing summary of a set of audit entries.
export function summarizeAuditForOwner(entries: readonly AuditEntry[]): string {
  if (entries.length === 0) {
    return (
      "Audit ledger is empty. The unified audit store is not wired — only picks " +
      "versioning and the settlement ledger provide audit trails today."
    );
  }

  const failures = entries.filter((e) => e.outcome === "FAILURE").length;
  const pending = entries.filter((e) => e.outcome === "PENDING").length;
  const needsReview = entries.filter((e) => e.requiresReview).length;

  const byEvent = new Map<string, number>();
  for (const e of entries) {
    byEvent.set(e.eventType, (byEvent.get(e.eventType) ?? 0) + 1);
  }
  const parts = Array.from(byEvent.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([type, n]) => `${n} ${type}`);

  return (
    `${entries.length} audit entr${entries.length === 1 ? "y" : "ies"} ` +
    `(${parts.join(", ")}). ${failures} failure(s), ${pending} pending, ` +
    `${needsReview} requiring review.`
  );
}
