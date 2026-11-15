/**
 * Galaxy Sports Edge — Contractual Store-Credit Alignment & Upgrade Bridge Ledger
 * Target Monorepo Path: apps/web/lib/billing/store-credit-ledger.ts
 *
 * Implements:
 * 1. Deterministic, idempotent post-settlement 100% Store-Credit minting when
 *    graded official plays in an aligned Door 2 pack finish <= 0.00u net units.
 * 2. One-click Store-Credit redemption on subsequent Door 2 packs.
 * 3. $35.00 (3500 cents) All-Access Upgrade Bridge Credit toward Door 1
 *    $59.99/mo Founding All-Access Membership ($24.99 net first month).
 * 4. Pluggable Stripe Customer Balance, DB Repository, PostHog (Project 516325),
 *    and Sentry telemetry adapters + an in-memory transactional store for tests.
 */

import { createHash } from 'crypto';

export const FOUNDING_ALL_ACCESS_CAP = 100;
export const FOUNDING_ALL_ACCESS_MONTHLY_CENTS = 5999; // $59.99/mo locked for first 100 members
export const STANDARD_ALL_ACCESS_MONTHLY_CENTS = 7999; // $79.99/mo post-cap standard rate
export const ROS_PLAYOFFS_PASS_CENTS = 24900; // $249.00 ROS + Playoffs Pass
export const ALL_ACCESS_UPGRADE_BRIDGE_CENTS = 3500; // $35.00 upgrade bridge credit -> $24.99 first mo

export type StorefrontDoor = 'DOOR_1_ALL_ACCESS' | 'DOOR_2_PACK';

export type Door1MembershipSku =
  | 'FOUNDING_ALL_ACCESS_MONTHLY_5999'
  | 'STANDARD_ALL_ACCESS_MONTHLY_7999'
  | 'ROS_PLAYOFFS_PASS_24900';

export type Door2PackSku =
  | 'TNF_SHOWDOWN_STANDARD_19'
  | 'TNF_SHOWDOWN_ALIGNED_29'
  | 'MNF_SHOWDOWN_STANDARD_19'
  | 'MNF_SHOWDOWN_ALIGNED_29'
  | 'SUNDAY_360_STANDARD_29'
  | 'SUNDAY_360_ALIGNED_39';

export type OfficialPlayGradeStatus = 'WIN' | 'LOSS' | 'PUSH' | 'VOID' | 'PENDING';

export interface OfficialGradedPlay {
  readonly playId: string;
  readonly marketLabel: string;
  readonly status: OfficialPlayGradeStatus;
  /** Standard unit stake risked on the official release (e.g., 1.0u). */
  readonly riskUnits: number;
  /** American price locked at pre-kickoff publication (e.g., -110, +125). */
  readonly americanOdds: number;
  /**
   * Optional pre-computed net units from workers/settlement-engine.
   * When omitted, net units are derived deterministically from status, riskUnits, and americanOdds.
   */
  readonly settledNetUnits?: number;
}

export interface Door2PackPurchase {
  readonly purchaseId: string;
  readonly customerId: string;
  readonly stripeCustomerId?: string;
  readonly packId: string;
  readonly packSku: Door2PackSku;
  readonly weekNumber: number;
  readonly paidCashCents: number;
  readonly redeemedCreditCents: number;
  readonly storeCreditAligned: boolean;
  readonly purchasedAtIso: string;
}

export type StoreCreditEntryKind =
  | 'MINT_ALIGNMENT_CREDIT'
  | 'REDEEM_PACK_CREDIT'
  | 'MINT_UPGRADE_BRIDGE_SUPPLEMENT'
  | 'REDEEM_ALL_ACCESS_BRIDGE_35';

export interface StoreCreditLedgerEntry {
  readonly entryId: string;
  readonly idempotencyKey: string;
  readonly customerId: string;
  readonly kind: StoreCreditEntryKind;
  /** Positive for credit mints, negative for redemptions. */
  readonly deltaCents: number;
  readonly balanceAfterCents: number;
  readonly referencePurchaseId: string;
  readonly referencePackId?: string;
  readonly netUnitsSnapshot?: number;
  readonly createdAtIso: string;
  readonly metadata: Readonly<Record<string, string | number | boolean>>;
}

export type SettlementCreditOutcomeStatus =
  | 'MINTED_100_PCT_STORE_CREDIT'
  | 'ALREADY_MINTED_IDEMPOTENT'
  | 'PROFITABLE_NO_CREDIT_DUE'
  | 'INELIGIBLE_STANDARD_TIER'
  | 'DEFERRED_PENDING_PLAYS'
  | 'NO_OFFICIAL_PLAYS_RELEASED';

