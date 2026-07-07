/**
 * jarvis-data.ts — signal-coverage math is population-consistent.
 *
 * Regression guard for the correctness bug where the snapshot-coverage
 * NUMERATOR counted signalSnapshots across ALL picks (unpublished internal
 * + bootstrap) while the DENOMINATOR was the published population. Bootstrap
 * or internal picks that carry snapshots pushed the ratio past 1 (then
 * clamped to 1), so the cockpit read "fully covered / GREEN" even when the
 * public, canonical coverage was low — overstating launch readiness.
 *
 * The fix scopes BOTH sides to the same set: published, non-bootstrap picks.
 * We drive loadJarvisAssessment through a fake DB and assert (a) the snapshot
 * count is scoped, (b) no snapshot count is issued WITHOUT that scoping, and
 * (c) the derived signalCoverageStatus reflects the honest scoped ratio.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  // Snapshots among published, non-bootstrap picks (the scoped numerator).
  snapshotCount: 30,
  // The published, non-bootstrap population (the scoped denominator).
  publishedCanonicalCount: 100,
  // Every `where` passed to a snapshot-scoped pick.count, for scoping asserts.
  snapshotWheres: [] as Array<Record<string, unknown>>,
  dataQuality: 0.95,
}));

type Where = Record<string, unknown> & {
  signalSnapshot?: unknown;
  settledAt?: unknown;
  generatedAt?: unknown;
  result?: unknown;
  isPublished?: unknown;
  isBootstrap?: unknown;
  isFeatured?: unknown;
};

function pickCount(args?: { where?: Where }): Promise<number> {
  const w: Where = args?.where ?? {};
  if (w.signalSnapshot !== undefined) {
    state.snapshotWheres.push(w);
    return Promise.resolve(state.snapshotCount);
  }
  if (w.settledAt !== undefined) return Promise.resolve(0);
  if (w.generatedAt !== undefined) return Promise.resolve(0);
  if (w.result === "VOID") return Promise.resolve(0);
  if (w.isBootstrap === true && w.result !== undefined) return Promise.resolve(0);
  if (w.result !== undefined) {
    const r = w.result as { in?: unknown };
    if (r && typeof r === "object" && Array.isArray(r.in)) return Promise.resolve(60);
    if (w.result === "WIN") return Promise.resolve(40);
    if (w.result === "LOSS") return Promise.resolve(15);
    if (w.result === "PUSH") return Promise.resolve(5);
    if (w.result === "PENDING") return Promise.resolve(0);
  }
  // Denominator: published, non-bootstrap population.
  if (w.isPublished === true && w.isBootstrap === false) {
    return Promise.resolve(state.publishedCanonicalCount);
  }
  // All published (incl. bootstrap) — history.publishedCount.
  if (w.isPublished === true) return Promise.resolve(state.publishedCanonicalCount + 25);
  if (w.isFeatured === true) return Promise.resolve(0);
  return Promise.resolve(0);
}

vi.mock("@sports/db", () => ({
  isStubMode: () => false,
  isDemoPicksEnabled: () => false,
  db: {
    ingestionRun: {
      findFirst: () => Promise.resolve(null),
      count: () => Promise.resolve(0),
    },
    pick: {
      count: pickCount,
      findFirst: () => Promise.resolve(null),
      findMany: () => Promise.resolve([{ modelVersion: "v-test" }]),
    },
    game: {
      aggregate: () => Promise.resolve({ _avg: { dataQualityScore: state.dataQuality } }),
    },
  },
}));

async function load() {
  const { loadJarvisAssessment } = await import("./jarvis-data");
  return loadJarvisAssessment();
}

describe("jarvis-data signal coverage", () => {
  beforeEach(() => {
    state.snapshotWheres = [];
    state.snapshotCount = 30;
    state.publishedCanonicalCount = 100;
    state.dataQuality = 0.95;
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("scopes the snapshot count to published, non-bootstrap picks", async () => {
    await load();
    expect(state.snapshotWheres.length).toBeGreaterThan(0);
    for (const w of state.snapshotWheres) {
      expect(w.isPublished).toBe(true);
      expect(w.isBootstrap).toBe(false);
    }
  });

  it("never counts snapshots across the whole (unscoped) pick population", async () => {
    await load();
    const unscoped = state.snapshotWheres.filter(
      (w) => w.isPublished !== true || w.isBootstrap !== false
    );
    expect(unscoped).toEqual([]);
  });

  it("reads RED when public-canonical coverage is low, even with high DQ", async () => {
    // 30 / 100 = 0.30 published-canonical coverage. Under the old bug a large
    // pile of bootstrap/internal snapshots would have clamped this to 1 (GREEN).
    state.snapshotCount = 30;
    state.publishedCanonicalCount = 100;
    const { assessment } = await load();
    expect(assessment.signalCoverageStatus).toBe("RED");
  });

  it("reads GREEN only when the scoped coverage is genuinely high", async () => {
    state.snapshotCount = 95;
    state.publishedCanonicalCount = 100;
    const { assessment } = await load();
    expect(assessment.signalCoverageStatus).toBe("GREEN");
  });
});
