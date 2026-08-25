import { afterEach, describe, expect, it, vi } from "vitest";
import {
  GENESIS_HASH,
  mintPickEntry,
  verifyChain,
} from "@sports/prediction-engine";
import {
  GLASS_LEDGER_CHAIN_ID,
  americanToDecimalOrNull,
  appendPickToChain,
  appendSettlementToChain,
  isLedgerChainEnabled,
  loadLedgerChain,
  pairedClosingFields,
  type LedgerChainDb,
} from "../ledger-chain-store.js";

const HASH64 = "a".repeat(64);

interface Row {
  id: string;
  chainId: string;
  seq: number;
  prevHash: string;
  entryHash: string;
  entryType: string;
  pickId: string;
  payload: string;
  hashAlg: string;
  canonVersion: number;
  modelVersion: string | null;
  occurredAt: Date;
  createdAt: Date;
}

function makeDb(seed: Row[] = []): LedgerChainDb & { rows: Row[]; transactionCalls: number } {
  const rows = [...seed];
  let n = 0;
  const delegate = {
    async findFirst(args: { where: Record<string, unknown>; orderBy?: Record<string, "asc" | "desc"> }) {
      const where = args.where;
      let found = rows.filter((r) => {
        if (where["chainId"] && r.chainId !== where["chainId"]) return false;
        if (where["entryType"] && r.entryType !== where["entryType"]) return false;
        if (where["pickId"] && r.pickId !== where["pickId"]) return false;
        return true;
      });
      if (args.orderBy?.["seq"] === "desc") {
        found = [...found].sort((a, b) => b.seq - a.seq);
      }
      return found[0] ?? null;
    },
    async findMany(args: {
      where?: Record<string, unknown>;
      orderBy?: Record<string, "asc" | "desc">;
      take?: number;
    }) {
      const where = args.where ?? {};
      let found = rows.filter((r) => {
        if (where["chainId"] && r.chainId !== where["chainId"]) return false;
        const seq = where["seq"] as { gt?: number } | undefined;
        if (seq && typeof seq.gt === "number" && !(r.seq > seq.gt)) return false;
        return true;
      });
      if (args.orderBy?.["seq"] === "asc") found = [...found].sort((a, b) => a.seq - b.seq);
      if (typeof args.take === "number") found = found.slice(0, args.take);
      return found;
    },
    async create(args: { data: Record<string, unknown> }) {
      const data = args.data;
      const row: Row = {
        id: `id-${++n}`,
        chainId: String(data["chainId"]),
        seq: Number(data["seq"]),
        prevHash: String(data["prevHash"]),
        entryHash: String(data["entryHash"]),
        entryType: String(data["entryType"]),
        pickId: String(data["pickId"]),
        payload: String(data["payload"]),
        hashAlg: String(data["hashAlg"]),
        canonVersion: Number(data["canonVersion"]),
        modelVersion: (data["modelVersion"] as string | null) ?? null,
        occurredAt: data["occurredAt"] as Date,
        createdAt: new Date("2026-08-20T00:00:00.000Z"),
      };
      if (rows.some((r) => r.chainId === row.chainId && r.seq === row.seq)) {
        const err = Object.assign(new Error("Unique constraint failed on chainId,seq"), {
          code: "P2002",
          meta: { target: ["chainId", "seq"] },
        });
        throw err;
      }
      if (rows.some((r) => r.chainId === row.chainId && r.entryType === row.entryType && r.pickId === row.pickId)) {
        const err = Object.assign(new Error("Unique constraint failed on chainId,entryType,pickId"), {
          code: "P2002",
          meta: { target: ["chainId", "entryType", "pickId"] },
        });
        throw err;
      }
      rows.push(row);
      return row;
    },
  };
  const db: LedgerChainDb & { rows: Row[]; transactionCalls: number } = {
    rows,
    transactionCalls: 0,
    ledgerChainEntry: delegate,
    $transaction: async (fn) => {
      db.transactionCalls += 1;
      return fn({
        $queryRawUnsafe: async () => [],
        ledgerChainEntry: delegate,
      });
    },
  };
  return db;
}

const pickFields = {
  pickId: "pick-1",
  sport: "NFL",
  market: "SPREAD",
  selection: "Chiefs -3.5",
  priceDecimal: 1.91,
  book: "consensus",
  decisionAt: "2026-09-10T17:00:00.000Z",
  kickoffAt: "2026-09-10T20:00:00.000Z",
  modelVersion: "v5.1.0",
  featureSnapshotHash: HASH64,
};

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("isLedgerChainEnabled", () => {
  it("is off unless the literal string true", () => {
    vi.unstubAllEnvs();
    expect(isLedgerChainEnabled()).toBe(false);
    vi.stubEnv("LEDGER_CHAIN_ENABLED", "TRUE");
    expect(isLedgerChainEnabled()).toBe(false);
    vi.stubEnv("LEDGER_CHAIN_ENABLED", "true");
    expect(isLedgerChainEnabled()).toBe(true);
  });
});

