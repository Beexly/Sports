import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * /api/clv — executed behavior. The public CLV JSON surface must obey the same
 * gate-until-defensible discipline as /api/performance: 503 until the
 * performance gate is on, and below the graded-sample floor it exposes the
 * counts but withholds the beat-close RATE (never a fabricated number).
 *
 * Follows the executed-handler + vi.mock("@sports/db") pattern used by
 * health-route.test.ts and picks-stale-kill-switch.test.ts.
 */

const mocks = vi.hoisted(() => ({
  canExposePerformanceStats: true,
  minSettledPicksForLearning: 25,
  pickFindMany: vi.fn<(args: unknown) => Promise<unknown[]>>(),
}));

vi.mock("@sports/db", () => ({
  db: { pick: { findMany: mocks.pickFindMany } },
}));

vi.mock("@sports/prediction-engine", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@sports/prediction-engine")>();
  return {
    ...actual,
    getReadinessGates: () => ({
      canExposePerformanceStats: mocks.canExposePerformanceStats,
      minSettledPicksForLearning: mocks.minSettledPicksForLearning,
    }),
  };
});

async function callClv(): Promise<{ status: number; body: Record<string, unknown> }> {
  vi.resetModules();
  const mod = await import("@/app/api/clv/route");
  const req = new Request("http://localhost/api/clv");
  const res = await mod.GET(req as unknown as Parameters<typeof mod.GET>[0]);
  return { status: res.status, body: (await res.json()) as Record<string, unknown> };
}

/**
 * loadPublicClvPolicy now issues ONE findMany and partitions in app code, because
 * the in-play rule compares a pick column to a GAME column and a Prisma `where`
 * cannot express that (C-302 extended to the CLV reader).
 *
 * Every row here is PRE-GAME, so these fixtures exercise the same arithmetic the
 * four counts used to. The in-play path has its own fixture below rather than
 * being smuggled into the shared helper — a helper that quietly produced
 * excluded rows would make every other assertion in this file mean something
 * different from what it says.
 */
const PREGAME = { generatedAt: new Date("2026-07-01T00:00:00Z"), game: { commenceTime: new Date("2026-07-01T02:00:00Z") } };
const IN_PLAY = { generatedAt: new Date("2026-07-01T03:00:00Z"), game: { commenceTime: new Date("2026-07-01T02:00:00Z") } };

function rows(beat: number, lost: number, matched: number, inPlayLost = 0): unknown[] {
  const out: unknown[] = [];
  for (let i = 0; i < beat; i++) out.push({ clvVerdict: "BEAT_CLOSE", ...PREGAME });
  for (let i = 0; i < lost; i++) out.push({ clvVerdict: "LOST_TO_CLOSE", ...PREGAME });
  for (let i = 0; i < matched; i++) out.push({ clvVerdict: "MATCHED_CLOSE", ...PREGAME });
  for (let i = 0; i < inPlayLost; i++) out.push({ clvVerdict: "LOST_TO_CLOSE", ...IN_PLAY });
  return out;
}

function mockCounts(graded: number, beat: number, lost: number, matched: number): void {
  // `graded` is now derived from the rows rather than mocked independently, so a
  // fixture whose parts do not add up fails here instead of silently publishing
  // a rate over a denominator that never existed.
  if (beat + lost + matched !== graded) {
    throw new Error(`fixture does not add up: ${beat}+${lost}+${matched} !== ${graded}`);
  }
  mocks.pickFindMany.mockResolvedValueOnce(rows(beat, lost, matched));
}

