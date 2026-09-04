import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * CACHE STAMPEDE on the public picks route (the day-one failure).
 *
 * `/api/picks` maps EVERY fetched pick through `passesPublicSelectiveFilterAsync`
 * inside a `Promise.all`. Both durable loaders behind it were memoised by
 * RESOLVED VALUE:
 *
 *     if (cachedPlan !== undefined) return cachedPlan;   // <- guard
 *     cachedPlan = await loadProvenPathPlan();           // <- assignment
 *
 * `Promise.all` invokes all N map callbacks synchronously up to their first
 * `await`, so every caller clears the guard before the first assignment ever
 * lands: nothing is memoised until the whole fan-out has already been issued.
 *
 * Measured on a cold lambda: a PRO/ELITE viewer (dailyPickLimit null →
 * `take: 200`) fired 200 plan reads + 200 pause reads = 400 concurrent durable
 * queries for ONE request; FREE/Fantasy (`take: 48`) fired 96. Warm: 0 — so it
 * fires exactly during a cold-start traffic spike, on the money page.
 *
 * WHAT THIS FILE COUNTS: real DB round-trips. Both durable loaders read
 * `jarvisMemoryEvent.findFirst` (distinguished by `where.scope`), so ONLY
 * `@sports/db` is mocked here and the durable modules run for real. Counting
 * queries — not mock invocations behind a mocked dynamic `import()` — is what
 * makes the number in these assertions the same number Neon would have seen.
 */

const PROVEN_SCOPE = "ops.calibration.proven-path";
const PAUSE_SCOPE = "ops.ranking.pause-apply";

interface FindFirstArgs {
  where: { scope: string; memory_type: string };
}

const dbMocks = vi.hoisted(() => ({ findFirst: vi.fn() }));

vi.mock("@sports/db", () => ({
  isStubMode: () => false,
  isDemoPicksEnabled: () => false,
  db: { jarvisMemoryEvent: { findFirst: dbMocks.findFirst, create: vi.fn() } },
}));

import {
  clearSelectiveRuntimeCaches,
  getCachedProvenPathPlan,
  getCachedRankingPauseDurable,
  passesPublicSelectiveFilterAsync,
  type PublicPickLike,
} from "@/lib/calibration/selective-publish-runtime";

const PLAN_ROW = {
  metadata: { generatedAt: "2026-08-01T00:00:00.000Z", defaultDelta: 0.1, pauseGroups: [], keepGroups: [] },
  full_text: null,
};
const PAUSE_ROW = {
  metadata: { enabled: false, groups: [], setAt: "2026-08-01T00:00:00.000Z", setBy: "founder", note: "test" },
  full_text: null,
};

/** The exact fan-out /api/picks issues for a PRO/ELITE viewer: take: 200. */
const PRO_ELITE_TAKE = 200;
/** …and for a FREE / Fantasy viewer: take: 48. */
const FREE_TAKE = 48;

function picks(n: number): PublicPickLike[] {
  return Array.from({ length: n }, (_, i) => ({
    confidence: 60 + (i % 20),
    rankingP: 0.62,
    rankingScore: 62,
    edgeScore: 3,
    pickType: "spread",
    sportKey: "americanfootball_nfl",
    marketImpliedProb: 0.5,
  }));
}

function queriesFor(scope: string): number {
  return dbMocks.findFirst.mock.calls.filter(
    (call) => (call[0] as FindFirstArgs).where.scope === scope,
  ).length;
}

/** One macrotask turn (drains the microtask queue behind it). */
function tick(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * Wait until the herd has actually been issued — i.e. the first DB read is in
 * flight — then give every sibling caller its turn before counting.
 *
 * A fixed number of ticks would be unfair to both sides: the first dynamic
 * `import()` of a durable module can take several turns, and counting too early
 * would read 0 whether or not the fix is present. The 200 callers all resume
 * from the SAME module-load promise, so their reads are issued in one microtask
 * drain — by the time this returns, the count is the herd's full size.
 */
async function settle(): Promise<void> {
  for (let i = 0; i < 50; i += 1) {
    await tick();
    if (dbMocks.findFirst.mock.calls.length > 0) break;
  }
  await tick();
  await tick();
}

/**
 * A DB that holds every read open until released — this is what forces the
 * genuinely concurrent path. Without it a fast-resolving read lets caller N
 * find the value already cached, and the test would pass before AND after.
 */
function gatedDb(): { release: () => void } {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => (release = resolve));
  dbMocks.findFirst.mockImplementation(async (args: FindFirstArgs) => {
    await gate;
    return args.where.scope === PROVEN_SCOPE ? PLAN_ROW : PAUSE_ROW;
  });
  return { release };
}

beforeEach(() => {
  clearSelectiveRuntimeCaches();
  dbMocks.findFirst.mockReset().mockImplementation(async (args: FindFirstArgs) =>
    args.where.scope === PROVEN_SCOPE ? PLAN_ROW : PAUSE_ROW,
  );
});

