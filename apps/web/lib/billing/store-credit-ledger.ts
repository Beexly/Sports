/**
 * Store-credit ledger — PURE rule engine + injectable persistence seam.
 *
 * Rule (owner directive 2026-11-13): after a single-slate pack settles, sum
 * the net units of its official plays (flat 1u stake per play, graded at the
 * locked American price). If the pack net is at or below 0.00u AND the buyer
 * paid the credit-back tier, mint store credit worth 100% of the pack price.
 * The buyer may instead elect a flat $35 upgrade credit toward Door 1
 * (Season Membership). The choice is recorded once.
 *
 * Idempotency: minting is keyed on (purchaseId, slateKey) — a purchase can
 * never be double-minted, even if settlement runs twice.
 *
 * Persistence: no suitable existing table carries store-credit mints
 * (checkout_attempts is Stripe-checkout-specific; revenue_event is an
 * append-only log without a uniqueness seam). This module therefore ships the
 * store INTERFACE plus an in-memory adapter. Durable persistence needs a
 * migration adding e.g. store_credit_mints with UNIQUE(purchaseId, slateKey);
 * until then, wire `InMemoryStoreCreditStore` (or implement the interface
 * against your own durable store). No migrations are created here.
 */

// ---------------------------------------------------------------------------
// Odds math
// ---------------------------------------------------------------------------

/**
 * Convert an American price to decimal odds.
 *   -110 -> 1.909090...   (+100 profit risked per 110)
 *   +150 -> 2.5           (150 profit per 100)
 * Throws on invalid prices (|price| < 100, zero, non-finite, non-integer).
 */
export function americanToDecimal(americanPrice: number): number {
  if (!Number.isFinite(americanPrice) || !Number.isInteger(americanPrice)) {
    throw new Error(`American price must be an integer, got ${americanPrice}`);
  }
  if (americanPrice === 0 || Math.abs(americanPrice) < 100) {
    throw new Error(`American price magnitude must be >= 100, got ${americanPrice}`);
  }
  return americanPrice > 0
    ? 1 + americanPrice / 100
    : 1 + 100 / Math.abs(americanPrice);
}

export type SettledPlayResult = "WIN" | "LOSS" | "PUSH" | "VOID";

export interface PackPlayOutcome {
  readonly pickId: string;
  readonly result: SettledPlayResult;
  /** Locked American price at publish (e.g. -110, +150). */
  readonly americanPrice: number;
}

/**
 * Net units for one official play at a flat 1u stake:
 *   WIN  -> decimal odds - 1 (profit)
 *   LOSS -> -1u
 *   PUSH -> 0u (stake returned)
 *   VOID -> 0u (stake returned; cancelled/no-action)
 */
export function playNetUnits(play: PackPlayOutcome): number {
  switch (play.result) {
    case "WIN":
      return americanToDecimal(play.americanPrice) - 1;
    case "LOSS":
      return -1;
    case "PUSH":
    case "VOID":
      return 0;
    default: {
      const exhaustive: never = play.result;
      throw new Error(`Unknown play result: ${String(exhaustive)}`);
    }
  }
}

/** Net-unit comparison precision: 0.0001u (float-safe at 1u stakes). */
const NET_UNIT_PRECISION = 10_000;

/** Sum of official-play net units, rounded to 4 decimal places. */
export function packNetUnits(plays: readonly PackPlayOutcome[]): number {
  const net = plays.reduce((sum, play) => sum + playNetUnits(play), 0);
  return Math.round(net * NET_UNIT_PRECISION) / NET_UNIT_PRECISION;
}

// ---------------------------------------------------------------------------
// Mint records + store seam
// ---------------------------------------------------------------------------

export type CreditChoice = "store-credit" | "upgrade-credit";

/** Flat upgrade credit toward Door 1, per founder rule (3500 cents). */
export const UPGRADE_CREDIT_CENTS = 3500;

export interface StoreCreditMintRecord {
  readonly purchaseId: string;
  readonly slateKey: string;
  /** What the buyer actually paid for the pack (cents). */
  readonly packPriceCents: number;
  readonly netUnits: number;
  /** 100% of pack price — the store-credit option. */
  readonly creditBackCents: number;
  /** Flat $35 — the upgrade-credit option. */
  readonly upgradeCreditCents: number;
  /** Which option the buyer elected (recorded once). */
  readonly choice: CreditChoice;
  /** Cents actually granted under the recorded choice. */
  readonly grantedCents: number;
  readonly mintedAt: string;
}

export function mintKey(purchaseId: string, slateKey: string): string {
  return `${purchaseId}::${slateKey}`;
}

/**
 * Persistence seam. A durable implementation MUST enforce uniqueness on
 * (purchaseId, slateKey) at the storage layer (e.g. a UNIQUE constraint) so
 * concurrent settlements cannot double-mint across processes.
 */
export interface StoreCreditStore {
  getMint(purchaseId: string, slateKey: string): Promise<StoreCreditMintRecord | null>;
  /** Persist a mint. Must never overwrite an existing mint for the same key. */
  putMint(record: StoreCreditMintRecord): Promise<void>;
}

/** In-memory adapter (dev/test). Process-local; not durable across restarts. */
export class InMemoryStoreCreditStore implements StoreCreditStore {
  private readonly mints = new Map<string, StoreCreditMintRecord>();

