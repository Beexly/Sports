import { authModuleMock } from '@/lib/testing/auth-mock';
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
import { receiptMarketFairProb } from "@/lib/calibration/proven-path-rows";

/**
 * v5.2.8 Phase 2 (ledger C-107): the market-implied win probability is the
 * receipt's number, shown on book-priced two-way MONEYLINE picks with at least
 * two books, to EVERY tier. Label wording is the verified text from the
 * proposal (section 1).
 *
 * Phase 1 gated this behind `canSeeConfidence`; the assertions below used to
 * pin that gate and now pin its removal, on the proposal's recorded founder
 * decision ("FREE viewers get it too: it is public arithmetic"). What must NOT
 * relax with it is the paywall on what is actually ours — confidence, edge
 * score, factor trail — so the FREE-branch assertions below still pin those as
 * absent, and pin that FREE receives no percent-formatted confidence anywhere.
 *
 * Executed-handler section mirrors the vi.mock("@sports/db") pattern from
 * picks-prod-seed-exclusion.test.ts.
 */

const FREE = getEntitlements("FREE");
const PRO = getEntitlements("PRO");

const RECEIPTED_ML = { pickType: "MONEYLINE", bookmakerCount: 6, receiptMarketFairProb: 0.6142 };

describe("resolveMarketImplied", () => {
  it("resolves on a receipted book-priced moneyline", () => {
    expect(resolveMarketImplied(RECEIPTED_ML)).toEqual({ prob: 0.6142, bookmakerCount: 6 });
  });

  it("does not vary by tier — it is arithmetic on quoted prices, not our model", () => {
    // Phase 2: the resolver takes no viewer at all, so a future edit cannot
    // silently re-gate it. FREE still buys nothing here; see the payload
    // assertions below, which pin confidence/edgeScore/factorBreakdown as the
    // things that stay paid.
    expect(FREE.canSeeConfidence).toBe(false);
    expect(resolveMarketImplied(RECEIPTED_ML)).toEqual({ prob: 0.6142, bookmakerCount: 6 });
  });

  it("returns null on a single-book row: one book is not a consensus", () => {
    // The label says "averaged across the N books"; at N = 1 that is false.
    expect(resolveMarketImplied({ ...RECEIPTED_ML, bookmakerCount: 1 })).toBeNull();
    expect(resolveMarketImplied({ ...RECEIPTED_ML, bookmakerCount: 2 })).not.toBeNull();
  });

  it("returns null on SPREAD and TOTAL picks", () => {
    expect(resolveMarketImplied({ ...RECEIPTED_ML, pickType: "SPREAD" })).toBeNull();
    expect(resolveMarketImplied({ ...RECEIPTED_ML, pickType: "TOTAL" })).toBeNull();
  });

  it("returns null on a signal-slate row (no book behind it)", () => {
    expect(resolveMarketImplied({ ...RECEIPTED_ML, bookmakerCount: 0 })).toBeNull();
  });

  it("returns null without a receipt or with a degenerate probability", () => {
    expect(resolveMarketImplied({ ...RECEIPTED_ML, receiptMarketFairProb: null })).toBeNull();
    expect(resolveMarketImplied({ ...RECEIPTED_ML, receiptMarketFairProb: undefined })).toBeNull();
    expect(resolveMarketImplied({ ...RECEIPTED_ML, receiptMarketFairProb: 0 })).toBeNull();
    expect(resolveMarketImplied({ ...RECEIPTED_ML, receiptMarketFairProb: 1 })).toBeNull();
    expect(resolveMarketImplied({ ...RECEIPTED_ML, receiptMarketFairProb: Number.NaN })).toBeNull();
  });

  it("never displays the synthetic coin-flip 0.5 a receipt may carry, the same rule the calibration paths apply", () => {
    // A receipt minted without a resolved market probability carries 0.5; the
    // public calibration loaders reject it (receiptMarketFairProb), so "50%"
    // must never be shown as a market price either.
    expect(resolveMarketImplied({ ...RECEIPTED_ML, receiptMarketFairProb: 0.5 })).toBeNull();
    expect(receiptMarketFairProb({ marketFairProb: 0.5 })).toBeNull();
    // Same tolerance as the calibration rule: a real price near a coin flip still shows.
    for (const p of [0.51, 0.49, 0.5000001, 0.4999999]) {
      expect(resolveMarketImplied({ ...RECEIPTED_ML, receiptMarketFairProb: p })?.prob).toBe(p);
      expect(receiptMarketFairProb({ marketFairProb: p })).toBe(p);
    }
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

describe("/api/picks source wires the receipt through the shared resolver", () => {
  const src = readFileSync(resolve(__dirname, "..", "app/api/picks/route.ts"), "utf8");
  it("selects the receipt's marketFairProb and resolves through the helper", () => {
    expect(src).toMatch(/proofReceipt:\s*\{\s*select:\s*\{\s*contentHash:\s*true,\s*marketFairProb:\s*true\s*\}\s*\}/);
    expect(src).toMatch(/signalSnapshot:\s*\{\s*select:\s*\{\s*bookmakerCount:\s*true\s*\}\s*\}/);
    expect(src).toContain('from "@/lib/picks/market-implied-display"');
    // Phase 2: resolved once, with NO entitlement argument, and both the
    // public `winProbability` and the deprecated `marketImplied` alias are
    // derived from that one call so they can never disagree.
    expect(src).toMatch(/const marketImpliedInput = \{/);
    expect(src).toMatch(/resolveMarketImplied\(marketImpliedInput\)/);
    expect(src).toMatch(/resolveWinProbability\(marketImpliedInput\)/);
    expect(src).not.toMatch(/resolveMarketImplied\([^)]*entitlements/);
    // N in the label is the immutable mint-time snapshot count, never the live
    // Pick.bookmakerCount column that every refresh cycle rewrites.
    expect(src).toMatch(/bookmakerCount:\s*pick\.signalSnapshot\?\.bookmakerCount\s*\?\?\s*0/);
    // Spread in only when resolved, so an unresolved pick omits the key
    // entirely rather than carrying a null the UI would have to special-case.
    expect(src).toMatch(/\.\.\.\(marketImplied \? \{ marketImplied \} : \{\}\)/);
    expect(src).toMatch(/\.\.\.\(winProbability \? \{ winProbability \} : \{\}\)/);
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

vi.mock("@/lib/auth", () => authModuleMock({ auth: mocks.auth }));
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

describe("/api/picks payload: market-implied win probability reaches every tier", () => {
  beforeEach(() => {
    mocks.pickFindMany.mockReset().mockResolvedValue([receiptedMoneylineRow("ml-1")]);
    mocks.pickCount.mockReset().mockResolvedValue(1);
    mocks.auth.mockReset().mockResolvedValue(null);
    mocks.getUserEntitlements.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("FREE (anonymous) branch RECEIVES the probability but still buys nothing of ours", async () => {
    const { status, body } = await callPicks();
    expect(status).toBe(200);
    const data = body["data"] as Array<Record<string, unknown>>;
    expect(data).toHaveLength(1);
    const row = data[0]!;

    // Phase 2: public arithmetic on quoted prices, so FREE sees it. The public
    // calibration claim is about this number; hiding it from the tier that
    // reads the claim was incoherent.
    expect(row["winProbability"]).toEqual({
      value: 0.6142,
      basis: "market_devig",
      books: 6,
      method: "proportional",
    });
    expect(row["marketImplied"]).toEqual({ prob: 0.6142, bookmakerCount: 6 });

    // What stays paid is what is actually ours. This is the invariant that must
    // never relax, and it is the reason the gate above could be removed safely.
    // (The Edge Index is deliberately NOT on this list: it is the free tier's
    // trust signal by design — see publicEdgeScore — so it is asserted present
    // rather than absent, to catch a regression in either direction.)
    expect(row["confidence"]).toBeNull();
    expect(row["confidenceCalibrated"]).toBeNull();
    expect(row["factorBreakdown"]).toBeNull();
    expect(typeof row["edgeScore"]).toBe("number");
    expect(row["hasBookPrice"]).toBe(true);

    // The raw engine field name never ships, and no confidence-as-a-percent
    // reaches an anonymous reader anywhere in the payload.
    expect(JSON.stringify(row)).not.toContain("marketFairProb");
    expect(JSON.stringify(row)).not.toMatch(/\d+\s?%/);
  });

  it("never emits the reserved independent_estimate basis", async () => {
    // The union member exists because the proposal names it; no estimator in
    // the engine has been shown to carry information at publish time, so the
    // API must never label a guess as a probability.
    const { body } = await callPicks();
    const data = body["data"] as Array<Record<string, unknown>>;
    expect(JSON.stringify(data)).not.toContain("independent_estimate");
  });

  it("PRO branch carries the receipt's probability and the bookmaker count", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "user-pro" } });
    mocks.getUserEntitlements.mockResolvedValue({ ...PRO });
    const { status, body } = await callPicks();
    expect(status).toBe(200);
    const data = body["data"] as Array<Record<string, unknown>>;
    expect(data[0]?.["confidence"]).toBe(70);
    expect(data[0]?.["marketImplied"]).toEqual({ prob: 0.6142, bookmakerCount: 6 });
    expect(data[0]?.["winProbability"]).toEqual({
      value: 0.6142,
      basis: "market_devig",
      books: 6,
      method: "proportional",
    });
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
    expect(data[0]).not.toHaveProperty("winProbability");
    expect(data[0]?.["hasBookPrice"]).toBe(true);
  });

  it("hasBookPrice follows the mint-time snapshot count through a transient feed gap on the live column", async () => {
    // A refresh cycle briefly wrote Pick.bookmakerCount 0 (feed gap); the
    // receipt-era snapshot still says 6. The pill and the percentage must read
    // the same count, never "No book price attached" beside a percentage.
    const gapRow = { ...receiptedMoneylineRow("ml-gap"), bookmakerCount: 0, signalSnapshot: { bookmakerCount: 6 } };
    mocks.pickFindMany.mockResolvedValue([gapRow]);

    // FREE branch: the pill and the percentage read the SAME snapshot count,
    // so "No book price attached" can never render beside a percentage.
    const free = await callPicks();
    const freeRow = (free.body["data"] as Array<Record<string, unknown>>)[0]!;
    expect(freeRow["hasBookPrice"]).toBe(true);
    expect(freeRow["marketImplied"]).toEqual({ prob: 0.6142, bookmakerCount: 6 });
    expect(freeRow["confidence"]).toBeNull();

    // PRO branch: the pill and the percentage agree.
    mocks.auth.mockResolvedValue({ user: { id: "user-pro" } });
    mocks.getUserEntitlements.mockResolvedValue({ ...PRO });
    mocks.pickFindMany.mockResolvedValue([gapRow]);
    const pro = await callPicks();
    const proRow = (pro.body["data"] as Array<Record<string, unknown>>)[0]!;
    expect(proRow["hasBookPrice"]).toBe(true);
    expect(proRow["marketImplied"]).toEqual({ prob: 0.6142, bookmakerCount: 6 });
  });

  it("strips the signal-slate marker from the rendered selection for every viewer", async () => {
    // A signal-slate row never mints a PickSignalSnapshot (process-sport.ts is
    // the only writer), so it carries none.
    mocks.pickFindMany.mockResolvedValue([
      { ...receiptedMoneylineRow("sig-1"), selection: "Home ML (model signal)", bookmakerCount: 0, line: 0, proofReceipt: null, signalSnapshot: null },
    ]);
    const { body } = await callPicks();
    const data = body["data"] as Array<Record<string, unknown>>;
    expect(data[0]?.["selection"]).toBe("Home ML");
    expect(data[0]?.["hasBookPrice"]).toBe(false);
    expect(data[0]).not.toHaveProperty("marketImplied");
    expect(JSON.stringify(body)).not.toContain("(model signal)");
  });
});
