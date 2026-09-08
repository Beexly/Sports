import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  gateDecisionFindMany: vi.fn<(args?: unknown) => Promise<unknown[]>>(),
  pickFindMany: vi.fn<(args?: unknown) => Promise<unknown[]>>(),
  gameFindMany: vi.fn<(args?: unknown) => Promise<unknown[]>>(),
}));

vi.mock("@sports/db", () => ({
  db: {
    gateDecision: { findMany: mocks.gateDecisionFindMany, /* groupBy: the pass lane's withdrawal watermark (C-161). A db mock has to carry every method the code calls. */ groupBy: vi.fn(async () => []) },
    pick: { findMany: mocks.pickFindMany },
    game: { findMany: mocks.gameFindMany },
  },
  getSamplePicks: () => [],
  isDemoPicksEnabled: () => false,
  isStubMode: () => false,
}));

vi.mock("@sports/prediction-engine", () => ({
  getReadinessGates: () => ({ isBootstrapMode: false }),
  MODEL_VERSION: "v5.0.0",
  // Real clamp behavior — the board must never surface an Edge Index > 100.
  toEdgeIndex: (v: number | null | undefined) =>
    v == null || !Number.isFinite(v) ? null : Math.max(0, Math.min(100, Math.round(v))),
}));

import { loadBoardPasses } from "@/lib/board/passes";
import { loadBoardState } from "@/lib/board/state";
import { getEntitlements } from "@sports/types";

// This suite exercises Gate Cam lane construction, not the paywall — pass a
// PRO viewer so `market` reflects the real derived selection instead of the
// tier-redacted "ALL_MARKETS" a FREE/anonymous viewer now receives.
const proViewer = getEntitlements("PRO");

const evaluatedAt = new Date("2026-05-22T15:30:00.000Z");

function game(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    awayTeamName: "BOS",
    homeTeamName: "NYY",
    currentEdgeIndex: 61,
    bookmakerCoverageMax: 11,
    sport: { name: "MLB" },
    ...overrides,
  };
}

type ScoringBranch = {
  status: string;
  commenceTime: { lte: Date; gte: Date };
};

/**
 * Pull one status branch out of the scoring lane's OR. Throws rather than
 * returning undefined so a missing branch fails as a missing branch, not as an
 * unrelated property access on undefined.
 */
function branchFor(branches: readonly ScoringBranch[], status: string): ScoringBranch {
  const found = branches.find((b) => b.status === status);
  if (found === undefined) throw new Error(`scoring lane has no ${status} branch`);
  return found;
}

