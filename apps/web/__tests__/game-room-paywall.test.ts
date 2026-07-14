import { beforeEach, describe, expect, it, vi } from "vitest";
import { getEntitlements } from "@sports/types";

/**
 * Server-side paywall enforcement for the Game Intelligence Room — executed
 * against the REAL shared loader (`loadGameRoom`, mocked db), the single source
 * of truth both the public SSR page (`/room/[gameId]`) and the Pro-gated Model
 * Court route feed from.
 *
 * CLAUDE.md rule #3 (no frontend-only paywalls): the Room is a PUBLIC read-only
 * surface, but two of its panels carry paid metrics the board denies FREE:
 *
 *  - the pre-mortem note (`buildPickPremortemNote`) embeds the paid factor trail
 *    — confidence at prediction, line-movement delta, rest/schedule/ATS/H2H
 *    sample sizes, data-quality score, book depth — the same values the audit
 *    route (#103) gates behind PRO/ELITE, and
 *  - Market Pulse line movement (`canSeeLineMovement`) is the Pro-tier market read.
 *
 * The regression this pins: the page rendered `room.premortem.summary` (which is
 * literally `"...scored at 78 confidence..."` plus the factor drivers) and the
 * raw `lineMovementSpread/Total` with NO entitlement check, so an anonymous
 * `curl https://.../room/<id>` (viewer → FREE) read the platform's paid metrics.
 *
 * Invariants:
 *  - ANONYMOUS / FREE / FANTASY → `premortem` is null and BOTH line-movement
 *    values are null; no premium marker survives serialization.
 *  - PRO / ELITE → the pre-mortem is built (confidence + factor trail present)
 *    and line movement is served (unchanged behavior for entitled callers).
 */

const mocks = vi.hoisted(() => ({
  gameFindUnique: vi.fn<(args: unknown) => Promise<unknown>>(),
}));

vi.mock("@sports/db", () => ({
  db: {
    game: { findUnique: mocks.gameFindUnique },
  },
}));

import { loadGameRoom, type GameRoomViewer } from "@/lib/game-room/load";

// Concrete premium values baked into the pick + snapshot so we can assert the
// exact confidence number and line-movement deltas cross the gate (or don't).
const SNAPSHOT = {
  id: "snap-1",
  capturedAt: new Date("2026-07-11T12:00:00.000Z"),
  hadOddsSignal: true,
  hadLineMovementSignal: true,
  hadRestSignal: true,
  hadScheduleSignal: true,
  hadAtsFormSignal: true,
  hadH2HSignal: true,
  hadVenueSignal: false,
  hadWeatherSignal: false,
  hadInjurySignal: false,
  bookmakerCount: 3,
  dataQualityScore: 64,
  lineMovementDelta: -1.5,
  restAdvantageNet: 2,
  atsFormSampleSize: 6,
  h2hSampleSize: 3,
  scheduleDensityHome: 4,
  scheduleDensityAway: 2,
  modelVersion: "v5.0.0",
  confidenceAtPrediction: 78,
  settlementResult: null,
  isBootstrap: false,
};

function gameFixture() {
  return {
    id: "game-1",
    homeTeamName: "Chiefs",
    awayTeamName: "Broncos",
    commenceTime: new Date("2026-07-12T20:00:00.000Z"),
    status: "SCHEDULED",
    currentEdgeIndex: 61,
    bookmakerCoverageMax: 6,
    dataQualityScore: 82,
    // The Pro-tier market read — must be withheld from FREE.
    lineMovementSpread: -2.5,
    lineMovementTotal: 1.5,
    sport: { name: "NFL" },
    picks: [
      {
        id: "pick-1",
        selection: "Chiefs -3.5",
        pickType: "SPREAD",
        confidence: 78,
        tier: "FREE",
        edgeScore: 60,
        consensusPct: 0.58,
        bookmakerCount: 3,
        riskLevel: "MODERATE",
        modelVersion: "v5.0.0",
        isPublished: true,
        isBootstrap: false,
        result: "PENDING",
        settledAt: null,
        generatedAt: new Date("2026-07-11T13:00:00.000Z"),
        signalSnapshot: SNAPSHOT,
        lossAutopsy: null,
      },
      {
        id: "pick-2",
        selection: "Raiders +3.5",
        pickType: "SPREAD",
        confidence: 91,
        tier: "PREMIUM",
        edgeScore: 72,
        consensusPct: 0.61,
        bookmakerCount: 4,
        riskLevel: "LOW",
        modelVersion: "v5.0.0",
        isPublished: true,
        isBootstrap: false,
        result: "PENDING",
        settledAt: null,
        generatedAt: new Date("2026-07-11T12:45:00.000Z"),
        signalSnapshot: SNAPSHOT,
        lossAutopsy: null,
      },
    ],
    gameSignals: [
      {
        id: "sig-1",
        sourceCategory: "MARKET",
        sourceName: "odds-api",
        signalKey: "LINE_MOVEMENT",
        fetchedAt: new Date("2026-07-11T12:30:00.000Z"),
        expiresAt: null,
        trustLevel: 1,
        isBootstrap: false,
      },
    ],
  };
}

function viewerFor(tier: "FREE" | "FANTASY" | "PRO" | "ELITE"): GameRoomViewer {
  const e = getEntitlements(tier);
  return {
    canSeePremiumPicks: e.canSeePremiumPicks,
    canSeeConfidence: e.canSeeConfidence,
    canSeeFactorBreakdown: e.canSeeFactorBreakdown,
    canSeeLineMovement: e.canSeeLineMovement,
  };
}

