import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { Prisma } from "@prisma/client";
import {
  SettlementRaceRollback,
  settleOnePickGuarded,
  writeFreeSettlementInTx,
  type FreeSettlementWriteArgs,
} from "@/lib/data-sources/free-settlement-runner";

/**
 * Concurrency test for the settlement write (Devin Review, #717).
 *
 * The two guarded statements — the pick update and the FINAL score write — each
 * carry the same kickoff predicate, but under READ COMMITTED each reads its own
 * committed snapshot, so a schedule correction can commit BETWEEN them. This
 * drives the real function against a transaction client that does exactly that,
 * rather than asserting on source text: the fake evaluates every WHERE clause
 * against the current committed rows, and replays an undo log when the callback
 * throws, which is what a rollback does.
 */

const KICKOFF = new Date("2026-09-06T17:00:00.000Z");
const SETTLED_AT = new Date("2026-09-06T21:00:00.000Z");
const POSTPONED_TO = new Date("2026-09-08T17:00:00.000Z");

type GameRow = {
  id: string;
  commenceTime: Date;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
  resultFetched: boolean;
};
type PickRow = { id: string; gameId: string; result: string; settledAt: Date | null };

class FakeTxStore {
  game: GameRow = {
    id: "g1",
    commenceTime: KICKOFF,
    homeScore: null,
    awayScore: null,
    status: "SCHEDULED",
    resultFetched: false,
  };
  pick: PickRow = { id: "p1", gameId: "g1", result: "PENDING", settledAt: null };
  events: Array<Record<string, unknown>> = [];
  work: Array<Record<string, unknown>> = [];

  /** Fires after the pick write, standing in for another transaction committing. */
  onAfterPickWrite: (() => void) | null = null;

  /** Same, but keyed on the Nth game read — 1 is the kickoff reread. */
  onAfterGameRead: ((call: number) => void) | null = null;
  private gameReads = 0;

  private undo: Array<() => void> = [];

  /** Rolls back on throw, exactly as db.$transaction does. */
  async run<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    this.undo = [];
    try {
      return await fn(this.client());
    } catch (err) {
      for (const step of [...this.undo].reverse()) step();
      throw err;
    }
  }

  /** Evaluates a Prisma OR clause against the current committed game row. */
  private matchesOr(clauses: Array<Record<string, unknown>> | undefined): boolean {
    if (!clauses) return true;
    const row = this.game as unknown as Record<string, unknown>;
    return clauses.some((clause) =>
      Object.entries(clause).every(([field, expected]) => {
        const actual = row[field];
        if (expected !== null && typeof expected === "object" && "not" in expected) {
          return actual !== (expected as { not: unknown }).not;
        }
        return actual === expected;
      }),
    );
  }

  client(): Prisma.TransactionClient {
    // Prisma accepts either an exact value or an { lte } bound for commenceTime;
    // the settlement write uses both shapes, so the fake evaluates both.
    const lte = (when: unknown): boolean => {
      const clause = (when as { commenceTime?: Date | { lte?: Date } } | undefined)?.commenceTime;
      if (clause instanceof Date) {
        return this.game.commenceTime.getTime() === clause.getTime();
      }
      const bound = (clause as { lte?: Date } | undefined)?.lte;
      return bound instanceof Date ? this.game.commenceTime.getTime() <= bound.getTime() : true;
    };
    return {
      game: {
        findUnique: async ({ where }: { where: { id: string } }) => {
          const row = where.id === this.game.id ? { ...this.game } : null;
          this.onAfterGameRead?.(++this.gameReads);
          return row;
        },
        updateMany: async ({
          where,
          data,
        }: {
          where: {
            id: string;
            commenceTime?: Date | { lte?: Date };
            OR?: Array<Record<string, unknown>>;
          };
          data: Partial<GameRow>;
        }) => {
          if (where.id !== this.game.id || !lte(where) || !this.matchesOr(where.OR)) {
            return { count: 0 };
          }
          const before = { ...this.game };
          this.undo.push(() => {
            this.game = before;
          });
          this.game = { ...this.game, ...data };
          return { count: 1 };
        },
      },
      pick: {
        findUnique: async ({ where }: { where: { id: string } }) =>
          where.id === this.pick.id ? { result: this.pick.result } : null,
        updateMany: async ({
          where,
          data,
        }: {
          where: { id: string; result?: string; game?: { commenceTime?: { lte?: Date } } };
          data: Partial<PickRow>;
        }) => {
          const matches =
            where.id === this.pick.id &&
            (where.result === undefined || where.result === this.pick.result) &&
            lte(where.game);
          if (!matches) return { count: 0 };
          const before = { ...this.pick };
          this.undo.push(() => {
            this.pick = before;
          });
          this.pick = { ...this.pick, ...data };
          this.onAfterPickWrite?.();
          return { count: 1 };
        },
      },
      pickSettlementEvent: {
        create: async ({ data }: { data: Record<string, unknown> }) => {
          this.events.push(data);
          this.undo.push(() => {
            this.events.pop();
          });
          return data;
        },
      },
      postSettlementWork: {
        createMany: async ({ data }: { data: Array<Record<string, unknown>> }) => {
          const added = data.length;
          this.work.push(...data);
          this.undo.push(() => {
            this.work.splice(this.work.length - added, added);
          });
          return { count: added };
        },
      },
    } as unknown as Prisma.TransactionClient;
  }
}

