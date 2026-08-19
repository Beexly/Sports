/**
 * LedgerStore — runtime persistence for the Glass Ledger hash chain.
 *
 * This is the bridge between the pure chain-math in `ledger-chain.ts` and
 * the runtime ingestion pipeline. It is intentionally tiny:
 *   - default OFF (feature flag `LEDGER_CHAIN_ENABLED`)
 *   - in-memory with optional JSON file fallback for durability across
 *     restarts (not required for the proof, but nice to have)
 *   - never throws to callers — append failures are logged and swallowed,
 *     exactly like the receipt-mint pattern in `process-sport.ts`
 *
 * DO NOT import this from any browser/client bundle. It is server-only.
 */

import { GENESIS_HASH, appendPick, appendSettlement, type LedgerChain } from "./ledger-chain.js";

const LEDGER_STATE_FILE = process.env.LEDGER_STATE_FILE ?? "";
const LEDGER_CHAIN_ENABLED = process.env.LEDGER_CHAIN_ENABLED === "true";

let chain: LedgerChain = [];
let initialized = false;

async function loadFromDisk(): Promise<LedgerChain> {
  if (!LEDGER_STATE_FILE) return [];
  try {
    const fs = await import("node:fs");
    if (!fs.existsSync(LEDGER_STATE_FILE)) return [];
    const raw = await fs.promises.readFile(LEDGER_STATE_FILE, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed as LedgerChain;
  } catch {
    return [];
  }
}

async function saveToDisk(next: LedgerChain): Promise<void> {
  if (!LEDGER_STATE_FILE) return;
  try {
    const fs = await import("node:fs");
    await fs.promises.writeFile(LEDGER_STATE_FILE, JSON.stringify(next, null, 2), "utf8");
  } catch {
    // non-fatal: disk full or permission issue should not break the chain
  }
}

async function ensureInitialized(): Promise<LedgerChain> {
  if (!initialized) {
    initialized = true;
    chain = await loadFromDisk();
  }
  return chain;
}

export function isLedgerChainEnabled(): boolean {
  return LEDGER_CHAIN_ENABLED;
}

export async function getLedgerChain(): Promise<LedgerChain> {
  return ensureInitialized();
}

export async function appendPickToChain(pick: {
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
}): Promise<LedgerChain> {
  if (!LEDGER_CHAIN_ENABLED) return ensureInitialized();
  const current = await ensureInitialized();
  try {
    const next = appendPick(current, {
      seq: current.length,
      prevHash: current.length === 0 ? GENESIS_HASH : current[current.length - 1]!.entryHash,
      ...pick,
    });
    await saveToDisk(next);
    chain = next;
    return next;
  } catch (err) {
    console.warn("[ledger-store] appendPick failed:", err instanceof Error ? err.message : err);
    return current;
  }
}

export async function appendSettlementToChain(settlement: {
  readonly pickId: string;
  readonly settledAt: string;
  readonly outcome: "WIN" | "LOSS" | "PUSH" | "VOID";
  readonly closingPriceDecimal: number | null;
  readonly clvBps: number | null;
}): Promise<LedgerChain> {
  if (!LEDGER_CHAIN_ENABLED) return ensureInitialized();
  const current = await ensureInitialized();
  try {
    const next = appendSettlement(current, {
      seq: current.length,
      prevHash: current.length === 0 ? GENESIS_HASH : current[current.length - 1]!.entryHash,
      ...settlement,
    });
    await saveToDisk(next);
    chain = next;
    return next;
  } catch (err) {
    console.warn("[ledger-store] appendSettlement failed:", err instanceof Error ? err.message : err);
    return current;
  }
}
