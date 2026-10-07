import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Settlement-snapshots invariants (SO-1f, fresh test-gap lane 2026-10-07).
 *
 * The module under test is the ONLY writer of settlement outcomes into
 * PickSignalSnapshot. Its live consumers are settle-sport.ts (per settled
 * pick) and settlement-evidence.ts, so a wrong answer here is a wrong graded
 * record, not a log line. Its whole safety story is WRITE-ONCE: the graded
 * outcome goes in through an UPDATE restricted to rows whose settlementResult
 * is still null, and a second settlement call must never rewrite an outcome
 * that already exists. Tests use an injected in-memory store; no DB, no
 * network, no invented product data (every pick below is a synthetic id).
 *
 * Pinned-as-is findings are marked: the behaviour exists in the source today
 * and the test records it so a future change is a conscious decision, not an
 * accident. They are not endorsements.
 */

import {
  recordPickSettlementSnapshot,
  type RecordSettlementSnapshotInput,
  type SettlementSnapshotDb,
  type SettledPickResult,
} from "../settlement-snapshots.js";

type UpdateManyArgs = Parameters<
  SettlementSnapshotDb["pickSignalSnapshot"]["updateMany"]
>[0];
type CreateArgs = Parameters<
  SettlementSnapshotDb["pickSignalSnapshot"]["create"]
>[0];
type FindUniqueArgs = Parameters<
  SettlementSnapshotDb["pickSignalSnapshot"]["findUnique"]
>[0];

interface StoreShape {
  /** null = row does not exist; string = settled; "" = row exists, unsettled. */
  rows: Map<string, string | null | "">;
  failUpdateTimes: number;
  failCreateTimes: number;
}

interface CapturedCalls {
  updates: UpdateManyArgs[];
  creates: CreateArgs[];
  finds: FindUniqueArgs[];
}

/** noUncheckedIndexedAccess-safe first-element read: a missing call is a test failure, not undefined. */
function first<T>(items: T[]): T {
  const [item] = items;
  if (item === undefined) throw new Error("expected at least one captured call");
  return item;
}

function makeDb(shape: StoreShape): { db: SettlementSnapshotDb; calls: CapturedCalls } {
  const calls: CapturedCalls = { updates: [], creates: [], finds: [] };
  const updateMany = vi.fn(
    async (args: UpdateManyArgs): Promise<{ count: number }> => {
      calls.updates.push(args);
      if (shape.failUpdateTimes > 0) {
        shape.failUpdateTimes -= 1;
        throw new Error(`injected update failure (${shape.failUpdateTimes} left)`);
      }
      const current = shape.rows.get(args.where.pickId);
      // WHERE settlementResult = null: only an existing UNSETTLED row moves.
      if (current === "" ) {
        shape.rows.set(args.where.pickId, args.data.settlementResult);
        return { count: 1 };
      }
      return { count: 0 };
    },
  );
  const findUnique = vi.fn(
    async (
      args: FindUniqueArgs,
    ): Promise<{ settlementResult: string | null } | null> => {
      calls.finds.push(args);
      const current = shape.rows.get(args.where.pickId);
      if (current === undefined) return null;
      return { settlementResult: current === "" ? null : current };
    },
  );
  const create = vi.fn(async (args: CreateArgs): Promise<unknown> => {
    calls.creates.push(args);
    if (shape.failCreateTimes > 0) {
      shape.failCreateTimes -= 1;
      throw new Error("injected create failure");
    }
    shape.rows.set(args.data.pickId, args.data.settlementResult);
    return args.data;
  });
  return {
    db: { pickSignalSnapshot: { updateMany, findUnique, create } },
    calls,
  };
}

function baseInput(overrides: Partial<RecordSettlementSnapshotInput> = {}): RecordSettlementSnapshotInput {
  const db = overrides.db ?? makeDb({ rows: new Map(), failUpdateTimes: 0, failCreateTimes: 0 }).db;
  return {
    db,
    pick: {
      id: "pick-so1f",
      gameId: "game-so1f",
      isBootstrap: false,
      bookmakerCount: 7,
      confidence: 62,
      modelVersion: "v5.2.7",
      factorBreakdown: { dataQualityScore: 88 },
    },
    result: "WIN",
    settledAt: new Date("2026-10-07T03:00:00.000Z"),
    isEligibleForLearning: true,
    gameDataQualityScore: 71,
    sleep: async () => undefined,
    ...overrides,
  };
}