describe("appendPickToChain", () => {
  it("does ZERO database work when the flag is off", async () => {
    vi.stubEnv("LEDGER_CHAIN_ENABLED", "false");
    const db = makeDb();
    const result = await appendPickToChain(db, pickFields);
    expect(result).toEqual({ ok: false, skipped: "flag_off" });
    expect(db.transactionCalls).toBe(0);
    expect(db.rows).toHaveLength(0);
  });

  it("mints seq 0 against GENESIS_HASH and round-trips through verifyChain", async () => {
    vi.stubEnv("LEDGER_CHAIN_ENABLED", "true");
    const db = makeDb();
    const result = await appendPickToChain(db, pickFields);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.seq).toBe(0);
    expect(db.rows[0]!.prevHash).toBe(GENESIS_HASH);
    expect(db.rows[0]!.chainId).toBe(GLASS_LEDGER_CHAIN_ID);
    expect(db.rows[0]!.entryType).toBe("PICK");

    const expected = mintPickEntry({
      ...pickFields,
      seq: 0,
      prevHash: GENESIS_HASH,
    });
    expect(result.entryHash).toBe(expected.entryHash);

    const loaded = await loadLedgerChain(db, { ignoreWriteFlag: true });
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    expect(verifyChain(loaded.entries)).toEqual({ valid: true });
  });

  it("links the second pick to the first entryHash", async () => {
    vi.stubEnv("LEDGER_CHAIN_ENABLED", "true");
    const db = makeDb();
    const first = await appendPickToChain(db, pickFields);
    const second = await appendPickToChain(db, { ...pickFields, pickId: "pick-2" });
    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    expect(second.seq).toBe(1);
    expect(db.rows[1]!.prevHash).toBe(first.entryHash);
  });

  it("treats a duplicate pick as already_present, not a fork", async () => {
    vi.stubEnv("LEDGER_CHAIN_ENABLED", "true");
    const db = makeDb();
    await appendPickToChain(db, pickFields);
    const again = await appendPickToChain(db, pickFields);
    expect(again).toMatchObject({ ok: false, skipped: "already_present" });
    expect(db.rows).toHaveLength(1);
  });

  it("skips honestly when the table is missing", async () => {
    vi.stubEnv("LEDGER_CHAIN_ENABLED", "true");
    const db = makeDb();
    db.$transaction = async () => {
      throw Object.assign(new Error('relation "ledger_chain_entries" does not exist'), { code: "P2021" });
    };
    const result = await appendPickToChain(db, pickFields);
    expect(result).toMatchObject({ ok: false, skipped: "table_missing" });
  });

  it("skips when the Prisma delegate has not been generated yet", async () => {
    vi.stubEnv("LEDGER_CHAIN_ENABLED", "true");
    const db = { $transaction: vi.fn() };
    const result = await appendPickToChain(db, pickFields);
    expect(result).toEqual({ ok: false, skipped: "delegate_missing" });
    expect(db.$transaction).not.toHaveBeenCalled();
  });
});

describe("appendSettlementToChain", () => {
  it("refuses a settlement for a pick that is not on the chain", async () => {
    vi.stubEnv("LEDGER_CHAIN_ENABLED", "true");
    const db = makeDb();
    const result = await appendSettlementToChain(db, {
      pickId: "ghost",
      settledAt: "2026-09-11T00:00:00.000Z",
      outcome: "WIN",
      closingPriceDecimal: null,
      clvBps: null,
    });
    expect(result).toMatchObject({ ok: false, skipped: "unknown_pick" });
    expect(db.rows).toHaveLength(0);
  });

  it("appends a settlement after its pick and keeps verifyChain green", async () => {
    vi.stubEnv("LEDGER_CHAIN_ENABLED", "true");
    const db = makeDb();
    await appendPickToChain(db, pickFields);
    const settled = await appendSettlementToChain(db, {
      pickId: pickFields.pickId,
      settledAt: "2026-09-11T00:00:00.000Z",
      outcome: "WIN",
      closingPriceDecimal: 1.87,
      clvBps: 220,
    });
    expect(settled.ok).toBe(true);
    if (!settled.ok) return;
    expect(settled.seq).toBe(1);
    const loaded = await loadLedgerChain(db, { ignoreWriteFlag: true });
    expect(loaded.ok && loaded.ok && verifyChain(loaded.entries).valid).toBe(true);
  });
});

describe("loadLedgerChain", () => {
  it("returns an empty array, not an error, for a live empty table", async () => {
    vi.stubEnv("LEDGER_CHAIN_ENABLED", "true");
    const db = makeDb();
    const loaded = await loadLedgerChain(db, { ignoreWriteFlag: true });
    expect(loaded).toEqual({ ok: true, entries: [] });
  });
});

describe("odds helpers", () => {
  it("converts American prices and refuses junk", () => {
    expect(americanToDecimalOrNull(-110)).toBeCloseTo(1.90909, 4);
    expect(americanToDecimalOrNull(150)).toBe(2.5);
    expect(americanToDecimalOrNull(0)).toBeNull();
    expect(americanToDecimalOrNull(null)).toBeNull();
  });

  it("pairs CLV or returns both-null — never one-sided", () => {
    const paired = pairedClosingFields(2.1, 1.95);
    expect(paired.closingPriceDecimal).toBe(1.95);
    expect(paired.clvBps).toBeCloseTo(366.3, 1);
    expect(pairedClosingFields(2.1, null)).toEqual({ closingPriceDecimal: null, clvBps: null });
  });
});
