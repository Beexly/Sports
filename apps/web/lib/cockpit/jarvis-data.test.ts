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
  // The other signal dimensions. classifySignal takes the MIN across all of
  // them, so any one left at 0 pins the status to RED and makes the snapshot
  // ratio — the thing this file actually tests — unobservable. Each test sets
  // these to whatever isolates the dimension under test.
  featureSnapshots: [] as Array<Record<string, boolean>>,
  gameSignalIds: [] as string[],
  publishedGameIds: [] as string[],
  dailyBriefCount: 0,
}));

/** A snapshot row with every `had*Signal` flag set — a fully-covered pick. */
function fullSignalSnapshot(): Record<string, boolean> {
  return Object.fromEntries(
    [
      "hadOddsSignal",
      "hadLineMovementSignal",
      "hadRestSignal",
      "hadScheduleSignal",
      "hadAtsFormSignal",
      "hadH2HSignal",
      "hadVenueSignal",
      "hadWeatherSignal",
      "hadInjurySignal",
      "hadRatingsSignal",
      "hadPlayerSignal",
      "hadOfficialsSignal",
      "hadVenueEnvironmentSignal",
      "hadPaceSignal",
      "hadMilestoneSignal",
    ].map((k) => [k, true]),
  );
}

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

// The loader fans out over SEVEN Prisma models inside one Promise.all. A model
// missing from this fake is `undefined`, so the property access throws while
// BUILDING the array — before any per-call `.catch()` can attach — and every
// test in this file dies with a TypeError instead of an assertion failure.
// Keep this list in sync with the `db.<model>` calls in jarvis-data.ts.
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
      // Two distinct call sites: model versions, and published gameIds.
      findMany: (args?: { distinct?: readonly string[] }) =>
        args?.distinct?.includes("gameId")
          ? Promise.resolve(state.publishedGameIds.map((gameId) => ({ gameId })))
          : Promise.resolve([{ modelVersion: "v-test" }]),
    },
    game: {
      aggregate: () => Promise.resolve({ _avg: { dataQualityScore: state.dataQuality } }),
    },
    settlementRun: {
      findFirst: () => Promise.resolve(null),
      count: () => Promise.resolve(0),
    },
    pickSignalSnapshot: {
      findMany: () => Promise.resolve(state.featureSnapshots),
    },
    gameSignal: {
      groupBy: () =>
        Promise.resolve(
          state.gameSignalIds.map((gameId) => ({ gameId, _count: { _all: 1 } })),
        ),
    },
    dailyBrief: {
      count: () => Promise.resolve(state.dailyBriefCount),
    },
  },
}));

// The free-source redundancy score is one of the six metrics classifySignal
// takes the MIN over, and it is currently ~0.73 because polymarket-gamma and
// kalshi-public are on COMPLIANCE HOLD (cleared:false). That is a real, live
// rights fact — and it is not what this file tests. Left un-mocked it pins the
// status to AMBER no matter how honest the snapshot ratio is, so the GREEN
// assertion could never observe the dimension under test. Pin it to full
// redundancy so these tests measure snapshot-coverage math and nothing else.
// (source-router's own coverage lives in source-router.test.ts.)
const NEEDS = [
  "scores",
  "results",
  "odds",
  "standings",
  "schedules",
  "weather",
  "player_stats",
] as const;

vi.mock("@/lib/data-sources/source-router", () => ({
  freeCoverageMatrix: () =>
    NEEDS.map((need) => ({
      need,
      sport: "nfl",
      freeCovers: true,
      primaryId: "espn-public-api",
      mustSpend: false,
      clearedCount: 2,
      redundancy: "multi",
    })),
  redundancyGaps: () => [],
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
    state.featureSnapshots = [];
    state.gameSignalIds = [];
    state.publishedGameIds = [];
    state.dailyBriefCount = 0;
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
    // Isolate the dimension under test. classifySignal takes the MIN across
    // every defined metric, so the feature-matrix and game-signal dimensions
    // must be non-limiting or they, not the scoped snapshot ratio, decide the
    // status. (The free-source score is handled by the mock below.)
    state.featureSnapshots = Array.from({ length: 200 }, fullSignalSnapshot);
    state.publishedGameIds = Array.from({ length: 50 }, (_, i) => `g${i}`);
    state.gameSignalIds = [...state.publishedGameIds];
    const { assessment } = await load();
    expect(assessment.signalCoverageStatus).toBe("GREEN");
  });
});
