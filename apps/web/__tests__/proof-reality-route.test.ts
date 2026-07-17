/**
 * /api/proof/reality/[gameId] + its /image sibling — Reality Receipt v0 (W003).
 * Executed against the REAL loader (`loadRealityReceipt`, mocked db) so the
 * route-level honesty mapping (found / no-decision / not-found / outage) and
 * the anchor composition (NOT_REQUESTED / NOT_MIGRATED / PENDING /
 * BITCOIN_ATTESTED / UNAVAILABLE) are exercised end to end, not just unit by
 * unit.
 */
import { createHash } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildDetachedOts, emptyNode, serializeDetached } from "@sports/crypto";

const mocks = vi.hoisted(() => ({
  gameFindUnique: vi.fn<(args: unknown) => Promise<unknown>>(),
  slateFindUnique: vi.fn<(args: unknown) => Promise<unknown>>(),
}));

vi.mock("@sports/db", () => ({
  db: {
    game: { findUnique: mocks.gameFindUnique },
    slateCommitment: { findUnique: mocks.slateFindUnique },
  },
}));

import { GET as getReceipt } from "@/app/api/proof/reality/[gameId]/route";
import { GET as getImage } from "@/app/api/proof/reality/[gameId]/image/route";

const ROOT = "d6b1e5a03a7b0d38fc9d4bce23a3d3bd7e0e33ad9c3ec25b5f0ba8c1c243c1f1";

// Committed values MUST agree with the canonical payload string.
const PAYLOAD =
  "asOf=2026-07-14T16:00:00.000Z|confidence=78|edgeScore=71|entryOdds=-110|line=-3.5|marketFairProb=0.52|modelProb=none|modelVersion=gse-v6|selection=Home -3.5";

function sha256Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

const SNAPSHOT = {
  id: "snap-1",
  capturedAt: new Date("2026-07-14T16:00:00.000Z"),
  hadOddsSignal: true,
  hadLineMovementSignal: false,
  hadRestSignal: false,
  hadScheduleSignal: false,
  hadAtsFormSignal: false,
  hadH2HSignal: false,
  hadVenueSignal: false,
  hadWeatherSignal: false,
  hadInjurySignal: false,
  hadRatingsSignal: false,
  hadPlayerSignal: false,
  hadOfficialsSignal: false,
  hadVenueEnvironmentSignal: false,
  hadPaceSignal: false,
  hadMilestoneSignal: false,
  bookmakerCount: 2,
  dataQualityScore: 64,
  modelVersion: "gse-v6",
  confidenceAtPrediction: 78,
  isBootstrap: false,
};

