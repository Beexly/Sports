/**
 * Logic tests for STALENESS_LAW + the two-doctrines board composer (WP-5).
 * Pure composition only: no DB, no DOM. The live acceptance case (113
 * quarantined future picks -> PASS-only board) is pinned here.
 */
import { describe, expect, it } from "vitest";
import {
  STALENESS_LAW,
  composeDoctrineBoard,
  formatConfidence,
} from "./staleness-law";
import type { BoardStatePayload } from "./state";
import type { BoardPassesPayload } from "./passes";

const BANNED_STRINGS = [
  "Board temporarily unavailable",
  "Today's picks n/a",
  "temporarily unavailable",
  "n/a",
];

function stateFixture(over: {
  publishedToday?: unknown[];
  gatedTodayRows?: unknown[];
  boardClass?: string;
}): BoardStatePayload {
  return {
    data: {
      publishedToday: over.publishedToday ?? [],
      gatedTodayRows: over.gatedTodayRows ?? [],
    },
    meta: { boardClass: { state: over.boardClass ?? "PASS_DOCTRINE" } },
  } as unknown as BoardStatePayload;
}

function passesFixture(passes: unknown[]): BoardPassesPayload {
  return { data: { passes } } as unknown as BoardPassesPayload;
}

describe("formatConfidence", () => {
  it("renders an integer XX/100, never a percentage", () => {
    expect(formatConfidence(74)).toBe("74/100");
    expect(formatConfidence(74.6)).toBe("75/100");
    expect(formatConfidence(0)).toBe("0/100");
    expect(formatConfidence(100)).toBe("100/100");
    expect(formatConfidence(140)).toBe("100/100");
    expect(formatConfidence(-5)).toBe("0/100");
    for (const label of [formatConfidence(74), formatConfidence(100)]) {
      expect(label).not.toContain("%");
    }
  });
});

describe("STALENESS_LAW copy", () => {
  it("states the two doctrines and bans the error-state language", () => {
    expect(STALENESS_LAW.length).toBeGreaterThanOrEqual(4);
    const joined = STALENESS_LAW.join(" ");
    expect(joined).toContain("PLAY");
    expect(joined).toContain("PASS");
    for (const banned of BANNED_STRINGS) {
      expect(joined.toLowerCase()).not.toContain(banned.toLowerCase());
    }
  });
});

describe("composeDoctrineBoard", () => {
  it("PASS-only slate renders the PASS doctrine proudly (the live acceptance case)", () => {
    const board = composeDoctrineBoard({
      state: stateFixture({
        publishedToday: [],
        gatedTodayRows: [
          { gameId: "g1", matchup: "NE @ DET", gateReason: "Waiting on the final injury report." },
        ],
      }),
      passes: passesFixture([
        { gameId: "g2", matchup: "KC @ ATL", reason: "The price moved past our number." },
      ]),
      viewerCanSeeSelection: false,
    });
    expect(board.posture).toBe("PASS_ONLY");
    expect(board.zone1).toHaveLength(0);
    expect(board.zone2).toHaveLength(2);
    expect(board.headline).toBe("No official plays qualify right now.");
    expect(board.subline).toContain("decision, not an outage");
    for (const text of [board.headline, board.subline, ...board.zone2.map((r) => r.reason)]) {
      for (const banned of BANNED_STRINGS) {
        expect(text.toLowerCase()).not.toContain(banned.toLowerCase());
      }
    }
  });

  it("a failed load is a resting PASS board, never an error state", () => {
    const board = composeDoctrineBoard({
      state: null,
      passes: null,
      viewerCanSeeSelection: false,
    });
    expect(board.posture).toBe("PASS_ONLY");
    expect(board.headline).toBe("The board is resting between slates.");
    expect(board.zone1).toHaveLength(0);
    expect(board.zone2).toHaveLength(0);
    for (const banned of BANNED_STRINGS) {
      expect(board.headline.toLowerCase()).not.toContain(banned.toLowerCase());
      expect(board.subline.toLowerCase()).not.toContain(banned.toLowerCase());
    }
  });

  it("Zone 1 plays carry integer confidence; selection stays gated server-side", () => {
    const published = [
      {
        gameId: "g1",
        matchup: "PIT @ CIN",
        market: "Chiefs -3.5",
        confidence: 74.4,
        status: "OFFICIAL",
      },
    ];
    const free = composeDoctrineBoard({
      state: stateFixture({ publishedToday: published, boardClass: "PLAYS_LIVE" }),
      passes: null,
      viewerCanSeeSelection: false,
    });
    expect(free.posture).toBe("PLAYS");
    expect(free.zone1[0]?.confidence).toBe(74);
    expect(free.zone1[0]?.confidenceLabel).toBe("74/100");
    expect(free.zone1[0]?.selection).toBeNull();

    const member = composeDoctrineBoard({
      state: stateFixture({ publishedToday: published, boardClass: "PLAYS_LIVE" }),
      passes: null,
      viewerCanSeeSelection: true,
    });
    expect(member.zone1[0]?.selection).toBe("Chiefs -3.5");
  });

  it("rows without a finite confidence never enter Zone 1", () => {
    const board = composeDoctrineBoard({
      state: stateFixture({
        publishedToday: [
          { gameId: "g1", matchup: "A @ B", market: "X", confidence: null, status: "OFFICIAL" },
          { gameId: "g2", matchup: "C @ D", market: "Y", confidence: Number.NaN, status: "OFFICIAL" },
        ],
      }),
      passes: null,
      viewerCanSeeSelection: true,
    });
    expect(board.posture).toBe("PASS_ONLY");
    expect(board.zone1).toHaveLength(0);
  });

  it("a game in both lanes appears once, in Zone 1 (plays win the game)", () => {
    const board = composeDoctrineBoard({
      state: stateFixture({
        publishedToday: [
          { gameId: "g1", matchup: "PIT @ CIN", market: "UNDER 44", confidence: 80, status: "OFFICIAL" },
        ],
        gatedTodayRows: [{ gameId: "g1", matchup: "PIT @ CIN", gateReason: "stale" }],
      }),
      passes: passesFixture([{ gameId: "g1", matchup: "PIT @ CIN", reason: "duplicate" }]),
      viewerCanSeeSelection: false,
    });
    expect(board.zone1).toHaveLength(1);
    expect(board.zone2).toHaveLength(0);
  });

  it("Zone 2 dedupes by game across the gated lane and the pass list", () => {
    const board = composeDoctrineBoard({
      state: stateFixture({
        gatedTodayRows: [{ gameId: "g1", matchup: "A @ B", gateReason: "first reason" }],
      }),
      passes: passesFixture([
        { gameId: "g1", matchup: "A @ B", reason: "second reason" },
        { gameId: "g2", matchup: "C @ D", reason: "another reason" },
      ]),
      viewerCanSeeSelection: false,
    });
    expect(board.zone2).toHaveLength(2);
    expect(board.zone2[0]?.reason).toBe("first reason");
  });

  it("gated rows without a reason still render a plain-language fallback", () => {
    const board = composeDoctrineBoard({
      state: stateFixture({
        gatedTodayRows: [{ gameId: "g1", matchup: "A @ B", gateReason: null }],
      }),
      passes: null,
      viewerCanSeeSelection: false,
    });
    expect(board.zone2[0]?.reason).toBe("We haven't scored this game yet.");
  });
});