const EXHAUSTED_MESSAGE = "Settlement snapshot write exhausted retry attempts";

describe("recordPickSettlementSnapshot — write-once graded outcome", () => {
  it("a second settlement with a DIFFERENT result cannot rewrite an already-settled snapshot", async () => {
    const shape: StoreShape = {
      rows: new Map([["pick-so1f", "WIN"]]),
      failUpdateTimes: 0,
      failCreateTimes: 0,
    };
    const { db, calls } = makeDb(shape);
    const input = baseInput({ db, result: "LOSS" });
    const status = await recordPickSettlementSnapshot(input);
    expect(status).toBe("already-settled");
    expect(shape.rows.get("pick-so1f")).toBe("WIN");
    expect(calls.creates).toHaveLength(0);
    // The update ran but moved nothing, and no fallback row was created: the
    // graded outcome is immutable through this module.
  });

  it("the write-once predicate lives in the WHERE clause (pickId + settlementResult null), not in application code", async () => {
    const { db, calls } = makeDb({
      rows: new Map([["pick-so1f", ""]]),
      failUpdateTimes: 0,
      failCreateTimes: 0,
    });
    await recordPickSettlementSnapshot(baseInput({ db, result: "PUSH" }));
    expect(calls.updates).toHaveLength(1);
    expect(first(calls.updates).where).toEqual({
      pickId: "pick-so1f",
      settlementResult: null,
    });
  });

  it("an unsettled row is updated in place; findUnique and create are never reached", async () => {
    const shape: StoreShape = {
      rows: new Map([["pick-so1f", ""]]),
      failUpdateTimes: 0,
      failCreateTimes: 0,
    };
    const { db, calls } = makeDb(shape);
    const settledAt = new Date("2026-10-07T05:30:00.000Z");
    const status = await recordPickSettlementSnapshot(
      baseInput({ db, result: "LOSS", settledAt, isEligibleForLearning: false }),
    );
    expect(status).toBe("updated-existing");
    expect(shape.rows.get("pick-so1f")).toBe("LOSS");
    expect(first(calls.updates).data).toEqual({
      settlementResult: "LOSS",
      settledAt,
      eligibleForLearning: false,
    });
    expect(calls.finds).toHaveLength(0);
    expect(calls.creates).toHaveLength(0);
  });

  it("learningEligibleAt is stamped ONLY when eligible, and it equals settledAt (absence, not null)", async () => {
    const eligible = makeDb({ rows: new Map([["p1", ""]]), failUpdateTimes: 0, failCreateTimes: 0 });
    const at = new Date("2026-10-07T06:00:00.000Z");
    await recordPickSettlementSnapshot(
      baseInput({ db: eligible.db, result: "WIN", settledAt: at, isEligibleForLearning: true }),
    );
    expect(first(eligible.calls.updates).data).toMatchObject({
      eligibleForLearning: true,
      learningEligibleAt: at,
    });
    expect(Object.hasOwn(first(eligible.calls.updates).data, "learningEligibleAt")).toBe(true);

    const ineligible = makeDb({ rows: new Map([["p2", ""]]), failUpdateTimes: 0, failCreateTimes: 0 });
    await recordPickSettlementSnapshot(
      baseInput({ db: ineligible.db, result: "VOID", settledAt: at, isEligibleForLearning: false }),
    );
    expect(first(ineligible.calls.updates).data).toMatchObject({
      settlementResult: "VOID",
      eligibleForLearning: false,
    });
    expect(Object.hasOwn(first(ineligible.calls.updates).data, "learningEligibleAt")).toBe(false);
  });

  it("all four settled results are recorded verbatim", async () => {
    const results: SettledPickResult[] = ["WIN", "LOSS", "PUSH", "VOID"];
    for (const result of results) {
      const { db, calls } = makeDb({ rows: new Map([["px", ""]]), failUpdateTimes: 0, failCreateTimes: 0 });
      const input = baseInput({ db, result });
      (input as { pick: { id: string } }).pick.id = "px";
      await recordPickSettlementSnapshot(input);
      expect(first(calls.updates).data.settlementResult).toBe(result);
    }
  });
});