export interface SettlementCreditEvaluation {
  readonly status: SettlementCreditOutcomeStatus;
  readonly purchaseId: string;
  readonly packId: string;
  readonly customerId: string;
  readonly gradedPlayCount: number;
  readonly activeGradedPlayCount: number;
  readonly netUnits: number;
  readonly eligibleForCredit: boolean;
  readonly mintedCents: number;
  readonly customerBalanceCents: number;
  readonly idempotencyKey: string;
  readonly ledgerEntry?: StoreCreditLedgerEntry;
  readonly reason: string;
}

export interface AllAccessUpgradeQuote {
  readonly customerId: string;
  readonly targetSku: 'FOUNDING_ALL_ACCESS_MONTHLY_5999' | 'STANDARD_ALL_ACCESS_MONTHLY_7999';
  readonly foundingSpotLocked: boolean;
  readonly baseMonthlyCents: number;
  readonly availableStoreCreditCents: number;
  readonly bridgeCreditAppliedCents: number;
  readonly walletCreditConsumedCents: number;
  readonly promotionalBridgeTopUpCents: number;
  readonly firstMonthNetChargeCents: number;
  readonly eligibleForBridge: boolean;
  readonly reason: string;
}

export interface AllAccessUpgradeResult {
  readonly quote: AllAccessUpgradeQuote;
  readonly upgradeIdempotencyKey: string;
  readonly alreadyRedeemed: boolean;
  readonly ledgerEntries: readonly StoreCreditLedgerEntry[];
  readonly remainingStoreCreditCents: number;
}

export interface StripeCustomerBalanceGateway {
  creditCustomerBalance(params: {
    stripeCustomerId: string;
    amountCents: number;
    idempotencyKey: string;
    description: string;
  }): Promise<{ stripeTransactionId: string }>;

  debitCustomerBalance(params: {
    stripeCustomerId: string;
    amountCents: number;
    idempotencyKey: string;
    description: string;
  }): Promise<{ stripeTransactionId: string }>;
}

export interface TelemetryGateway {
  capturePostHogEvent(params: {
    distinctId: string;
    event: string;
    properties: Record<string, string | number | boolean>;
  }): void;

  captureSentryBreadcrumb(params: {
    category: string;
    message: string;
    data: Record<string, string | number | boolean>;
  }): void;
}

export interface StoreCreditRepository {
  getEntryByIdempotencyKey(idempotencyKey: string): Promise<StoreCreditLedgerEntry | null>;
  getCustomerBalanceCents(customerId: string): Promise<number>;
  getCustomerEntries(customerId: string): Promise<readonly StoreCreditLedgerEntry[]>;
  hasCustomerUsedUpgradeBridge(customerId: string): Promise<boolean>;
  hasCustomerPurchasedAlignedPack(customerId: string): Promise<boolean>;
  appendLedgerEntry(entry: StoreCreditLedgerEntry): Promise<StoreCreditLedgerEntry>;
  markUpgradeBridgeUsed(customerId: string, upgradeIdempotencyKey: string): Promise<void>;
}

export const DOOR_2_PACK_CATALOG: Readonly<
  Record<
    Door2PackSku,
    {
      sku: Door2PackSku;
      label: string;
      priceCents: number;
      storeCreditAligned: boolean;
      slateWindow: 'TNF_SHOWDOWN' | 'MNF_SHOWDOWN' | 'SUNDAY_360';
    }
  >
> = {
  TNF_SHOWDOWN_STANDARD_19: {
    sku: 'TNF_SHOWDOWN_STANDARD_19',
    label: 'Thursday Night Showdown Pack (Standard)',
    priceCents: 1900,
    storeCreditAligned: false,
    slateWindow: 'TNF_SHOWDOWN',
  },
  TNF_SHOWDOWN_ALIGNED_29: {
    sku: 'TNF_SHOWDOWN_ALIGNED_29',
    label: 'Thursday Night Showdown Pack (100% Store-Credit Alignment)',
    priceCents: 2900,
    storeCreditAligned: true,
    slateWindow: 'TNF_SHOWDOWN',
  },
  MNF_SHOWDOWN_STANDARD_19: {
    sku: 'MNF_SHOWDOWN_STANDARD_19',
    label: 'Monday Night Showdown Pack (Standard)',
    priceCents: 1900,
    storeCreditAligned: false,
    slateWindow: 'MNF_SHOWDOWN',
  },
  MNF_SHOWDOWN_ALIGNED_29: {
    sku: 'MNF_SHOWDOWN_ALIGNED_29',
    label: 'Monday Night Showdown Pack (100% Store-Credit Alignment)',
    priceCents: 2900,
    storeCreditAligned: true,
    slateWindow: 'MNF_SHOWDOWN',
  },
  SUNDAY_360_STANDARD_29: {
    sku: 'SUNDAY_360_STANDARD_29',
    label: 'Sunday 360° Full-Slate Pack (Standard)',
    priceCents: 2900,
    storeCreditAligned: false,
    slateWindow: 'SUNDAY_360',
  },
  SUNDAY_360_ALIGNED_39: {
    sku: 'SUNDAY_360_ALIGNED_39',
    label: 'Sunday 360° Full-Slate Pack (100% Store-Credit Alignment)',
    priceCents: 3900,
    storeCreditAligned: true,
    slateWindow: 'SUNDAY_360',
  },
};