describe("/api/clv", () => {
  beforeEach(() => {
    mocks.canExposePerformanceStats = true;
    mocks.minSettledPicksForLearning = 25;
    mocks.pickFindMany.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("drops a pick minted after kickoff, and says so rather than silently", async () => {
    // MEASURED on production 2026-09-14: 158 graded rows were generated at or
    // after their game's kickoff, and 0 of the 119 moneylines among them beat
    // the close. That is arithmetic, not a model result -- a pick locked at a
    // LIVE price has no close to beat, so the comparison can only read as a
    // loss. C-298 excluded these from the eligibility sample and C-302 from the
    // confidence readers; CLV was the surface the rule had not reached.
    //
    // 24 beat / 12 lost / 4 matched PRE-GAME, plus 10 in-play losses. If the
    // exclusion regresses, the denominator becomes 50 and the rate drops to
    // 48.0 -- so this assertion fails in the direction the defect moves.
    mocks.pickFindMany.mockResolvedValueOnce(rows(24, 12, 4, 10));

    const { status, body } = await callClv();
    expect(status).toBe(200);
    const data = body["data"] as Record<string, unknown>;
    expect(data["gradedSampleSize"]).toBe(40);
    expect(data["beatCloseRatePct"]).toBe(60);
    // The exclusion is reported, never silent: a number that moved a published
    // rate has to be visible beside it.
    expect(data["inPlayExcluded"]).toBe(10);
    expect(String(data["inPlayNote"])).toMatch(/Excluded 10 of 50/);
  });

  it("an all-in-play sample publishes nothing rather than publishing zero", async () => {
    // The degenerate end: every graded row is in-play, so there is no sample at
    // all. The floor must catch this and withhold the rate. Publishing 0% here
    // would be the worst outcome -- a fabricated number with no rows behind it.
    mocks.pickFindMany.mockResolvedValueOnce(rows(0, 0, 0, 30));

    const { status, body } = await callClv();
    expect(status).toBe(200);
    const data = body["data"] as Record<string, unknown>;
    expect(data["gradedSampleSize"]).toBe(0);
    expect(data["beatCloseRatePct"]).toBeNull();
    expect(data["inPlayExcluded"]).toBe(30);
  });

  it("returns 503 (bootstrap gate) when the performance gate is off", async () => {
    mocks.canExposePerformanceStats = false;

    const { status, body } = await callClv();

    expect(status).toBe(503);
    // Honest gate: bootstrapMode tracks real history mode, not "any feature off".
    expect(typeof body["bootstrapMode"]).toBe("boolean");
    expect(String(body["error"] ?? "")).toMatch(/disabled/i);
    expect(mocks.pickFindMany).not.toHaveBeenCalled();
  });

  it("exposes the beat-close rate once the graded sample clears the floor", async () => {
    // 40 graded (>= 25 floor): 24 beat, 12 lost, 4 matched.
    mockCounts(40, 24, 12, 4);

    const { status, body } = await callClv();

    expect(status).toBe(200);
    expect(body["success"]).toBe(true);
    const data = body["data"] as Record<string, unknown>;
    expect(data["canExposeClv"]).toBe(true);
    expect(data["gradedSampleSize"]).toBe(40);
    expect(data["beatCloseRatePct"]).toBe(60); // 24/40
    expect(body["disclaimer"]).toContain("Closing line value");
  });

  it("withholds the rate but keeps counts below the graded-sample floor", async () => {
    // Only 5 graded, below the 25 floor.
    mockCounts(5, 3, 1, 1);

    const { status, body } = await callClv();

    expect(status).toBe(200);
    const data = body["data"] as Record<string, unknown>;
    expect(data["canExposeClv"]).toBe(false);
    // Rate withheld (never a fabricated number off a thin sample)...
    expect(data["beatCloseRatePct"]).toBeNull();
    // ...but the factual sample size is still exposed.
    expect(data["gradedSampleSize"]).toBe(5);
  });

  it("fails closed to a 503 collecting state on a DB error (no stack-trace leak)", async () => {
    mocks.pickFindMany.mockRejectedValue(new Error("db down"));

    const { status, body } = await callClv();

    expect(status).toBe(503);
    expect(typeof body["bootstrapMode"]).toBe("boolean");
    expect(String(body["error"] ?? "")).toMatch(/disabled|collecting|unavailable/i);
  });
});