describe("recordPickSettlementSnapshot — fallback snapshot derivation", () => {
  it("no row at all -> created-fallback with the full prediction-time shape", async () => {
    const { db, calls } = makeDb({ rows: new Map(), failUpdateTimes: 0, failCreateTimes: 0 });
    const settledAt = new Date("2026-10-07T07:00:00.000Z");
    const status = await recordPickSettlementSnapshot(
      baseInput({ db, result: "WIN", settledAt, isEligibleForLearning: true }),
    );
    expect(status).toBe("created-fallback");
    expect(calls.creates).toHaveLength(1);
    const created = first(calls.creates).data;
    expect(created.pickId).toBe("pick-so1f");
    expect(created.gameId).toBe("game-so1f");
    expect(created.settlementResult).toBe("WIN");
    expect(created.settledAt).toBe(settledAt);
    expect(created.eligibleForLearning).toBe(true);
    expect(created.learningEligibleAt).toBe(settledAt);
    expect(created.confidenceAtPrediction).toBe(62);
    expect(created.isBootstrap).toBe(false);
    expect(created.bookmakerCount).toBe(7);
    expect(created.modelVersion).toBe("v5.2.7");
    expect(created.usedDerivedHistory).toBe(false);
    expect(created.usedScheduleSignal).toBe(false);
    expect(created.dataQualityScore).toBe(88);
  });

  it("dataQualityScore: a finite factor-breakdown score wins over the game score", async () => {
    const { db, calls } = makeDb({ rows: new Map(), failUpdateTimes: 0, failCreateTimes: 0 });
    await recordPickSettlementSnapshot(
      baseInput({ db, pick: { ...baseInput().pick, factorBreakdown: { dataQualityScore: 40 } } }),
    );
    expect(first(calls.creates).data.dataQualityScore).toBe(40);
  });

  it.each([
    ["null factorBreakdown", null],
    ["array factorBreakdown", [1, 2, 3]],
    ["string factorBreakdown", "not-an-object"],
    ["number factorBreakdown", 42],
  ])("%s falls back to the game-level score", async (_label, factorBreakdown) => {
    const { db, calls } = makeDb({ rows: new Map(), failUpdateTimes: 0, failCreateTimes: 0 });
    await recordPickSettlementSnapshot(
      baseInput({
        db,
        pick: { ...baseInput().pick, factorBreakdown: factorBreakdown as unknown },
      }),
    );
    expect(first(calls.creates).data.dataQualityScore).toBe(71);
  });

  it.each([
    ["NaN inside the breakdown", { dataQualityScore: Number.NaN }],
    ["+Infinity inside the breakdown", { dataQualityScore: Number.POSITIVE_INFINITY }],
    ["-Infinity inside the breakdown", { dataQualityScore: Number.NEGATIVE_INFINITY }],
  ])("a non-finite breakdown SCORE (%s) falls back to the game score (isFinite branch)", async (_label, factorBreakdown) => {
    // These exercise the Number.isFinite guard specifically: the value IS a
    // number inside a well-shaped object, so only the finite check stands
    // between NaN and the graded snapshot. (Whole-shape garbage above is
    // caught by the object guard instead.)
    const { db, calls } = makeDb({ rows: new Map(), failUpdateTimes: 0, failCreateTimes: 0 });
    await recordPickSettlementSnapshot(
      baseInput({
        db,
        pick: { ...baseInput().pick, factorBreakdown: factorBreakdown as unknown },
      }),
    );
    expect(first(calls.creates).data.dataQualityScore).toBe(71);
  });

  it.each([
    ["NaN", Number.NaN],
    ["+Infinity", Number.POSITIVE_INFINITY],
    ["-Infinity", Number.NEGATIVE_INFINITY],
    ["string value", "99"],
    ["missing key", {}],
  ])("non-finite or non-numeric breakdown score (%s) falls back to the game score", async (_label, breakdown) => {
    const { db, calls } = makeDb({ rows: new Map(), failUpdateTimes: 0, failCreateTimes: 0 });
    await recordPickSettlementSnapshot(
      baseInput({
        db,
        pick: { ...baseInput().pick, factorBreakdown: breakdown as unknown },
      }),
    );
    expect(first(calls.creates).data.dataQualityScore).toBe(71);
  });

  it("modelVersion null is stored as the EMPTY STRING, not null (pinned as-is)", async () => {
    const { db, calls } = makeDb({ rows: new Map(), failUpdateTimes: 0, failCreateTimes: 0 });
    await recordPickSettlementSnapshot(
      baseInput({ db, pick: { ...baseInput().pick, modelVersion: null } }),
    );
    expect(first(calls.creates).data.modelVersion).toBe("");
  });

  it("fallback claims hadOddsSignal: true unconditionally (pinned as-is — optimistic default)", async () => {
    const { db, calls } = makeDb({ rows: new Map(), failUpdateTimes: 0, failCreateTimes: 0 });
    await recordPickSettlementSnapshot(
      baseInput({ db, pick: { ...baseInput().pick, bookmakerCount: 0 } }),
    );
    // Even a zero-bookmaker pick (no market read at prediction time) is
    // recorded as hadOddsSignal. The fallback row exists only because the
    // prediction-time snapshot was lost, and its honest flag is unknowable
    // from this module's inputs; the test records today's optimistic choice
    // so a change to it is a conscious one.
    expect(first(calls.creates).data.hadOddsSignal).toBe(true);
  });

  it("ineligible fallback carries no learningEligibleAt key", async () => {
    const { db, calls } = makeDb({ rows: new Map(), failUpdateTimes: 0, failCreateTimes: 0 });
    await recordPickSettlementSnapshot(
      baseInput({ db, result: "VOID", isEligibleForLearning: false }),
    );
    const created = first(calls.creates).data;
    expect(created.eligibleForLearning).toBe(false);
    expect(Object.hasOwn(created, "learningEligibleAt")).toBe(false);
  });
});