/**
 * Deterministic SHA-256 hex digest for idempotency keys and audit receipts.
 */
export function sha256Hex(payload: string): string {
  return createHash('sha256').update(payload, 'utf8').digest('hex');
}

/**
 * Computes net profit/loss in units for a single graded official play.
 * Rounds at the 6th decimal place per leg and 4th decimal place at the slate level
 * so break-even cards (0.0000u) never drift above zero from IEEE-754 arithmetic.
 */
export function computeOfficialPlayNetUnits(play: OfficialGradedPlay): number {
  if (play.status === 'PENDING') {
    throw new RangeError(`Cannot compute settled units for PENDING play '${play.playId}'.`);
  }
  if (play.settledNetUnits !== undefined) {
    if (!Number.isFinite(play.settledNetUnits)) {
      throw new RangeError(`Non-finite settledNetUnits on play '${play.playId}'.`);
    }
    return play.settledNetUnits;
  }
  if (!Number.isFinite(play.riskUnits) || play.riskUnits <= 0) {
    throw new RangeError(`riskUnits must be finite and > 0 on play '${play.playId}'.`);
  }
  if (
    !Number.isFinite(play.americanOdds) ||
    (play.americanOdds > -100 && play.americanOdds < 100)
  ) {
    throw new RangeError(
      `Invalid American odds ${play.americanOdds} on play '${play.playId}'. Expected <= -100 or >= +100.`,
    );
  }

  switch (play.status) {
    case 'PUSH':
    case 'VOID':
      return 0;
    case 'LOSS':
      return -play.riskUnits;
    case 'WIN': {
      const profitMultiplier =
        play.americanOdds >= 100 ? play.americanOdds / 100 : 100 / Math.abs(play.americanOdds);
      return Number((play.riskUnits * profitMultiplier).toFixed(6));
    }
  }
}

/**
 * Aggregates graded official plays across a game/slate pack and rounds to 4 decimal places.
 */
export function summarizePackSettlementUnits(plays: readonly OfficialGradedPlay[]): {
  hasPending: boolean;
  totalPlayCount: number;
  activeGradedPlayCount: number;
  netUnits: number;
} {
  let hasPending = false;
  let activeGradedPlayCount = 0;
  let rawUnits = 0;

  for (const play of plays) {
    if (play.status === 'PENDING') {
      hasPending = true;
      continue;
    }
    if (play.status !== 'VOID') {
      activeGradedPlayCount += 1;
    }
    rawUnits += computeOfficialPlayNetUnits(play);
  }

  const normalizedUnits = Object.is(Math.round(rawUnits * 10000) / 10000, -0)
    ? 0
    : Math.round(rawUnits * 10000) / 10000;

  return {
    hasPending,
    totalPlayCount: plays.length,
    activeGradedPlayCount,
    netUnits: normalizedUnits,
  };
}

/**
 * Deterministic idempotency key for post-settlement store-credit minting.
 */
export function buildSettlementCreditIdempotencyKey(purchaseId: string, packId: string): string {
  const digest = sha256Hex(`gse:store-credit:v1:${purchaseId.trim()}:${packId.trim()}`).slice(0, 24);
  return `sc_mint_${purchaseId.trim()}_${packId.trim()}_${digest}`;
}

export class StoreCreditLedgerService {
  private readonly repo: StoreCreditRepository;
  private readonly stripeGateway?: StripeCustomerBalanceGateway;
  private readonly telemetry?: TelemetryGateway;
  private readonly nowFn: () => string;

  constructor(deps: {
    repo: StoreCreditRepository;
    stripeGateway?: StripeCustomerBalanceGateway;
    telemetry?: TelemetryGateway;
    nowFn?: () => string;
  }) {
    this.repo = deps.repo;
    this.stripeGateway = deps.stripeGateway;
    this.telemetry = deps.telemetry;
    this.nowFn = deps.nowFn ?? (() => new Date().toISOString());
  }

