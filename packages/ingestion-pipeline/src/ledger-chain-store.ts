/**
 * Glass Ledger durable store — Postgres persistence for ledger-chain.ts.
 *
 * The pure module owns hashing and invariants. This module owns I/O:
 *   - LEDGER_CHAIN_ENABLED === "true" or we do ZERO database work
 *   - append inside a transaction with pg_advisory_xact_lock(chainId)
 *   - unique (chainId, seq) is the race backstop; retry once
 *   - unique (chainId, entryType, pickId) is the idempotent stand-down
 *   - never throws to a caller — table-absent / lock-absent / unique
 *     collision / integrity errors become a skipped result
 *
 * `db` is accepted as `unknown` and cast to a hand-written surface, matching
 * line-archive.ts / watchlist db.ts: the Prisma delegate does not exist
 * until `prisma generate` runs against the F-9 schema. A missing delegate
 * or missing table is an honest skip, not a 500.
 *
 * Application code never UPDATE/DELETE these rows.
 */

import {
  GENESIS_HASH,
  LedgerIntegrityError,
  computeClvBps,
  mintPickEntry,
  mintSettlementEntry,
  pickCommittedPayload,
  settlementCommittedPayload,
  type LedgerEntry,
  type LedgerPickEntry,
  type LedgerSettlement,
  type PickEntryInput,
  type SettlementEntryInput,
} from "@sports/prediction-engine";

export const GLASS_LEDGER_CHAIN_ID = "glass-v1";
export const LEDGER_CHAIN_CANON_VERSION = 1;
export const LEDGER_CHAIN_HASH_ALG = "sha256";

export type LedgerChainEntryType = "PICK" | "SETTLEMENT";

export function isLedgerChainEnabled(): boolean {
  return process.env["LEDGER_CHAIN_ENABLED"] === "true";
}

export type LedgerChainSkipReason =
  | "flag_off"
  | "table_missing"
  | "delegate_missing"
  | "already_present"
  | "unknown_pick"
  | "integrity"
  | "error";

export type LedgerChainAppendResult =
  | {
      readonly ok: true;
      readonly seq: number;
      readonly entryHash: string;
      readonly entryType: LedgerChainEntryType;
    }
  | {
      readonly ok: false;
      readonly skipped: LedgerChainSkipReason;
      readonly message?: string;
    };

export type LedgerChainLoadResult =
  | { readonly ok: true; readonly entries: readonly LedgerEntry[] }
  | { readonly ok: false; readonly reason: "flag_off" | "table_missing" | "delegate_missing" | "error"; readonly message?: string };

