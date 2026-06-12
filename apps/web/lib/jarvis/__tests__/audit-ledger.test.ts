import { describe, it, expect } from "vitest";
import {
  createAuditEntry,
  formatAuditEntryAsMarkdown,
  buildAuditLedgerStatus,
  summarizeAuditForOwner,
  type AuditEntry,
} from "../audit-ledger";

const NOW = "2026-06-12T10:00:00.000Z";

function makeEntry(overrides: Partial<Omit<AuditEntry, "id">> = {}): AuditEntry {
  return createAuditEntry({
    eventType: "ACTION_APPROVED",
    timestamp: NOW,
    actor: "owner",
    summary: "Approved the Jarvis OS build.",
    outcome: "SUCCESS",
    riskLevel: "MEDIUM",
    requiresReview: false,
    ...overrides,
  });
}

describe("createAuditEntry", () => {
  it("produces a valid entry with a deterministic id", () => {
    const entry = makeEntry();
    expect(entry.id).toBe(makeEntry().id);
    expect(entry.id).toContain("action_approved");
    expect(entry.id).toContain("owner");
    expect(entry.eventType).toBe("ACTION_APPROVED");
    expect(entry.timestamp).toBe(NOW);
  });

  it("preserves optional linkage fields", () => {
    const entry = makeEntry({ agentId: "jarvis", actionId: "action-1", scribeEntryId: "scribe-1" });
    expect(entry.agentId).toBe("jarvis");
    expect(entry.actionId).toBe("action-1");
    expect(entry.scribeEntryId).toBe("scribe-1");
  });
});

describe("buildAuditLedgerStatus", () => {
  it("returns isWired: false — no unified audit store exists", () => {
    const status = buildAuditLedgerStatus();
    expect(status.isWired).toBe(false);
    expect(status.totalEntries).toBe(0);
    expect(status.pendingReview).toBe(0);
    expect(status.lastEventAt).toBeNull();
    expect(status.truth).toMatch(/not wired|no unified/i);
  });
});

describe("formatAuditEntryAsMarkdown", () => {
  it("produces markdown with frontmatter", () => {
    const md = formatAuditEntryAsMarkdown(makeEntry({ details: "Branch build approved." }));
    expect(md.startsWith("---\n")).toBe(true);
    expect(md).toContain("event: ACTION_APPROVED");
    expect(md).toContain("outcome: SUCCESS");
    expect(md).toContain("# ACTION_APPROVED — SUCCESS");
    expect(md).toContain("## Details");
  });
});

describe("summarizeAuditForOwner", () => {
  it("is honest about an empty ledger", () => {
    expect(summarizeAuditForOwner([])).toMatch(/not wired|empty/i);
  });

  it("counts outcomes and review flags", () => {
    const summary = summarizeAuditForOwner([
      makeEntry(),
      makeEntry({ eventType: "ERROR", outcome: "FAILURE", requiresReview: true }),
    ]);
    expect(summary).toContain("2 audit entries");
    expect(summary).toContain("1 failure(s)");
    expect(summary).toContain("1 requiring review");
  });
});
