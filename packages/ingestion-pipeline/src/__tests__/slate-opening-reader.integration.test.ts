/**
 * Real-Postgres integration proof for the Phase 0.5b opener reader
 * (`planSlateOpeningFromDb`).
 *
 * The pure planner (`planSlateOpening`, @sports/crypto) is exhaustively unit
 * tested. What that CANNOT prove is the part that only exists in the query:
 * that the pending count is keyed to EXACTLY the covered set. This is the one
 * place a wrong query opens a live slate, so before the reveal gate is ever
 * flipped it must be proven against a real database — which is what this file
 * does.
 *
 * The load-bearing properties, each asserted below against real rows:
 *   1. While any covered pick is still PENDING, the reader REFUSES (not_settled).
 *   2. A MOSTLY-settled slate (one covered pick pending) still refuses — the
 *      aggregate covers the whole population.
 *   3. An UNRELATED pending pick — one on the same games but NOT stamped with
 *      this slateKey — does NOT block the slate. This is the covered-set-keying
 *      property: counting a wider set would let it block a finished slate.
 *   4. Once every covered pick carries a terminal result, the reader REVEALS an
 *      opening that genuinely reproduces the published Pedersen hex.
 *   5. A slate whose opener columns are null reads as no_opener (pre-0.5 history).
 *   6. An absent slate reads as no_opener, never a throw.
 *
 * GATED: runs only when SLATE_OPENING_PG_URL points at a DISPOSABLE Postgres
 * whose schema was pushed from this branch, AND that same URL is exported as
 * DATABASE_URL so the @sports/db singleton the reader imports is the real
 * client. Without it the whole suite is skipped — green in DB-less environments,
 * and no test fabricates a pass.
 *
 *   SLATE_OPENING_PG_URL=postgresql://postgres@127.0.0.1:54329/sports_test \
 *   DATABASE_URL=$SLATE_OPENING_PG_URL \
 *   npx vitest run src/__tests__/slate-opening-reader.integration.test.ts
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { commitLedger, encodeFixedPoint, CURVE_ORDER } from "@sports/crypto";

const PG_URL = process.env["SLATE_OPENING_PG_URL"];

// The @sports/db singleton reads DATABASE_URL at import time and falls back to a
// stub when it is unset/sentinel — and the test harness deliberately blanks
// DATABASE_URL so no suite ever hits a real database by accident. So we point
// DATABASE_URL at the disposable instance (which survives as SLATE_OPENING_PG_URL)
// and DYNAMICALLY import db + the reader inside beforeAll, after the env is set,
// so the real client initializes rather than the stub. Bound here, assigned in
// beforeAll.
type Db = typeof import("@sports/db")["db"];
type PlanFn = typeof import("../slate-opening-reader.js")["planSlateOpeningFromDb"];
let db: Db;
let planSlateOpeningFromDb: PlanFn;

/** Deterministic blinding — a fixture must not depend on a CSPRNG draw. */
function blindingFor(i: number): bigint {
  return BigInt(1_000_003 + i * 7919) % CURVE_ORDER;
}

/**
 * Mint a real Pedersen aggregate over the covered picks' edge scores, exactly
 * as `mintSlatePedersenAggregate` does (encodeFixedPoint(e, 0, 100), summed).
 * Returns the opener columns so the stored commitment genuinely opens.
 */
function mintAggregate(edgeScores: readonly number[]) {
  const values = edgeScores.map((e) => {
    const v = encodeFixedPoint(e, 0, 100);
    if (v === null) throw new Error(`edge ${e} out of range`);
    return v;
  });
  const blindings = values.map((_, i) => blindingFor(i));
  const ledger = commitLedger(values, blindings);
  if (ledger === null) throw new Error("commitLedger failed");
  return {
    hex: ledger.aggregateCommitment,
    value: ledger.aggregateValue.toString(),
    blindingSum: ledger.aggregateBlinding.toString(),
  };
}

let sportId: string;
let gameId: string;
let seq = 0;