  async getMint(purchaseId: string, slateKey: string): Promise<StoreCreditMintRecord | null> {
    return this.mints.get(mintKey(purchaseId, slateKey)) ?? null;
  }

  async putMint(record: StoreCreditMintRecord): Promise<void> {
    const key = mintKey(record.purchaseId, record.slateKey);
    // Never overwrite: first mint wins, even under a same-process race.
    if (!this.mints.has(key)) {
      this.mints.set(key, record);
    }
  }

  /** Test/helper introspection. */
  size(): number {
    return this.mints.size;
  }
}

// ---------------------------------------------------------------------------
// Settlement rule engine
// ---------------------------------------------------------------------------

export type PackTier = "standard" | "credit-back";

export interface SettlePackInput {
  readonly purchaseId: string;
  readonly slateKey: string;
  /** Cents the buyer actually paid (the tier price at purchase time). */
  readonly packPriceCents: number;
  readonly tier: PackTier;
  readonly plays: readonly PackPlayOutcome[];
  /** Buyer's election; defaults to full store credit. */
  readonly choice?: CreditChoice;
  readonly now?: Date;
}

export type SettlePackReason =
  | "minted"
  | "already-minted"
  | "net-positive"
  | "standard-tier";

export interface SettlePackResult {
  readonly purchaseId: string;
  readonly slateKey: string;
  readonly netUnits: number;
  readonly minted: boolean;
  /** True when a mint already existed for (purchaseId, slateKey). */
  readonly duplicate: boolean;
  readonly reason: SettlePackReason;
  readonly record: StoreCreditMintRecord | null;
}

/**
 * Settle a purchased pack and mint store credit when the protection rule
 * fires. PURE with respect to business rules; all persistence goes through
 * the injected store. Idempotent per (purchaseId, slateKey).
 */
export async function settlePack(
  input: SettlePackInput,
  store: StoreCreditStore,
): Promise<SettlePackResult> {
  if (!input.purchaseId || !input.slateKey) {
    throw new Error("settlePack requires purchaseId and slateKey");
  }
  if (!Number.isInteger(input.packPriceCents) || input.packPriceCents < 0) {
    throw new Error(`packPriceCents must be a non-negative integer, got ${input.packPriceCents}`);
  }

  const netUnits = packNetUnits(input.plays);

  // Idempotency first: an existing mint is returned untouched, never re-minted.
  const existing = await store.getMint(input.purchaseId, input.slateKey);
  if (existing) {
    return {
      purchaseId: input.purchaseId,
      slateKey: input.slateKey,
      netUnits: existing.netUnits,
      minted: false,
      duplicate: true,
      reason: "already-minted",
      record: existing,
    };
  }

  if (input.tier !== "credit-back") {
    return {
      purchaseId: input.purchaseId,
      slateKey: input.slateKey,
      netUnits,
      minted: false,
      duplicate: false,
      reason: "standard-tier",
      record: null,
    };
  }

  if (netUnits > 0) {
    return {
      purchaseId: input.purchaseId,
      slateKey: input.slateKey,
      netUnits,
      minted: false,
      duplicate: false,
      reason: "net-positive",
      record: null,
    };
  }

  const choice: CreditChoice = input.choice ?? "store-credit";
  const record: StoreCreditMintRecord = {
    purchaseId: input.purchaseId,
    slateKey: input.slateKey,
    packPriceCents: input.packPriceCents,
    netUnits,
    creditBackCents: input.packPriceCents,
    upgradeCreditCents: UPGRADE_CREDIT_CENTS,
    choice,
    grantedCents: choice === "upgrade-credit" ? UPGRADE_CREDIT_CENTS : input.packPriceCents,
    mintedAt: (input.now ?? new Date()).toISOString(),
  };
  await store.putMint(record);

  return {
    purchaseId: input.purchaseId,
    slateKey: input.slateKey,
    netUnits,
    minted: true,
    duplicate: false,
    reason: "minted",
    record,
  };
}

/**
 * Convenience alias matching the owner-spec naming: mint store credit for a
 * settled pack. Same engine, same idempotency.
 */
export const mintStoreCredit = settlePack;

export {
  FOUNDING_ALL_ACCESS_CAP,
  FOUNDING_ALL_ACCESS_MONTHLY_CENTS,
  STANDARD_ALL_ACCESS_MONTHLY_CENTS,
  ROS_PLAYOFFS_PASS_CENTS,
  ALL_ACCESS_UPGRADE_BRIDGE_CENTS,
  type StorefrontDoor,
  type Door1MembershipSku,
  type Door2PackSku,
  type OfficialPlayGradeStatus,
  type OfficialGradedPlay,
  type Door2PackPurchase,
  type StoreCreditEntryKind,
  type StoreCreditLedgerEntry,
  type SettlementCreditOutcomeStatus,
  type SettlementCreditEvaluation,
  type AllAccessUpgradeQuote,
  type AllAccessUpgradeResult,
  type StoreCreditRepository,
  type StripeCustomerBalanceGateway,
  type TelemetryGateway,
  DOOR_2_PACK_CATALOG,
  sha256Hex,
  buildSettlementCreditIdempotencyKey,
  computeOfficialPlayNetUnits,
  summarizePackSettlementUnits,
  InMemoryStoreCreditRepository,
  StoreCreditLedgerService,
} from "./store-credit-ledger-v2";
