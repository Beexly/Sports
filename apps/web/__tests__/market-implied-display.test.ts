import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { getEntitlements } from "@sports/types";
import {
  MARKET_IMPLIED_CALIBRATION_CLAIM,
  formatMarketImpliedLabel,
  marketImpliedPercent,
  resolveMarketImplied,
} from "@/lib/picks/market-implied-display";

/**
 * v5.2.8 display side (ledger C-107): the market-implied win probability is
 * the receipt's number, shown only on book-priced two-way MONEYLINE picks and
 * only to viewers the paywall shows confidence to. Label wording is the
 * verified text from the proposal (section 1).
 *
 * Executed-handler section mirrors the vi.mock("@sports/db") pattern from
 * picks-prod-seed-exclusion.test.ts.
 */

const FREE = getEntitlements("FREE");
const PRO = getEntitlements("PRO");

const RECEIPTED_ML = { pickType: "MONEYLINE", bookmakerCount: 6, receiptMarketFairProb: 0.6142 };

describe("resolveMarketImplied", () => {
  it("resolves for a confidence buyer on a receipted book-priced moneyline", () => {
    expect(PRO.canSeeConfidence).toBe(true);
    expect(resolveMarketImplied(RECEIPTED_ML, PRO)).toEqual({ prob: 0.6142, bookmakerCount: 6 });
  });

  it("returns null for a viewer the paywall hides confidence from", () => {
    expect(FREE.canSeeConfidence).toBe(false);
    expect(resolveMarketImplied(RECEIPTED_ML, FREE)).toBeNull();
  });

  it("returns null on SPREAD and TOTAL picks", () => {
    expect(resolveMarketImplied({ ...RECEIPTED_ML, pickType: "SPREAD" }, PRO)).toBeNull();
    expect(resolveMarketImplied({ ...RECEIPTED_ML, pickType: "TOTAL" }, PRO)).toBeNull();
  });

  it("returns null on a signal-slate row (no book behind it)", () => {
    expect(resolveMarketImplied({ ...RECEIPTED_ML, bookmakerCount: 0 }, PRO)).toBeNull();
  });

  it("returns null without a receipt or with a degenerate probability", () => {
    expect(resolveMarketImplied({ ...RECEIPTED_ML, receiptMarketFairProb: null }, PRO)).toBeNull();
    expect(resolveMarketImplied({ ...RECEIPTED_ML, receiptMarketFairProb: undefined }, PRO)).toBeNull();
    expect(resolveMarketImplied({ ...RECEIPTED_ML, receiptMarketFairProb: 0 }, PRO)).toBeNull();
    expect(resolveMarketImplied({ ...RECEIPTED_ML, receiptMarketFairProb: 1 }, PRO)).toBeNull();
    expect(resolveMarketImplied({ ...RECEIPTED_ML, receiptMarketFairProb: Number.NaN }, PRO)).toBeNull();
  });
});

describe("formatMarketImpliedLabel", () => {
  it("renders the verified proposal wording exactly, with NN and N filled in", () => {
    expect(marketImpliedPercent(0.6142)).toBe(61);
    expect(formatMarketImpliedLabel({ prob: 0.6142, bookmakerCount: 6 })).toBe(
      "Market-implied win probability 61%: every book's price for each side converted to an " +
        "implied probability, averaged across the 6 books in the snapshot, normalised to sum to " +
        "one, fixed at publish time in this pick's proof receipt.",
    );
  });

  it("the restated calibration claim is MONEYLINE-scoped and keeps confidence off the chart", () => {
    expect(MARKET_IMPLIED_CALIBRATION_CLAIM).toContain("settled two-way moneyline picks");
    expect(MARKET_IMPLIED_CALIBRATION_CLAIM).toContain("fixed at publish time and committed to the pick's proof receipt, never recomputed");
    expect(MARKET_IMPLIED_CALIBRATION_CLAIM).toContain("Confidence is a ranking score");
    expect(MARKET_IMPLIED_CALIBRATION_CLAIM).not.toMatch(/\d+%/);
  });
});

describe("/api/picks source wires the receipt through the confidence entitlement", () => {
  const src = readFileSync(resolve(__dirname, "..", "app/api/picks/route.ts"), "utf8");
  it("selects the receipt's marketFairProb and resolves through the helper", () => {
    expect(src).toMatch(/proofReceipt:\s*\{\s*select:\s*\{\s*contentHash:\s*true,\s*marketFairProb:\s*true\s*\}\s*\}/);
    expect(src).toMatch(/signalSnapshot:\s*\{\s*select:\s*\{\s*bookmakerCount:\s*true\s*\}\s*\}/);
    expect(src).toContain('from "@/lib/picks/market-implied-display"');
    expect(src).toMatch(/resolveMarketImplied\(\s*\{[\s\S]{0,300}\},\s*entitlements,?\s*\)/);
    // N in the label is the immutable mint-time snapshot count, never the live
    // Pick.bookmakerCount column that every refresh cycle rewrites.
    expect(src).toMatch(/bookmakerCount:\s*pick\.signalSnapshot\?\.bookmakerCount\s*\?\?\s*0/);
    // The key is spread in only when resolved: no FREE payload branch carries it.
    expect(src).toMatch(/\.\.\.\(marketImplied \? \{ marketImplied \} : \{\}\)/);
  });
});