describe("recordPickSettlementSnapshot — retry and backoff", () => {
  it("a transient first-attempt failure retries after exactly baseDelayMs and still records", async () => {
    const shape: StoreShape = { rows: new Map([["pick-so1f", ""]]), failUpdateTimes: 1, failCreateTimes: 0 };
    const { db, calls } = makeDb(shape);
    const sleeps: number[] = [];
    const status = await recordPickSettlementSnapshot(
      baseInput({ db, result: "WIN", sleep: async (ms) => void sleeps.push(ms) }),
    );
    expect(status).toBe("updated-existing");
    expect(sleeps).toEqual([100]);
    expect(calls.updates).toHaveLength(2);
  });

  it("backoff doubles per attempt: 100, 200, 400", async () => {
    const shape: StoreShape = { rows: new Map([["pick-so1f", ""]]), failUpdateTimes: 3, failCreateTimes: 0 };
    const { db, calls } = makeDb(shape);
    const sleeps: number[] = [];
    const status = await recordPickSettlementSnapshot(
      baseInput({ db, sleep: async (ms) => void sleeps.push(ms), maxAttempts: 4 }),
    );
    expect(status).toBe("updated-existing");
    expect(sleeps).toEqual([100, 200, 400]);
    expect(calls.updates).toHaveLength(4);
  });

  it("exhausted attempts rethrow the ORIGINAL error, not the exhausted wrapper", async () => {
    const shape: StoreShape = { rows: new Map([["pick-so1f", ""]]), failUpdateTimes: 99, failCreateTimes: 0 };
    const { db, calls } = makeDb(shape);
    await expect(
      recordPickSettlementSnapshot(baseInput({ db, maxAttempts: 2 })),
    ).rejects.toThrow("injected update failure");
    expect(calls.updates).toHaveLength(2);
  });

  it("maxAttempts bounds the tries (custom value of 2)", async () => {
    const shape: StoreShape = { rows: new Map(), failUpdateTimes: 99, failCreateTimes: 0 };
    const { db, calls } = makeDb(shape);
    await expect(
      recordPickSettlementSnapshot(baseInput({ db, maxAttempts: 2 })),
    ).rejects.toThrow("injected update failure");
    expect(calls.updates).toHaveLength(2);
  });

  it("maxAttempts 0 is fail-closed: the exhausted error fires with ZERO store calls", async () => {
    const { db, calls } = makeDb({ rows: new Map(), failUpdateTimes: 0, failCreateTimes: 0 });
    await expect(
      recordPickSettlementSnapshot(baseInput({ db, maxAttempts: 0 })),
    ).rejects.toThrow(EXHAUSTED_MESSAGE);
    expect(calls.updates).toHaveLength(0);
    expect(calls.finds).toHaveLength(0);
    expect(calls.creates).toHaveLength(0);
  });

  it("a failing create retries too (fallback path is inside the same retry loop)", async () => {
    const shape: StoreShape = { rows: new Map(), failUpdateTimes: 0, failCreateTimes: 1 };
    const { db, calls } = makeDb(shape);
    const sleeps: number[] = [];
    const status = await recordPickSettlementSnapshot(
      baseInput({ db, sleep: async (ms) => void sleeps.push(ms) }),
    );
    expect(status).toBe("created-fallback");
    expect(sleeps).toEqual([100]);
    expect(calls.creates).toHaveLength(2);
  });
});