const ARGS: FreeSettlementWriteArgs = {
  pickId: "p1",
  gameId: "g1",
  result: "WIN",
  homeScore: 27,
  awayScore: 20,
  settledAt: SETTLED_AT,
};

let store: FakeTxStore;
let warn: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  store = new FakeTxStore();
  warn = vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  warn.mockRestore();
});

describe("settlement write under a mid-transaction schedule correction", () => {
  it("leaves the pick PENDING when the postponement commits between the two writes", async () => {
    store.onAfterPickWrite = () => {
      // Another transaction commits a postponement. It is NOT part of this
      // transaction, so a rollback must not undo it.
      store.game = { ...store.game, commenceTime: POSTPONED_TO };
    };

    const written = await settleOnePickGuarded((fn) => store.run(fn), ARGS);

    expect(written.count).toBe(0);
    expect(store.pick.result).toBe("PENDING");
    expect(store.pick.settledAt).toBeNull();
    expect(store.events).toHaveLength(0);
    expect(store.work).toHaveLength(0);
    expect(store.game.status).toBe("SCHEDULED");
    expect(store.game.homeScore).toBeNull();
    // The concurrent correction survives the rollback.
    expect(store.game.commenceTime).toEqual(POSTPONED_TO);
    expect(warn.mock.calls.flat().join(" ")).toContain("SETTLE_ROLLBACK");
  });

  it("negative control: without the rollback the same race settles the pick", async () => {
    store.onAfterPickWrite = () => {
      store.game = { ...store.game, commenceTime: POSTPONED_TO };
    };

    // Call the write directly, with no transaction wrapper to undo it. This is
    // the state the database would be left in if the zero game-update count
    // were merely returned instead of thrown: pick settled, game never FINAL.
    await expect(writeFreeSettlementInTx(store.client(), ARGS)).rejects.toBeInstanceOf(
      SettlementRaceRollback,
    );
    expect(store.pick.result).toBe("WIN");
    expect(store.game.status).toBe("SCHEDULED");
  });

  it("settles normally when nothing races it", async () => {
    const written = await settleOnePickGuarded((fn) => store.run(fn), ARGS);

    expect(written.count).toBe(1);
    expect(store.pick.result).toBe("WIN");
    expect(store.pick.settledAt).toEqual(SETTLED_AT);
    expect(store.game.status).toBe("FINAL");
    expect(store.game.homeScore).toBe(27);
    expect(store.game.awayScore).toBe(20);
    expect(store.game.resultFetched).toBe(true);
    expect(store.events).toHaveLength(1);
    expect(store.work).toHaveLength(2);
  });

  it("refuses before writing anything when the postponement is already committed", async () => {
    store.game = { ...store.game, commenceTime: POSTPONED_TO };

    const written = await settleOnePickGuarded((fn) => store.run(fn), ARGS);

    expect(written.count).toBe(0);
    expect(store.pick.result).toBe("PENDING");
    expect(store.events).toHaveLength(0);
    expect(warn.mock.calls.flat().join(" ")).toContain("KICKOFF_MOVED");
  });

  it("a scoreless VOID never reaches the FINAL-score guard", async () => {
    const written = await settleOnePickGuarded((fn) => store.run(fn), {
      ...ARGS,
      result: "VOID",
      homeScore: null,
      awayScore: null,
    });

    expect(written.count).toBe(1);
    expect(store.pick.result).toBe("VOID");
    // No score was invented and the game was never marked FINAL.
    expect(store.game.status).toBe("SCHEDULED");
    expect(store.game.homeScore).toBeNull();
  });

  it("leaves the pick PENDING when the postponement commits after the kickoff reread", async () => {
    // The reread alone is not the guard: a correction can commit between it and
    // the pick write. The relation filter that rides in the write is what makes
    // the update match nothing here (Devin Review, #717).
    store.onAfterGameRead = (call) => {
      if (call === 1) store.game = { ...store.game, commenceTime: POSTPONED_TO };
    };

    const written = await settleOnePickGuarded((fn) => store.run(fn), ARGS);

    expect(written.count).toBe(0);
    expect(store.pick.result).toBe("PENDING");
    expect(store.events).toHaveLength(0);
    expect(store.work).toHaveLength(0);
    expect(store.game.status).toBe("SCHEDULED");
  });

  it("the kickoff guard also covers a scoreless VOID, which skips the score reread", async () => {
    store.game = { ...store.game, commenceTime: POSTPONED_TO };

    const written = await settleOnePickGuarded((fn) => store.run(fn), {
      ...ARGS,
      result: "VOID",
      homeScore: null,
      awayScore: null,
    });

    expect(written.count).toBe(0);
    expect(store.pick.result).toBe("PENDING");
    expect(store.events).toHaveLength(0);
  });

  it("refuses a scoreless VOID when the postponement commits after the kickoff reread", async () => {
    // A scoreless outcome writes no FINAL score, so the rollback guard never
    // fires and the relation filter on the pick write is the ONLY thing left
    // standing between this race and a VOID stamped on a game that has not
    // been played yet.
    store.onAfterGameRead = (call) => {
      if (call === 1) store.game = { ...store.game, commenceTime: POSTPONED_TO };
    };

    const written = await settleOnePickGuarded((fn) => store.run(fn), {
      ...ARGS,
      result: "VOID",
      homeScore: null,
      awayScore: null,
    });

    expect(written.count).toBe(0);
    expect(store.pick.result).toBe("PENDING");
    expect(store.pick.settledAt).toBeNull();
    expect(store.events).toHaveLength(0);
    expect(store.work).toHaveLength(0);
  });

  it("leaves a competing FINAL alone when it commits after the conflict read", async () => {
    // The cross-path conflict check is a READ. The paid settlement path can
    // commit a different FINAL between it and the game write, and the write
    // carried only the kickoff predicate, so it clobbered that score after
    // picks had already been graded against it (Devin Review + cubic, #717).
    store.onAfterGameRead = (call) => {
      // Call 2 is the score reread; the competing FINAL lands right after it.
      if (call === 2) {
        store.game = { ...store.game, homeScore: 31, awayScore: 17, status: "FINAL" };
      }
    };

    const written = await settleOnePickGuarded((fn) => store.run(fn), ARGS);

    expect(written.count).toBe(0);
    expect(written.refusal).toBe("ROLLED_BACK_SCORE");
    expect(store.pick.result).toBe("PENDING");
    expect(store.events).toHaveLength(0);
    // The competing score survives untouched — no last-write-wins clobber.
    expect(store.game.homeScore).toBe(31);
    expect(store.game.awayScore).toBe(17);
  });

  it("still writes when the concurrent FINAL agrees with ours", async () => {
    store.onAfterGameRead = (call) => {
      if (call === 2) {
        store.game = { ...store.game, homeScore: 27, awayScore: 20, status: "FINAL" };
      }
    };

    const written = await settleOnePickGuarded((fn) => store.run(fn), ARGS);

    expect(written.count).toBe(1);
    expect(written.refusal).toBeNull();
    expect(store.pick.result).toBe("WIN");
    expect(store.game.homeScore).toBe(27);
  });

  it("reports a pick another worker already settled as ALREADY_SETTLED, not a refusal of ours", async () => {
    // Both causes of a zero pick-update count used to be reported identically,
    // so the runner counted someone else's settled pick as its own backlog
    // (cubic, #717).
    store.pick = { ...store.pick, result: "WIN", settledAt: SETTLED_AT };

    const written = await settleOnePickGuarded((fn) => store.run(fn), ARGS);

    expect(written.count).toBe(0);
    expect(written.refusal).toBe("ALREADY_SETTLED");
    expect(store.events).toHaveLength(0);
  });

  it("names the kickoff as the cause when the postponement is what refused the write", async () => {
    store.onAfterPickWrite = () => {
      store.game = { ...store.game, commenceTime: POSTPONED_TO };
    };

    const written = await settleOnePickGuarded((fn) => store.run(fn), ARGS);

    expect(written.refusal).toBe("ROLLED_BACK_KICKOFF");
  });

  it("rolls a scoreless VOID back when the postponement commits after the pick write", async () => {
    // A scoreless outcome writes no FINAL, so nothing took a row lock on the
    // game and the pick write's relation filter was the only guard. A
    // correction committing after that statement left a VOID stamped on a game
    // nobody has played (Devin Review, #717).
    store.onAfterPickWrite = () => {
      store.game = { ...store.game, commenceTime: POSTPONED_TO };
    };

    const written = await settleOnePickGuarded((fn) => store.run(fn), {
      ...ARGS,
      result: "VOID",
      homeScore: null,
      awayScore: null,
    });

    expect(written.count).toBe(0);
    expect(written.refusal).toBe("ROLLED_BACK_KICKOFF");
    expect(store.pick.result).toBe("PENDING");
    expect(store.pick.settledAt).toBeNull();
    expect(store.events).toHaveLength(0);
    expect(store.work).toHaveLength(0);
    expect(store.game.commenceTime).toEqual(POSTPONED_TO);
  });

  it("hands back the kickoff the database held, so the refusal can be aged correctly", async () => {
    store.onAfterPickWrite = () => {
      store.game = { ...store.game, commenceTime: POSTPONED_TO };
    };

    const written = await settleOnePickGuarded((fn) => store.run(fn), ARGS);

    expect(written.kickoffAt).toEqual(POSTPONED_TO);
  });

  it("never overwrites a schedule correction that moved the game to another PAST time", async () => {
    // The scoreless hold writes the kickoff back to keep the row locked. Matched
    // on `lte: settledAt` that write was a no-op only when nothing had changed:
    // a correction to a DIFFERENT past time satisfies the same predicate, so the
    // hold overwrote the correction with the stale kickoff (Devin Review, #717).
    const CORRECTED = new Date(KICKOFF.getTime() - 60 * 60 * 1000);
    store.onAfterGameRead = (call) => {
      if (call === 1) store.game = { ...store.game, commenceTime: CORRECTED };
    };

    const written = await settleOnePickGuarded((fn) => store.run(fn), {
      ...ARGS,
      result: "VOID",
      homeScore: null,
      awayScore: null,
    });

    expect(written.count).toBe(0);
    expect(written.refusal).toBe("ROLLED_BACK_KICKOFF");
    expect(store.pick.result).toBe("PENDING");
    // The correction survives: it was not replaced by the kickoff we had read.
    expect(store.game.commenceTime).toEqual(CORRECTED);
  });

  it("SCORED sibling: refuses when the game is corrected to another PAST time", async () => {
    // The scoreless branch above was made exact in an earlier round and this
    // one was left on `lte: settledAt`. The final was bound to the kickoff read
    // at the top of the transaction, within MAX_KICKOFF_DRIFT_MS, so a
    // correction to a DIFFERENT past time still satisfies `lte` while silently
    // invalidating that binding: the row would take a score matched to a
    // kickoff it no longer has (Devin Review, #717). Same fix, same reason, the
    // branch nobody was looking at.
    const CORRECTED = new Date(KICKOFF.getTime() - 60 * 60 * 1000);
    store.onAfterGameRead = (call) => {
      if (call === 1) store.game = { ...store.game, commenceTime: CORRECTED };
    };

    const written = await settleOnePickGuarded((fn) => store.run(fn), ARGS);

    expect(written.count).toBe(0);
    // A moved kickoff is a schedule correction, never a score conflict: telling
    // the operator SCORE would send them looking for a disagreeing final that
    // does not exist.
    expect(written.refusal).toBe("ROLLED_BACK_KICKOFF");
    expect(store.pick.result).toBe("PENDING");
    expect(store.game.commenceTime).toEqual(CORRECTED);
    // The score never landed on a row whose kickoff no longer matches it.
    expect(store.game.status).not.toBe("FINAL");
  });

  it("reports the CURRENT kickoff when the pick write is what refused, not the one we loaded", async () => {
    // Three code paths return KICKOFF_MOVED. Two carried kickoffAt from the
    // start; the one reached when the reread passes and the pick write's
    // relation filter then refuses did not, so the caller aged the refusal
    // against the kickoff this cycle loaded and classified a postponed game as
    // a lost write race instead of NOT_COMMENCED (CodeRabbit, #717).
    store.onAfterGameRead = (call) => {
      if (call === 1) store.game = { ...store.game, commenceTime: POSTPONED_TO };
    };

    const written = await settleOnePickGuarded((fn) => store.run(fn), {
      ...ARGS,
      result: "VOID",
      homeScore: null,
      awayScore: null,
    });

    expect(written.count).toBe(0);
    expect(written.refusal).toBe("KICKOFF_MOVED");
    expect(written.kickoffAt).toEqual(POSTPONED_TO);
    expect(store.pick.result).toBe("PENDING");
  });

  it("rethrows anything that is not the deliberate rollback", async () => {
    const boom = new Error("connection reset");
    await expect(
      settleOnePickGuarded(() => Promise.reject(boom), ARGS),
    ).rejects.toBe(boom);
  });
});
