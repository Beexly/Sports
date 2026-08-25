import { describe, expect, it, vi } from "vitest";
import {
  loadCanonicalSamplePosture,
  isCalibrationPublished,
  loadCanonicalSampleBySport,
} from "@/lib/ops/canonical-sample-posture";
import { loadPublicPerformancePolicy } from "@/lib/performance/public-performance-policy";

/**
 * Mirrors loadPublicPerformancePolicy count order:
 * settled, wins, losses, pushes, pending, bootstrap, recentTotal, recentBootstrap
 */
function mockDb(seq: number[]) {
  const count = vi.fn();
  for (const n of seq) count.mockResolvedValueOnce(n);
  return { pick: { count } } as never;
}

describe("loadCanonicalSamplePosture", () => {
  it("exposes canonical settled and excludes bootstrap from ladder N", async () => {
    const sample = await loadCanonicalSamplePosture(
      // Order matches the db.pick.count sequence in loadCanonicalSamplePosture:
      // settled, WIN, LOSS, PUSH, VOID, PENDING, bootstrapSettled, recent, recentBootstrap.
      // (VOID was added by the Clopper-Pearson work — decided-only rates need voids
      // counted in the population but excluded from the rate.)
      mockDb([42, 20, 18, 4, 3, 11, 900, 50, 40]),
      {
        commencedTotal: 1478,
        canExposePerformanceStats: false,
        minSettledPicksForLearning: 100,
      },
    );
    expect(sample.commencedTotal).toBe(1478);
    expect(sample.canonicalSettled).toBe(42);
    expect(sample.canonicalWins).toBe(20);
    expect(sample.canonicalLosses).toBe(18);
    expect(sample.canonicalPushes).toBe(4);
    // VOID is counted upstream (it belongs in the population, not the decided
    // rate) but CanonicalSamplePosture deliberately doesn't surface it.
    expect(sample.canonicalPending).toBe(11);
    expect(sample.bootstrapSettled).toBe(900);
    expect(sample.remainingToFloor).toBe(58);
    expect(sample.operatorHint).toMatch(/42\/100/);
  });

  it("remainingToFloor is zero when above learning floor", async () => {
    const sample = await loadCanonicalSamplePosture(
      // settled, WIN, LOSS, PUSH, VOID, PENDING, bootstrapSettled, recent, recentBootstrap
      mockDb([150, 70, 70, 10, 2, 5, 0, 20, 0]),
      {
        commencedTotal: 200,
        canExposePerformanceStats: false,
        minSettledPicksForLearning: 100,
      },
    );
    // PR #375 (commit 8670e51b) deliberately replaced "published calibration +
    // founder YES" with the eligibility + publish-policy contract: PROVEN still
    // needs eligibility GREEN and a publish policy (AUTO_PUBLISH or PUBLISHED).
    expect(sample.remainingToFloor).toBe(0);
    expect(sample.operatorHint).toMatch(/meets learning floor 100/);
    expect(sample.operatorHint).toMatch(/PROVEN still requires eligibility GREEN/);
    expect(sample.operatorHint).toMatch(/sample alone is not enough/);
  });
});

