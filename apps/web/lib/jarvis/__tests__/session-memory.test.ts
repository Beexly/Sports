import { describe, it, expect } from "vitest";
import {
  createSessionContext,
  addFact,
  lookupFact,
  supersedeFact,
  buildContextSummary,
  buildSessionHandoff,
  extractOwnerPreferences,
  type SessionFact,
} from "../session-memory";
import type { ConversationMessage } from "../conversation-engine";

// ─── Helpers ───────────────────────────────────────────────────────────────────

function makeFact(
  overrides: Partial<Omit<SessionFact, "id" | "usedCount">> = {},
): Omit<SessionFact, "id" | "usedCount"> {
  return {
    factType: "PLATFORM_STATE",
    content: "Platform is GREEN",
    derivedFrom: "OwnerSummary",
    confidence: "HIGH",
    timestamp: new Date().toISOString(),
    ...overrides,
  };
}

// ─── createSessionContext ──────────────────────────────────────────────────────

describe("createSessionContext", () => {
  it("creates an empty context with the given session id", () => {
    const ctx = createSessionContext("s1", new Date().toISOString());
    expect(ctx.sessionId).toBe("s1");
    expect(ctx.facts).toHaveLength(0);
    expect(ctx.decisionsThisSession).toHaveLength(0);
    expect(ctx.tasksDispatchedThisSession).toHaveLength(0);
    expect(ctx.risksSurfacedThisSession).toHaveLength(0);
  });
});

// ─── addFact ──────────────────────────────────────────────────────────────────

describe("addFact", () => {
  it("adds a new fact to the context", () => {
    const ctx = createSessionContext("s1", new Date().toISOString());
    const updated = addFact(ctx, makeFact());
    expect(updated.facts).toHaveLength(1);
  });

  it("does NOT re-add an identical fact (deduplication invariant)", () => {
    const ctx = createSessionContext("s1", new Date().toISOString());
    const fact = makeFact({ content: "EXACT_SAME_CONTENT" });
    const once = addFact(ctx, fact);
    const twice = addFact(once, fact);
    expect(twice.facts).toHaveLength(1);
  });

  it("allows two facts of the same type with different content", () => {
    const ctx = createSessionContext("s1", new Date().toISOString());
    const f1 = addFact(ctx, makeFact({ content: "First fact" }));
    const f2 = addFact(f1, makeFact({ content: "Different fact" }));
    expect(f2.facts).toHaveLength(2);
  });

  it("tracks decisions in decisionsThisSession", () => {
    const ctx = createSessionContext("s1", new Date().toISOString());
    const updated = addFact(ctx, makeFact({ factType: "OWNER_DECISION", content: "Approved launch" }));
    expect(updated.decisionsThisSession).toContain("Approved launch");
  });

  it("tracks dispatched tasks in tasksDispatchedThisSession", () => {
    const ctx = createSessionContext("s1", new Date().toISOString());
    const updated = addFact(ctx, makeFact({ factType: "TASK_DISPATCHED", content: "Overnight loop" }));
    expect(updated.tasksDispatchedThisSession).toContain("Overnight loop");
  });

  it("tracks risks in risksSurfacedThisSession", () => {
    const ctx = createSessionContext("s1", new Date().toISOString());
    const updated = addFact(ctx, makeFact({ factType: "RISK_SURFACED", content: "Pipeline stale" }));
    expect(updated.risksSurfacedThisSession).toContain("Pipeline stale");
  });
});

// ─── lookupFact ───────────────────────────────────────────────────────────────

describe("lookupFact", () => {
  it("returns only active (non-superseded) facts of the requested type", () => {
    const ctx = createSessionContext("s1", new Date().toISOString());
    const withFact = addFact(ctx, makeFact({ factType: "PLATFORM_STATE", content: "GREEN" }));
    const result = lookupFact(withFact, "PLATFORM_STATE");
    expect(result).toHaveLength(1);
    expect(result[0]?.content).toBe("GREEN");
  });

  it("excludes superseded facts from lookup", () => {
    const ctx = createSessionContext("s1", new Date().toISOString());
    const withOld = addFact(ctx, makeFact({ factType: "PLATFORM_STATE", content: "OLD" }));
    const oldId = withOld.facts[0]!.id;
    const withNew = supersedeFact(
      withOld,
      oldId,
      makeFact({ factType: "PLATFORM_STATE", content: "NEW" }),
    );

    const result = lookupFact(withNew, "PLATFORM_STATE");
    expect(result).toHaveLength(1);
    expect(result[0]?.content).toBe("NEW");
  });

  it("returns empty array for unknown fact type", () => {
    const ctx = createSessionContext("s1", new Date().toISOString());
    const result = lookupFact(ctx, "RISK_SURFACED");
    expect(result).toHaveLength(0);
  });
});