  /**
   * Executes post-settlement contractual Store-Credit Alignment evaluation for a Door 2 purchase.
   * Safe to invoke repeatedly across cron retries or webhook replays (strictly idempotent).
   */
  async settlePackPurchase(
    purchase: Door2PackPurchase,
    officialPlays: readonly OfficialGradedPlay[],
  ): Promise<SettlementCreditEvaluation> {
    const totalPurchaseValueCents = purchase.paidCashCents + purchase.redeemedCreditCents;
    if (
      !Number.isInteger(purchase.paidCashCents) ||
      purchase.paidCashCents < 0 ||
      !Number.isInteger(purchase.redeemedCreditCents) ||
      purchase.redeemedCreditCents < 0 ||
      totalPurchaseValueCents <= 0
    ) {
      throw new RangeError(
        `Invalid purchase amounts on '${purchase.purchaseId}': cash=${purchase.paidCashCents}, credit=${purchase.redeemedCreditCents}.`,
      );
    }

    const idempotencyKey = buildSettlementCreditIdempotencyKey(purchase.purchaseId, purchase.packId);
    const existingEntry = await this.repo.getEntryByIdempotencyKey(idempotencyKey);
    if (existingEntry) {
      const currentBalance = await this.repo.getCustomerBalanceCents(purchase.customerId);
      return {
        status: 'ALREADY_MINTED_IDEMPOTENT',
        purchaseId: purchase.purchaseId,
        packId: purchase.packId,
        customerId: purchase.customerId,
        gradedPlayCount: officialPlays.length,
        activeGradedPlayCount: officialPlays.filter(
          (p) => p.status !== 'VOID' && p.status !== 'PENDING',
        ).length,
        netUnits: existingEntry.netUnitsSnapshot ?? 0,
        eligibleForCredit: true,
        mintedCents: existingEntry.deltaCents,
        customerBalanceCents: currentBalance,
        idempotencyKey,
        ledgerEntry: existingEntry,
        reason: 'Store credit was already minted for this settled pack purchase (idempotent replay).',
      };
    }

    if (!purchase.storeCreditAligned) {
      const currentBalance = await this.repo.getCustomerBalanceCents(purchase.customerId);
      return {
        status: 'INELIGIBLE_STANDARD_TIER',
        purchaseId: purchase.purchaseId,
        packId: purchase.packId,
        customerId: purchase.customerId,
        gradedPlayCount: officialPlays.length,
        activeGradedPlayCount: 0,
        netUnits: 0,
        eligibleForCredit: false,
        mintedCents: 0,
        customerBalanceCents: currentBalance,
        idempotencyKey,
        reason: 'Standard non-aligned pack tier does not carry Store-Credit Alignment.',
      };
    }

    const summary = summarizePackSettlementUnits(officialPlays);
    if (summary.hasPending) {
      const currentBalance = await this.repo.getCustomerBalanceCents(purchase.customerId);
      return {
        status: 'DEFERRED_PENDING_PLAYS',
        purchaseId: purchase.purchaseId,
        packId: purchase.packId,
        customerId: purchase.customerId,
        gradedPlayCount: summary.totalPlayCount,
        activeGradedPlayCount: summary.activeGradedPlayCount,
        netUnits: summary.netUnits,
        eligibleForCredit: false,
        mintedCents: 0,
        customerBalanceCents: currentBalance,
        idempotencyKey,
        reason: 'At least one official play in this pack is still PENDING official post-game grading.',
      };
    }

    // Contractual trigger: graded official plays finish <= 0.00u OR zero plays survived pre-kickoff gates / all voided.
    const noActionSlate = summary.totalPlayCount === 0 || summary.activeGradedPlayCount === 0;
    const finishedAtOrBelowZeroUnits = summary.netUnits <= 0;

    if (!noActionSlate && !finishedAtOrBelowZeroUnits) {
      const currentBalance = await this.repo.getCustomerBalanceCents(purchase.customerId);
      return {
        status: 'PROFITABLE_NO_CREDIT_DUE',
        purchaseId: purchase.purchaseId,
        packId: purchase.packId,
        customerId: purchase.customerId,
        gradedPlayCount: summary.totalPlayCount,
        activeGradedPlayCount: summary.activeGradedPlayCount,
        netUnits: summary.netUnits,
        eligibleForCredit: false,
        mintedCents: 0,
        customerBalanceCents: currentBalance,
        idempotencyKey,
        reason: `Official graded plays finished positive (+${summary.netUnits.toFixed(2)}u > 0.00u); no store credit owed.`,
      };
    }

    // Mint 100% of total pack purchase price back as Store Credit.
    const mintAmountCents = totalPurchaseValueCents;
    const priorBalanceCents = await this.repo.getCustomerBalanceCents(purchase.customerId);
    const nextBalanceCents = priorBalanceCents + mintAmountCents;

    let stripeTxId = 'local_ledger_only';
    if (this.stripeGateway && purchase.stripeCustomerId) {
      const stripeRes = await this.stripeGateway.creditCustomerBalance({
        stripeCustomerId: purchase.stripeCustomerId,
        amountCents: mintAmountCents,
        idempotencyKey,
        description: `GSE 100% Store-Credit Alignment (${purchase.packId}, ${summary.netUnits.toFixed(2)}u)`,
      });
      stripeTxId = stripeRes.stripeTransactionId;
    }

    const entry: StoreCreditLedgerEntry = {
      entryId: `sce_${sha256Hex(idempotencyKey).slice(0, 16)}`,
      idempotencyKey,
      customerId: purchase.customerId,
      kind: 'MINT_ALIGNMENT_CREDIT',
      deltaCents: mintAmountCents,
      balanceAfterCents: nextBalanceCents,
      referencePurchaseId: purchase.purchaseId,
      referencePackId: purchase.packId,
      netUnitsSnapshot: summary.netUnits,
      createdAtIso: this.nowFn(),
      metadata: {
        packSku: purchase.packSku,
        weekNumber: purchase.weekNumber,
        noActionSlate,
        gradedPlayCount: summary.totalPlayCount,
        activeGradedPlayCount: summary.activeGradedPlayCount,
        stripeTransactionId: stripeTxId,
        posthogProjectId: 516325,
      },
    };

    const persisted = await this.repo.appendLedgerEntry(entry);

    this.telemetry?.capturePostHogEvent({
      distinctId: purchase.customerId,
      event: 'store_credit_alignment_minted',
      properties: {
        packId: purchase.packId,
        packSku: purchase.packSku,
        weekNumber: purchase.weekNumber,
        mintedCents: mintAmountCents,
        netUnits: summary.netUnits,
        noActionSlate,
      },
    });

    this.telemetry?.captureSentryBreadcrumb({
      category: 'billing.store_credit',
      message: `Minted ${mintAmountCents}c store credit for ${purchase.purchaseId}`,
      data: {
        packId: purchase.packId,
        netUnits: summary.netUnits,
        balanceAfterCents: persisted.balanceAfterCents,
      },
    });

    return {
      status: noActionSlate ? 'NO_OFFICIAL_PLAYS_RELEASED' : 'MINTED_100_PCT_STORE_CREDIT',
      purchaseId: purchase.purchaseId,
      packId: purchase.packId,
      customerId: purchase.customerId,
      gradedPlayCount: summary.totalPlayCount,
      activeGradedPlayCount: summary.activeGradedPlayCount,
      netUnits: summary.netUnits,
      eligibleForCredit: true,
      mintedCents: mintAmountCents,
      customerBalanceCents: persisted.balanceAfterCents,
      idempotencyKey,
      ledgerEntry: persisted,
      reason: noActionSlate
        ? 'All official plays in pack were voided or withheld by pre-kickoff gates; minted 100% store credit.'
        : `Official plays settled at ${summary.netUnits.toFixed(2)}u (<= 0.00u); minted 100% store credit ($${(mintAmountCents / 100).toFixed(2)}).`,
    };
  }

