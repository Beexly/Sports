import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { synthesizeJarvis, type JarvisInput } from "@/lib/cockpit/jarvis";
import { evaluatePublicPerformancePolicy } from "@/lib/performance/public-performance-policy";

const NOW = new Date("2026-05-18T12:00:00Z");

function fixedInput(): JarvisInput {
  return {
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
    performancePolicy: evaluatePublicPerformancePolicy({
      canExposePerformanceStats: true,
      minSettledPicksForLearning: 25,
      canonicalSettledCount: 100,
      bootstrapCount: 0,
      pendingCount: 0,
      canonicalWins: 55,
      canonicalLosses: 40,
      canonicalPushes: 5,
    }),
    ingestion: {
      lastAttemptAt: new Date(NOW.getTime() - 60 * 60 * 1000),
      lastSuccessAt: new Date(NOW.getTime() - 60 * 60 * 1000),
      lastWasSuccess: true,
      recentFailureCount: 0,
    },
    settlement: {
      lastSettlementAt: new Date(NOW.getTime() - 2 * 60 * 60 * 1000),
      settledIn24h: 12,
      pendingPickCount: 0,
    },
    history: {
      canonicalSettledCount: 100,
      bootstrapSettledCount: 0,
      canonicalPendingCount: 0,
      winCount: 55,
      lossCount: 40,
      pushCount: 5,
      voidCount: 0,
      publishedCount: 100,
      featuredCount: 8,
      canonicalEligibleForPublic: 100,
      canonicalExcludedFromPublic: 0,
    },
    signal: {
      snapshotCoveragePct: 0.95,
      signalCoveragePct: 0.92,
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
      ciHardening: "implemented",
    },
    externalConfigMissing: [],
  };
}

describe("Jarvis determinism", () => {
  it("synthesizeJarvis is deterministic for a fixed input", () => {
    const a = synthesizeJarvis(fixedInput());
    const b = synthesizeJarvis(fixedInput());
    // Compare by JSON to ignore reference identity differences on arrays.
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("synthesizeJarvis does not mutate its input", () => {
    const i = fixedInput();
    const before = JSON.stringify(i);
    synthesizeJarvis(i);
    const after = JSON.stringify(i);
    expect(after).toBe(before);
  });
});

describe("Jarvis synthesizer purity (source-level)", () => {
  const src = readFileSync(
    resolve(__dirname, "..", "lib/cockpit/jarvis.ts"),
    "utf8"
  );

  it("does not import @sports/db", () => {
    expect(src).not.toMatch(/from\s+["']@sports\/db["']/);
  });

  it("does not import node:fs / node:path / node:child_process", () => {
    expect(src).not.toMatch(/from\s+["']node:(fs|path|child_process|http|https|net)["']/);
  });

  it("does not call fetch() or globalThis.fetch", () => {
    expect(src).not.toMatch(/\bfetch\s*\(/);
  });

  it("does not call Date.now() in module scope (would defeat determinism)", () => {
    // Date.now() is allowed inside functions when callers explicitly want
    // wall-clock; the synthesizer doesn't need it because input.now is
    // passed in. Look for `Date.now(` outside of comments.
    const stripped = src
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/[^\n]*/g, "");
    expect(stripped).not.toMatch(/Date\.now\s*\(/);
  });

  it("does not call Math.random()", () => {
    expect(src).not.toMatch(/Math\.random\s*\(/);
  });

  it("does not contain auto-bet, auto-publish, or auto-act language anywhere in the synthesizer", () => {
    expect(src).not.toMatch(/\bauto[- ]bet\b/i);
    expect(src).not.toMatch(/\bauto[- ]publish\b/i);
    expect(src).not.toMatch(/\bauto[- ]promote\b/i);
    expect(src).not.toMatch(/\bautomatically\s+(bet|publish|promote)/i);
    expect(src).not.toMatch(/\bplace\s+a\s+bet\b/i);
  });

  it("does not perform top-level awaits", () => {
    // Top-level await would mark the module async, breaking pure import.
    const stripped = src
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/[^\n]*/g, "");
    // Allow `await` inside arrow/function bodies. Module-level await
    // would appear at column 0–4 outside a function.
    const lines = stripped.split(/\r?\n/);
    let depth = 0;
    for (const line of lines) {
      const open = (line.match(/\{/g) ?? []).length;
      const close = (line.match(/\}/g) ?? []).length;
      const trimmed = line.trim();
      if (depth === 0 && /^await\b/.test(trimmed)) {
        throw new Error(`Top-level await detected: ${line}`);
      }
      depth += open - close;
      if (depth < 0) depth = 0;
    }
    expect(true).toBe(true);
  });
});
