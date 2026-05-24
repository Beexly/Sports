import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildPickProvenance } from "@/lib/cockpit/pick-provenance";

describe("buildPickProvenance", () => {
  it("returns sources[], factors[], confidence, and modelVersion for operator traceability", () => {
    const out = buildPickProvenance(
      {
        id: "pick_1",
        pickType: "SPREAD",
        selection: "BOS -4.5",
        line: -4.5,
        confidence: 78,
        edgeScore: 69,
        consensusPct: 0.62,
        bookmakerCount: 14,
        tier: "FREE",
        pickGrade: "STRONG_PLAY",
        riskLevel: "MODERATE",
        reasoning: "Market and schedule agreed.",
        reasoningShort: "Market agreement with rest edge.",
        modelVersion: "v5.0.0",
        generatedAt: new Date("2026-05-24T02:00:00.000Z"),
        dataFreshnessAt: new Date("2026-05-24T01:55:00.000Z"),
        factorBreakdown: {
          consensusScore: 24,
          marketDepthScore: 16,
          edgeScore: 20,
          lineMovementScore: 8,
          volatilityPenalty: -2,
          scheduleStressScore: 1,
          factors: [
            {
              name: "Consensus",
              impact: "positive",
              description: "Books aligned",
              weight: 24,
            },
          ],
        },
      },
      [
        {
          id: "src_1",
          provider: "the-odds-api",
          sourceKind: "ODDS_EVENTS",
          fetchedAt: new Date("2026-05-24T01:50:00.000Z"),
          payloadHash: "abcdef1234567890",
          payloadBytes: 4096,
          ingestionRunId: "run_1",
        },
      ]
    );

    expect(out.modelVersion).toBe("v5.0.0");
    expect(out.sources).toHaveLength(1);
    expect(out.factors).toHaveLength(1);
    expect(out.confidence.score).toBe(78);
    expect(out.confidence.math.components.consensusScore).toBe(24);
    expect(out.confidence.math.clampedScore).toBe(67);
  });

  it("fails soft when factorBreakdown is absent", () => {
    const out = buildPickProvenance(
      {
        id: "pick_2",
        pickType: "TOTAL",
        selection: "OVER 219.5",
        line: 219.5,
        confidence: 65,
        edgeScore: 55,
        consensusPct: 0.54,
        bookmakerCount: 10,
        tier: "FREE",
        pickGrade: "SOLID_PLAY",
        riskLevel: "MODERATE",
        reasoning: "",
        reasoningShort: "",
        modelVersion: "v5.0.0",
        generatedAt: new Date("2026-05-24T02:00:00.000Z"),
        dataFreshnessAt: null,
        factorBreakdown: null,
      },
      []
    );

    expect(out.factors).toEqual([]);
    expect(out.sources).toEqual([]);
    expect(out.confidence.math.rawScore).toBe(0);
    expect(out.narrative).toBeNull();
  });
});

const repoRoot = resolve(__dirname, "..");
const ROUTE = resolve(repoRoot, "app/api/cockpit/picks/[id]/provenance/route.ts");

describe("GET /api/cockpit/picks/[id]/provenance", () => {
  const src = readFileSync(ROUTE, "utf8");

  it("is force-dynamic, admin-only, rate-limited, and no-store", () => {
    expect(src).toMatch(/dynamic\s*=\s*["']force-dynamic["']/);
    expect(src).toMatch(/auth\(\)/);
    expect(src).toMatch(/role\s*!==\s*["']ADMIN["']/);
    expect(src).toMatch(/checkRateLimit/);
    expect(src).toMatch(/cockpit-pick-provenance/);
    expect(src).toMatch(/failureMode:\s*["']fail-closed["']/);
    expect(src).toMatch(/Cache-Control/);
    expect(src).toMatch(/no-store/);
  });

  it("reads pick + source snapshots and delegates to buildPickProvenance", () => {
    expect(src).toMatch(/db\.pick\.findUnique/);
    expect(src).toMatch(/db\.sourceSnapshot\.findMany/);
    expect(src).toMatch(/buildPickProvenance/);
  });

  it("has explicit 400 and 404 refusal envelopes", () => {
    expect(src).toMatch(/Pick ID required/);
    expect(src).toMatch(/not found/);
    expect(src).toMatch(/400/);
    expect(src).toMatch(/404/);
  });

  it("never writes to the DB and never touches publishedAt", () => {
    expect(src).not.toMatch(/db\.\w+\.(create|update|upsert|delete)\b/);
    const codeOnly = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*/g, "");
    expect(codeOnly).not.toMatch(/publishedAt/);
  });
});
