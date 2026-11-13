/**
 * Durable StoreCreditStore adapter (WP-5).
 *
 * Persists mints in public.store_credit_mints (migration SQL shipped beside
 * this file: store-credit-mints.sql). The PRIMARY KEY (purchase_id, slate_key)
 * is the cross-process double-mint guard; putMint uses ON CONFLICT DO NOTHING
 * so the first mint wins forever, exactly as the StoreCreditStore contract
 * requires.
 *
 * Until the migration is applied the store reports itself unavailable and
 * callers must gate cleanly (never fake a mint). No auto-DDL: schema changes
 * belong to the DB owner, not to request handlers.
 */

import { db } from "@sports/db";
import type { StoreCreditMintRecord, StoreCreditStore } from "./store-credit-ledger";

interface MintRow {
  purchase_id: string;
  slate_key: string;
  pack_price_cents: number;
  net_units: number;
  credit_back_cents: number;
  upgrade_credit_cents: number;
  choice: string;
  granted_cents: number;
  minted_at: Date | string;
}

function rowToRecord(row: MintRow): StoreCreditMintRecord {
  return {
    purchaseId: row.purchase_id,
    slateKey: row.slate_key,
    packPriceCents: Number(row.pack_price_cents),
    netUnits: Number(row.net_units),
    creditBackCents: Number(row.credit_back_cents),
    upgradeCreditCents: Number(row.upgrade_credit_cents),
    choice: row.choice === "upgrade-credit" ? "upgrade-credit" : "store-credit",
    grantedCents: Number(row.granted_cents),
    mintedAt:
      row.minted_at instanceof Date ? row.minted_at.toISOString() : String(row.minted_at),
  };
}

export class PrismaStoreCreditStore implements StoreCreditStore {
  async getMint(purchaseId: string, slateKey: string): Promise<StoreCreditMintRecord | null> {
    const rows = (await db.$queryRawUnsafe(
      `SELECT purchase_id, slate_key, pack_price_cents, net_units, credit_back_cents,
              upgrade_credit_cents, choice, granted_cents, minted_at
         FROM public.store_credit_mints
        WHERE purchase_id = $1 AND slate_key = $2
        LIMIT 1`,
      purchaseId,
      slateKey,
    )) as MintRow[];
    return rows.length > 0 ? rowToRecord(rows[0]!) : null;
  }

  async putMint(record: StoreCreditMintRecord): Promise<void> {
    // First mint wins: the PK conflict is swallowed, never an overwrite.
    await db.$executeRawUnsafe(
      `INSERT INTO public.store_credit_mints
         (purchase_id, slate_key, pack_price_cents, net_units, credit_back_cents,
          upgrade_credit_cents, choice, granted_cents, minted_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::timestamptz)
       ON CONFLICT (purchase_id, slate_key) DO NOTHING`,
      record.purchaseId,
      record.slateKey,
      record.packPriceCents,
      record.netUnits,
      record.creditBackCents,
      record.upgradeCreditCents,
      record.choice,
      record.grantedCents,
      record.mintedAt,
    );
  }
}

let availabilityCache: { value: boolean; at: number } | null = null;
const AVAILABILITY_TTL_MS = 60_000;

/**
 * True when the mints table exists. Cached for a minute so a missing
 * migration does not cost a probe per request; a freshly applied migration
 * is picked up within the TTL without a restart.
 */
export async function isStoreCreditStoreAvailable(): Promise<boolean> {
  const now = Date.now();
  if (availabilityCache && now - availabilityCache.at < AVAILABILITY_TTL_MS) {
    return availabilityCache.value;
  }
  let value = false;
  try {
    const rows = (await db.$queryRawUnsafe(
      `SELECT to_regclass('public.store_credit_mints') AS present`,
    )) as Array<{ present: string | null }>;
    value = rows.length > 0 && rows[0]!.present !== null;
  } catch {
    value = false;
  }
  availabilityCache = { value, at: now };
  return value;
}