  /**
   * Redeems available Store Credit toward a subsequent Door 2 Game/Slate Pack in 1 click.
   */
  async redeemCreditTowardPack(params: {
    customerId: string;
    stripeCustomerId?: string;
    targetPurchaseId: string;
    targetPackId: string;
    targetPackPriceCents: number;
  }): Promise<{
    appliedCreditCents: number;
    remainingCashDueCents: number;
    remainingBalanceCents: number;
    ledgerEntry: StoreCreditLedgerEntry | null;
  }> {
    if (!Number.isInteger(params.targetPackPriceCents) || params.targetPackPriceCents <= 0) {
      throw new RangeError(`targetPackPriceCents must be a positive integer.`);
    }

    const idempotencyKey = `sc_redeem_pack_${params.customerId}_${params.targetPurchaseId}`;
    const existing = await this.repo.getEntryByIdempotencyKey(idempotencyKey);
    if (existing) {
      const applied = Math.abs(existing.deltaCents);
      return {
        appliedCreditCents: applied,
        remainingCashDueCents: Math.max(0, params.targetPackPriceCents - applied),
        remainingBalanceCents: existing.balanceAfterCents,
        ledgerEntry: existing,
      };
    }

    const currentBalance = await this.repo.getCustomerBalanceCents(params.customerId);
    if (currentBalance <= 0) {
      return {
        appliedCreditCents: 0,
        remainingCashDueCents: params.targetPackPriceCents,
        remainingBalanceCents: 0,
        ledgerEntry: null,
      };
    }

    const appliedCreditCents = Math.min(currentBalance, params.targetPackPriceCents);
    const nextBalance = currentBalance - appliedCreditCents;

    if (this.stripeGateway && params.stripeCustomerId) {
      await this.stripeGateway.debitCustomerBalance({
        stripeCustomerId: params.stripeCustomerId,
        amountCents: appliedCreditCents,
        idempotencyKey,
        description: `GSE Store-Credit Pack Redemption (${params.targetPackId})`,
      });
    }

    const entry: StoreCreditLedgerEntry = {
      entryId: `sce_${sha256Hex(idempotencyKey).slice(0, 16)}`,
      idempotencyKey,
      customerId: params.customerId,
      kind: 'REDEEM_PACK_CREDIT',
      deltaCents: -appliedCreditCents,
      balanceAfterCents: nextBalance,
      referencePurchaseId: params.targetPurchaseId,
      referencePackId: params.targetPackId,
      createdAtIso: this.nowFn(),
      metadata: {
        targetPackPriceCents: params.targetPackPriceCents,
        remainingCashDueCents: params.targetPackPriceCents - appliedCreditCents,
      },
    };

    const persisted = await this.repo.appendLedgerEntry(entry);

    this.telemetry?.capturePostHogEvent({
      distinctId: params.customerId,
      event: 'store_credit_pack_redeemed',
      properties: {
        targetPackId: params.targetPackId,
        appliedCreditCents,
        remainingCashDueCents: params.targetPackPriceCents - appliedCreditCents,
      },
    });

    return {
      appliedCreditCents,
      remainingCashDueCents: params.targetPackPriceCents - appliedCreditCents,
      remainingBalanceCents: persisted.balanceAfterCents,
      ledgerEntry: persisted,
    };
  }