describe("selective-publish runtime: durable loaders are single-flight", () => {
  it("200 CONCURRENT callers cost ONE plan query, not 200", async () => {
    const db = gatedDb();

    // Every caller is issued before any of them can resolve — the real shape.
    const inFlight = Promise.all(
      Array.from({ length: PRO_ELITE_TAKE }, () => getCachedProvenPathPlan()),
    );
    await settle();

    // Pre-fix this is 200: all 200 cleared the `!== undefined` guard.
    expect(queriesFor(PROVEN_SCOPE)).toBe(1);

    db.release();
    const results = await inFlight;
    expect(queriesFor(PROVEN_SCOPE)).toBe(1);
    expect(results).toHaveLength(PRO_ELITE_TAKE);
    // Every caller got the SAME resolved plan — one flight, shared.
    expect(new Set(results).size).toBe(1);
    expect(results[0]).not.toBeNull();
  });

  it("200 CONCURRENT callers cost ONE pause-snap query, not 200", async () => {
    const db = gatedDb();

    const inFlight = Promise.all(
      Array.from({ length: PRO_ELITE_TAKE }, () => getCachedRankingPauseDurable()),
    );
    await settle();

    expect(queriesFor(PAUSE_SCOPE)).toBe(1);

    db.release();
    const results = await inFlight;
    expect(queriesFor(PAUSE_SCOPE)).toBe(1);
    expect(new Set(results).size).toBe(1);
    expect(results[0]).not.toBeNull();
  });

  it("the real /api/picks shape — Promise.all over 200 picks — costs 2 DB queries, not 400", async () => {
    const db = gatedDb();

    // Mirrors apps/web/app/api/picks/route.ts:
    //   await Promise.all(picks.map(async (pick) => passesPublicSelectiveFilterAsync(...)))
    const inFlight = Promise.all(
      picks(PRO_ELITE_TAKE).map((pick) => passesPublicSelectiveFilterAsync(pick, {})),
    );
    await settle();
    db.release();
    const verdicts = await inFlight;

    expect(dbMocks.findFirst.mock.calls.length).toBe(2); // pre-fix: 400
    expect(queriesFor(PROVEN_SCOPE)).toBe(1);
    expect(queriesFor(PAUSE_SCOPE)).toBe(1);
    expect(verdicts).toHaveLength(PRO_ELITE_TAKE);
    expect(verdicts.every((v) => typeof v === "boolean")).toBe(true);
  });

  it("the FREE / Fantasy fan-out (take: 48) costs 2 DB queries, not 96", async () => {
    const db = gatedDb();

    const inFlight = Promise.all(
      picks(FREE_TAKE).map((pick) => passesPublicSelectiveFilterAsync(pick, {})),
    );
    await settle();
    db.release();
    await inFlight;

    expect(dbMocks.findFirst.mock.calls.length).toBe(2); // pre-fix: 96
  });

  it("every concurrent caller sees the SAME durable plan object (one parse, not 200)", async () => {
    // A fresh row per read, exactly as Prisma hands one back: pre-fix each of
    // the 200 callers ran its own read and parsed its own plan object, so the
    // selective filter re-derived its config per pick instead of sharing one.
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    dbMocks.findFirst.mockReset().mockImplementation(async () => {
      await gate;
      return { metadata: { ...PLAN_ROW.metadata }, full_text: null };
    });

    const inFlight = Promise.all(
      Array.from({ length: PRO_ELITE_TAKE }, () => getCachedProvenPathPlan()),
    );
    await settle();
    release();
    const results = await inFlight;

    expect(new Set(results).size).toBe(1); // pre-fix: 200 distinct objects
    expect(dbMocks.findFirst.mock.calls.length).toBe(1);
  });

  it("a warm isolate serves later requests from cache with zero further queries", async () => {
    await Promise.all(picks(FREE_TAKE).map((pick) => passesPublicSelectiveFilterAsync(pick, {})));
    expect(dbMocks.findFirst.mock.calls.length).toBe(2);

    await Promise.all(picks(FREE_TAKE).map((pick) => passesPublicSelectiveFilterAsync(pick, {})));
    expect(dbMocks.findFirst.mock.calls.length).toBe(2);
  });

  it("clearSelectiveRuntimeCaches() still forces a reload (post-write invalidation preserved)", async () => {
    // /api/ops/ranking-pause-apply calls this after a founder write; caching a
    // promise must not break that invalidation.
    await getCachedProvenPathPlan();
    await getCachedRankingPauseDurable();
    expect(dbMocks.findFirst.mock.calls.length).toBe(2);

    clearSelectiveRuntimeCaches();

    await getCachedProvenPathPlan();
    await getCachedRankingPauseDurable();
    expect(queriesFor(PROVEN_SCOPE)).toBe(2);
    expect(queriesFor(PAUSE_SCOPE)).toBe(2);
  });

  it("a DB outage degrades to null and is still bounded to one query per batch", async () => {
    dbMocks.findFirst.mockReset().mockRejectedValue(new Error("neon pool exhausted"));

    const verdicts = await Promise.all(
      picks(PRO_ELITE_TAKE).map((pick) => passesPublicSelectiveFilterAsync(pick, {})),
    );

    // The durable loaders swallow DB errors and return null, so the public
    // board still renders — but it must not cost 400 failing queries to do it.
    expect(dbMocks.findFirst.mock.calls.length).toBe(2);
    expect(verdicts.every((v) => typeof v === "boolean")).toBe(true);
  });
});