describe("board loaders with persisted gate decisions", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-22T16:00:00.000Z"));
    mocks.gateDecisionFindMany.mockReset();
    mocks.pickFindMany.mockReset();
    mocks.gameFindMany.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("builds Gate Cam lanes from persisted decisions before falling back to derived rows", async () => {
    mocks.gateDecisionFindMany.mockResolvedValue([
      {
        id: "gd_published",
        gameId: "game_1",
        status: "PUBLISHED",
        reason: "Cleared publish threshold.",
        edgeIndex: 72,
        confidence: 74,
        evaluatedAt,
        modelVersion: "v5.1.0",
        game: game(),
        pick: { selection: "BOS -1.5", confidence: 74, isPublished: true },
      },
      {
        id: "gd_gated",
        gameId: "game_2",
        status: "GATED",
        reason: "Market depth below publish threshold.",
        edgeIndex: null,
        confidence: null,
        evaluatedAt,
        modelVersion: "v5.1.0",
        game: game({ awayTeamName: "LAD", homeTeamName: "SF", currentEdgeIndex: 44 }),
        pick: null,
      },
      {
        id: "gd_scoring",
        gameId: "game_3",
        status: "SCORING",
        reason: "Refresh in progress.",
        edgeIndex: 58,
        confidence: null,
        evaluatedAt,
        modelVersion: "v5.1.0",
        game: game({ awayTeamName: "SEA", homeTeamName: "HOU" }),
        pick: null,
      },
    ]);

    const result = await loadBoardState(new Date("2026-05-22T16:00:00.000Z"), proViewer);

    expect(result.meta.isSampleData).toBe(false);
    expect(result.data.openPicks).toBe(1);
    expect(result.data.gatedToday).toBe(1);
    expect(result.data.booksPolled).toBe(11);
    expect(result.data.publishedToday[0]?.market).toBe("BOS -1.5");
    expect(result.data.gatedTodayRows[0]?.gateReason).toBe("Market depth below publish threshold.");
    expect(result.data.scoringNow[0]?.status).toBe("SCORING_NOW");
    expect(mocks.pickFindMany).not.toHaveBeenCalled();
    expect(mocks.gameFindMany).not.toHaveBeenCalled();
  });

  it("clamps an out-of-range persisted edgeIndex to 0–100 (Edge Index 100 bug guard)", async () => {
    mocks.gateDecisionFindMany.mockResolvedValue([
      {
        id: "gd_overflow",
        gameId: "game_x",
        status: "PUBLISHED",
        reason: "Cleared publish threshold.",
        // Corrupt/mis-scaled upstream value (e.g. a stray ×10). Must NOT reach the UI as 350.
        edgeIndex: 350,
        confidence: 74,
        evaluatedAt,
        modelVersion: "v5.1.0",
        game: game({ awayTeamName: "TEX", homeTeamName: "STL" }),
        pick: { selection: "OVER 7.5", confidence: 74, isPublished: true },
      },
    ]);

    const result = await loadBoardState(new Date("2026-05-22T16:00:00.000Z"));
    const row = result.data.publishedToday[0];
    expect(row?.edgeIndex).not.toBeNull();
    expect(row!.edgeIndex!).toBeLessThanOrEqual(100);
    expect(row!.edgeIndex!).toBe(100);
  });

  it("builds the Pass List from persisted gated decisions", async () => {
    mocks.gateDecisionFindMany.mockResolvedValue([
      {
        id: "gd_gated",
        gameId: "game_2",
        status: "GATED",
        reason: "Consensus below publish threshold.",
        edgeIndex: null,
        evaluatedAt,
        game: game({ awayTeamName: "LAD", homeTeamName: "SF", currentEdgeIndex: 44 }),
      },
    ]);

    const result = await loadBoardPasses(new Date("2026-05-22T16:00:00.000Z"));

    expect(result.meta.isSampleData).toBe(false);
    expect(result.data.passes).toHaveLength(1);
    expect(result.data.passes[0]).toMatchObject({
      id: "gd_gated",
      gameId: "game_2",
      matchup: "LAD @ SF",
      sport: "MLB",
      edgeIndex: 44,
      reason: "Consensus below publish threshold.",
    });
    expect(mocks.gameFindMany).not.toHaveBeenCalled();
  });

  it("falls back to the active engine model version when no rows expose one", async () => {
    mocks.gateDecisionFindMany.mockResolvedValue([]);
    mocks.pickFindMany.mockResolvedValue([]);
    mocks.gameFindMany.mockResolvedValue([]);

    const result = await loadBoardState(new Date("2026-05-22T16:00:00.000Z"));

    expect(result.data.modelVersion).toBe("v5.0.0");
  });

  it("keeps identical pick counts for PRO and FREE viewers (no tier-based row drop)", async () => {
    // Two picks: one FREE (tier="FREE"), one PREMIUM (tier="PREMIUM").
    // Before the fix, the FREE viewer's query carried `tier: "FREE"` which dropped
    // the premium row entirely, making openPicks vary by viewer tier.
    const freePick = {
      id: "pick_free",
      gameId: "game_1",
      selection: "BOS -1.5",
      confidence: 68,
      edgeScore: 60,
      factorBreakdown: null,
      generatedAt: evaluatedAt,
      modelVersion: "v5.1.0",
      tier: "FREE",
      game: game(),
    };
    const premiumPick = {
      id: "pick_premium",
      gameId: "game_2",
      selection: "LAD +2.0",
      confidence: 82,
      edgeScore: 75,
      factorBreakdown: null,
      generatedAt: evaluatedAt,
      modelVersion: "v5.1.0",
      tier: "PREMIUM",
      game: game({ awayTeamName: "LAD", homeTeamName: "SF", currentEdgeIndex: 55 }),
    };

    mocks.gateDecisionFindMany.mockResolvedValue([]);
    mocks.pickFindMany.mockResolvedValue([freePick, premiumPick]);
    mocks.gameFindMany.mockResolvedValue([]);

    const freeViewer = getEntitlements("FREE");
    const proResult = await loadBoardState(new Date("2026-05-22T16:00:00.000Z"), proViewer);
    const freeResult = await loadBoardState(new Date("2026-05-22T16:00:00.000Z"), freeViewer);

    // Counts must be identical regardless of viewer tier.
    expect(freeResult.data.openPicks).toBe(proResult.data.openPicks);
    expect(freeResult.data.openPicks).toBe(2);
    expect(freeResult.data.gatedToday).toBe(proResult.data.gatedToday);
    expect(freeResult.data.sportsWatched).toBe(proResult.data.sportsWatched);

    // Only the market field differs: PRO sees real selections, FREE sees "ALL_MARKETS".
    // Every FREE-viewer row must be redacted to "ALL_MARKETS".
    expect(freeResult.data.publishedToday.every((r) => r.market === "ALL_MARKETS")).toBe(true);
    // PRO viewer must see at least one real selection (not all redacted).
    expect(proResult.data.publishedToday.some((r) => r.market !== "ALL_MARKETS")).toBe(true);
  });

  it("redacts rankingP/rankingSource for FREE viewers (GSE-SEC-026)", async () => {
    // rankingP and rankingSource are premium-only model internals.
    // A FREE/anonymous viewer must never receive them.
    const premiumPick = {
      id: "pick_premium",
      gameId: "game_2",
      selection: "LAD +2.0",
      confidence: 82,
      edgeScore: 75,
      factorBreakdown: {
        consensusScore: 15,
        marketDepthScore: 12,
        edgeScore: 20,
        rankingP: 0.723,
        rankingSource: "independent_trueProb",
        factors: [],
      },
      generatedAt: evaluatedAt,
      modelVersion: "v5.1.0",
      tier: "PREMIUM",
      game: game({ awayTeamName: "LAD", homeTeamName: "SF", currentEdgeIndex: 55 }),
    };

    mocks.gateDecisionFindMany.mockResolvedValue([]);
    mocks.pickFindMany.mockResolvedValue([premiumPick]);
    mocks.gameFindMany.mockResolvedValue([]);

    const freeViewer = getEntitlements("FREE");
    const proResult = await loadBoardState(new Date("2026-05-22T16:00:00.000Z"), proViewer);
    const freeResult = await loadBoardState(new Date("2026-05-22T16:00:00.000Z"), freeViewer);

    // PRO viewer sees rankingP + rankingSource from the factor breakdown.
    expect(proResult.data.publishedToday[0]?.rankingP).toBeCloseTo(0.723, 3);
    expect(proResult.data.publishedToday[0]?.rankingSource).toBe("independent_trueProb");

    // FREE viewer gets BOTH nulled out server-side.
    expect(freeResult.data.publishedToday[0]?.rankingP).toBeNull();
    expect(freeResult.data.publishedToday[0]?.rankingSource).toBeNull();
  });

  it("nulls rankingP for anonymous viewers (no entitlements)", async () => {
    const premiumPick = {
      id: "pick_1",
      gameId: "game_1",
      selection: "CHI -3.5",
      confidence: 88,
      edgeScore: 80,
      factorBreakdown: {
        consensusScore: 15,
        marketDepthScore: 12,
        edgeScore: 20,
        rankingP: 0.912,
        rankingSource: "blend_indep_conf",
        factors: [],
      },
      generatedAt: evaluatedAt,
      modelVersion: "v5.1.0",
      tier: "PREMIUM",
      game: game(),
    };

    mocks.gateDecisionFindMany.mockResolvedValue([]);
    mocks.pickFindMany.mockResolvedValue([premiumPick]);
    mocks.gameFindMany.mockResolvedValue([]);

    // Anonymous = no entitlements passed -> isPremiumViewer defaults to false.
    const anonymousResult = await loadBoardState(new Date("2026-05-22T16:00:00.000Z"));
    expect(anonymousResult.data.publishedToday[0]?.rankingP).toBeNull();
    expect(anonymousResult.data.publishedToday[0]?.rankingSource).toBeNull();
  });

  describe("loadBoardState — fallback lanes never double-count a fixture (C-117)", () => {
    const futureGame = {
      id: "game_overlap",
      commenceTime: new Date("2026-05-22T23:00:00.000Z"),
      updatedAt: new Date("2026-05-22T15:00:00.000Z"),
      dataQualityScore: 80,
      ...game(),
    };

    it("drops a gated DECISION row for a game that also has a published decision", async () => {
      // The primary GateDecision path had the same gap the fallback did, and
      // the fallback fix did not reach it. GateDecision rows are historical and
      // the query does not make PUBLISHED and GATED mutually exclusive, so one
      // game carries both. The published row keys on its real pickType and the
      // gated one on NO_PICK, so their keys never collide and the collapse
      // cannot pair them: the board showed a published pick AND a "we passed on
      // this" row for the same fixture (Devin Review, #717).
      mocks.gateDecisionFindMany.mockResolvedValue([
        {
          id: "gd_pub",
          gameId: "game_both",
          status: "PUBLISHED",
          reason: "Cleared publish threshold.",
          edgeIndex: 72,
          confidence: 88,
          evaluatedAt,
          modelVersion: "v5.1.0",
          game: game(),
          pick: { selection: "BOS -1.5", confidence: 88, pickType: "SPREAD", isPublished: true },
        },
        {
          id: "gd_gate",
          gameId: "game_both",
          status: "GATED",
          reason: "Market depth below publish threshold.",
          edgeIndex: 40,
          confidence: null,
          evaluatedAt: new Date("2026-05-22T15:45:00.000Z"),
          modelVersion: "v5.1.0",
          game: game(),
          pick: null,
        },
      ]);

      const result = await loadBoardState(new Date("2026-05-22T18:00:00.000Z"), proViewer);

      expect(result.data.publishedToday).toHaveLength(1);
      expect(result.data.gatedTodayRows).toHaveLength(0);
      // Counters describe the rows actually shown.
      expect(result.data.openPicks).toBe(1);
      expect(result.data.gatedToday).toBe(0);
    });

    it("makes the scoring and gated lanes DISJOINT at the query, so no game can be in both", async () => {
      // CORRECTION. Two earlier tests here asserted post-filter behaviour: that
      // a game satisfying both lanes ends up gated. That pinned a workaround.
      // Suppressing the scoring row was right while the scoring query returned
      // only FUTURE games, and became wrong the moment it returned started
      // ones — it then left a started game reading GATED_TODAY after kickoff
      // (Devin Review, #717). The real fix is that the two predicates cannot
      // both match, so there is nothing to arbitrate. That is what to pin.
      const now = new Date("2026-05-22T16:00:00.000Z");
      mocks.gateDecisionFindMany.mockResolvedValue([]);
      mocks.pickFindMany.mockResolvedValue([]);
      mocks.gameFindMany.mockResolvedValue([]);

      await loadBoardState(now, proViewer);

      const whereOf = (i: number) =>
        (mocks.gameFindMany.mock.calls[i]?.[0] as {
          where: {
            commenceTime?: Record<string, unknown>;
            status?: unknown;
            OR?: ScoringBranch[];
          };
        }).where;

      const scoring = whereOf(0);
      const gated = whereOf(1);

      // SCORING: started, and not so long ago that it cannot still be playing.
      // The lower bound is what stops a stale row from a failed settlement
      // surfacing as "scoring" forever on a quiet slate — but it is PER
      // STATUS, because one shared bound dropped a long LIVE game off the
      // board entirely (Devin Review, #719).
      const branches = scoring.OR ?? [];
      expect(branches.map((b) => b.status).sort()).toEqual(["LIVE", "SCHEDULED"]);
      const live = branchFor(branches, "LIVE");
      const scheduled = branchFor(branches, "SCHEDULED");

      // Both halves end at `now`: the scoring lane is started games only.
      expect(live.commenceTime.lte.getTime()).toBe(now.getTime());
      expect(scheduled.commenceTime.lte.getTime()).toBe(now.getTime());

      // SCHEDULED past kickoff is ambiguous, so it keeps the tight bound.
      expect(now.getTime() - scheduled.commenceTime.gte.getTime()).toBe(8 * 60 * 60 * 1000);
      // LIVE is a positive assertion, so its bound is wider — but it IS
      // bounded, because a LIVE row also outlives a game whose transition to
      // FINAL failed.
      expect(now.getTime() - live.commenceTime.gte.getTime()).toBe(24 * 60 * 60 * 1000);
      expect(live.commenceTime.gte.getTime()).toBeLessThan(scheduled.commenceTime.gte.getTime());

      const scoringHi = live.commenceTime.lte;

      // GATED: not started. This is the half that makes the lanes disjoint.
      const gatedLo = (gated.commenceTime as { gt: Date }).gt;
      expect(gatedLo.getTime()).toBe(now.getTime());

      // The exact instant has ONE owner. Scoring takes it via `lte: now`, so
      // gated must use a STRICT `gt: now` — inclusive-inclusive would put a
      // game kicking off at exactly `now` in both lanes, which is the overlap
      // this split exists to remove (CodeRabbit, #719).
      expect(gated.commenceTime).toHaveProperty("gt");
      expect(gated.commenceTime).not.toHaveProperty("gte");
      expect(scoringHi.getTime()).toBeLessThanOrEqual(gatedLo.getTime());
    });

    it("keeps a LIVE game in the scoring lane nine hours after kickoff, and still drops a stale SCHEDULED one", async () => {
      // A shared eight-hour bound across both status values did not MISLABEL a
      // long or delayed game — it removed it from the board entirely, because
      // the gated lane starts at `gt: now` and would not take it either. A rain
      // delay or a lightning suspension runs past eight hours (Devin Review,
      // #719). The bound still has to exist for both, because either status can
      // outlive the game when the transition to FINAL fails.
      const now = new Date("2026-05-22T16:00:00.000Z");
      mocks.gateDecisionFindMany.mockResolvedValue([]);
      mocks.pickFindMany.mockResolvedValue([]);
      mocks.gameFindMany.mockResolvedValue([]);

      await loadBoardState(now, proViewer);

      const branches =
        ((mocks.gameFindMany.mock.calls[0]?.[0] as { where: { OR?: ScoringBranch[] } }).where
          .OR ?? []);

      /** Apply the shipped predicate to a candidate row. */
      const selects = (status: string, hoursAgo: number): boolean => {
        const commenceTime = new Date(now.getTime() - hoursAgo * 60 * 60 * 1000);
        return branches.some(
          (b) =>
            b.status === status &&
            commenceTime.getTime() <= b.commenceTime.lte.getTime() &&
            commenceTime.getTime() >= b.commenceTime.gte.getTime(),
        );
      };

      // THE REGRESSION: a delayed game, still in progress, nine hours in.
      expect(selects("LIVE", 9)).toBe(true);
      // Unchanged: SCHEDULED past kickoff is ambiguous and keeps the tight
      // bound, so a row a failed settlement left behind is still excluded.
      expect(selects("SCHEDULED", 9)).toBe(false);
      // LIVE is bounded too — a day-old LIVE row is a failed transition, not a
      // game. Deleting the LIVE lower bound would flip this to true.
      expect(selects("LIVE", 25)).toBe(false);
      // Both statuses inside their windows are still selected.
      expect(selects("LIVE", 2)).toBe(true);
      expect(selects("SCHEDULED", 2)).toBe(true);
    });

    it("keeps a started game in the scoring lane instead of reverting it to gated", async () => {
      // The RED case: a same-day started game with no published pick used to
      // satisfy both queries, and the suppression dropped its scoring row, so
      // viewers saw GATED_TODAY after kickoff. With the lanes disjoint the
      // gated query no longer returns it at all, and the suppression that could
      // have re-broken this is gone.
      const startedGame = {
        id: "game_started",
        commenceTime: new Date("2026-05-22T15:00:00.000Z"),
        updatedAt: new Date("2026-05-22T15:30:00.000Z"),
        dataQualityScore: 80,
        ...game(),
      };
      mocks.gateDecisionFindMany.mockResolvedValue([]);
      mocks.pickFindMany.mockResolvedValue([]);
      // Only the scoring query matches it now, so return it for that call only.
      mocks.gameFindMany
        .mockResolvedValueOnce([startedGame])
        .mockResolvedValueOnce([]);

      const result = await loadBoardState(new Date("2026-05-22T16:00:00.000Z"), proViewer);

      expect(result.data.scoringNow).toHaveLength(1);
      expect(result.data.scoringNow[0]?.status).toBe("SCORING_NOW");
      expect(result.data.gatedTodayRows).toHaveLength(0);
    });

    it("suppresses a generic lane row for a fixture that already has a published pick", async () => {
      // Published rows key on the real pickType and the generic lanes on
      // NO_PICK, so their keys never collide and the collapse alone cannot pair
      // them. The gated query already excludes published games; the scoring
      // query does not, so the same fixture appeared twice.
      mocks.gateDecisionFindMany.mockResolvedValue([]);
      mocks.pickFindMany.mockResolvedValue([
        {
          id: "pick_pub",
          gameId: "game_overlap",
          pickType: "SPREAD",
          selection: "BOS -1.5",
          confidence: 71,
          edgeScore: 63,
          factorBreakdown: null,
          generatedAt: evaluatedAt,
          modelVersion: "v5.1.0",
          tier: "FREE",
          game: game(),
        },
      ]);
      mocks.gameFindMany.mockResolvedValue([futureGame]);

      const result = await loadBoardState(new Date("2026-05-22T16:00:00.000Z"), proViewer);

      expect(result.data.publishedToday).toHaveLength(1);
      expect(result.data.scoringNow.some((r) => r.gameId === "game_overlap")).toBe(false);
      expect(result.data.gatedTodayRows.some((r) => r.gameId === "game_overlap")).toBe(false);
      // And the counters agree with the rows actually shown.
      expect(result.data.openPicks).toBe(1);
      expect(result.data.gatedToday).toBe(0);
    });
  });

  describe("loadBoardState — one fixture, one row (C-117)", () => {
    it("collapses repeated gate decisions for one game and keeps the counts honest", async () => {
      // Measured on a live slate: 58 rows over 18 fixtures, one matchup shown
      // four times as two contradictory variants. GateDecision has no unique
      // constraint and the query takes the latest 100 with no per-game collapse,
      // so repeated evaluations of one game each became a row.
      mocks.gateDecisionFindMany.mockResolvedValue([
        {
          id: "gd_a",
          gameId: "game_dupe",
          status: "PUBLISHED",
          reason: "Cleared publish threshold.",
          edgeIndex: 60,
          confidence: 57,
          evaluatedAt,
          modelVersion: "v5.1.0",
          game: game(),
          pick: { selection: "BOS -1.5", confidence: 57, isPublished: true },
        },
        {
          id: "gd_b",
          gameId: "game_dupe",
          status: "PUBLISHED",
          reason: "Cleared publish threshold.",
          edgeIndex: 72,
          confidence: 88,
          evaluatedAt,
          modelVersion: "v5.1.0",
          game: game(),
          pick: { selection: "BOS -1.5", confidence: 88, isPublished: true },
        },
      ]);
  
      const result = await loadBoardState(new Date("2026-05-22T18:00:00.000Z"), proViewer);
  
      // One fixture, one row — the free visitor and the subscriber can no longer
      // be shown 57 LEAN and 88 STRONG_PLAY for the same game.
      expect(result.data.publishedToday).toHaveLength(1);
      expect(result.data.publishedToday[0]!.confidence).toBe(88);
      // The board's own numbers describe the rows it actually shows. Deduping
      // after the counts were taken would leave these disagreeing.
      expect(result.data.openPicks).toBe(1);
      expect(result.data.sportsWatched).toBe(1);
    });
  
    it("asks the database only for decisions on games that were not merged away", async () => {
      mocks.gateDecisionFindMany.mockResolvedValue([]);
      mocks.pickFindMany.mockResolvedValue([]);
      mocks.gameFindMany.mockResolvedValue([]);
  
      await loadBoardState(new Date("2026-05-22T18:00:00.000Z"), proViewer);
  
      const where = mocks.gateDecisionFindMany.mock.calls[0]?.[0]?.where as {
        game?: { mergedIntoGameId?: null };
      };
      expect(where.game?.mergedIntoGameId).toBeNull();
    });
  });
});