  /**
   * Computes the $35.00 All-Access Upgrade Bridge quote for a customer transitioning
   * from Door 2 (Single-Slate / Showdown Pack) to Door 1 ($59.99/mo Founding All-Access).
   *
   * Eligibility:
   * - Customer holds positive Store Credit balance OR previously purchased an aligned Door 2 pack,
   * - Customer has not previously redeemed the one-time $35 All-Access Upgrade Bridge.
   * When wallet credit is e.g. $29.00 (from TNF/MNF Aligned Pack), GSE tops up the $6.00 gap
   * automatically so the customer receives the full $35.00 bridge ($59.99 -> $24.99 first month).
   * When wallet credit is $39.00 (from Sunday 360° Aligned Pack), $35.00 is applied to the
   * bridge ($24.99 first month) and $4.00 remains in the customer's Store Credit wallet (or
   * customer can optionally apply full wallet balance if > $35; default caps bridge at $35.00
   * contractual bridge while preserving remaining credit in wallet).
   */
  async quoteAllAccessUpgradeBridge(params: {
    customerId: string;
    activeFoundingMemberCount: number;
  }): Promise<AllAccessUpgradeQuote> {
    if (
      !Number.isInteger(params.activeFoundingMemberCount) ||
      params.activeFoundingMemberCount < 0
    ) {
      throw new RangeError('activeFoundingMemberCount must be a non-negative integer.');
    }

    const foundingSpotLocked = params.activeFoundingMemberCount < FOUNDING_ALL_ACCESS_CAP;
    const targetSku = foundingSpotLocked
      ? 'FOUNDING_ALL_ACCESS_MONTHLY_5999'
      : 'STANDARD_ALL_ACCESS_MONTHLY_7999';
    const baseMonthlyCents = foundingSpotLocked
      ? FOUNDING_ALL_ACCESS_MONTHLY_CENTS
      : STANDARD_ALL_ACCESS_MONTHLY_CENTS;

    const [availableStoreCreditCents, alreadyUsedBridge, hasAlignedPackHistory] = await Promise.all([
      this.repo.getCustomerBalanceCents(params.customerId),
      this.repo.hasCustomerUsedUpgradeBridge(params.customerId),
      this.repo.hasCustomerPurchasedAlignedPack(params.customerId),
    ]);

    if (alreadyUsedBridge) {
      return {
        customerId: params.customerId,
        targetSku,
        foundingSpotLocked,
        baseMonthlyCents,
        availableStoreCreditCents,
        bridgeCreditAppliedCents: 0,
        walletCreditConsumedCents: 0,
        promotionalBridgeTopUpCents: 0,
        firstMonthNetChargeCents: baseMonthlyCents,
        eligibleForBridge: false,
        reason: 'Customer has already redeemed the one-time $35 All-Access Upgrade Bridge.',
      };
    }

    if (availableStoreCreditCents <= 0 && !hasAlignedPackHistory) {
      return {
        customerId: params.customerId,
        targetSku,
        foundingSpotLocked,
        baseMonthlyCents,
        availableStoreCreditCents: 0,
        bridgeCreditAppliedCents: 0,
        walletCreditConsumedCents: 0,
        promotionalBridgeTopUpCents: 0,
        firstMonthNetChargeCents: baseMonthlyCents,
        eligibleForBridge: false,
        reason: 'Upgrade Bridge requires an active Store-Credit balance or prior Door 2 Aligned Pack purchase.',
      };
    }

    const walletCreditConsumedCents = Math.min(
      availableStoreCreditCents,
      ALL_ACCESS_UPGRADE_BRIDGE_CENTS,
    );
    const promotionalBridgeTopUpCents =
      ALL_ACCESS_UPGRADE_BRIDGE_CENTS - walletCreditConsumedCents;
    const firstMonthNetChargeCents = baseMonthlyCents - ALL_ACCESS_UPGRADE_BRIDGE_CENTS;

    return {
      customerId: params.customerId,
      targetSku,
      foundingSpotLocked,
      baseMonthlyCents,
      availableStoreCreditCents,
      bridgeCreditAppliedCents: ALL_ACCESS_UPGRADE_BRIDGE_CENTS,
      walletCreditConsumedCents,
      promotionalBridgeTopUpCents,
      firstMonthNetChargeCents,
      eligibleForBridge: true,
      reason: foundingSpotLocked
        ? `Applies $35.00 All-Access Upgrade Bridge toward $59.99/mo Founding Membership ($${(firstMonthNetChargeCents / 100).toFixed(2)} first month).`
        : `Applies $35.00 All-Access Upgrade Bridge toward $79.99/mo Standard Membership ($${(firstMonthNetChargeCents / 100).toFixed(2)} first month).`,
    };
  }