/** Unique suffix per test so parallel/re-runs never collide on unique keys. */
function uid(): string {
  seq += 1;
  return `slot-int-${Date.now()}-${seq}`;
}

async function makeGame(): Promise<string> {
  const game = await db.game.create({
    data: {
      externalId: uid(),
      sportId,
      homeTeamName: "Chiefs",
      awayTeamName: "Broncos",
      commenceTime: new Date("2026-09-14T17:00:00.000Z"),
    },
    select: { id: true },
  });
  return game.id;
}

interface SeededPick {
  edgeScore: number;
  result: "PENDING" | "WIN" | "LOSS" | "PUSH" | "VOID";
  /** slateKey to stamp on the receipt, or null to leave it unstamped/unrelated. */
  slateKey: string | null;
  /** Share an existing game (with a distinct pickType) instead of minting one. */
  gameId?: string;
  pickType?: "SPREAD" | "MONEYLINE" | "TOTAL";
}

/**
 * Seed picks + receipts. The real schema enforces ONE pick per (game, pickType)
 * — a fact the unit tests could not see — so each seeded pick gets its own
 * game. The covered-set property under test is keyed off the receipt's
 * slateKey stamp, not the game, so per-pick games change nothing it asserts.
 */
async function seedPicks(_gid: string, picks: readonly SeededPick[]): Promise<string[]> {
  const gameIds: string[] = [];
  for (const p of picks) {
    const ownGame = p.gameId ?? (await makeGame());
    gameIds.push(ownGame);
    const pick = await db.pick.create({
      data: {
        gameId: ownGame,
        pickType: p.pickType ?? "SPREAD",
        selection: "Chiefs -3",
        line: -3,
        confidence: 60,
        edgeScore: p.edgeScore,
        reasoning: "integration fixture",
        modelVersion: "v5.1.0",
        result: p.result,
      },
      select: { id: true },
    });
    await db.pickProofReceipt.create({
      data: {
        pickId: pick.id,
        payload: "{}",
        contentHash: uid(),
        marketFairProb: 0.5,
        confidence: 60,
        edgeScore: p.edgeScore,
        entryOdds: -110,
        line: -3,
        modelVersion: "v5.1.0",
        asOf: new Date("2026-09-14T12:00:00.000Z"),
        slateKey: p.slateKey,
      },
    });
  }
  return gameIds;
}

/**
 * Create a SlateCommitment row; opener columns null unless minted.
 * MUST be created before receipts are stamped with its slateKey — the FK on
 * pickProofReceipt.slateKey enforces the same ordering the production freeze
 * transaction uses (commitment row + receipt stamps in one $transaction).
 */
async function makeSlate(
  slateKey: string,
  count: number,
  opener: { hex: string; value: string; blindingSum: string } | null,
): Promise<void> {
  await db.slateCommitment.create({
    data: {
      slateKey,
      root: "deadbeef".repeat(8),
      count,
      committedAt: new Date("2026-09-14T12:00:00.000Z"),
      pedersenAggregateHex: opener?.hex ?? null,
      pedersenAggregateValue: opener?.value ?? null,
      pedersenBlindingSum: opener?.blindingSum ?? null,
    },
  });
}