function gameFixture(opts: { commenceTime: Date; slateKey?: string | null } = { commenceTime: new Date("2026-07-14T20:00:00.000Z") }) {
  return {
    id: "game-1",
    homeTeamName: "Home",
    awayTeamName: "Away",
    commenceTime: opts.commenceTime,
    lineMovementSpread: -0.5,
    lineMovementTotal: null,
    sport: { name: "NFL" },
    picks: [
      {
        id: "pick-1",
        selection: "Home -3.5",
        pickType: "SPREAD",
        line: -3.5,
        confidence: 78,
        tier: "FREE",
        edgeScore: 71,
        bookmakerCount: 2,
        reasoningShort: "Market evidence cleared the gate.",
        modelVersion: "gse-v6",
        dataFreshnessAt: new Date("2026-07-14T16:00:00.000Z"),
        isPublished: true,
        isBootstrap: false,
        result: "PENDING",
        settledAt: null,
        generatedAt: new Date("2026-07-14T16:05:00.000Z"),
        signalSnapshot: SNAPSHOT,
        lossAutopsy: null,
        clvKind: null,
        clvValue: null,
        clvVerdict: null,
        clvCapturedAt: null,
        proofReceipt: {
          id: "receipt-1",
          pickId: "pick-1",
          payload: PAYLOAD,
          contentHash: sha256Hex(`leaf:pick-1:${PAYLOAD}`),
          marketFairProb: 0.52,
          confidence: 78,
          edgeScore: 71,
          modelProb: null,
          entryOdds: -110,
          line: -3.5,
          modelVersion: "gse-v6",
          asOf: new Date("2026-07-14T16:00:00.000Z"),
          frozenAt: new Date("2026-07-14T16:00:00.000Z"),
          slateKey: opts.slateKey === undefined ? "NFL:2026-07-14" : opts.slateKey,
        },
      },
    ],
    gateDecisions: [
      {
        id: "gate-1",
        pickId: "pick-1",
        status: "PUBLISHED",
        reason: "The governed edge floor cleared.",
        reasonCode: "EDGE_CLEARED",
        edgeIndex: 71,
        confidence: 78,
        modelVersion: "gse-v6",
        evaluatedAt: new Date("2026-07-14T16:05:00.000Z"),
        evidenceRefs: { boundary: { metric: "edgeIndex", observedValue: 71, threshold: 65, crossed: true } },
      },
    ],
    odds: [
      {
        id: "odds-1",
        ingestionRunId: "run-1",
        bookmaker: "book-a",
        market: "SPREADS",
        fetchedAt: new Date("2026-07-14T16:00:00.000Z"),
        spread: -3.5,
        total: null,
        homePrice: null,
        awayPrice: null,
        ingestionRun: { status: "SUCCESS", sourceSnapshots: [] },
      },
    ],
    gameSignals: [],
  };
}

function call(gameId: string): Promise<Response> {
  return getReceipt(new Request(`https://x.test/api/proof/reality/${gameId}`), {
    params: Promise.resolve({ gameId }),
  }) as Promise<Response>;
}

function callImage(gameId: string): Promise<Response> {
  return getImage(new Request(`https://x.test/api/proof/reality/${gameId}/image`), {
    params: Promise.resolve({ gameId }),
  }) as Promise<Response>;
}

afterEach(() => {
  mocks.gameFindUnique.mockReset();
  mocks.slateFindUnique.mockReset();
});