  /**
   * Atomically redeems the $35.00 All-Access Upgrade Bridge for a Door 2 -> Door 1 upgrade.
   * Idempotent by (customerId, subscriptionCheckoutId).
   */
  async redeemAllAccessUpgradeBridge(params: {
    customerId: string;
    stripeCustomerId?: string;
    subscriptionCheckoutId: string;
    activeFoundingMemberCount: number;
  }): Promise<AllAccessUpgradeResult> {
    const upgradeIdempotencyKey = `sc_bridge35_${params.customerId}_${params.subscriptionCheckoutId}`;
    const existingRedeem = await this.repo.getEntryByIdempotencyKey(upgradeIdempotencyKey);
    if (existingRedeem) {
      const remaining = await this.repo.getCustomerBalanceCents(params.customerId);
      const foundingSpotLocked = params.activeFoundingMemberCount < FOUNDING_ALL_ACCESS_CAP;
      const baseMonthlyCents = foundingSpotLocked
        ? FOUNDING_ALL_ACCESS_MONTHLY_CENTS
        : STANDARD_ALL_ACCESS_MONTHLY_CENTS;
      return {
        quote: {
          customerId: params.customerId,
          targetSku: foundingSpotLocked
            ? 'FOUNDING_ALL_ACCESS_MONTHLY_5999'
            : 'STANDARD_ALL_ACCESS_MONTHLY_7999',
          foundingSpotLocked,
          baseMonthlyCents,
          availableStoreCreditCents: remaining,
          bridgeCreditAppliedCents: ALL_ACCESS_UPGRADE_BRIDGE_CENTS,
          walletCreditConsumedCents: Number(existingRedeem.metadata.walletCreditConsumedCents ?? 0),
          promotionalBridgeTopUpCents: Number(
            existingRedeem.metadata.promotionalBridgeTopUpCents ?? 0,
          ),
          firstMonthNetChargeCents: baseMonthlyCents - ALL_ACCESS_UPGRADE_BRIDGE_CENTS,
          eligibleForBridge: true,
          reason: 'Idempotent replay of completed $35 All-Access Upgrade Bridge redemption.',
        },
        upgradeIdempotencyKey,
        alreadyRedeemed: true,
        ledgerEntries: [existingRedeem],
        remainingStoreCreditCents: remaining,
      };
    }

    const quote = await this.quoteAllAccessUpgradeBridge({
      customerId: params.customerId,
      activeFoundingMemberCount: params.activeFoundingMemberCount,
    });

    if (!quote.eligibleForBridge) {
      throw new Error(`Customer '${params.customerId}' is ineligible for Upgrade Bridge: ${quote.reason}`);
    }

    const createdEntries: StoreCreditLedgerEntry[] = [];
    let runningBalance = quote.availableStoreCreditCents;

    if (quote.promotionalBridgeTopUpCents > 0) {
      const topUpKey = `${upgradeIdempotencyKey}_topup`;
      runningBalance += quote.promotionalBridgeTopUpCents;
      const topUpEntry: StoreCreditLedgerEntry = {
        entryId: `sce_${sha256Hex(topUpKey).slice(0, 16)}`,
        idempotencyKey: topUpKey,
        customerId: params.customerId,
        kind: 'MINT_UPGRADE_BRIDGE_SUPPLEMENT',
        deltaCents: quote.promotionalBridgeTopUpCents,
        balanceAfterCents: runningBalance,
        referencePurchaseId: params.subscriptionCheckoutId,
        createdAtIso: this.nowFn(),
        metadata: {
          bridgeTargetCents: ALL_ACCESS_UPGRADE_BRIDGE_CENTS,
          walletCreditBeforeTopUpCents: quote.availableStoreCreditCents,
        },
      };
      createdEntries.push(await this.repo.appendLedgerEntry(topUpEntry));
    }

    runningBalance -= ALL_ACCESS_UPGRADE_BRIDGE_CENTS;

    if (this.stripeGateway && params.stripeCustomerId && quote.walletCreditConsumedCents > 0) {
      await this.stripeGateway.debitCustomerBalance({
        stripeCustomerId: params.stripeCustomerId,
        amountCents: quote.walletCreditConsumedCents,
        idempotencyKey: upgradeIdempotencyKey,
        description: 'GSE $35 All-Access Upgrade Bridge Redemption',
      });
    }

    const redeemEntry: StoreCreditLedgerEntry = {
      entryId: `sce_${sha256Hex(upgradeIdempotencyKey).slice(0, 16)}`,
      idempotencyKey: upgradeIdempotencyKey,
      customerId: params.customerId,
      kind: 'REDEEM_ALL_ACCESS_BRIDGE_35',
      deltaCents: -ALL_ACCESS_UPGRADE_BRIDGE_CENTS,
      balanceAfterCents: runningBalance,
      referencePurchaseId: params.subscriptionCheckoutId,
      createdAtIso: this.nowFn(),
      metadata: {
        targetSku: quote.targetSku,
        baseMonthlyCents: quote.baseMonthlyCents,
        walletCreditConsumedCents: quote.walletCreditConsumedCents,
        promotionalBridgeTopUpCents: quote.promotionalBridgeTopUpCents,
        firstMonthNetChargeCents: quote.firstMonthNetChargeCents,
        posthogProjectId: 516325,
      },
    };

    createdEntries.push(await this.repo.appendLedgerEntry(redeemEntry));
    await this.repo.markUpgradeBridgeUsed(params.customerId, upgradeIdempotencyKey);

    this.telemetry?.capturePostHogEvent({
      distinctId: params.customerId,
      event: 'all_access_bridge_35_redeemed',
      properties: {
        targetSku: quote.targetSku,
        foundingSpotLocked: quote.foundingSpotLocked,
        walletCreditConsumedCents: quote.walletCreditConsumedCents,
        promotionalBridgeTopUpCents: quote.promotionalBridgeTopUpCents,
        firstMonthNetChargeCents: quote.firstMonthNetChargeCents,
      },
    });

    return {
      quote,
      upgradeIdempotencyKey,
      alreadyRedeemed: false,
      ledgerEntries: createdEntries,
      remainingStoreCreditCents: runningBalance,
    };
  }
}

