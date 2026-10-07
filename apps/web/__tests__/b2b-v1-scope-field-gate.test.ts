/**
 * B2B v1 — PRO-gated FIELD shaping by key scope.
 *
 * The ROW filter (`...(scope === "premium" ? {} : { tier: "FREE" })`) was fixed
 * earlier, but the FIELD shaping was not: a free-scope key still received
 * `modelConfidence` / `rankingP` / `pModel` on the FREE-tier rows it is allowed
 * to see. The product rule is "Free — 2 picks/day teaser, NO confidence
 * scores", and app/api/picks/route.ts already nulls confidence for exactly this
 * viewer. These are the regression tests for that gap.
 *
 * Shape note: the premium fields are emitted as `null`, NOT removed. This is a
 * published API surface, so the KEYS stay present and existing consumers that
 * read `.modelConfidence` / `.pModel` keep working.
 *
 * Ordering note: nulling a field must not degrade the sort. Both routes rank on
 * the UNDERLYING model values server-side and shape the response afterwards, so
 * a free-scope caller gets the same row ORDER as a premium one.
 */

import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ findMany: vi.fn() }));

vi.mock("@sports/db", () => ({
  db: { pick: { findMany: mocks.findMany } },
  isStubMode: () => false,
}));

vi.mock("@/lib/b2b/api-key-auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/b2b/api-key-auth")>();
  return {
    ...actual,
    // Bypass the durable (Postgres-backed) limiter; scope resolution stays real.
    rateLimitB2b: async () => ({ ok: true as const, remaining: 99, status: 200 }),
  };
});

const FREE_KEY = "freekey";
const PREMIUM_KEY = "premiumkey";

// Deterministic FREE-tier board: LOW ranks below HIGH on confidence alone.
const ROWS = [
  {
    id: "pick-low",
    pickType: "SPREAD",
    confidence: 55,
    selection: "KC -3.5",
    line: -3.5,
    generatedAt: new Date("2026-08-20T00:00:00.000Z"),
    modelVersion: "v5.1.0",
    factorBreakdown: null,
    game: {
      commenceTime: new Date("2026-08-21T00:00:00.000Z"),
      sport: { key: "americanfootball_nfl" },
      homeTeamName: "Chiefs",
      awayTeamName: "Bills",
    },
  },
  {
    id: "pick-high",
    pickType: "TOTAL",
    confidence: 80,
    selection: "Over 44.5",
    line: 44.5,
    generatedAt: new Date("2026-08-20T00:00:00.000Z"),
    modelVersion: "v5.1.0",
    factorBreakdown: null,
    game: {
      commenceTime: new Date("2026-08-21T00:00:00.000Z"),
      sport: { key: "americanfootball_nfl" },
      homeTeamName: "49ers",
      awayTeamName: "Rams",
    },
  },
];

interface Row {
  id: string;
  modelConfidence?: number | null;
  rankingP?: number | null;
  pModel?: number | null;
}

async function call(
  surface: "signals" | "probabilities",
  apiKey: string,
): Promise<{ status: number; rows: Row[]; where: Record<string, unknown> }> {
  vi.resetModules();
  mocks.findMany.mockResolvedValue(ROWS);
  const mod =
    surface === "signals"
      ? await import("@/app/api/v1/signals/route")
      : await import("@/app/api/v1/probabilities/route");
  const res = await mod.GET(
    new Request(`https://www.galaxysportsedge.com/api/v1/${surface}`, {
      headers: { "x-api-key": apiKey },
    }),
  );
  const body = (await res.json()) as { data: Row[] };
  const where = (mocks.findMany.mock.calls[0]?.[0]?.where ?? {}) as Record<string, unknown>;
  return { status: res.status, rows: body.data ?? [], where };
}

describe("B2B v1 PRO-gated field shaping", () => {
  const previousKeys = process.env["GSE_B2B_API_KEYS"];
  process.env["GSE_B2B_API_KEYS"] = `${FREE_KEY},${PREMIUM_KEY}:premium`;

  afterEach(() => {
    mocks.findMany.mockReset();
    if (previousKeys === undefined) delete process.env["GSE_B2B_API_KEYS"];
    else process.env["GSE_B2B_API_KEYS"] = previousKeys;
    process.env["GSE_B2B_API_KEYS"] = `${FREE_KEY},${PREMIUM_KEY}:premium`;
  });

  it("signals: a FREE-scope key gets modelConfidence/rankingP as null (keys retained)", async () => {
    const { status, rows, where } = await call("signals", FREE_KEY);

    expect(status).toBe(200);
    // Row filter (already fixed) still holds.
    expect(where["tier"]).toBe("FREE");
    expect(rows).toHaveLength(2);
    for (const row of rows) {
      expect(row.modelConfidence).toBeNull();
      expect(row.rankingP).toBeNull();
      // Published shape: the key must still be PRESENT, just null.
      expect(Object.prototype.hasOwnProperty.call(row, "modelConfidence")).toBe(true);
      expect(Object.prototype.hasOwnProperty.call(row, "rankingP")).toBe(true);
    }
    // Ordering must survive the nulling — ranked on the underlying confidence.
    expect(rows.map((r) => r.id)).toEqual(["pick-high", "pick-low"]);
  });

  it("signals: a PREMIUM-scope key still gets modelConfidence, in the same order", async () => {
    const { status, rows, where } = await call("signals", PREMIUM_KEY);

    expect(status).toBe(200);
    expect(where["tier"]).toBeUndefined();
    expect(rows.map((r) => r.modelConfidence)).toEqual([80, 55]);
    expect(rows.map((r) => r.id)).toEqual(["pick-high", "pick-low"]);
  });

  it("probabilities: a FREE-scope key gets pModel/rankingP as null (keys retained)", async () => {
    const { status, rows, where } = await call("probabilities", FREE_KEY);

    expect(status).toBe(200);
    expect(where["tier"]).toBe("FREE");
    expect(rows).toHaveLength(2);
    for (const row of rows) {
      expect(row.pModel).toBeNull();
      expect(row.rankingP).toBeNull();
      expect(Object.prototype.hasOwnProperty.call(row, "pModel")).toBe(true);
      expect(Object.prototype.hasOwnProperty.call(row, "rankingP")).toBe(true);
    }
    expect(rows.map((r) => r.id)).toEqual(["pick-high", "pick-low"]);
  });

  it("probabilities: a PREMIUM-scope key still gets pModel, in the same order", async () => {
    const { status, rows } = await call("probabilities", PREMIUM_KEY);

    expect(status).toBe(200);
    expect(rows.map((r) => r.pModel)).toEqual([0.8, 0.55]);
    expect(rows.map((r) => r.id)).toEqual(["pick-high", "pick-low"]);
  });
});
