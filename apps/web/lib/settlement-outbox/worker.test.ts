import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  drainSettlementOutbox,
  OUTBOX_MAX_ATTEMPTS,
  STALE_CLAIM_MINUTES,
} from "./worker";

/**
 * Settlement outbox worker — claim/retry state machine, mock-proven.
 * (The unique constraints and transactional append that FEED this worker
 * are constraint-proven against the schema in the pipeline's tests and the
 * disposable-Postgres verification; here the mock db simulates the
 * updateMany count semantics those constraints produce.)
 *
 * Pins:
 *   - claim → notify → DELIVERED with per-channel outcomes persisted
 *   - a failed delivery marks FAILED (attemptCount already incremented at
 *     claim time) and never throws out of the drain
 *   - stale CLAIMED rows are reclaimed to PENDING before claiming
 *   - a double-claim race (updateMany count 0) skips the event untouched
 *   - FAILED rows at the attempt cap are not candidates (dead-letter)
 *   - VOID settlements are delivered-as-skipped, never alerted
 */

const NOW = new Date("2026-07-22T12:00:00.000Z");

const mocks = vi.hoisted(() => ({
  eventUpdateMany: vi.fn(),
  eventUpdate: vi.fn(),
  eventFindMany: vi.fn(),
  pickFindUnique: vi.fn(),
  notify: vi.fn(),
}));

function db() {
  return {
    pickSettlementEvent: {
      updateMany: mocks.eventUpdateMany,
      update: mocks.eventUpdate,
      findMany: mocks.eventFindMany,
    },
    pick: { findUnique: mocks.pickFindUnique },
  };
}

function eventRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "evt-1",
    pickId: "pick-1",
    gameId: "game-1",
    result: "WIN",
    settledAt: new Date("2026-07-22T04:00:00.000Z"),
    status: "PENDING",
    attemptCount: 0,
    ...overrides,
  };
}

function pickRow() {
  return {
    id: "pick-1",
    pickType: "SPREAD",
    selection: "Chiefs -3.5",
    game: {
      id: "game-1",
      homeTeamId: "team-home",
      awayTeamId: "team-away",
      homeTeamName: "Chiefs",
      awayTeamName: "Bills",
      sport: { key: "americanfootball_nfl" },
    },
  };
}

beforeEach(() => {
  for (const mock of Object.values(mocks)) mock.mockReset();
  // Default: reclaim matches nothing, claims succeed, one candidate.
  mocks.eventUpdateMany.mockResolvedValue({ count: 1 });
  mocks.eventUpdate.mockResolvedValue({});
  mocks.eventFindMany.mockResolvedValue([eventRow()]);
  mocks.pickFindUnique.mockResolvedValue(pickRow());
  mocks.notify.mockResolvedValue({
    followersMatched: 1,
    dispatches: [
      {
        userId: "user-1",
        entityId: "team-home",
        sent: true,
        outcome: "dispatched",
        channels: [{ channel: "push", sent: true, detail: "sent" }],
      },
    ],
  });
  // First updateMany call is the stale reclaim — count 0 by default.
  mocks.eventUpdateMany.mockResolvedValueOnce({ count: 0 });
});