/**
 * Deterministic in-memory repository implementation for unit tests, staging previews,
 * and single-process verification harnesses.
 */
export class InMemoryStoreCreditRepository implements StoreCreditRepository {
  private readonly entriesByKey = new Map<string, StoreCreditLedgerEntry>();
  private readonly entriesByCustomer = new Map<string, StoreCreditLedgerEntry[]>();
  private readonly bridgeUsedByCustomer = new Map<string, string>();
  private readonly alignedPurchasesByCustomer = new Set<string>();

  registerAlignedPackPurchase(customerId: string): void {
    this.alignedPurchasesByCustomer.add(customerId);
  }

  async getEntryByIdempotencyKey(idempotencyKey: string): Promise<StoreCreditLedgerEntry | null> {
    return this.entriesByKey.get(idempotencyKey) ?? null;
  }

  async getCustomerBalanceCents(customerId: string): Promise<number> {
    const list = this.entriesByCustomer.get(customerId);
    if (!list || list.length === 0) return 0;
    return list[list.length - 1]!.balanceAfterCents;
  }

  async getCustomerEntries(customerId: string): Promise<readonly StoreCreditLedgerEntry[]> {
    return [...(this.entriesByCustomer.get(customerId) ?? [])];
  }

  async hasCustomerUsedUpgradeBridge(customerId: string): Promise<boolean> {
    return this.bridgeUsedByCustomer.has(customerId);
  }

  async hasCustomerPurchasedAlignedPack(customerId: string): Promise<boolean> {
    return this.alignedPurchasesByCustomer.has(customerId);
  }

  async appendLedgerEntry(entry: StoreCreditLedgerEntry): Promise<StoreCreditLedgerEntry> {
    const existing = this.entriesByKey.get(entry.idempotencyKey);
    if (existing) {
      return existing;
    }
    this.entriesByKey.set(entry.idempotencyKey, entry);
    const list = this.entriesByCustomer.get(entry.customerId) ?? [];
    list.push(entry);
    this.entriesByCustomer.set(entry.customerId, list);
    if (entry.kind === 'MINT_ALIGNMENT_CREDIT') {
      this.alignedPurchasesByCustomer.add(entry.customerId);
    }
    return entry;
  }

  async markUpgradeBridgeUsed(customerId: string, upgradeIdempotencyKey: string): Promise<void> {
    this.bridgeUsedByCustomer.set(customerId, upgradeIdempotencyKey);
  }
}
