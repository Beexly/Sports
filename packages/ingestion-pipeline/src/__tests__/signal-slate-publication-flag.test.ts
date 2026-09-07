import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * C-92: A SLATE REFRESH MUST NOT RE-PUBLISH WHAT AN OPERATOR WITHDREW.
 *
 * `isPublished` used to sit in the payload shared by the create and the update,
 * so every slate run rewrote the flag on every existing PENDING row. An
 * operator who unpublished a live pick - because it was wrong, or corrupt, or
 * on a line no book quotes - had it silently re-published by the next run.
 * Measured read-only on production 2026-09-07: 70 published PENDING moneylines
 * are subject to that path today.
 *
 * The obvious fix, writing the flag on create only, is the WRONG one, and this
 * suite pins why: it would also remove the gate's power to CLOSE.
 * `canExposePublicPicks` is an honesty boundary, and when it goes false, rows
 * that are live have to stop being live.
 *
 * So the write is one-directional, and both directions are asserted here.
 * The DB is mocked (the generate-signal-slate-guard.test.ts pattern).
 */

const mocks = vi.hoisted(() => ({
  gameFindMany: vi.fn<() => Promise<unknown[]>>(),
  gameUpdate: vi.fn<(args: unknown) => Promise<unknown>>(),
  pickFindUnique: vi.fn<(args: unknown) => Promise<unknown>>(),
  pickUpdateMany: vi.fn<(args: unknown) => Promise<{ count: number }>>(),
  pickCreate: vi.fn<(args: unknown) => Promise<unknown>>(),
  buildIndependents: vi.fn<() => Promise<unknown[]>>(),
  canExpose: { value: true },
}));

vi.mock("@sports/db", () => ({
  db: {
    game: { findMany: mocks.gameFindMany, update: mocks.gameUpdate, count: vi.fn(async () => 1) },
    pick: { findUnique: mocks.pickFindUnique, updateMany: mocks.pickUpdateMany, create: mocks.pickCreate },
  },
}));

vi.mock("@sports/prediction-engine", () => ({
  getReadinessGates: () => ({
    canExposePublicPicks: mocks.canExpose.value,
    canPersistCanonicalHistory: true,
  }),
  MODEL_VERSION: "vtest",
  MIN_PUBLISH_CONFIDENCE: 50,
  PREMIUM_CONFIDENCE_THRESHOLD: 70,
}));

vi.mock("../build-independent-fair-values.js", () => ({
  buildIndependentFairValues: mocks.buildIndependents,
}));

import { generateSignalSlate, SIGNAL_SELECTION_SUFFIX } from "../generate-signal-slate.js";

const NOW = new Date("2026-09-05T15:00:00.000Z");
const GAME = {
  id: "game-1",
  homeTeamName: "Cincinnati Bearcats",
  awayTeamName: "Boston College Eagles",
  commenceTime: new Date("2026-09-05T19:30:00.000Z"),
  createdAt: new Date("2026-09-01T10:00:00.000Z"),
  sport: { key: "americanfootball_ncaaf", name: "NCAAF" },
};

const CFB_BOARD = {
  events: [
    {
      id: "402",
      date: "2026-09-05T19:30Z",
      status: { type: { state: "pre", completed: false } },
      competitions: [{ competitors: [
        { homeAway: "home", team: { displayName: "Cincinnati Bearcats" } },
        { homeAway: "away", team: { displayName: "Boston College Eagles" } },
      ] }],
    },
  ],
};

const espnFetch = vi.fn<(url: string) => Promise<Response>>();

function runSlate() {
  return generateSignalSlate({ now: NOW, skipSeed: true, fetchImpl: espnFetch as unknown as typeof fetch });
}

/** The row an operator has already withdrawn: still PENDING, no longer public. */
function withdrawnSignalRow() {
  return {
    id: "pick-withdrawn",
    result: "PENDING",
    selection: `Cincinnati Bearcats ML ${SIGNAL_SELECTION_SUFFIX}`,
    bookmakerCount: 0,
  };
}

function updateData(): Record<string, unknown> {
  const call = mocks.pickUpdateMany.mock.calls[0]?.[0] as { data: Record<string, unknown> };
  return call.data;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.canExpose.value = true;
  espnFetch.mockImplementation(async () =>
    new Response(JSON.stringify(CFB_BOARD), { status: 200, headers: { "content-type": "application/json" } }),
  );
  mocks.gameFindMany.mockResolvedValue([GAME]);
  mocks.gameUpdate.mockResolvedValue({});
  mocks.pickUpdateMany.mockResolvedValue({ count: 1 });
  mocks.pickCreate.mockResolvedValue({});
  mocks.buildIndependents.mockResolvedValue([
    { source: "espn_powerindex", homeFairProb: 0.68, awayFairProb: 0.32, capturedAt: NOW.toISOString() },
  ]);
});