describe("recordPickSettlementSnapshot — no caller mutation", () => {
  it("the input object is never mutated", async () => {
    const { db } = makeDb({ rows: new Map([["pick-so1f", ""]]), failUpdateTimes: 0, failCreateTimes: 0 });
    const pick = { ...baseInput().pick };
    const input = baseInput({ db, pick, result: "PUSH" });
    await recordPickSettlementSnapshot(input);
    expect(input.result).toBe("PUSH");
    expect(input.settledAt).toEqual(new Date("2026-10-07T03:00:00.000Z"));
    expect(input.isEligibleForLearning).toBe(true);
    expect(input.gameDataQualityScore).toBe(71);
    expect(input.pick).toBe(pick);
  });
});

describe("recordPickSettlementSnapshot — status partition over store shapes", () => {
  it("the three shapes map 1:1 onto the three statuses, mutually exclusive and exhaustive", async () => {
    const shapes: Array<[StoreShape, "updated-existing" | "already-settled" | "created-fallback"]> = [
      [{ rows: new Map([["p", ""]]), failUpdateTimes: 0, failCreateTimes: 0 }, "updated-existing"],
      [{ rows: new Map([["p", "WIN"]]), failUpdateTimes: 0, failCreateTimes: 0 }, "already-settled"],
      [{ rows: new Map(), failUpdateTimes: 0, failCreateTimes: 0 }, "created-fallback"],
    ];
    for (const [shape, expected] of shapes) {
      const { db, calls } = makeDb(shape);
      const input = baseInput({ db });
      (input as { pick: { id: string } }).pick.id = "p";
      const status = await recordPickSettlementSnapshot(input);
      expect(status).toBe(expected);
      // Exactly one of the three outcomes ever writes a NEW row.
      expect(calls.creates).toHaveLength(expected === "created-fallback" ? 1 : 0);
    }
  });
});

describe("cross-file contract — the caller derives learning eligibility", () => {
  // Vitest always runs from the package root (its own npm script), so a
  // cwd-relative read is stable here; import.meta is not usable because the
  // package tsconfig targets CommonJS.
  const source = readFileSync(join(process.cwd(), "src", "settle-sport.ts"), "utf8");

  it("VOID can never mark a snapshot learning-eligible: the decisive-result predicate excludes it", () => {
    const derivationText = source.match(/const isEligibleForLearning =[\s\S]*?;/)?.[0];
    expect(derivationText).toBeDefined();
    expect(derivationText).toContain("gates.canLearnFromOutcomes");
    expect(derivationText).toContain("!pick.isBootstrap");
    expect(derivationText).toContain("isDecisiveResult");
    const decisiveText = source.match(/const isDecisiveResult =[^\n]*/)?.[0];
    expect(decisiveText).toBeDefined();
    expect(decisiveText).toContain("WIN");
    expect(decisiveText).toContain("LOSS");
    expect(decisiveText).toContain("PUSH");
    expect(decisiveText).not.toContain("VOID");
  });

  it("the caller passes the game's dataQualityScore as the fallback source", () => {
    expect(source).toContain("gameDataQualityScore: game.dataQualityScore");
  });
});
