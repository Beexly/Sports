import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * WP-22 (issue #1137): a book-less row stores its `line` as the non-null DB
 * sentinel `0`. The public API used to serialize that straight through beside
 * `hasBookPrice: false`, so a consumer received
 *
 *   { "pickType": "MONEYLINE", "line": 0, "hasBookPrice": false }
 *
 * which reads as a quote no book ever made. The fix is in the serializer: the
 * sentinel is withheld as `null`, and `PublicPick.line` is nullable so a
 * consumer cannot read a number that was never quoted.
 *
 * What must NOT change with it:
 *   - a book-priced SPREAD keeps its real number, including a genuine 0 (a
 *     pick'em spread IS zero — nulling every zero would delete a real line);
 *   - `hasBookPrice` stays the source of truth for whether a price exists.
 *
 * Harness mirrors market-implied-display.test.ts (vi.mock("@sports/db")).
 */

const mocks = vi.hoisted(() => ({
  pickFindMany: vi.fn<(args?: { where?: Record<string, unknown> }) => Promise<unknown[]>>(),
  pickCount: vi.fn<(args?: { where?: Record<string, unknown> }) => Promise<number>>(),
  auth: vi.fn<() => Promise<{ user?: { id: string } } | null>>(),
  getUserEntitlements: vi.fn<(userId: string) => Promise<Record<string, unknown>>>(),
}));

vi.mock("@/lib/api/public-form-rate-limit", () => ({
  consumePublicFormRateLimit: vi.fn(async () => ({ ok: true, backend: "memory" })),
}));

vi.mock("@sports/db", () => ({
  db: {
    pick: { findMany: mocks.pickFindMany, count: mocks.pickCount },
  },
  isStubMode: () => false,
}));

vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/entitlements", () => ({ getUserEntitlements: mocks.getUserEntitlements }));

// The subject is the serializer, not the selective-publish filter.
vi.mock("@/lib/calibration/selective-publish-runtime", () => ({
  passesPublicSelectiveFilterAsync: vi.fn(async () => true),
}));

vi.mock("@sports/prediction-engine", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@sports/prediction-engine")>();
  return {
    ...actual,
    getReadinessGates: () => ({
      canExposePublicPicks: true,
      forceNoBetIfStale: false,
    }),
  };
});

type Fixture = {
  id: string;
  gameId: string;
  pickType: "MONEYLINE" | "SPREAD" | "TOTAL";
  line: number;
  selection: string;
  bookmakerCount: number;
};

/** A row as Prisma hands it back, with an explicit mint-time snapshot count. */
function row(f: Fixture) {
  const soon = new Date(Date.now() + 2 * 60 * 60 * 1000);
  return {
    id: f.id,
    gameId: f.gameId,
    modelVersion: "v5.2.7",
    pickType: f.pickType,
    selection: f.selection,
    line: f.line,
    confidence: 70,
    edgeScore: 12,
    bookmakerCount: f.bookmakerCount,
    factorBreakdown: null,
    tier: "FREE",
    pickGrade: "LEAN",
    riskLevel: "MODERATE",
    reasoning: "Fixture reasoning. More text.",
    reasoningShort: "Fixture reasoning.",
    isFeatured: false,
    generatedAt: new Date(),
    dataFreshnessAt: null,
    result: "PENDING",
    proofReceipt: null,
    signalSnapshot: { bookmakerCount: f.bookmakerCount },
    game: {
      homeTeamName: "Home",
      awayTeamName: "Away",
      commenceTime: soon,
      dataQualityScore: 90,
      openingSpread: null,
      openingTotal: null,
      sport: { name: "NFL", key: "americanfootball_nfl" },
    },
  };
}

async function callPicks(): Promise<Array<Record<string, unknown>>> {
  vi.resetModules();
  const mod = await import("@/app/api/picks/route");
  const req = new Request("http://localhost/api/picks");
  const res = await mod.GET(req as unknown as Parameters<typeof mod.GET>[0]);
  expect(res.status).toBe(200);
  const body = (await res.json()) as { data: Array<Record<string, unknown>> };
  return body.data;
}

describe("/api/picks never ships the unpriced row's line:0 sentinel (WP-22)", () => {
  beforeEach(() => {
    mocks.auth.mockReset().mockResolvedValue(null);
    mocks.getUserEntitlements.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("withholds the sentinel as null and still flags hasBookPrice:false", async () => {
    // Distinct gameIds: a book-less row for a game that also carries a priced
    // row is dropped by the coherence guard, which is a different rule.
    mocks.pickFindMany.mockReset().mockResolvedValue([
      row({
        id: "ml-nobook",
        gameId: "game-a",
        pickType: "MONEYLINE",
        line: 0,
        selection: "Home ML (model signal)",
        bookmakerCount: 0,
      }),
    ]);
    mocks.pickCount.mockReset().mockResolvedValue(1);

    const data = await callPicks();
    expect(data).toHaveLength(1);
    const pick = data[0]!;
    expect(pick["hasBookPrice"]).toBe(false);
    expect(pick["line"]).toBeNull();
    // The exact shape the issue reported must be impossible now.
    expect(pick["line"] === 0 && pick["hasBookPrice"] === false).toBe(false);
  });

  it("keeps a real book-priced spread line", async () => {
    mocks.pickFindMany.mockReset().mockResolvedValue([
      row({
        id: "spread-priced",
        gameId: "game-b",
        pickType: "SPREAD",
        line: -3.5,
        selection: "Away -3.5",
        bookmakerCount: 4,
      }),
    ]);
    mocks.pickCount.mockReset().mockResolvedValue(1);

    const data = await callPicks();
    const pick = data[0]!;
    expect(pick["hasBookPrice"]).toBe(true);
    expect(pick["line"]).toBe(-3.5);
  });

  it("keeps a genuine pick'em zero: 0 is real when a book priced it", async () => {
    mocks.pickFindMany.mockReset().mockResolvedValue([
      row({
        id: "spread-pickem",
        gameId: "game-c",
        pickType: "SPREAD",
        line: 0,
        selection: "Home +0",
        bookmakerCount: 5,
      }),
    ]);
    mocks.pickCount.mockReset().mockResolvedValue(1);

    const data = await callPicks();
    const pick = data[0]!;
    expect(pick["hasBookPrice"]).toBe(true);
    expect(pick["line"]).toBe(0);
  });

  it("no row on a mixed board pairs line:0 with hasBookPrice:false", async () => {
    mocks.pickFindMany.mockReset().mockResolvedValue([
      row({ id: "a", gameId: "g1", pickType: "MONEYLINE", line: 0, selection: "ML signal", bookmakerCount: 0 }),
      row({ id: "b", gameId: "g2", pickType: "SPREAD", line: 0, selection: "Home +0", bookmakerCount: 5 }),
    ]);
    mocks.pickCount.mockReset().mockResolvedValue(2);

    // FREE's daily cap is 2, so a two-row board is delivered whole.
    const data = await callPicks();
    expect(data).toHaveLength(2);
    for (const pick of data) {
      // The reported shape must be impossible on every row of a mixed board.
      expect(pick["line"] === 0 && pick["hasBookPrice"] === false).toBe(false);
    }
    const unpriced = data.filter((p) => p["hasBookPrice"] === false);
    const priced = data.filter((p) => p["hasBookPrice"] === true);
    expect(unpriced).toHaveLength(1);
    expect(priced).toHaveLength(1);
    for (const pick of unpriced) expect(pick["line"]).toBeNull();
    // The priced pick'em still carries its real zero.
    expect(priced[0]!["line"]).toBe(0);
  });
});