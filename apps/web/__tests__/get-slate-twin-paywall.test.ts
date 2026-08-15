import { beforeEach, describe, expect, it, vi } from "vitest";
import { getEntitlements, type Entitlements } from "@sports/types";

/**
 * Server-side paywall enforcement for the Galaxy Slate Twin on /observatory.
 *
 * P7-12: get-slate-twin.ts previously ran its picks subquery with NO tier
 * predicate, NO isPublished, and NO isBootstrap filter — the exact bug class
 * fixed on /picks (P7-10) and /api/board/state. That meant a premium-tier
 * pick (or a bootstrap/dev seed pick) could surface its confidence number and
 * reasoning note to an anonymous/FREE viewer on the observatory's spatial
 * viz, which draws the confidence orbit ring and the inspect-HUD verbatim.
 *
 * This pin asserts the data-layer gate (query filtering) AND the field-level
 * redaction (confidence + note) so that a missed predicate still cannot leak.
 *
 * The mock for db.game.findMany simulates Prisma's `where` clause on the
 * nested picks include: when the caller passes tier:"FREE", the mock strips
 * PREMIUM-tier picks from the returned rows (just as a real DB would). This
 * lets us verify both layers — that the filter is ASKED FOR and that the
 * redaction BACKUP catches anything that slips through.
 */

// All game rows we know about, tagged with their real tier so the mock can
// simulate Prisma's where-clause filtering.
const ALL_GAME_ROWS = [
  {
    id: "game-premium-1",
    sport: { id: "sport-nfl", name: "NFL" },
    homeTeamName: "Chiefs",
    awayTeamName: "Broncos",
    commenceTime: new Date("2026-08-20T20:00:00.000Z"),
    status: "SCHEDULED",
    dataQualityScore: 72,
    bookmakerCoverageMax: 6,
    openingSpread: -3.0,
    odds: [{ market: "SPREADS", spread: -3.5, bookmaker: "draftkings", homePrice: -110, awayPrice: -110, drawPrice: null, fetchedAt: new Date("2026-08-19T12:00:00.000Z") }],
    picks: [{ tier: "PREMIUM", pickGrade: "ELITE_PLAY", confidence: 88, reasoning: "Sharp money diverging from the market.", isPublished: true, isBootstrap: false, riskLevel: "LOW_RISK", bookmakerCount: 6, consensusPct: 0.62 }],
  },
  {
    id: "game-free-1",
    sport: { id: "sport-nfl", name: "NFL" },
    homeTeamName: "Packers",
    awayTeamName: "Vikings",
    commenceTime: new Date("2026-08-20T22:00:00.000Z"),
    status: "SCHEDULED",
    dataQualityScore: 68,
    bookmakerCoverageMax: 5,
    openingSpread: -2.0,
    odds: [{ market: "SPREADS", spread: -2.5, bookmaker: "draftkings", homePrice: -110, awayPrice: -110, drawPrice: null, fetchedAt: new Date("2026-08-19T12:00:00.000Z") }],
    picks: [{ tier: "FREE", pickGrade: "LEAN", confidence: 55, reasoning: "Standard market read.", isPublished: true, isBootstrap: false, riskLevel: "LOW_RISK", bookmakerCount: 5, consensusPct: 0.5 }],
  },
];

const mocks = vi.hoisted(() => ({
  gameFindMany: vi.fn<(args: { where?: Record<string, unknown>; include?: Record<string, unknown> }) => Promise<unknown[]>>(),
}));

// The mock simulates Prisma's nested where-clause on picks include.
function mockGameFindManyImpl(args: { where?: Record<string, unknown>; include?: Record<string, unknown> }): Promise<unknown[]> {
  const picksInclude = args.include?.picks as { where?: Record<string, unknown> } | undefined;
  const picksWhere = picksInclude?.where ?? {};
  // Simulate isPublished + isBootstrap + tier filtering on the nested picks.
  const filtered = ALL_GAME_ROWS.map((row) => {
      const picks = (row.picks as Array<Record<string, unknown>>).filter((p) => {
      if (picksWhere.isPublished === true && p.isPublished !== true) return false;
      if (picksWhere.isBootstrap === false && p.isBootstrap === true) return false;
      if (picksWhere.tier && p.tier !== picksWhere.tier) return false;
      return true;
    });
    return { ...row, picks };
  });
  return Promise.resolve(filtered);
}