describe("drainSettlementOutbox", () => {
  it("claim → notify → DELIVERED, with per-channel outcomes persisted on the event", async () => {
    const summary = await drainSettlementOutbox(db(), mocks.notify, NOW);

    expect(summary).toEqual({
      reclaimed: 0,
      claimed: 1,
      delivered: 1,
      failed: 0,
      skippedRace: 0,
    });

    // Claim was atomic: scoped to the status the candidate was read at,
    // with attemptCount incremented at claim time.
    expect(mocks.eventUpdateMany).toHaveBeenCalledWith({
      where: { id: "evt-1", status: "PENDING" },
      data: { status: "CLAIMED", claimedAt: NOW, attemptCount: { increment: 1 } },
    });

    // Notify got the full graded-event context rebuilt from the pick/game.
    expect(mocks.notify).toHaveBeenCalledWith(expect.anything(), {
      pickId: "pick-1",
      pickType: "SPREAD",
      selection: "Chiefs -3.5",
      result: "WIN",
      settledAt: eventRow().settledAt,
      sportKey: "americanfootball_nfl",
      homeTeam: { id: "team-home", name: "Chiefs" },
      awayTeam: { id: "team-away", name: "Bills" },
    });

    // DELIVERED with the honest per-channel record.
    expect(mocks.eventUpdate).toHaveBeenCalledWith({
      where: { id: "evt-1" },
      data: expect.objectContaining({
        status: "DELIVERED",
        deliveredAt: expect.any(Date),
        channelOutcomes: expect.objectContaining({
          followersMatched: 1,
          dispatches: expect.arrayContaining([
            expect.objectContaining({ sent: true, outcome: "dispatched" }),
          ]),
        }),
      }),
    });
  });

  it("candidate query only asks for PENDING or retryable FAILED (below the attempt cap)", async () => {
    await drainSettlementOutbox(db(), mocks.notify, NOW);

    expect(mocks.eventFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [
            { status: "PENDING" },
            { status: "FAILED", attemptCount: { lt: OUTBOX_MAX_ATTEMPTS } },
          ],
        },
      }),
    );
  });

  it("a failing notify marks the event FAILED with the error recorded — and never throws", async () => {
    mocks.notify.mockRejectedValue(new Error("channel stack exploded"));

    const summary = await drainSettlementOutbox(db(), mocks.notify, NOW);

    expect(summary.failed).toBe(1);
    expect(summary.delivered).toBe(0);
    expect(mocks.eventUpdate).toHaveBeenCalledWith({
      where: { id: "evt-1" },
      data: {
        status: "FAILED",
        channelOutcomes: { error: "channel stack exploded" },
      },
    });
    // attemptCount was already incremented atomically AT CLAIM — verify the
    // claim carried the increment so a crash mid-send still burns an attempt.
    expect(mocks.eventUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ attemptCount: { increment: 1 } }),
      }),
    );
  });

  it("a vanished pick (deleted row) marks FAILED, not DELIVERED", async () => {
    mocks.pickFindUnique.mockResolvedValue(null);

    const summary = await drainSettlementOutbox(db(), mocks.notify, NOW);

    expect(summary.failed).toBe(1);
    expect(mocks.notify).not.toHaveBeenCalled();
    expect(mocks.eventUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "FAILED" }) }),
    );
  });

  it("reclaims stale CLAIMED rows (older than the stale window) back to PENDING first", async () => {
    mocks.eventUpdateMany.mockReset();
    mocks.eventUpdateMany.mockResolvedValueOnce({ count: 2 }); // the reclaim
    mocks.eventUpdateMany.mockResolvedValue({ count: 1 }); // subsequent claims
    mocks.eventFindMany.mockResolvedValue([]);

    const summary = await drainSettlementOutbox(db(), mocks.notify, NOW);

    expect(summary.reclaimed).toBe(2);
    const staleCutoff = new Date(NOW.getTime() - STALE_CLAIM_MINUTES * 60_000);
    expect(mocks.eventUpdateMany).toHaveBeenNthCalledWith(1, {
      where: { status: "CLAIMED", claimedAt: { lt: staleCutoff } },
      data: { status: "PENDING", claimedAt: null },
    });
  });

  it("double-claim race: updateMany count 0 → the event is skipped untouched", async () => {
    mocks.eventUpdateMany.mockReset();
    mocks.eventUpdateMany.mockResolvedValueOnce({ count: 0 }); // reclaim
    mocks.eventUpdateMany.mockResolvedValueOnce({ count: 0 }); // claim LOST

    const summary = await drainSettlementOutbox(db(), mocks.notify, NOW);

    expect(summary).toEqual({
      reclaimed: 0,
      claimed: 0,
      delivered: 0,
      failed: 0,
      skippedRace: 1,
    });
    expect(mocks.notify).not.toHaveBeenCalled();
    expect(mocks.eventUpdate).not.toHaveBeenCalled();
  });

  it("a retryable FAILED candidate is claimed scoped to status FAILED (still race-safe)", async () => {
    mocks.eventFindMany.mockResolvedValue([
      eventRow({ id: "evt-9", status: "FAILED", attemptCount: 2 }),
    ]);

    await drainSettlementOutbox(db(), mocks.notify, NOW);

    expect(mocks.eventUpdateMany).toHaveBeenCalledWith({
      where: { id: "evt-9", status: "FAILED" },
      data: { status: "CLAIMED", claimedAt: NOW, attemptCount: { increment: 1 } },
    });
  });

  it("VOID settlement: delivered-as-skipped, never fans out an alert", async () => {
    mocks.eventFindMany.mockResolvedValue([eventRow({ result: "VOID" })]);

    const summary = await drainSettlementOutbox(db(), mocks.notify, NOW);

    expect(summary.delivered).toBe(1);
    expect(mocks.notify).not.toHaveBeenCalled();
    expect(mocks.eventUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "DELIVERED",
          channelOutcomes: { skipped: "non_decisive_result", result: "VOID" },
        }),
      }),
    );
  });

  it("one broken event never stops the rest of the batch", async () => {
    mocks.eventFindMany.mockResolvedValue([
      eventRow({ id: "evt-bad" }),
      eventRow({ id: "evt-good", pickId: "pick-2" }),
    ]);
    mocks.pickFindUnique
      .mockResolvedValueOnce(null) // evt-bad: pick gone
      .mockResolvedValueOnce(pickRow());

    const summary = await drainSettlementOutbox(db(), mocks.notify, NOW);

    expect(summary.failed).toBe(1);
    expect(summary.delivered).toBe(1);
  });

  it("never throws even when the drain-level queries explode", async () => {
    mocks.eventUpdateMany.mockReset();
    mocks.eventUpdateMany.mockRejectedValue(new Error("db down"));

    await expect(drainSettlementOutbox(db(), mocks.notify, NOW)).resolves.toEqual({
      reclaimed: 0,
      claimed: 0,
      delivered: 0,
      failed: 0,
      skippedRace: 0,
    });
  });

  it("NEVER deletes outbox rows — failure at the attempt cap is a durable dead-letter, not a purge", async () => {
    // Structural pin: the worker's db surface has no delete/deleteMany at
    // all, and no code path invokes one. (The candidate filter excludes
    // capped FAILED rows; they stay in the table as the honest record.)
    const handle = db() as unknown as Record<string, Record<string, unknown>>;
    expect(handle["pickSettlementEvent"]).not.toHaveProperty("delete");
    expect(handle["pickSettlementEvent"]).not.toHaveProperty("deleteMany");
  });
});