describe.skipIf(!PG_URL)("planSlateOpeningFromDb against real Postgres", () => {
  beforeAll(async () => {
    process.env["DATABASE_URL"] = PG_URL;
    process.env["DIRECT_URL"] = PG_URL;
    process.env["FORCE_REAL_PRISMA"] = "true";
    ({ db } = await import("@sports/db"));
    ({ planSlateOpeningFromDb } = await import("../slate-opening-reader.js"));

    const sport = await db.sport.upsert({
      where: { key: "americanfootball_nfl" },
      create: { key: "americanfootball_nfl", name: "NFL", displayName: "National Football League" },
      update: {},
      select: { id: true },
    });
    sportId = sport.id;
  });

  beforeEach(async () => {
    gameId = await makeGame();
  });

  afterAll(async () => {
    await db.$disconnect?.();
  });

  it("REFUSES not_settled while every covered pick is pending", async () => {
    const key = uid();
    const edges = [12.5, 40, 7.25];
    await makeSlate(key, edges.length, mintAggregate(edges));
    await seedPicks(gameId, edges.map((e) => ({ edgeScore: e, result: "PENDING" as const, slateKey: key })));

    const plan = await planSlateOpeningFromDb(key);
    expect(plan.action).toBe("REFUSE");
    if (plan.action !== "REFUSE") return;
    expect(plan.reason).toBe("not_settled");
  });

  it("REFUSES a mostly-settled slate — one pending covered pick still blocks", async () => {
    const key = uid();
    const edges = [12.5, 40, 7.25];
    await makeSlate(key, edges.length, mintAggregate(edges));
    await seedPicks(gameId, [
      { edgeScore: edges[0]!, result: "WIN", slateKey: key },
      { edgeScore: edges[1]!, result: "LOSS", slateKey: key },
      { edgeScore: edges[2]!, result: "PENDING", slateKey: key }, // the lone holdout
    ]);

    const plan = await planSlateOpeningFromDb(key);
    expect(plan.action).toBe("REFUSE");
    if (plan.action !== "REFUSE") return;
    expect(plan.reason).toBe("not_settled");
  });

  it("an UNRELATED pending pick does NOT block a fully-settled slate (covered-set keying)", async () => {
    const key = uid();
    const edges = [12.5, 40, 7.25];
    // Every COVERED pick (stamped with this slateKey) is settled...
    await makeSlate(key, edges.length, mintAggregate(edges));
    const coveredGames = await seedPicks(gameId, edges.map((e) => ({ edgeScore: e, result: "WIN" as const, slateKey: key })));
    // ...but one of those SAME games also carries a pending pick (different
    // pickType — the schema allows one pick per (game, pickType)) that is NOT
    // part of this slate's pre-registration (slateKey null). If the pending
    // count were keyed off games instead of the slateKey stamp, this would
    // wrongly block a finished slate.
    await seedPicks(gameId, [
      { edgeScore: 99, result: "PENDING", slateKey: null, gameId: coveredGames[0]!, pickType: "TOTAL" },
    ]);

    const plan = await planSlateOpeningFromDb(key);
    expect(plan.action).toBe("REVEAL");
  });

  it("REVEALS a genuine opening once every covered pick has settled", async () => {
    const key = uid();
    const edges = [12.5, 40, 7.25];
    const opener = mintAggregate(edges);
    await makeSlate(key, edges.length, opener);
    await seedPicks(gameId, [
      { edgeScore: edges[0]!, result: "WIN", slateKey: key },
      { edgeScore: edges[1]!, result: "LOSS", slateKey: key },
      { edgeScore: edges[2]!, result: "PUSH", slateKey: key },
    ]);

    const plan = await planSlateOpeningFromDb(key);
    expect(plan.action).toBe("REVEAL");
    if (plan.action !== "REVEAL") return;
    // The disclosed opener is exactly what was stored and genuinely opens the hex.
    expect(plan.opening.aggregateHex).toBe(opener.hex);
    expect(plan.opening.value).toBe(opener.value);
    expect(plan.opening.blindingSum).toBe(opener.blindingSum);
  });

  it("REFUSES no_opener when the slate's opener columns are null (pre-0.5 slate)", async () => {
    const key = uid();
    const edges = [12.5, 40];
    await makeSlate(key, edges.length, null);
    await seedPicks(gameId, edges.map((e) => ({ edgeScore: e, result: "WIN" as const, slateKey: key })));

    const plan = await planSlateOpeningFromDb(key);
    expect(plan.action).toBe("REFUSE");
    if (plan.action !== "REFUSE") return;
    expect(plan.reason).toBe("no_opener");
  });

  it("REFUSES no_opener for a slateKey with no commitment row, without throwing", async () => {
    const plan = await planSlateOpeningFromDb(`missing-${uid()}`);
    expect(plan.action).toBe("REFUSE");
    if (plan.action !== "REFUSE") return;
    expect(plan.reason).toBe("no_opener");
  });
});