// ---------------------------------------------------------------------------
// Executed handler: FREE omits the key, PRO receives it on a receipted moneyline.
// ---------------------------------------------------------------------------

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
}));

vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/entitlements", () => ({ getUserEntitlements: mocks.getUserEntitlements }));

// The subject is the serializer, not the selective-publish filter; let every
// row through so the payload shape is what is asserted.
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

/** Test fixture only: a receipted book-priced moneyline row as Prisma returns it. */
function receiptedMoneylineRow(id: string) {
  const soon = new Date(Date.now() + 2 * 60 * 60 * 1000);
  return {
    id,
    modelVersion: "v5.2.7",
    pickType: "MONEYLINE",
    selection: "Home ML",
    line: -150,
    confidence: 70,
    edgeScore: 12,
    bookmakerCount: 6,
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
    proofReceipt: { contentHash: "a".repeat(64), marketFairProb: 0.6142 },
    // Immutable mint-time snapshot (created once, update: {}); the label's N.
    signalSnapshot: { bookmakerCount: 6 },
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

async function callPicks(): Promise<{ status: number; body: Record<string, unknown> }> {
  vi.resetModules();
  const mod = await import("@/app/api/picks/route");
  const req = new Request("http://localhost/api/picks");
  const res = await mod.GET(req as unknown as Parameters<typeof mod.GET>[0]);
  return { status: res.status, body: (await res.json()) as Record<string, unknown> };
}

describe("/api/picks payload: market-implied win probability follows the confidence gate", () => {
  beforeEach(() => {
    mocks.pickFindMany.mockReset().mockResolvedValue([receiptedMoneylineRow("ml-1")]);
    mocks.pickCount.mockReset().mockResolvedValue(1);
    mocks.auth.mockReset().mockResolvedValue(null);
    mocks.getUserEntitlements.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("FREE (anonymous) branch omits marketImplied and confidence", async () => {
    const { status, body } = await callPicks();
    expect(status).toBe(200);
    const data = body["data"] as Array<Record<string, unknown>>;
    expect(data).toHaveLength(1);
    const row = data[0]!;
    expect(row["confidence"]).toBeNull();
    expect(row).not.toHaveProperty("marketImplied");
    expect(row["hasBookPrice"]).toBe(true);
    expect(JSON.stringify(row)).not.toContain("marketFairProb");
  });

  it("PRO branch carries the receipt's probability and the bookmaker count", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "user-pro" } });
    mocks.getUserEntitlements.mockResolvedValue({ ...PRO });
    const { status, body } = await callPicks();
    expect(status).toBe(200);
    const data = body["data"] as Array<Record<string, unknown>>;
    expect(data[0]?.["confidence"]).toBe(70);
    expect(data[0]?.["marketImplied"]).toEqual({ prob: 0.6142, bookmakerCount: 6 });
  });

  it("PRO branch reports the mint-time snapshot count, not the live Pick column after a refresh", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "user-pro" } });
    mocks.getUserEntitlements.mockResolvedValue({ ...PRO });
    // A refresh cycle has since rewritten Pick.bookmakerCount (6 -> 9); the
    // receipt-era snapshot still says 6, and the label claims N was fixed at
    // publish time, so 6 is the only honest number.
    mocks.pickFindMany.mockResolvedValue([
      { ...receiptedMoneylineRow("ml-drift"), bookmakerCount: 9, signalSnapshot: { bookmakerCount: 6 } },
    ]);
    const { body } = await callPicks();
    const data = body["data"] as Array<Record<string, unknown>>;
    expect(data[0]?.["marketImplied"]).toEqual({ prob: 0.6142, bookmakerCount: 6 });
    expect(data[0]?.["hasBookPrice"]).toBe(true);
  });

  it("PRO branch omits the percentage when no snapshot count exists (never falls back to the live column)", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "user-pro" } });
    mocks.getUserEntitlements.mockResolvedValue({ ...PRO });
    mocks.pickFindMany.mockResolvedValue([
      { ...receiptedMoneylineRow("ml-nosnap"), bookmakerCount: 9, signalSnapshot: null },
    ]);
    const { body } = await callPicks();
    const data = body["data"] as Array<Record<string, unknown>>;
    expect(data[0]?.["confidence"]).toBe(70);
    expect(data[0]).not.toHaveProperty("marketImplied");
    expect(data[0]?.["hasBookPrice"]).toBe(true);
  });

  it("strips the signal-slate marker from the rendered selection for every viewer", async () => {
    mocks.pickFindMany.mockResolvedValue([
      { ...receiptedMoneylineRow("sig-1"), selection: "Home ML (model signal)", bookmakerCount: 0, line: 0, proofReceipt: null },
    ]);
    const { body } = await callPicks();
    const data = body["data"] as Array<Record<string, unknown>>;
    expect(data[0]?.["selection"]).toBe("Home ML");
    expect(data[0]?.["hasBookPrice"]).toBe(false);
    expect(data[0]).not.toHaveProperty("marketImplied");
    expect(JSON.stringify(body)).not.toContain("(model signal)");
  });
});