describe("a PUBLISHED decision whose pick has been withdrawn", () => {
  /**
   * GateDecision records what we decided at a moment in time; Pick.isPublished
   * records what is live now. Nothing kept them in step, so a withdrawn pick
   * kept its PUBLISHED_TODAY row and kept suppressing that fixture's gated row
   * (Devin Review, #719).
   *
   * Measured on production 2026-09-07, read-only: 84 PUBLISHED decisions
   * already point at picks with isPublished=false, so this was live before the
   * remediation tool existed - and scripts/ops/unpublish-corrupted-picks.ts
   * withdraws 586 more. A remediation the product surface ignores is not a
   * remediation, which is what makes this a launch-sequencing bug and not a
   * cosmetic one.
   */
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-22T16:00:00.000Z"));
    mocks.gateDecisionFindMany.mockReset();
    mocks.pickFindMany.mockReset();
    mocks.gameFindMany.mockReset();
    mocks.pickFindMany.mockResolvedValue([]);
    mocks.gameFindMany.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const withdrawn = {
    id: "gd_withdrawn",
    gameId: "game_w",
    status: "PUBLISHED",
    reason: null,
    reasonCode: null,
    edgeIndex: 61,
    confidence: 74,
    modelVersion: "v5.2.7",
    evaluatedAt,
    game: game(),
    pick: { selection: "BOS -1.5", confidence: 74, pickType: "SPREAD", isPublished: false },
  };

  it("does not show it as published", async () => {
    mocks.gateDecisionFindMany.mockResolvedValue([withdrawn]);
    const result = await loadBoardState(new Date("2026-05-22T16:00:00.000Z"), proViewer);
    expect(result.data.publishedToday.map((r) => r.id)).not.toContain("gd_withdrawn");
    expect(result.data.openPicks).toBe(0);
  });

  const gated = (over: Record<string, unknown> = {}) => ({
    id: "gd_gated_w",
    gameId: "game_w",
    status: "GATED",
    reason: "Fixture reason: edge below threshold",
    reasonCode: "EDGE_BELOW_THRESHOLD",
    edgeIndex: 40,
    confidence: 51,
    modelVersion: "v5.2.7",
    evaluatedAt,
    game: game(),
    pick: null,
    ...over,
  });

  it("lets a NEWER gated evaluation display once the publication is withdrawn", async () => {
    // While the withdrawn row counted as published it hid the honest gated row
    // for the same fixture, so the board went silent about the game.
    mocks.gateDecisionFindMany.mockResolvedValue([
      withdrawn,
      gated({ evaluatedAt: new Date("2026-05-22T15:45:00.000Z") }),
    ]);
    const result = await loadBoardState(new Date("2026-05-22T16:00:00.000Z"), proViewer);
    expect(result.data.gatedTodayRows.map((r) => r.id)).toEqual(["gd_gated_w"]);
    expect(result.data.publishedToday).toHaveLength(0);
  });

  it("does NOT let an OLDER gated evaluation resurface after a withdrawal", async () => {
    // Chronology, not just displayability. We evaluated, published, then
    // withdrew; reverting the board to an earlier "we passed on this"
    // misrepresents that sequence (Devin Review, #719). The withdrawn row still
    // resolves order even though it cannot be shown, so the fixture drops out of
    // the decision path entirely and the fallback lanes judge it on their own
    // predicates.
    mocks.gateDecisionFindMany.mockResolvedValue([
      withdrawn,
      gated({ evaluatedAt: new Date("2026-05-22T14:00:00.000Z") }),
    ]);
    const result = await loadBoardState(new Date("2026-05-22T16:00:00.000Z"), proViewer);
    expect(result.data.gatedTodayRows).toHaveLength(0);
    expect(result.data.publishedToday).toHaveLength(0);
  });

  it("PINS A KNOWN GAP: the watermark is the publication time, not the withdrawal time", async () => {
    // REVIEW ROUND 37 (Devin, #719). CONFIRMED, and it is C-158's missing
    // column showing a second face rather than a separate bug.
    //
    // The rule above compares a gated evaluation against the PUBLICATION's
    // evaluatedAt, because Pick.isPublished is a bare Boolean (schema.prisma:550)
    // with nowhere to record when it flipped. So the fixture below is
    // ambiguous by construction:
    //
    //   published 15:30 -> gated 15:45 -> withdrawn 16:00   a pick was LIVE at 15:45
    //   published 15:30 -> withdrawn 15:40 -> gated 15:45   the gated row is current
    //
    // The board shows the gated row in both. The test one block above asserts
    // the SECOND reading, which is the honest one; this test names the price of
    // it, which is the first.
    //
    // THIS EXPECTATION IS THE DEFECT, not the contract. It should FAIL and be
    // replaced when C-158 lands an `unpublishedAt`. The fix available without
    // that column - suppress every gated row on any withdrawn fixture - is
    // worse: it silences the board on games we have an honest current answer
    // for, which is what C-149 was written to stop.
    mocks.gateDecisionFindMany.mockResolvedValue([
      withdrawn,
      gated({ id: "gd_gated_while_live", evaluatedAt: new Date("2026-05-22T15:45:00.000Z") }),
    ]);
    const result = await loadBoardState(new Date("2026-05-22T16:00:00.000Z"), proViewer);
    expect(result.data.gatedTodayRows.map((r) => r.id)).toEqual(["gd_gated_while_live"]);
  });

  it("falls through to the fallback lanes when chronology supersedes EVERY row", async () => {
    // REVIEW ROUND 32 (Devin, #719). The branch is entered on displayable
    // CANDIDATES and returned on them too, so a fixture whose only surviving row
    // was superseded by a withdrawal produced three empty lanes AND skipped the
    // fallback pick and game queries - blanking the whole board, live published
    // picks on other fixtures included.
    //
    // This is the assertion the older-gated test could not make: it stubbed both
    // fallback queries empty, so an empty board and a fallback that never ran
    // looked identical. Here the fallback lane has a real published pick on a
    // DIFFERENT fixture, so only one of those two behaviours can pass.
    mocks.gateDecisionFindMany.mockResolvedValue([
      withdrawn,
      gated({ evaluatedAt: new Date("2026-05-22T14:00:00.000Z") }),
    ]);
    mocks.pickFindMany.mockResolvedValue([
      {
        id: "pick_other_fixture",
        gameId: "game_other",
        pickType: "SPREAD",
        selection: "BOS -1.5",
        confidence: 71,
        edgeScore: 63,
        factorBreakdown: null,
        generatedAt: evaluatedAt,
        modelVersion: "v5.1.0",
        tier: "FREE",
        game: game(),
      },
    ]);

    const result = await loadBoardState(new Date("2026-05-22T16:00:00.000Z"), proViewer);

    expect(result.data.publishedToday.map((r) => r.id)).toEqual(["pick_other_fixture"]);
    expect(result.data.openPicks).toBe(1);
    // The chronology rule still holds: the superseded gated row does not
    // resurface just because the fallback lanes now run.
    expect(result.data.gatedTodayRows.some((r) => r.id === "gd_gated_w")).toBe(false);
  });

  it("still shows a decision whose pick IS published", async () => {
    // The control. Dropping every published row would also satisfy the two
    // assertions above.
    mocks.gateDecisionFindMany.mockResolvedValue([
      { ...withdrawn, id: "gd_live", pick: { ...withdrawn.pick, isPublished: true } },
    ]);
    const result = await loadBoardState(new Date("2026-05-22T16:00:00.000Z"), proViewer);
    expect(result.data.publishedToday.map((r) => r.id)).toEqual(["gd_live"]);
    expect(result.data.openPicks).toBe(1);
  });
});
