import { describe, expect, it, vi } from "vitest";
import {
  SUPERSEDE_EVENT_SCHEMA_VERSION,
  SUPERSEDED_UNPUBLISHED_RCA_CODE,
  supersedeUnpublishedPendingPick,
  type SupersedeDb,
  type SupersedeTx,
} from "../supersede-unpublished-pick.js";

/**
 * Unit tests for the mint-side supersede void (lane B, 2026-09-20): the write
 * loop's remedy for an UNPUBLISHED PENDING slot-holder. Pins the outbox
 * contract: PENDING+unpublished-scoped void, one PickSettlementEvent with the
 * RCA code, the same post-settlement rows the zero-sit void appends, and
 * write-nothing idempotence when a racing lane wins.
 */

const ARGS = {
  pickId: "pick-stale",
  gameId: "game-1",
  sportKey: "americanfootball_nfl",
  pickType: "SPREAD",
  supersededSelection: "Atlanta Falcons -1.5",
  supersededBySelection: "Carolina Panthers -2.5",
} as const;

function makeHarness(updateCount = 1, opts: { withUpsert?: boolean } = {}) {
  const pickUpdateMany = vi.fn().mockResolvedValue({ count: updateCount });
  const pickSettlementEventCreate = vi.fn().mockResolvedValue({});
  const pickSettlementEventUpsert = vi.fn().mockResolvedValue({});
  const postSettlementWorkCreateMany = vi.fn().mockResolvedValue({ count: 2 });
  const eventDelegate = opts.withUpsert
    ? { create: pickSettlementEventCreate, upsert: pickSettlementEventUpsert }
    : { create: pickSettlementEventCreate };
  const tx = {
    pick: { updateMany: pickUpdateMany },
    pickSettlementEvent: eventDelegate,
    postSettlementWork: { createMany: postSettlementWorkCreateMany },
  };
  const db: SupersedeDb = {
    $transaction: async <T,>(fn: (tx: SupersedeTx) => Promise<T>) => fn(tx as unknown as SupersedeTx),
  };
  return { db, tx, pickUpdateMany, pickSettlementEventCreate, pickSettlementEventUpsert, postSettlementWorkCreateMany };
}

describe("supersedeUnpublishedPendingPick", () => {
  it("voids the unpublished PENDING row through the outbox, stamps the RCA event, and returns true", async () => {
    const h = makeHarness(1);

    const result = await supersedeUnpublishedPendingPick(h.db, ARGS);

    expect(result).toBe(true);
    // The void is scoped to PENDING AND unpublished: a graded, already-voided
    // or republished row matches zero rows and nothing is written.
    expect(h.pickUpdateMany).toHaveBeenCalledTimes(1);
    expect(h.pickUpdateMany).toHaveBeenCalledWith({
      where: { id: "pick-stale", result: "PENDING", isPublished: false },
      data: { result: "VOID", settledAt: expect.any(Date) },
    });

    // TRANSACTIONAL OUTBOX: one VOID event carrying the RCA code.
    expect(h.pickSettlementEventCreate).toHaveBeenCalledTimes(1);
    const event = h.pickSettlementEventCreate.mock.calls[0]?.[0] as
      | { data: Record<string, unknown> }
      | undefined;
    if (!event) throw new Error("pickSettlementEvent.create was not called");
    expect(event.data).toMatchObject({
      pickId: "pick-stale",
      gameId: "game-1",
      result: "VOID",
      status: "PENDING",
      payload: {
        schemaVersion: SUPERSEDE_EVENT_SCHEMA_VERSION,
        kind: "SUPERSEDE_VOID",
        lane: "mint-supersede",
        result: "VOID",
        rcaCode: SUPERSEDED_UNPUBLISHED_RCA_CODE,
        pickId: "pick-stale",
        gameId: "game-1",
        sportKey: "americanfootball_nfl",
        pickType: "SPREAD",
        supersededSelection: "Atlanta Falcons -1.5",
        supersededBySelection: "Carolina Panthers -2.5",
        settledWith: { homeScore: null, awayScore: null, sources: [], path: "mint-supersede" },
      },
    });

    // Same post-settlement rows the zero-sit void appends.
    expect(h.postSettlementWorkCreateMany).toHaveBeenCalledTimes(1);
    expect(h.postSettlementWorkCreateMany).toHaveBeenCalledWith({
      data: [
        { subjectId: "pick-stale", kind: "CLV_GRADE" },
        { subjectId: "pick-stale", kind: "SNAPSHOT_OUTCOME" },
      ],
      skipDuplicates: true,
    });
  });

  it("writes nothing when the row left PENDING+unpublished before the scoped void (race lost)", async () => {
    const h = makeHarness(0);

    const result = await supersedeUnpublishedPendingPick(h.db, ARGS);

    // A settle/void lane won: the row is no longer ours to void, and the
    // helper is idempotent — no event, no post-settlement work, nothing.
    expect(result).toBe(false);
    expect(h.pickSettlementEventCreate).not.toHaveBeenCalled();
    expect(h.postSettlementWorkCreateMany).not.toHaveBeenCalled();
  });

  it("upserts (never create-throws) when the pick already owns an event row from an earlier void", async () => {
    // Regression for the hourly FAILED basketball_nba ingestion run: a slot
    // holder voided, re-opened to PENDING by a later lane and voided again still
    // owns its first PickSettlementEvent, so create() threw P2002 and rolled the
    // whole mint transaction back.
    const h = makeHarness(1, { withUpsert: true });
    h.pickSettlementEventCreate.mockRejectedValue(
      Object.assign(new Error("Unique constraint failed on the fields: (`pickId`)"), { code: "P2002" }),
    );

    const result = await supersedeUnpublishedPendingPick(h.db, ARGS);

    expect(result).toBe(true);
    expect(h.pickSettlementEventCreate).not.toHaveBeenCalled();
    expect(h.pickSettlementEventUpsert).toHaveBeenCalledTimes(1);
    const call = h.pickSettlementEventUpsert.mock.calls[0]?.[0] as
      | { where: { pickId: string }; create: Record<string, unknown>; update: Record<string, unknown> }
      | undefined;
    if (!call) throw new Error("pickSettlementEvent.upsert was not called");
    expect(call.where).toEqual({ pickId: "pick-stale" });
    expect(call.create).toMatchObject({ pickId: "pick-stale", result: "VOID", status: "PENDING" });
    // Reset to PENDING with cleared delivery stamps so the outbox re-announces
    // the current void rather than a stale delivered receipt.
    expect(call.update).toMatchObject({
      result: "VOID",
      status: "PENDING",
      claimedAt: null,
      deliveredAt: null,
      completedAt: null,
    });
  });
});
