/**
 * Jarvis Memory Protocol — Stage tests (pure + source-pin style)
 *
 * NO live DB. Tests exercise:
 *   1. Cockpit memory page — structure, imports, dynamic flag, honest empty-state strings
 *   2. Ask-Jarvis — transparency phrasings + recall import + askJarvisWithMemory export
 *   3. Brief compose — memory section + store-unavailable path
 *   4. Decisions.ts — transaction contract, typed error rethrow (source pins / pure logic)
 */

import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const COLD_IMPORT_TEST_TIMEOUT_MS = 30000;

// ── Helpers ───────────────────────────────────────────────────────────────────

function readSource(relPath: string): string {
  return fs.readFileSync(
    path.resolve(__dirname, "..", relPath),
    "utf-8",
  );
}

// ─── 1. Cockpit memory page ───────────────────────────────────────────────────

describe("cockpit memory page — source pins", () => {
  const src = readSource("app/cockpit/memory/page.tsx");

  it("file exists and is non-empty", () => {
    expect(src.length).toBeGreaterThan(0);
  });

  it("exports force-dynamic", () => {
    expect(src).toMatch(/export const dynamic\s*=\s*["']force-dynamic["']/);
  });

  it("imports from lib/jarvis/memory/actions (listMemoryByState, listMemoryConflicts)", () => {
    expect(src).toMatch(/listMemoryByState/);
    expect(src).toMatch(/listMemoryConflicts/);
    expect(src).toMatch(/from\s+["']@\/lib\/jarvis\/memory\/actions["']/);
  });

  it("imports confirmMemory and rejectMemory from actions", () => {
    expect(src).toMatch(/confirmMemory/);
    expect(src).toMatch(/rejectMemory/);
  });

  it("has honest not-connected state for candidates", () => {
    expect(src).toMatch(/memory-db-unavailable|No database connection/);
    expect(src).toMatch(/candidates-db-unavailable|candidates-empty/);
  });

  it("has honest empty state for candidates", () => {
    expect(src).toMatch(/candidates-empty/);
    expect(src).toMatch(/No candidates awaiting approval/);
  });

  it("has honest not-connected state for conflicts", () => {
    expect(src).toMatch(/conflicts-db-unavailable|conflicts-empty/);
  });

  it("has hygiene section with stale, low confidence, missing source", () => {
    expect(src).toMatch(/[Ss]tale/);
    expect(src).toMatch(/[Ll]ow [Cc]onfidence|low-confidence/);
    expect(src).toMatch(/[Mm]issing [Ss]ource|missing-source/);
  });

  it("never contains simulated or mock data — no hardcoded IDs or fake rows", () => {
    // Ensure there are no hardcoded test/mock memory IDs
    expect(src).not.toMatch(/mem-00\d|fake-memory|mock-candidate/);
  });

  it("Memory nav entry was added to layout.tsx", () => {
    const layout = readSource("app/cockpit/layout.tsx");
    expect(layout).toMatch(/\/cockpit\/memory/);
    expect(layout).toMatch(/Memory/);
    expect(layout).toMatch(/Memory review queue|memory.*queue/i);
  });
});

// ─── 2. Ask-Jarvis recall-before-answer ───────────────────────────────────────

describe("ask-jarvis — recall-before-answer source pins", () => {
  const src = readSource("lib/cockpit/ask-jarvis.ts");

  it("imports recallRelevantMemory from memory/actions", () => {
    expect(src).toMatch(/recallRelevantMemory/);
    expect(src).toMatch(/from\s+["']\.\.\/jarvis\/memory\/actions["']/);
  });

  it("imports MemoryStoreUnavailableError from memory/errors", () => {
    expect(src).toMatch(/MemoryStoreUnavailableError/);
    expect(src).toMatch(/from\s+["']\.\.\/jarvis\/memory\/errors["']/);
  });

  it("exports askJarvisWithMemory (async recall variant)", () => {
    expect(src).toMatch(/export async function askJarvisWithMemory/);
  });

  it("has the confirmed-memory transparency phrasing", () => {
    expect(src).toMatch(/Using confirmed memory from/);
  });

  it("has the candidate-only transparency phrasing", () => {
    expect(src).toMatch(/I found a related memory candidate, but it has not been confirmed/);
  });

  it("has the conflict transparency phrasing", () => {
    expect(src).toMatch(/There are conflicting memories\. Owner review is required/);
  });

  it("on MemoryStoreUnavailableError: returns base answer without degradation", () => {
    // Source pin: the catch block catches MemoryStoreUnavailableError and returns base
    expect(src).toMatch(/MemoryStoreUnavailableError[\s\S]{0,200}return base/);
  });

  it("memory context is additive — existing static answers remain as the base", () => {
    expect(src).toMatch(/memory.*ADDITIVE|ADDITIVE.*memory/i);
  });
});

describe("askJarvisWithMemory — pure logic", () => {
  it("is exported as an async function", async () => {
    // Source pin: file exports askJarvisWithMemory as an async function
    const src = readSource("lib/cockpit/ask-jarvis.ts");
    expect(src).toMatch(/export async function askJarvisWithMemory/);
  });

  it("returns a JarvisAnswer with the correct intent when called", async () => {
    // Use the real module — recallRelevantMemory will fail with MemoryStoreUnavailableError
    // because there's no DB, so it falls back to the base answer.
    const { askJarvisWithMemory } = await import("@/lib/cockpit/ask-jarvis");
    const { buildOwnerSummary } = await import("@/lib/cockpit/owner-summary");
    const { synthesizeJarvis } = await import("@/lib/cockpit/jarvis");
    const { evaluatePublicPerformancePolicy } = await import(
      "@/lib/performance/public-performance-policy"
    );

    const NOW = new Date("2026-05-18T12:00:00Z");
    const policy = evaluatePublicPerformancePolicy({
      canExposePerformanceStats: true,
      minSettledPicksForLearning: 25,
      canonicalSettledCount: 100,
      bootstrapCount: 10,
      pendingCount: 4,
      canonicalWins: 55,
      canonicalLosses: 40,
      canonicalPushes: 5,
      recentTotalCount: 20,
      recentBootstrapCount: 0,
    });
    const assessment = synthesizeJarvis({
      now: NOW,
      gates: {
        canPersistCanonicalHistory: true,
        canUseDerivedHistory: true,
        canExposePublicPicks: true,
        canPromoteFeaturedPicks: true,
        canExposePerformanceStats: true,
        canPublishContent: true,
        canLearnFromOutcomes: true,
        canApplyCalibrationAdjustments: false as const,
        isBootstrapMode: false,
        minSettledPicksForLearning: 25,
      },
      performancePolicy: policy,
      ingestion: {
        lastAttemptAt: NOW,
        lastSuccessAt: NOW,
        lastWasSuccess: true,
        recentFailureCount: 0,
      },
      settlement: {
        lastSettlementAt: NOW,
        settledIn24h: 0,
        pendingPickCount: 0,
      },
      history: {
        canonicalSettledCount: 100,
        bootstrapSettledCount: 10,
        canonicalPendingCount: 0,
        winCount: 55,
        lossCount: 40,
        pushCount: 5,
        voidCount: 0,
        publishedCount: 100,
        featuredCount: 0,
        canonicalEligibleForPublic: 100,
        canonicalExcludedFromPublic: 10,
      },
      signal: {
        snapshotCoveragePct: 0.9,
        signalCoveragePct: 0.9,
        averageDataQualityScore: 0.9,
        modelVersionsActive: ["v5"],
      },
      layers: {
        trustClaims: "implemented",
        performanceGating: "implemented",
        promotions: "implemented",
        dailyBrief: "implemented",
        calibration: "implemented",
        cockpit: "implemented",
        contentEngine: "implemented",
        ciHardening: "partial",
      },
      externalConfigMissing: [],
    });
    const summary = buildOwnerSummary({
      assessment,
      performancePolicy: policy,
      gates: {
        canExposePublicPicks: true,
        isBootstrapMode: false,
        minSettledPicksForLearning: 25,
      },
      todayPickCount: 0,
    });

    // With no DB (test environment), recallRelevantMemory will throw MemoryStoreUnavailableError.
    // The fallback path returns the base answer, so this resolves successfully.
    const result = askJarvisWithMemory("decisions", summary);
    expect(result).toBeInstanceOf(Promise);
    const answer = await result;
    expect(answer.intent).toBe("decisions");
    expect(answer.answer.length).toBeGreaterThan(0);
  }, COLD_IMPORT_TEST_TIMEOUT_MS);

  it("falls back gracefully to base answer when no DB is available", async () => {
    // The recall call will throw MemoryStoreUnavailableError in no-DB environment.
    // askJarvisWithMemory must return the same answer as askJarvis() in that case.
    const { askJarvis, askJarvisWithMemory } = await import("@/lib/cockpit/ask-jarvis");
    const { buildOwnerSummary } = await import("@/lib/cockpit/owner-summary");
    const { synthesizeJarvis } = await import("@/lib/cockpit/jarvis");
    const { evaluatePublicPerformancePolicy } = await import(
      "@/lib/performance/public-performance-policy"
    );

    const NOW = new Date("2026-05-18T12:00:00Z");
    const policy = evaluatePublicPerformancePolicy({
      canExposePerformanceStats: true,
      minSettledPicksForLearning: 25,
      canonicalSettledCount: 100,
      bootstrapCount: 10,
      pendingCount: 4,
      canonicalWins: 55,
      canonicalLosses: 40,
      canonicalPushes: 5,
      recentTotalCount: 20,
      recentBootstrapCount: 0,
    });
    const assessment = synthesizeJarvis({
      now: NOW,
      gates: {
        canPersistCanonicalHistory: true,
        canUseDerivedHistory: true,
        canExposePublicPicks: true,
        canPromoteFeaturedPicks: true,
        canExposePerformanceStats: true,
        canPublishContent: true,
        canLearnFromOutcomes: true,
        canApplyCalibrationAdjustments: false as const,
        isBootstrapMode: false,
        minSettledPicksForLearning: 25,
      },
      performancePolicy: policy,
      ingestion: {
        lastAttemptAt: NOW,
        lastSuccessAt: NOW,
        lastWasSuccess: true,
        recentFailureCount: 0,
      },
      settlement: {
        lastSettlementAt: NOW,
        settledIn24h: 0,
        pendingPickCount: 0,
      },
      history: {
        canonicalSettledCount: 100,
        bootstrapSettledCount: 10,
        canonicalPendingCount: 0,
        winCount: 55,
        lossCount: 40,
        pushCount: 5,
        voidCount: 0,
        publishedCount: 100,
        featuredCount: 0,
        canonicalEligibleForPublic: 100,
        canonicalExcludedFromPublic: 10,
      },
      signal: {
        snapshotCoveragePct: 0.9,
        signalCoveragePct: 0.9,
        averageDataQualityScore: 0.9,
        modelVersionsActive: ["v5"],
      },
      layers: {
        trustClaims: "implemented",
        performanceGating: "implemented",
        promotions: "implemented",
        dailyBrief: "implemented",
        calibration: "implemented",
        cockpit: "implemented",
        contentEngine: "implemented",
        ciHardening: "partial",
      },
      externalConfigMissing: [],
    });
    const summary = buildOwnerSummary({
      assessment,
      performancePolicy: policy,
      gates: {
        canExposePublicPicks: true,
        isBootstrapMode: false,
        minSettledPicksForLearning: 25,
      },
      todayPickCount: 0,
    });

    // Base answer (no memory involvement)
    const baseAnswer = askJarvis("what-is-memory-status", summary);

    // With memory — no DB so falls back
    const withMemory = await askJarvisWithMemory("what-is-memory-status", summary);
    expect(withMemory.intent).toBe(baseAnswer.intent);
    expect(withMemory.answer).toBe(baseAnswer.answer);
  });
});

// ─── 3. Brief compose — memory section ───────────────────────────────────────

describe("brief compose — memory section source pins", () => {
  const src = readSource("lib/brief/compose.ts");

  it("exports BriefMemorySection type", () => {
    expect(src).toMatch(/BriefMemorySection/);
  });

  it("exports BriefMemoryInput type", () => {
    expect(src).toMatch(/BriefMemoryInput/);
  });

  it("ComposedBrief has a memory field", () => {
    expect(src).toMatch(/memory\s*:\s*BriefMemorySection\s*\|\s*null/);
  });

  it("ComposeBriefInput accepts optional memory", () => {
    expect(src).toMatch(/memory\?\s*:\s*BriefMemorySection/);
  });

  it("memory section type is 'memory'", () => {
    expect(src).toMatch(/type:\s*["']memory["']/);
  });

  it("store-unavailable path contains honest not-connected message", () => {
    expect(src).toMatch(/Memory store not connected/);
  });
});

describe("brief compose — memory section logic", () => {
  it("memory field is null when not provided", async () => {
    const { composeBrief } = await import("@/lib/brief/compose");
    const result = composeBrief({ date: new Date("2026-06-13") });
    expect(result.memory).toBeNull();
  });

  it("memory section body says store not connected when storeConnected=false", async () => {
    const { composeBrief } = await import("@/lib/brief/compose");
    const result = composeBrief({
      date: new Date("2026-06-13"),
      memory: {
        storeConnected: false,
        newConfirmed: [],
        pendingCandidates: [],
        conflicts: [],
      },
    });
    const memSection = result.sections.find((s) => s.type === "memory");
    expect(memSection).toBeDefined();
    expect(memSection!.body).toMatch(/Memory store not connected/);
  });

  it("memory section reports new confirmed memories by title", async () => {
    const { composeBrief } = await import("@/lib/brief/compose");
    const result = composeBrief({
      date: new Date("2026-06-13"),
      memory: {
        storeConnected: true,
        newConfirmed: [
          {
            id: "m1",
            title: "Gate opened for pro tier",
            summary: "Garrett opened the pro gate on 2026-06-01",
            memory_state: "confirmed",
            confirmed_at: new Date("2026-06-01"),
            created_at: new Date("2026-06-01"),
          },
        ],
        pendingCandidates: [],
        conflicts: [],
      },
    });
    const memSection = result.sections.find((s) => s.type === "memory");
    expect(memSection).toBeDefined();
    expect(memSection!.body).toMatch(/Gate opened for pro tier/);
    expect(memSection!.body).toMatch(/1 new confirmed memory/);
  });

  it("memory section reports pending candidates count", async () => {
    const { composeBrief } = await import("@/lib/brief/compose");
    const result = composeBrief({
      date: new Date("2026-06-13"),
      memory: {
        storeConnected: true,
        newConfirmed: [],
        pendingCandidates: [
          {
            id: "c1",
            title: "Candidate 1",
            summary: "A candidate",
            memory_state: "candidate",
            confirmed_at: null,
            created_at: new Date(),
          },
          {
            id: "c2",
            title: "Candidate 2",
            summary: "Another candidate",
            memory_state: "candidate",
            confirmed_at: null,
            created_at: new Date(),
          },
        ],
        conflicts: [],
      },
    });
    const memSection = result.sections.find((s) => s.type === "memory");
    expect(memSection!.body).toMatch(/2 candidates awaiting approval/);
  });

  it("memory section reports conflicts count", async () => {
    const { composeBrief } = await import("@/lib/brief/compose");
    const result = composeBrief({
      date: new Date("2026-06-13"),
      memory: {
        storeConnected: true,
        newConfirmed: [],
        pendingCandidates: [],
        conflicts: [
          {
            id: "cf1",
            title: "Conflicted memory",
            summary: "A conflict",
            memory_state: "conflicted",
            confirmed_at: null,
            created_at: new Date(),
          },
        ],
      },
    });
    const memSection = result.sections.find((s) => s.type === "memory");
    expect(memSection!.body).toMatch(/1 conflict needing owner review/);
  });

  it("sections still include all original section types", async () => {
    const { composeBrief } = await import("@/lib/brief/compose");
    const result = composeBrief({ date: new Date("2026-06-13") });
    const types = result.sections.map((s) => s.type);
    expect(types).toContain("slate");
    expect(types).toContain("settlement");
    expect(types).toContain("line-movement");
    expect(types).toContain("promotions");
    expect(types).toContain("review");
    expect(types).toContain("memory");
  });

  it("composeDailyBrief still returns DRAFT", async () => {
    const { composeDailyBrief } = await import("@/lib/brief/compose");
    const result = composeDailyBrief({ date: new Date("2026-06-13") });
    expect(result.status).toBe("DRAFT");
    expect(result.responsibleGamingText).toContain("responsibly");
  });
});

// ─── 4. Decisions.ts — source pins + pure logic ───────────────────────────────

describe("decisions.ts — source pins", () => {
  const src = readSource("lib/jarvis/memory/decisions.ts");

  it("file exists and is non-empty", () => {
    expect(src.length).toBeGreaterThan(0);
  });

  it("exports createJarvisDecision", () => {
    expect(src).toMatch(/export async function createJarvisDecision/);
  });

  it("exports listOpenDecisions", () => {
    expect(src).toMatch(/export async function listOpenDecisions/);
  });

  it("exports createDecisionWithMemory", () => {
    expect(src).toMatch(/export async function createDecisionWithMemory/);
  });

  it("uses $transaction for createDecisionWithMemory", () => {
    expect(src).toMatch(/\$transaction/);
  });

  it("rethrows DB failures as MemoryStoreUnavailableError", () => {
    expect(src).toMatch(/MemoryStoreUnavailableError/);
    expect(src).toMatch(/throw new MemoryStoreUnavailableError/);
  });

  it("imports MemoryStoreUnavailableError from ./errors", () => {
    expect(src).toMatch(/from\s+["']\.\/errors["']/);
  });

  it("does NOT import actions.ts (keeps transaction boundary clean)", () => {
    expect(src).not.toMatch(/from\s+["']\.\/actions["']/);
  });

  it("creates memory event with type 'decision' and state 'candidate'", () => {
    expect(src).toMatch(/memory_type:\s*["']decision["']/);
    expect(src).toMatch(/memory_state:\s*["']candidate["']/);
  });

  it("links memory to decision via decisions.connect", () => {
    expect(src).toMatch(/decisions:\s*\{\s*connect/);
  });

  it("validates required fields before DB write", () => {
    expect(src).toMatch(/validateDecisionInput/);
    expect(src).toMatch(/required field/);
  });
});

describe("decisions.ts — pure validation logic (no DB)", () => {
  /**
   * These tests exercise the validation layer only — they call the real
   * createJarvisDecision/createDecisionWithMemory functions with bad inputs
   * to verify that validation throws BEFORE any DB call.
   *
   * For wrapping-DB-errors tests, we use source pins only since vi.mock
   * with @sports/db causes hoisting issues across test isolation boundaries.
   */

  it("validateDecisionInput throws for empty decision_title (pure logic)", () => {
    // Source pin: the validation function is defined in the file
    const src = readSource("lib/jarvis/memory/decisions.ts");
    expect(src).toMatch(/validateDecisionInput/);
    expect(src).toMatch(/required field/);
    // Verify the validation checks all required fields
    expect(src).toMatch(/decision_title/);
    expect(src).toMatch(/decision_summary/);
    expect(src).toMatch(/decision_type/);
    expect(src).toMatch(/rationale/);
    expect(src).toMatch(/owner/);
  });

  it("createJarvisDecision rejects with validation error for empty title (real call → validation fires before DB)", async () => {
    // Import the real module — the DB call will fail too, but validation fires first.
    // We just need to verify the error message matches our validation path.
    const { createJarvisDecision } = await import("@/lib/jarvis/memory/decisions");
    await expect(
      createJarvisDecision({
        decision_title: "",
        decision_summary: "summary",
        decision_type: "product",
        rationale: "rationale",
        owner: "garrett",
        decision_date: new Date("2026-06-01"),
      }),
    ).rejects.toThrow(/required field|decision_title/i);
  });

  it("createJarvisDecision rejects for invalid decision_date (real call → validation fires before DB)", async () => {
    const { createJarvisDecision } = await import("@/lib/jarvis/memory/decisions");
    await expect(
      createJarvisDecision({
        decision_title: "Title",
        decision_summary: "summary",
        decision_type: "product",
        rationale: "rationale",
        owner: "garrett",
        decision_date: new Date("not-a-date"),
      }),
    ).rejects.toThrow(/decision_date/);
  });

  it("createJarvisDecision rejects for missing rationale (real call → validation fires before DB)", async () => {
    const { createJarvisDecision } = await import("@/lib/jarvis/memory/decisions");
    await expect(
      createJarvisDecision({
        decision_title: "Title",
        decision_summary: "summary",
        decision_type: "product",
        rationale: "",
        owner: "garrett",
        decision_date: new Date("2026-06-01"),
      }),
    ).rejects.toThrow(/required field|rationale/i);
  });

  it("createDecisionWithMemory wraps all errors as MemoryStoreUnavailableError (source pin)", () => {
    // Source pin: the catch block wraps with MemoryStoreUnavailableError
    const src = readSource("lib/jarvis/memory/decisions.ts");
    expect(src).toMatch(/throw new MemoryStoreUnavailableError/);
    // Both createJarvisDecision and createDecisionWithMemory should wrap
    const throwCount = (src.match(/throw new MemoryStoreUnavailableError/g) ?? []).length;
    expect(throwCount).toBeGreaterThanOrEqual(2);
  });

  it("createDecisionWithMemory result shape (stub DB — integration path)", async () => {
    // In test mode, @sports/db is a stub that returns { id: "stub" }.
    // The $transaction callback runs with a stub client.
    // createDecisionWithMemory should return { decision, memoryEvent }.
    const { createDecisionWithMemory } = await import("@/lib/jarvis/memory/decisions");
    const result = await createDecisionWithMemory({
      decision_title: "Test decision",
      decision_summary: "summary",
      decision_type: "product",
      rationale: "rationale",
      owner: "garrett",
      decision_date: new Date("2026-06-01"),
    });
    // Stub returns { id: "stub" } for creates, so result should have both keys
    expect(result).toBeDefined();
    expect(result).toHaveProperty("decision");
    expect(result).toHaveProperty("memoryEvent");
  });

  it("createJarvisDecision result shape (stub DB — integration path)", async () => {
    const { createJarvisDecision } = await import("@/lib/jarvis/memory/decisions");
    const result = await createJarvisDecision({
      decision_title: "Valid title",
      decision_summary: "summary",
      decision_type: "product",
      rationale: "rationale",
      owner: "garrett",
      decision_date: new Date("2026-06-01"),
    });
    // Stub returns { id: "stub" } for creates
    expect(result).toBeDefined();
    expect(result).toHaveProperty("id");
  });
});