// ─── supersedeFact ────────────────────────────────────────────────────────────

describe("supersedeFact", () => {
  it("marks old fact supersededBy and adds new fact", () => {
    const ctx = createSessionContext("s1", new Date().toISOString());
    const withOld = addFact(ctx, makeFact({ content: "OLD" }));
    const oldId = withOld.facts[0]!.id;
    const updated = supersedeFact(withOld, oldId, makeFact({ content: "NEW" }));

    const oldFact = updated.facts.find((f) => f.id === oldId);
    expect(oldFact?.supersededBy).toBeTruthy();
    expect(updated.facts.some((f) => f.content === "NEW")).toBe(true);
  });

  it("creates immutable audit trail — old fact is still in facts array", () => {
    const ctx = createSessionContext("s1", new Date().toISOString());
    const withOld = addFact(ctx, makeFact({ content: "OLD_FACT" }));
    const oldId = withOld.facts[0]!.id;
    const updated = supersedeFact(withOld, oldId, makeFact({ content: "NEW_FACT" }));

    // Old fact still present (audit trail), just marked superseded
    expect(updated.facts.some((f) => f.content === "OLD_FACT")).toBe(true);
    expect(updated.facts.some((f) => f.content === "NEW_FACT")).toBe(true);
    expect(updated.facts).toHaveLength(2);
  });
});

// ─── buildContextSummary ──────────────────────────────────────────────────────

describe("buildContextSummary", () => {
  it("returns non-empty summary for a session with facts", () => {
    const ctx = createSessionContext("s1", new Date().toISOString());
    const withFacts = addFact(ctx, makeFact());
    const summary = buildContextSummary(withFacts);
    expect(summary).toContain("s1");
    expect(summary.length).toBeGreaterThan(0);
  });

  it("returns 'No facts accumulated yet' for empty context", () => {
    const ctx = createSessionContext("s_empty", new Date().toISOString());
    const summary = buildContextSummary(ctx);
    expect(summary).toContain("No facts");
  });
});

// ─── buildSessionHandoff ──────────────────────────────────────────────────────

describe("buildSessionHandoff", () => {
  it("returns a ScribeEntry of type HANDOFF", () => {
    const ctx = createSessionContext("s_handoff", new Date().toISOString());
    const handoff = buildSessionHandoff(ctx);
    expect(handoff.type).toBe("HANDOFF");
  });

  it("includes the session id in the handoff", () => {
    const ctx = createSessionContext("UNIQUE_SESSION_XYZ", new Date().toISOString());
    const handoff = buildSessionHandoff(ctx);
    expect(handoff.sourceSessionId).toBe("UNIQUE_SESSION_XYZ");
  });

  it("includes decisions in the body", () => {
    let ctx = createSessionContext("s1", new Date().toISOString());
    ctx = addFact(ctx, makeFact({ factType: "OWNER_DECISION", content: "Approved the launch" }));
    const handoff = buildSessionHandoff(ctx);
    expect(handoff.body).toContain("Approved the launch");
  });

  it("includes vault path for today", () => {
    const ctx = createSessionContext("s1", new Date().toISOString());
    const handoff = buildSessionHandoff(ctx);
    const today = new Date().toISOString().slice(0, 10);
    expect(handoff.vaultPath).toContain(today);
  });

  it("has id, title, createdAt, and tags", () => {
    const ctx = createSessionContext("s1", new Date().toISOString());
    const handoff = buildSessionHandoff(ctx);
    expect(handoff.id).toBeTruthy();
    expect(handoff.title).toBeTruthy();
    expect(handoff.createdAt).toBeTruthy();
    expect(handoff.tags).toBeDefined();
  });
});

// ─── extractOwnerPreferences ──────────────────────────────────────────────────

describe("extractOwnerPreferences", () => {
  it("returns empty array for empty message list", () => {
    const prefs = extractOwnerPreferences([]);
    expect(prefs).toHaveLength(0);
  });

  it("infers brevity preference from short messages", () => {
    const messages: ConversationMessage[] = [
      {
        id: "m1",
        role: "OWNER",
        content: "status",
        timestamp: new Date().toISOString(),
        priority: "ROUTINE",
        actionItems: [],
        requiresApproval: false,
        confidence: "HIGH",
      },
      {
        id: "m2",
        role: "OWNER",
        content: "ok",
        timestamp: new Date().toISOString(),
        priority: "ROUTINE",
        actionItems: [],
        requiresApproval: false,
        confidence: "HIGH",
      },
    ];
    const prefs = extractOwnerPreferences(messages);
    expect(prefs).toContain("Prefers terse exchanges");
  });
});
