import { describe, it, expect } from "vitest";
import {
  createScribeEntry,
  validateScribeEntry,
  redactScribeEntry,
  formatScribeEntryAsMarkdown,
  buildScribeProtocolForAgent,
  summarizeScribeEntries,
  generateScribeId,
} from "../scribe";
import type { ScribeEntry } from "../scribe-types";

const NOW = "2026-06-12T10:00:00.000Z";

function makeEntry(overrides: Partial<ScribeEntry> = {}): ScribeEntry {
  return createScribeEntry({
    createdAt: NOW,
    source: "claude",
    actor: "claude",
    project: "JARVIS",
    type: "RESULT",
    title: "Built the scribe system",
    summary: "Scribe types and pure functions implemented with redaction.",
    tags: ["jarvis", "scribe"],
    relatedFiles: ["apps/web/lib/jarvis/scribe.ts"],
    relatedRoutes: ["/cockpit/jarvis/os"],
    approvalStatus: "NOT_REQUIRED",
    visibility: "INTERNAL",
    riskLevel: "LOW",
    ...overrides,
  });
}

describe("createScribeEntry", () => {
  it("produces a valid entry with a deterministic id", () => {
    const entry = makeEntry();
    const { valid, errors } = validateScribeEntry(entry);
    expect(errors).toEqual([]);
    expect(valid).toBe(true);
    expect(entry.id).toBe(generateScribeId("claude", "RESULT", NOW));
    expect(entry.createdAt).toBe(NOW);
  });

  it("is deterministic — same inputs produce the same id", () => {
    expect(makeEntry().id).toBe(makeEntry().id);
  });
});

describe("validateScribeEntry", () => {
  it("catches missing required fields", () => {
    const bad = { ...makeEntry(), title: "", summary: "", source: "" };
    const { valid, errors } = validateScribeEntry(bad);
    expect(valid).toBe(false);
    expect(errors).toContain("title is required");
    expect(errors).toContain("summary is required");
    expect(errors).toContain("source is required");
  });
});

describe("redactScribeEntry — secrets never stored", () => {
  it("removes secrets from summary (key, token, password patterns)", () => {
    const entry = makeEntry({
      summary:
        "Set api_key=sk-abc12345678901234 and token: ghp_secretvalue then password=hunter2",
    });
    const redacted = redactScribeEntry(entry);
    expect(redacted.summary).not.toContain("hunter2");
    expect(redacted.summary).not.toContain("ghp_secretvalue");
    expect(redacted.summary).not.toContain("sk-abc12345678901234");
    expect(redacted.summary).toContain("[REDACTED]");
  });

  it("redacts details and nextAction too", () => {
    const entry = redactScribeEntry(
      makeEntry({
        details: "credential=supersecretvalue in env",
        nextAction: "Rotate the SECRET=oldvalue entry",
      })
    );
    expect(entry.details).toContain("[REDACTED]");
    expect(entry.details).not.toContain("supersecretvalue");
    expect(entry.nextAction).not.toContain("oldvalue");
  });

  it("redacts at creation time as well", () => {
    const entry = makeEntry({ summary: "the api_key=abc123def is set" });
    expect(entry.summary).not.toContain("abc123def");
    expect(entry.summary).toContain("[REDACTED]");
  });
});

describe("formatScribeEntryAsMarkdown", () => {
  it("produces valid markdown with frontmatter", () => {
    const md = formatScribeEntryAsMarkdown(makeEntry());
    expect(md.startsWith("---\n")).toBe(true);
    expect(md).toContain("project: JARVIS");
    expect(md).toContain("type: RESULT");
    expect(md).toContain("risk: LOW");
    expect(md).toContain("# Built the scribe system");
    // Frontmatter is closed.
    expect(md.split("---").length).toBeGreaterThanOrEqual(3);
  });

  it("never leaks secrets into markdown", () => {
    const md = formatScribeEntryAsMarkdown(
      makeEntry({ summary: "deploy with token=verysecret123" })
    );
    expect(md).not.toContain("verysecret123");
  });
});

describe("buildScribeProtocolForAgent", () => {
  it("returns per-agent defaults with the vault output path", () => {
    const protocol = buildScribeProtocolForAgent("ava");
    expect(protocol.agentId).toBe("ava");
    expect(protocol.defaultProject).toBe("GSN");
    expect(protocol.outputPath).toBe("docs/ai/jarvis/scribe/");
    expect(protocol.requiredFields).toContain("title");
    expect(protocol.forbiddenFields).toContain("secret");
  });

  it("falls back to JARVIS for unknown agents", () => {
    expect(buildScribeProtocolForAgent("unknown-agent").defaultProject).toBe("JARVIS");
  });
});

describe("summarizeScribeEntries", () => {
  it("reports an honest empty state", () => {
    expect(summarizeScribeEntries([])).toMatch(/empty|No entries/i);
  });

  it("counts entries by type", () => {
    const summary = summarizeScribeEntries([
      makeEntry(),
      makeEntry({ type: "RISK", riskLevel: "HIGH" }),
    ]);
    expect(summary).toContain("2 scribe entries");
    expect(summary).toContain("1 RESULT");
    expect(summary).toContain("1 RISK");
    expect(summary).toMatch(/high\/critical/i);
  });
});