// Marker strings emitted ONLY by the premium pre-mortem builder. Their absence
// from the serialized room proves nothing paid leaked under any key.
const PREMIUM_MARKERS = [
  "What would have to go wrong", // pre-mortem headline
  "78 confidence",              // pre-mortem summary ("scored at 78 confidence")
  "line movement reverses",     // factor-trail driver from the snapshot
];

describe("loadGameRoom — server-side paywall (pre-mortem + line movement)", () => {
  beforeEach(() => {
    mocks.gameFindUnique.mockReset().mockResolvedValue(gameFixture());
  });

  it("defaults to fail-closed: no viewer arg → premium withheld", async () => {
    const room = await loadGameRoom("game-1");
    expect(room).not.toBeNull();
    expect(room!.premortem).toBeNull();
    expect(room!.node.marketPulse.lineMovementSpread).toBeNull();
    expect(room!.node.marketPulse.lineMovementTotal).toBeNull();
    expect(room!.node.picks).toHaveLength(1);
    expect(room!.node.picks[0]?.confidence).toBeNull();
    expect(room!.lenses.every((lens) => !lens.canShowConfidence)).toBe(true);
    expect(room!.lenses.every((lens) => !lens.canShowFactorBreakdown)).toBe(true);
  });

  it("ANONYMOUS / FREE viewer: pre-mortem null, line movement null, no marker leaks", async () => {
    const room = await loadGameRoom("game-1", viewerFor("FREE"));
    expect(room).not.toBeNull();

    // The paid detail is NULL, not merely hidden at render time.
    expect(room!.premortem).toBeNull();
    expect(room!.node.marketPulse.lineMovementSpread).toBeNull();
    expect(room!.node.marketPulse.lineMovementTotal).toBeNull();

    // Public trust signals still render (edge index, evidence, book coverage).
    expect(room!.node.marketPulse.edgeIndex).toBe(61);
    expect(room!.node.marketPulse.bookmakerCoverage).toBe(6);

    // Belt-and-suspenders: no premium marker anywhere in the serialized room.
    const serialized = JSON.stringify(room);
    for (const marker of PREMIUM_MARKERS) {
      expect(serialized).not.toContain(marker);
    }
    expect(serialized).not.toContain("78 confidence");
    expect(serialized).not.toContain('"confidence":78');
    expect(serialized).not.toContain('"confidence":91');
    expect(serialized).not.toContain("Raiders +3.5");
    expect(mocks.gameFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          picks: expect.objectContaining({
            where: expect.objectContaining({ tier: "FREE" }),
          }),
        }),
      }),
    );
  });

  it("FANTASY viewer is treated as FREE on the betting room (no full board access)", async () => {
    const room = await loadGameRoom("game-1", viewerFor("FANTASY"));
    expect(room!.premortem).toBeNull();
    expect(room!.node.marketPulse.lineMovementSpread).toBeNull();
    expect(room!.node.marketPulse.lineMovementTotal).toBeNull();
    expect(room!.node.picks[0]?.confidence).toBeNull();
  });

  it("never exposes an unpublished loss-autopsy draft in public room memory", async () => {
    const fixture = gameFixture();
    mocks.gameFindUnique.mockResolvedValue({
      ...fixture,
      picks: [
        {
          ...fixture.picks[0]!,
          result: "LOSS",
          settledAt: new Date("2026-07-12T23:00:00.000Z"),
          lossAutopsy: {
            whatWeLearned: "INTERNAL DRAFT: change the injury prior before review.",
            status: "DRAFT",
            isPublic: false,
          },
        },
        fixture.picks[1]!,
      ],
    });

    const room = await loadGameRoom("game-1", viewerFor("FREE"));

    expect(room!.memory.status).toBe("SETTLED_LOSS");
    expect(room!.memory.body).toContain("full post-mortem has not been published");
    expect(JSON.stringify(room)).not.toContain("INTERNAL DRAFT");
  });

  it("PRO viewer: pre-mortem built with confidence + factor trail, line movement served", async () => {
    const room = await loadGameRoom("game-1", viewerFor("PRO"));
    expect(room!.premortem).not.toBeNull();
    expect(room!.premortem!.status).toBe("READY");
    // The confidence number and factor-trail driver are present for the paid tier.
    expect(room!.premortem!.summary).toContain("78 confidence");
    expect(room!.premortem!.summary).toContain("line movement reverses");
    // Line movement served unchanged.
    expect(room!.node.marketPulse.lineMovementSpread).toBe(-2.5);
    expect(room!.node.marketPulse.lineMovementTotal).toBe(1.5);
    expect(room!.node.picks).toHaveLength(2);
    expect(room!.node.picks.map((pick) => pick.confidence)).toEqual([78, 91]);
    expect(room!.lenses.find((lens) => lens.lens === "BETTOR")?.canShowConfidence).toBe(true);
    expect(room!.lenses.find((lens) => lens.lens === "ANALYST")?.canShowFactorBreakdown).toBe(true);
    const query = mocks.gameFindUnique.mock.calls.at(-1)?.[0] as {
      include?: { picks?: { where?: Record<string, unknown> } };
    };
    expect(query.include?.picks?.where).not.toHaveProperty("tier");
  });

  it("ELITE viewer: full premium (unchanged for entitled callers)", async () => {
    const room = await loadGameRoom("game-1", viewerFor("ELITE"));
    expect(room!.premortem).not.toBeNull();
    expect(room!.premortem!.summary).toContain("78 confidence");
    expect(room!.node.marketPulse.lineMovementSpread).toBe(-2.5);
    expect(room!.node.marketPulse.lineMovementTotal).toBe(1.5);
  });
});