// --- Prediction engine: force the readiness gate OPEN ---
vi.mock("@sports/prediction-engine", () => ({
  getReadinessGates: () => ({ canExposePublicPicks: true }),
}));

// --- DB: only game.findMany is exercised by buildLiveSlate ---
vi.mock("@sports/db", () => ({
  db: { game: { findMany: mocks.gameFindMany } },
}));

// --- Board state: returns null (no published rows cross-ref) ---
vi.mock("@/lib/board/state", () => ({
  loadBoardState: vi.fn(() => Promise.resolve(null)),
}));

// --- Market helpers: stub to null so drift/disagreement stay undefined ---
vi.mock("@/lib/market/game-market-read", () => ({
  buildH2hMarketRead: vi.fn(() => null),
  DRIFT_MOVING_PP: 15,
}));
vi.mock("@/lib/market/simulation-cloud-geometry", () => ({
  WIDE_SPREAD_PP: 40,
}));

import { getSlateTwin } from "@/lib/slate-twin/get-slate-twin";

// Concrete premium values baked into the fixture.
const PREMIUM_CONFIDENCE = 88;
const PREMIUM_REASONING = "Sharp money diverging from the market.";

describe("getSlateTwin paywall (P7-12)", () => {
  beforeEach(() => {
    mocks.gameFindMany.mockReset();
    mocks.gameFindMany.mockImplementation(mockGameFindManyImpl);
  });

  it("FREE viewer: premium-tier pick is filtered from the query (tier: FREE)", async () => {
    // The fixture has two games: one PREMIUM pick, one FREE pick.
    // With a FREE viewer, buildLiveSlate passes tier:"FREE" into the picks
    // subquery, so the DB returns only the FREE-tier pick row. The PREMIUM
    // game still renders (NO-BET verdict) but with zeroed confidence and a
    // redacted note — defense in depth.
    const slate = await getSlateTwin(getEntitlements("FREE"));
    expect(slate.live).toBe(true);
    expect(slate.games).toHaveLength(2);

    // The FREE pick game: real verdict + real data, but confidence still
    // redacted (confidence is a Pro+ metric).
    const freeGame = slate.games.find((g) => g.id === "game-free-1");
    expect(freeGame).toBeDefined();
    expect(freeGame!.verdict).not.toBe("NO-BET");
    // Even FREE picks: confidence is redacted for non-pro viewers.
    expect(freeGame!.confidence.every((c) => c === 0)).toBe(true);
    expect(freeGame!.note).toBe("Signal tracked — detail unlocks with Pro");

    // The PREMIUM pick game: the pick was filtered out → NO-BET.
    const premiumGame = slate.games.find((g) => g.id === "game-premium-1");
    expect(premiumGame).toBeDefined();
    expect(premiumGame!.verdict).toBe("NO-BET");
    // Confidence is zeroed (redaction backup).
    expect(premiumGame!.confidence.every((c) => c === 0)).toBe(true);
    expect(premiumGame!.note).toBe("Signal tracked — detail unlocks with Pro");
    // No premium value leaks anywhere in the serialized slate.
    // (We can't assert .not.toContain("88") because floating-point oddsPath
    // values like 0.48809... contain "88" as a substring — so we assert on
    // the specific premium fields instead.)
    expect(slate.games.every((g) => g.confidence.every((c) => c === 0))).toBe(true);
    expect(slate.games.every((g) => g.note === "Signal tracked — detail unlocks with Pro")).toBe(true);
    expect(JSON.stringify(slate)).not.toContain(PREMIUM_REASONING);
  });

  it("PRO viewer: premium-tier pick surfaces with real confidence and reasoning", async () => {
    const slate = await getSlateTwin(getEntitlements("PRO"));
    expect(slate.games).toHaveLength(2);

    const premiumGame = slate.games.find((g) => g.id === "game-premium-1");
    expect(premiumGame).toBeDefined();
    // The premium pick surfaced → verdict is not NO-BET.
    expect(premiumGame!.verdict).not.toBe("NO-BET");
    // Confidence reflects the real pick value (scaled to 0..1 by conf01).
    const expectedConf01 = PREMIUM_CONFIDENCE / 100;
    expect(premiumGame!.confidence.every((c) => Math.abs(c - expectedConf01) < 0.01)).toBe(true);
    // Note contains the real reasoning (truncated to 160 chars).
    expect(premiumGame!.note).toContain("Sharp money diverging");
  });

  it("FREE viewer: confidence and note are redacted even for FREE-tier picks", async () => {
    const slate = await getSlateTwin(getEntitlements("FREE"));
    const freeGame = slate.games.find((g) => g.id === "game-free-1");
    expect(freeGame).toBeDefined();
    // CONFIDENCE is a Pro+ metric — redacted even for FREE picks.
    expect(freeGame!.confidence.every((c) => c === 0)).toBe(true);
    expect(freeGame!.note).toBe("Signal tracked — detail unlocks with Pro");
  });

  it("DEFAULT: called with no entitlements argument, FREE is assumed (fail-closed)", async () => {
    // getSlateTwin's signature defaults to getEntitlements("FREE") when the
    // caller omits the argument. A premium pick must still be blocked.
    const slate = await getSlateTwin();
    const premiumGame = slate.games.find((g) => g.id === "game-premium-1");
    expect(premiumGame).toBeDefined();
    expect(premiumGame!.verdict).toBe("NO-BET");
    expect(premiumGame!.confidence.every((c) => c === 0)).toBe(true);
    expect(premiumGame!.note).toBe("Signal tracked — detail unlocks with Pro");
    // Premium reasoning must not appear anywhere in the serialized slate.
    expect(JSON.stringify(slate)).not.toContain(PREMIUM_REASONING);
    // The premium game's signalDensity derives from dataQualityScore (72), not
    // the pick's confidence (88) — the pick was filtered out by tier:FREE.
    expect(premiumGame!.signalDensity).toBe(0.72);
  });

  it("GATED: empty game set falls back to DEMO_SLATE (illustrative, not live)", async () => {
    mocks.gameFindMany.mockResolvedValue([]);
    const slate = await getSlateTwin(getEntitlements("PRO"));
    expect(slate.illustrative).toBe(true);
    expect(slate.live).toBe(false);
  });
});