describe("GET /api/proof/reality/[gameId]", () => {
  it("no such game -> 404, not a fabricated empty receipt", async () => {
    mocks.gameFindUnique.mockResolvedValue(null);
    const res = await call("nope");
    expect(res.status).toBe(404);
    const body = (await res.json()) as { found: boolean; reason: string };
    expect(body.found).toBe(false);
    expect(body.reason).toMatch(/no such game/i);
  });

  it("game exists, no picks/gate recorded -> 404 NO_DECISION, distinct from not-found", async () => {
    const game = gameFixture();
    game.picks = [];
    game.gateDecisions = [];
    mocks.gameFindUnique.mockResolvedValue(game);
    const res = await call("game-1");
    expect(res.status).toBe(404);
    const body = (await res.json()) as { reason: string };
    expect(body.reason).toMatch(/no recorded decision/i);
  });

  it("DB outage -> 503, never reported as absence", async () => {
    mocks.gameFindUnique.mockRejectedValue(new Error("connection reset"));
    const res = await call("game-1");
    expect(res.status).toBe(503);
  });

  it("SEALED pre-kickoff: envelope digest + receipt state present, no committed fields, no anchor requested (no slateKey)", async () => {
    mocks.gameFindUnique.mockResolvedValue(gameFixture({ commenceTime: new Date("2026-12-31T20:00:00.000Z"), slateKey: null }));
    const res = await call("game-1");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { found: boolean; receipt: Record<string, unknown> };
    expect(body.found).toBe(true);
    expect(body.receipt["schemaVersion"]).toBe("reality-receipt/v0");
    const receipt = body.receipt["receipt"] as { state: string };
    expect(receipt.state).toBe("SEALED");
    expect(receipt).not.toHaveProperty("committed");
    expect(body.receipt["anchor"]).toEqual({ state: "NOT_REQUESTED" });
    expect(mocks.slateFindUnique).not.toHaveBeenCalled();
  });

  it("Bitcoin-attested anchor surfaces the block height", async () => {
    const node = emptyNode();
    node.attestations.push({ kind: "bitcoin", height: 905432 });
    const bytes = serializeDetached({ digestHex: ROOT, root: node });
    mocks.gameFindUnique.mockResolvedValue(gameFixture({ commenceTime: new Date("2026-12-31T20:00:00.000Z") }));
    mocks.slateFindUnique.mockResolvedValue({ otsProof: bytes });

    const res = await call("game-1");
    const body = (await res.json()) as { receipt: { anchor: { state: string; bitcoinBlockHeights: number[] } } };
    expect(body.receipt.anchor.state).toBe("BITCOIN_ATTESTED");
    expect(body.receipt.anchor.bitcoinBlockHeights).toEqual([905432]);
  });

  it("a pending (not yet Bitcoin-attested) anchor is reported honestly, never claimed early", async () => {
    const bytes = buildDetachedOts(ROOT, ["https://alice.btc.calendar.opentimestamps.org"]);
    mocks.gameFindUnique.mockResolvedValue(gameFixture({ commenceTime: new Date("2026-12-31T20:00:00.000Z") }));
    mocks.slateFindUnique.mockResolvedValue({ otsProof: bytes });

    const res = await call("game-1");
    const body = (await res.json()) as { receipt: { anchor: { state: string } } };
    expect(body.receipt.anchor.state).toBe("PENDING");
  });

  it("unmigrated OTS columns degrade to NOT_MIGRATED, never a crash", async () => {
    mocks.gameFindUnique.mockResolvedValue(gameFixture({ commenceTime: new Date("2026-12-31T20:00:00.000Z") }));
    mocks.slateFindUnique.mockRejectedValue(new Error("The column `slate_commitments.otsProof` does not exist"));

    const res = await call("game-1");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { receipt: { anchor: { state: string } } };
    expect(body.receipt.anchor.state).toBe("NOT_MIGRATED");
  });

  it("an anchor-subsystem outage is UNAVAILABLE, not a false NO_PROOF, and never fails the whole receipt (fail-open)", async () => {
    mocks.gameFindUnique.mockResolvedValue(gameFixture({ commenceTime: new Date("2026-12-31T20:00:00.000Z") }));
    mocks.slateFindUnique.mockRejectedValue(new Error("connection reset"));

    const res = await call("game-1");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { found: boolean; receipt: { anchor: { state: string } } };
    expect(body.found).toBe(true);
    expect(body.receipt.anchor.state).toBe("UNAVAILABLE");
  });

  it("OPENs at/after kickoff and surfaces committed fields once verified", async () => {
    mocks.gameFindUnique.mockResolvedValue(gameFixture({ commenceTime: new Date("2020-01-01T20:00:00.000Z"), slateKey: null }));
    const res = await call("game-1");
    const body = (await res.json()) as { receipt: { receipt: { state: string; verified: boolean; committed: unknown } } };
    expect(body.receipt.receipt.state).toBe("OPEN");
    expect(body.receipt.receipt.verified).toBe(true);
    expect(body.receipt.receipt.committed).not.toBeNull();
  });
});

describe("GET /api/proof/reality/[gameId]/image", () => {
  it("renders a PNG for a found receipt", async () => {
    mocks.gameFindUnique.mockResolvedValue(gameFixture({ commenceTime: new Date("2026-12-31T20:00:00.000Z"), slateKey: null }));
    const res = await callImage("game-1");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/png");
  });

  it("renders an honest unavailable PNG rather than throwing when the game does not exist", async () => {
    mocks.gameFindUnique.mockResolvedValue(null);
    const res = await callImage("nope");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/png");
  });
});
