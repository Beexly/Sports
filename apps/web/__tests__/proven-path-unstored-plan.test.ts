import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Regression: a plan that was BUILT but not STORED must not be handed back.
 *
 * `persistProvenPathPlan` reports `"ok" | "stub" | "error"`, but
 * `loadProvenPathSurface` discarded it and returned a surface carrying the plan
 * regardless. `loadProvenPathPlan` then reported that plan as the durable one —
 * so selective publish and the FOUNDING → PROVEN gate would act on a plan that
 * exists only in the isolate that computed it, and that no other isolate can
 * see. `null` ("no durable plan") is the honest answer, and the one every
 * caller already degrades on.
 *
 * The assertion drives the FAILED-write path specifically; asserting only that
 * a successful write returns a surface would pass against the broken code.
 */

const persistProvenPathPlanMock = vi.fn();
const stubMock = vi.fn(() => false);
const pickFindManyMock = vi.fn(async () => [] as unknown[]);

vi.mock("@sports/db", () => ({
  isStubMode: () => stubMock(),
  db: {
    pick: { findMany: (...a: unknown[]) => pickFindManyMock(...(a as [])) },
    // The real loadRankingPauseApply runs on the success path; give it a
    // delegate so it answers "no durable pause" instead of throwing.
    jarvisMemoryEvent: { findFirst: async () => null },
  },
}));

/**
 * `loadProvenPathSurface` returns early at `rows.length < 50`, so a test that
 * leaves the pick table empty never reaches the durable write at all. These are
 * the minimum a row must satisfy to survive `toProvenPathPickRow`: a settled
 * WIN/LOSS and a finite confidence.
 */
function settledPicks(count: number): unknown[] {
  return Array.from({ length: count }, (_, i) => ({
    confidence: 55 + (i % 30),
    result: i % 3 === 0 ? "LOSS" : "WIN",
    pickType: "SPREAD",
    factorBreakdown: null,
    game: { sport: { key: "nfl", name: "NFL" } },
  }));
}

vi.mock("@/lib/ops/proven-path-durable", () => ({
  persistProvenPathPlan: (...a: unknown[]) => persistProvenPathPlanMock(...a),
  loadProvenPathPlan: vi.fn(async () => null),
}));

describe("proven-path surface: an unstored plan is not returned", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stubMock.mockReturnValue(false);
    // Enough eligible rows to clear the `rows.length < 50` early return, so the
    // durable write is actually reached.
    pickFindManyMock.mockResolvedValue(settledPicks(60));
  });

  it("returns null when the durable write failed", async () => {
    persistProvenPathPlanMock.mockResolvedValue("error");
    const { loadProvenPathSurface } = await import("@/lib/ops/proven-path-seed");

    await expect(loadProvenPathSurface()).resolves.toBeNull();
    // Without this the case would be vacuous: an empty pick table returns null
    // before the write, so the assertion above would hold whether or not the
    // guard exists.
    expect(persistProvenPathPlanMock).toHaveBeenCalledOnce();
  });

  it("DOES return a surface when the same plan is written successfully", async () => {
    // The control that gives the case above its meaning. If the surface were
    // null for a successful write too, "returns null on error" would be
    // measuring the row loader rather than the guard.
    persistProvenPathPlanMock.mockResolvedValue("ok");
    const { loadProvenPathSurface } = await import("@/lib/ops/proven-path-seed");

    const surface = await loadProvenPathSurface();

    expect(persistProvenPathPlanMock).toHaveBeenCalledOnce();
    expect(surface).not.toBeNull();
    expect(surface?.plan).toBeDefined();
  });

  it("returns null in real stub mode, before the write is even attempted", async () => {
    // Actual stub mode. `loadProvenPathSurface` returns at its own
    // `isStubMode()` guard, so `persistProvenPathPlan` is never reached — which
    // is why the case below can only ever be about the RETURN VALUE "stub",
    // not about stub mode itself.
    stubMock.mockReturnValue(true);
    const { loadProvenPathSurface } = await import("@/lib/ops/proven-path-seed");

    await expect(loadProvenPathSurface()).resolves.toBeNull();
    expect(persistProvenPathPlanMock).not.toHaveBeenCalled();
  });

  it("does NOT withhold the surface when persist reports \"stub\"", async () => {
    // Earlier this case was titled "also withholds the surface in stub mode",
    // which contradicted its own assertion AND was not in stub mode. Named for
    // what it actually pins: only "error" withholds. The branch is unreachable
    // in production — persistProvenPathPlan returns "stub" only when
    // isStubMode() is true, and the case above shows the surface has already
    // returned by then — so this documents the contract, nothing more.
    persistProvenPathPlanMock.mockResolvedValue("stub");
    const { loadProvenPathSurface } = await import("@/lib/ops/proven-path-seed");

    const surface = await loadProvenPathSurface();
    expect(persistProvenPathPlanMock).toHaveBeenCalledOnce();
    expect(surface).not.toBeNull();
  });

  it("the failed-write branch returns before building a surface", async () => {
    // Source-level pin. `apps/web/tsconfig.json` excludes __tests__, so a
    // type-level assertion here would never be checked; this reads the real
    // file and asserts the guard sits between the write and the projection.
    const { readFileSync } = await import("node:fs");
    const { fileURLToPath } = await import("node:url");
    const { dirname, join } = await import("node:path");
    const here = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(join(here, "..", "lib/ops/proven-path-seed.ts"), "utf8");

    const write = src.indexOf("const planWrite = await persistProvenPathPlan(plan)");
    const guard = src.indexOf('if (planWrite === "error")');
    const projection = src.indexOf("projectProvenPathMetrics(rows)");

    expect(write).toBeGreaterThan(-1);
    expect(guard).toBeGreaterThan(write);
    expect(projection).toBeGreaterThan(guard);
    expect(src.slice(guard, projection)).toContain("return null");
  });
});