describe("getSlateTwin picks query filter shape (P7-12)", () => {
  beforeEach(() => {
    mocks.gameFindMany.mockReset();
    mocks.gameFindMany.mockImplementation(mockGameFindManyImpl);
  });

  it("passes isPublished, isBootstrap, and tier: FREE to the picks include for FREE viewers", async () => {
    mocks.gameFindMany.mockResolvedValue([]);
    await getSlateTwin(getEntitlements("FREE"));

    expect(mocks.gameFindMany).toHaveBeenCalledTimes(1);
    const callArg = mocks.gameFindMany.mock.calls[0]![0] as {
      include: { picks: { where: Record<string, unknown> } };
    };
    const pickWhere = callArg.include.picks.where;
    expect(pickWhere).toHaveProperty("isPublished", true);
    expect(pickWhere).toHaveProperty("isBootstrap", false);
    // For a FREE viewer, tier is filtered to "FREE".
    expect(pickWhere).toHaveProperty("tier", "FREE");
  });

  it("passes isPublished + isBootstrap but NO tier filter for PRO viewers", async () => {
    mocks.gameFindMany.mockResolvedValue([]);
    await getSlateTwin(getEntitlements("PRO"));

    const callArg = mocks.gameFindMany.mock.calls[0]![0] as {
      include: { picks: { where: Record<string, unknown> } };
    };
    const pickWhere = callArg.include.picks.where;
    expect(pickWhere).toHaveProperty("isPublished", true);
    expect(pickWhere).toHaveProperty("isBootstrap", false);
    // PRO viewers see all tiers — the `tier` key must be absent (not "FREE").
    expect(pickWhere).not.toHaveProperty("tier");
  });
});
