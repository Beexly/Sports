import { describe, expect, it } from "vitest";
import {
  addFact,
  buildContextSummary,
  buildSessionHandoff,
  createSessionContext,
  extractOwnerPreferences,
  lookupFact,
  supersedeFact,
} from "../session-memory";

const NOW = "2026-06-12T07:00:00.000Z";

const FACT = {
  factType: "PLATFORM_STATE" as const,
  content: "Overall AMBER; gate closed at 18/25.",
  derivedFrom: "OwnerSummary",
  confidence: "HIGH" as const,
  timestamp: NOW,
};

describe("session memory", () => {
  it("never re-derives a known fact: duplicate add bumps usedCount, not the store", () => {
    let ctx = createSessionContext("s1", NOW);
    ctx = addFact(ctx, FACT);
    ctx = addFact(ctx, FACT);
    ctx = addFact(ctx, FACT);
    expect(ctx.facts).toHaveLength(1);
    expect(ctx.facts[0]!.usedCount).toBe(2);
  });

  it("lookupFact returns only live facts of the type, newest first", () => {
    let ctx = createSessionContext("s1", NOW);
    ctx = addFact(ctx, FACT);
    ctx = addFact(ctx, {
      ...FACT,
      content: "Newer state.",
      timestamp: "2026-06-12T08:00:00.000Z",
    });
    const hits = lookupFact(ctx, "PLATFORM_STATE");
    expect(hits).toHaveLength(2);
    expect(hits[0]!.content).toBe("Newer state.");
    expect(lookupFact(ctx, "RISK_SURFACED")).toHaveLength(0);
  });

  it("supersedeFact retires the old fact without deleting it", () => {
    let ctx = createSessionContext("s1", NOW);
    ctx = addFact(ctx, FACT);
    const oldId = ctx.facts[0]!.id;
    ctx = supersedeFact(ctx, oldId, {
      ...FACT,
      content: "Corrected: gate is at 19/25.",
      timestamp: "2026-06-12T09:00:00.000Z",
    });
    expect(ctx.facts).toHaveLength(2);
    expect(ctx.facts.find((f) => f.id === oldId)!.supersededBy).toBeDefined();
    expect(lookupFact(ctx, "PLATFORM_STATE")).toHaveLength(1);
  });

  it("buildSessionHandoff returns a valid HANDOFF ScribeEntry", () => {
    let ctx = createSessionContext("s1", NOW);
    ctx = addFact(ctx, FACT);
    const entry = buildSessionHandoff(ctx);
    expect(entry.type).toBe("HANDOFF");
    expect(entry.body).toContain("1 facts on hand");
    expect(entry.vaultPath).toContain("s1");
  });

  it("extractOwnerPreferences reads explicit signals only", () => {
    const prefs = extractOwnerPreferences([
      {
        id: "o1",
        role: "OWNER",
        content: "keep it short and don't ask — just work, token budget is tight",
        timestamp: NOW,
        priority: "ROUTINE",
        actionItems: [],
        requiresApproval: false,
        confidence: "HIGH",
      },
    ]);
    expect(prefs.length).toBe(3);
    expect(extractOwnerPreferences([])).toHaveLength(0);
  });

  it("buildContextSummary is concise and counts superseded facts", () => {
    let ctx = createSessionContext("s1", NOW);
    ctx = addFact(ctx, FACT);
    const text = buildContextSummary(ctx);
    expect(text).toContain("1 facts on hand (0 superseded)");
    expect(text).toContain("No open loops.");
  });
});