describe("loadCanonicalSampleBySport", () => {
  const SPORTS = [
    { key: "americanfootball_nfl", displayName: "NFL" },
    { key: "americanfootball_ncaaf", displayName: "NCAAF" },
    { key: "baseball_mlb", displayName: "MLB" },
  ];

  /**
   * Fixture-aware mock: `db.pick.count` sums the fixture across ALL sports
   * when the `where` has no `game.sport.key` scope (mirrors
   * loadPublicPerformancePolicy's cumulative queries), or scopes to one
   * sport's row when it does (mirrors loadCanonicalSampleBySport's queries).
   * The same mock instance serves both loaders so the parity test below
   * proves the two loaders' filter shapes actually agree, not just that two
   * hand-picked numbers were set equal.
   */
  function fixtureDb(bySport: Record<string, { win: number; loss: number; push: number }>) {
    const count = vi.fn(({ where }: { where: Record<string, unknown> }) => {
      const scope = where["game"] as { sport?: { key?: string } } | undefined;
      const sportKey = scope?.sport?.key;
      const rows = sportKey ? [bySport[sportKey] ?? { win: 0, loss: 0, push: 0 }] : Object.values(bySport);
      const sum = (f: "win" | "loss" | "push") => rows.reduce((s, r) => s + r[f], 0);
      if (where["isBootstrap"] === true || where["generatedAt"]) return Promise.resolve(0);
      const result = where["result"];
      if (result && typeof result === "object" && "in" in result) {
        return Promise.resolve(sum("win") + sum("loss") + sum("push"));
      }
      if (result === "WIN") return Promise.resolve(sum("win"));
      if (result === "LOSS") return Promise.resolve(sum("loss"));
      if (result === "PUSH") return Promise.resolve(sum("push"));
      return Promise.resolve(0);
    });
    return { pick: { count } };
  }

  const FIXTURE = {
    americanfootball_nfl: { win: 10, loss: 8, push: 1 },
    americanfootball_ncaaf: { win: 5, loss: 3, push: 0 },
    baseball_mlb: { win: 0, loss: 0, push: 0 },
  };

  it("scopes counts per sport via game.sport.key, zero rows render 0 not omitted", async () => {
    const db = fixtureDb(FIXTURE);
    const rows = await loadCanonicalSampleBySport(db as never, SPORTS);
    expect(rows).toHaveLength(3);
    const nfl = rows.find((r) => r.sportKey === "americanfootball_nfl")!;
    expect(nfl.canonicalSettled).toBe(19);
    expect(nfl.canonicalWins).toBe(10);
    expect(nfl.canonicalLosses).toBe(8);
    expect(nfl.canonicalPushes).toBe(1);
    expect(nfl.error).toBeUndefined();
    const mlb = rows.find((r) => r.sportKey === "baseball_mlb")!;
    expect(mlb.canonicalSettled).toBe(0);
    expect(mlb.error).toBeUndefined();
  });

  it("sum(bySport[*].canonicalSettled) equals loadPublicPerformancePolicy's cumulative count (same filter shape)", async () => {
    const db = fixtureDb(FIXTURE);
    const rows = await loadCanonicalSampleBySport(db as never, SPORTS);
    const bySportTotal = rows.reduce((s, r) => s + r.canonicalSettled, 0);

    const policy = await loadPublicPerformancePolicy(db as never, {
      canExposePerformanceStats: true,
      minSettledPicksForLearning: 1,
    });
    expect(bySportTotal).toBe(policy.canonicalSettledCount);
    expect(bySportTotal).toBe(27); // (10+8+1) + (5+3+0) + (0+0+0)
  });

  it("one sport's count query throwing does not blank the other sports", async () => {
    const count = vi.fn(({ where }: { where: Record<string, unknown> }) => {
      const scope = where["game"] as { sport?: { key?: string } } | undefined;
      if (scope?.sport?.key === "baseball_mlb") {
        return Promise.reject(new Error("connection reset"));
      }
      const rows = scope?.sport?.key ? [FIXTURE[scope.sport.key as keyof typeof FIXTURE]] : Object.values(FIXTURE);
      const sum = (f: "win" | "loss" | "push") => rows.reduce((s, r) => s + r[f], 0);
      const result = where["result"];
      if (result && typeof result === "object" && "in" in result) {
        return Promise.resolve(sum("win") + sum("loss") + sum("push"));
      }
      if (result === "WIN") return Promise.resolve(sum("win"));
      if (result === "LOSS") return Promise.resolve(sum("loss"));
      if (result === "PUSH") return Promise.resolve(sum("push"));
      return Promise.resolve(0);
    });
    const db = { pick: { count } };

    const rows = await loadCanonicalSampleBySport(db as never, SPORTS);
    const nfl = rows.find((r) => r.sportKey === "americanfootball_nfl")!;
    const ncaaf = rows.find((r) => r.sportKey === "americanfootball_ncaaf")!;
    const mlb = rows.find((r) => r.sportKey === "baseball_mlb")!;

    expect(nfl.canonicalSettled).toBe(19);
    expect(nfl.error).toBeUndefined();
    expect(ncaaf.canonicalSettled).toBe(8);
    expect(ncaaf.error).toBeUndefined();
    expect(mlb.error).toBeTruthy();
    expect(mlb.canonicalSettled).toBe(0);
  });
});

describe("isCalibrationPublished", () => {
  it("defaults false and only true on exact env true", () => {
    expect(isCalibrationPublished({})).toBe(false);
    expect(isCalibrationPublished({ CALIBRATION_PUBLISHED: "true" })).toBe(true);
    expect(isCalibrationPublished({ CALIBRATION_PUBLISHED: "yes" })).toBe(false);
  });
});