interface StoredChainRow {
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

export interface LedgerChainTx {
  $queryRawUnsafe: (query: string, ...values: unknown[]) => Promise<unknown>;
  ledgerChainEntry: {
    findFirst(args: {
      where: Record<string, unknown>;
      orderBy?: Record<string, "asc" | "desc">;
    }): Promise<StoredChainRow | null>;
    create(args: { data: Record<string, unknown> }): Promise<StoredChainRow>;
  };
}

export interface LedgerChainDb {
  $transaction: <T>(
    fn: (tx: LedgerChainTx) => Promise<T>,
    options?: { isolationLevel?: "Serializable" | "RepeatableRead" | "ReadCommitted" },
  ) => Promise<T>;
  ledgerChainEntry?: {
    findFirst(args: {
      where: Record<string, unknown>;
      orderBy?: Record<string, "asc" | "desc">;
    }): Promise<StoredChainRow | null>;
    findMany(args: {
      where?: Record<string, unknown>;
      orderBy?: Record<string, "asc" | "desc">;
      take?: number;
      skip?: number;
    }): Promise<StoredChainRow[]>;
    create(args: { data: Record<string, unknown> }): Promise<StoredChainRow>;
  };
}

function asDb(db: unknown): LedgerChainDb {
  return db as LedgerChainDb;
}

function errorCode(error: unknown): string {
  return typeof error === "object" && error !== null && "code" in error
    ? String((error as { code: unknown }).code)
    : "";
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function isLedgerTableMissingError(error: unknown): boolean {
  const code = errorCode(error);
  const message = errorMessage(error);
  return (
    code === "P2021" ||
    message.includes("does not exist in the current database") ||
    message.includes('relation "ledger_chain_entries" does not exist')
  );
}

function isUniqueConstraintError(error: unknown): boolean {
  return errorCode(error) === "P2002" || /unique constraint/i.test(errorMessage(error));
}

function uniqueTarget(error: unknown): string {
  if (typeof error === "object" && error !== null && "meta" in error) {
    const meta = (error as { meta?: { target?: unknown } }).meta;
    if (Array.isArray(meta?.target)) return meta.target.map(String).join(",");
    if (typeof meta?.target === "string") return meta.target;
  }
  return errorMessage(error);
}

function isIdempotentUnique(error: unknown): boolean {
  const target = uniqueTarget(error).toLowerCase();
  return target.includes("entrytype") || target.includes("pickid");
}

async function lockChain(tx: LedgerChainTx, chainId: string): Promise<void> {
  if (typeof tx.$queryRawUnsafe !== "function") return;
  try {
    await tx.$queryRawUnsafe("SELECT pg_advisory_xact_lock(hashtext($1))", `gse-ledger-chain:${chainId}`);
  } catch {
    // Stub clients and non-Postgres adapters have no advisory locks.
    // Unique (chainId, seq) remains the race backstop.
  }
}

function rowToEntry(row: StoredChainRow): LedgerEntry {
  const body = JSON.parse(row.payload) as Record<string, unknown>;
  if (row.entryType === "SETTLEMENT") {
    return { ...(body as unknown as LedgerSettlement), entryHash: row.entryHash };
  }
  return { ...(body as unknown as LedgerPickEntry), entryHash: row.entryHash };
}

export interface PersistPickInput {
  readonly pickId: string;
  readonly sport: string;
  readonly market: string;
  readonly selection: string;
  readonly priceDecimal: number;
  readonly book: string;
  readonly decisionAt: string;
  readonly kickoffAt: string;
  readonly modelVersion: string;
  readonly featureSnapshotHash: string;
}

export interface PersistSettlementInput {
  readonly pickId: string;
  readonly settledAt: string;
  readonly outcome: "WIN" | "LOSS" | "PUSH" | "VOID";
  readonly closingPriceDecimal: number | null;
  readonly clvBps: number | null;
}

async function persistEntry(
  db: LedgerChainDb,
  chainId: string,
  build: (linkage: { seq: number; prevHash: string }, tx: LedgerChainTx) => Promise<{
    entryType: LedgerChainEntryType;
    pickId: string;
    payload: string;
    entryHash: string;
    seq: number;
    prevHash: string;
    modelVersion: string | null;
    occurredAt: Date;
  }>,
): Promise<LedgerChainAppendResult> {
  const delegate = db.ledgerChainEntry;
  if (!delegate) {
    return { ok: false, skipped: "delegate_missing" };
  }

  const MAX_ATTEMPTS = 2;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const written = await db.$transaction(async (tx) => {
        await lockChain(tx, chainId);
        const tail = await tx.ledgerChainEntry.findFirst({
          where: { chainId },
          orderBy: { seq: "desc" },
        });
        const linkage = tail
          ? { seq: tail.seq + 1, prevHash: tail.entryHash }
          : { seq: 0, prevHash: GENESIS_HASH };
        const built = await build(linkage, tx);
        await tx.ledgerChainEntry.create({
          data: {
            chainId,
            seq: built.seq,
            prevHash: built.prevHash,
            entryHash: built.entryHash,
            entryType: built.entryType,
            pickId: built.pickId,
            payload: built.payload,
            hashAlg: LEDGER_CHAIN_HASH_ALG,
            canonVersion: LEDGER_CHAIN_CANON_VERSION,
            modelVersion: built.modelVersion,
            occurredAt: built.occurredAt,
          },
        });
        return built;
      });
      return {
        ok: true,
        seq: written.seq,
        entryHash: written.entryHash,
        entryType: written.entryType,
      };
    } catch (error) {
      if (isLedgerTableMissingError(error)) {
        return { ok: false, skipped: "table_missing", message: errorMessage(error) };
      }
      if (isUniqueConstraintError(error) && isIdempotentUnique(error)) {
        return { ok: false, skipped: "already_present", message: errorMessage(error) };
      }
      if (isUniqueConstraintError(error) && attempt < MAX_ATTEMPTS) {
        continue;
      }
      if (error instanceof LedgerIntegrityError && error.code === "UNKNOWN_PICK") {
        return { ok: false, skipped: "unknown_pick", message: error.message };
      }
      if (error instanceof LedgerIntegrityError) {
        return { ok: false, skipped: "integrity", message: error.message };
      }
      return { ok: false, skipped: "error", message: errorMessage(error) };
    }
  }
  return { ok: false, skipped: "error", message: "ledger-chain-store: exhausted append retries" };
}

/**
 * Append a pick entry. No-ops with skipped:flag_off unless the founder flag
 * is the literal string "true". Never throws.
 */
export async function appendPickToChain(
  db: unknown,
  input: PersistPickInput,
  options?: { readonly chainId?: string },
): Promise<LedgerChainAppendResult> {
  if (!isLedgerChainEnabled()) return { ok: false, skipped: "flag_off" };
  const chainId = options?.chainId ?? GLASS_LEDGER_CHAIN_ID;
  try {
    return await persistEntry(asDb(db), chainId, async (linkage) => {
      const pickInput: PickEntryInput = {
        seq: linkage.seq,
        prevHash: linkage.prevHash,
        pickId: input.pickId,
        sport: input.sport,
        market: input.market,
        selection: input.selection,
        priceDecimal: input.priceDecimal,
        book: input.book,
        decisionAt: input.decisionAt,
        kickoffAt: input.kickoffAt,
        modelVersion: input.modelVersion,
        featureSnapshotHash: input.featureSnapshotHash,
      };
      const entry = mintPickEntry(pickInput);
      return {
        entryType: "PICK",
        pickId: entry.pickId,
        payload: pickCommittedPayload(pickInput),
        entryHash: entry.entryHash,
        seq: entry.seq,
        prevHash: entry.prevHash,
        modelVersion: entry.modelVersion,
        occurredAt: new Date(entry.decisionAt),
      };
    });
  } catch (error) {
    return { ok: false, skipped: "error", message: errorMessage(error) };
  }
}