describe("generate-signal-slate publication flag (C-92)", () => {
  it("does NOT touch isPublished on a refresh while the gate is open", async () => {
    // The defect. With the flag in the shared payload this update carried
    // isPublished:true, so the next slate run undid the operator's withdrawal.
    mocks.pickFindUnique.mockResolvedValue(withdrawnSignalRow());

    await runSlate();

    expect(mocks.pickUpdateMany).toHaveBeenCalledTimes(1);
    expect(updateData()).not.toHaveProperty("isPublished");
  });

  it("still refreshes everything else on that row, so this is not a skip", async () => {
    // The control. Simply not updating withdrawn rows would also satisfy the
    // assertion above, and would stop the slate keeping its own rows current.
    mocks.pickFindUnique.mockResolvedValue(withdrawnSignalRow());

    await runSlate();

    const data = updateData();
    expect(data.selection).toContain(SIGNAL_SELECTION_SUFFIX);
    expect(data.modelVersion).toBe("vtest");
    expect(data.generatedAt).toEqual(NOW);
  });

  it("FORCES isPublished false on a refresh when the gate is CLOSED", async () => {
    // The honesty boundary keeps its teeth. This is the case a create-only fix
    // would have broken: a live row would stay live after the gate closed.
    mocks.canExpose.value = false;
    mocks.pickFindUnique.mockResolvedValue({ ...withdrawnSignalRow(), id: "pick-live" });

    await runSlate();

    expect(updateData()).toMatchObject({ isPublished: false });
  });

  it("KNOWN LIMITATION: a gate reopening does NOT restore rows the gate hid (C-158)", async () => {
    // This test asserts a GAP, not a desired behaviour, and it exists so the
    // gap cannot go quiet (Devin Review, #719).
    //
    // One-directional writes mean gate recovery does not republish. A pick is
    // unique per (gameId, pickType), so no new row can replace a hidden one
    // either: it stays hidden for the rest of its life.
    //
    // Accepted because the two failures are not symmetric - the old behaviour
    // re-published picks an operator had withdrawn for being wrong, which
    // publishes a known falsehood, while this publishes less than it could.
    // Fixing both needs a provenance column to tell "hidden by the gate" from
    // "withdrawn by an operator", and isPublished is a bare Boolean. That is a
    // schema change and therefore founder-gated.
    //
    // WHEN C-158 IS IMPLEMENTED THIS TEST SHOULD FAIL, and should be replaced
    // by one asserting that gate-suppressed rows are restored while
    // operator-withdrawn rows are not.
    mocks.canExpose.value = true;
    mocks.pickFindUnique.mockResolvedValue(withdrawnSignalRow());

    await runSlate();

    expect(mocks.pickUpdateMany).toHaveBeenCalledTimes(1);
    expect(updateData()).not.toHaveProperty("isPublished");
  });

  it("on CREATE the gate decides outright, in both directions", async () => {
    // No prior operator judgement exists on a new row, so the flag is simply
    // the gate's value - asserted both ways so neither direction can rot.
    mocks.pickFindUnique.mockResolvedValue(null);
    await runSlate();
    expect((mocks.pickCreate.mock.calls[0]?.[0] as { data: Record<string, unknown> }).data)
      .toMatchObject({ isPublished: true });

    vi.clearAllMocks();
    mocks.canExpose.value = false;
    espnFetch.mockImplementation(async () =>
      new Response(JSON.stringify(CFB_BOARD), { status: 200, headers: { "content-type": "application/json" } }),
    );
    mocks.gameFindMany.mockResolvedValue([GAME]);
    mocks.gameUpdate.mockResolvedValue({});
    mocks.pickCreate.mockResolvedValue({});
    mocks.buildIndependents.mockResolvedValue([
      { source: "espn_powerindex", homeFairProb: 0.68, awayFairProb: 0.32, capturedAt: NOW.toISOString() },
    ]);
    mocks.pickFindUnique.mockResolvedValue(null);
    await runSlate();
    expect((mocks.pickCreate.mock.calls[0]?.[0] as { data: Record<string, unknown> }).data)
      .toMatchObject({ isPublished: false });
  });
});