/**
 * Append a settlement entry. Requires a prior PICK row for the same pickId
 * on this chain (UNKNOWN_PICK is a skip, not a throw). Never throws.
 */
export async function appendSettlementToChain(
  db: unknown,
  input: PersistSettlementInput,
  options?: { readonly chainId?: string },
): Promise<LedgerChainAppendResult> {
  if (!isLedgerChainEnabled()) return { ok: false, skipped: "flag_off" };
  const chainId = options?.chainId ?? GLASS_LEDGER_CHAIN_ID;
  try {
    return await persistEntry(asDb(db), chainId, async (linkage, tx) => {
      const priorPick = await tx.ledgerChainEntry.findFirst({
        where: { chainId, entryType: "PICK", pickId: input.pickId },
      });
      if (!priorPick) {
        throw new LedgerIntegrityError(
          `settlement references pickId "${input.pickId}" which is not in the chain`,
          "UNKNOWN_PICK",
          linkage.seq,
        );
      }
      const settlementInput: SettlementEntryInput = {
        seq: linkage.seq,
        prevHash: linkage.prevHash,
        pickId: input.pickId,
        settledAt: input.settledAt,
        outcome: input.outcome,
        closingPriceDecimal: input.closingPriceDecimal,
        clvBps: input.clvBps,
      };
      const entry = mintSettlementEntry(settlementInput);
      return {
        entryType: "SETTLEMENT",
        pickId: entry.pickId,
        payload: settlementCommittedPayload(settlementInput),
        entryHash: entry.entryHash,
        seq: entry.seq,
        prevHash: entry.prevHash,
        modelVersion: null,
        occurredAt: new Date(entry.settledAt),
      };
    });
  } catch (error) {
    if (error instanceof LedgerIntegrityError && error.code === "UNKNOWN_PICK") {
      return { ok: false, skipped: "unknown_pick", message: error.message };
    }
    return { ok: false, skipped: "error", message: errorMessage(error) };
  }
}

/**
 * Load chain rows in seq order for the open verifier / export endpoint.
 * Empty chain is `{ ok: true, entries: [] }`, not an error.
 * Flag-off still returns entries if the caller is a public export that
 * should be readable independently of the write flag — pass
 * `{ ignoreWriteFlag: true }`.
 */
export async function loadLedgerChain(
  db: unknown,
  options?: {
    readonly chainId?: string;
    readonly ignoreWriteFlag?: boolean;
    readonly take?: number;
    readonly afterSeq?: number;
  },
): Promise<LedgerChainLoadResult> {
  if (!options?.ignoreWriteFlag && !isLedgerChainEnabled()) {
    // Reads for the public export ignore this; internal callers default to the write flag
    // so a disabled chain is not probed.
    return { ok: false, reason: "flag_off" };
  }
  const client = asDb(db);
  const delegate = client.ledgerChainEntry;
  if (!delegate) return { ok: false, reason: "delegate_missing" };
  const chainId = options?.chainId ?? GLASS_LEDGER_CHAIN_ID;
  try {
    const rows = await delegate.findMany({
      where: {
        chainId,
        ...(typeof options?.afterSeq === "number" ? { seq: { gt: options.afterSeq } } : {}),
      },
      orderBy: { seq: "asc" },
      take: options?.take,
    });
    return { ok: true, entries: rows.map(rowToEntry) };
  } catch (error) {
    if (isLedgerTableMissingError(error)) {
      return { ok: false, reason: "table_missing", message: errorMessage(error) };
    }
    return { ok: false, reason: "error", message: errorMessage(error) };
  }
}

/**
 * Derive settlement CLV fields from a stored pick's decision price and an
 * optional closing decimal. Both-null when either side is missing — never
 * a one-sided CLV (ledger-chain.ts paired-field contract).
 */
export function pairedClosingFields(
  decisionPriceDecimal: number | null,
  closingPriceDecimal: number | null,
): { closingPriceDecimal: number | null; clvBps: number | null } {
  if (
    decisionPriceDecimal === null ||
    closingPriceDecimal === null ||
    !(decisionPriceDecimal > 1) ||
    !(closingPriceDecimal > 1)
  ) {
    return { closingPriceDecimal: null, clvBps: null };
  }
  try {
    return {
      closingPriceDecimal,
      clvBps: computeClvBps(decisionPriceDecimal, closingPriceDecimal),
    };
  } catch {
    return { closingPriceDecimal: null, clvBps: null };
  }
}

/** American → decimal. Returns null rather than throwing on junk. */
export function americanToDecimalOrNull(american: number | null | undefined): number | null {
  if (typeof american !== "number" || !Number.isFinite(american) || american === 0) return null;
  const decimal = american > 0 ? 1 + american / 100 : 1 + 100 / Math.abs(american);
  return decimal > 1 ? decimal : null;
}
