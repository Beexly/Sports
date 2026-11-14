/**
 * Galaxy Sports Edge (`galaxysportsedge.com` — Galaxy Sports Network LLC)
 * & Galaxy Science Institute (TX SOS #15043440630001 501(c)(3) Revision Track)
 * ============================================================================
 * File: gse_autonomous_revenue_and_b2b_api_blueprint.ts
 * Date: 2026-11-13
 *
 * Compiler Safety Invariants:
 *   - 100% `strict: true`, `strictNullChecks: true`, `noUncheckedIndexedAccess: true` safe
 *     (TS2532-impossible via `atOrThrow` and `recordGetOrDefault`).
 *   - Zero `21+` age restriction on checkout (Astra Mandate #1: analytical subscription & skill platform).
 *   - `00-TRUTH-FILE` Public-Copy Governance:
 *       * Entity: Galaxy Sports Network LLC, DBA Galaxy Sports Edge (`galaxysportsedge.com`).
 *       * Confidence Badges: Strictly integer `XX/100` format (zero `%` confidence badges).
 *       * Public Ledger Disclosure: "Every pick is on the public ledger, wins and losses: https://galaxysportsedge.com/calibration".
 *       * Autonomous Action Boundary: `find`, `draft`, `monitor`, `rank`, `package`, `report` run autonomously;
 *         `send`, `submit`, `post`, `pay`, `deploy` queue for explicit founder approval.
 *
 * Connects ALL 5 Commercial Monetization Streams of `galaxysportsedge.com`:
 *   - Stream 1: Free Viral `/parlay-mri` SGP Correlation Vig Scanner -> Email/SMS Capture ->
 *               `$19/$29` Showdown & `$29/$39` Sunday 360° Packs (with contractual `100% Store-Credit Alignment`)
 *   - Stream 2: `$59.99/mo` Founding All-Access Membership (capped at first 100 members) &
 *               `$249` ROS+Playoffs Pass (with automatic `$35` store-credit upgrade bridge)
 *   - Stream 3: DraftKings Classic & Showdown MILP Portfolio Optimizer Tier
 *               (`gse-dfs-pool-preview` feature flag live at 100% in PostHog `516325`)
 *   - Stream 4: OpenRouter `Stealth-Skeleton` B2B Quantitative Reasoning API + x402 USDC / Stripe Metered
 *               Developer API (`packages/stats-api` & `packages/mcp-equations-server`)
 *   - Stream 5: Dual-Use Commercial SBIR/STTR & Defense Telemetry Licensing (`NSF SBIR Phase I $305k`,
 *               `DoD MTEC 26-04` commercial performer track, `NFL Big Data Bowl $100k`) under
 *               `Galaxy Sports Network LLC` while GSI clears its TX SOS `#15043440630001` 501(c)(3) revision.
 */

import { createHash, createHmac, timingSafeEqual } from "node:crypto";

// ============================================================================
// SECTION 0: TS2532-SAFE HELPERS, UTF-8 NFC & 00-TRUTH-FILE GOVERNANCE
// ============================================================================

export const COMMERCIAL_LEGAL_ENTITY = "Galaxy Sports Network LLC" as const;
export const COMMERCIAL_DBA = "Galaxy Sports Edge" as const;
export const PUBLIC_CALIBRATION_LEDGER_URL = "https://galaxysportsedge.com/calibration" as const;
export const PUBLIC_LEDGER_LINE =
  `Every pick is on the public ledger, wins and losses: ${PUBLIC_CALIBRATION_LEDGER_URL}` as const;

export const POSTHOG_PROJECT_ID = 516325 as const;
export const POSTHOG_DFS_PREVIEW_FLAG = "gse-dfs-pool-preview" as const;
export const BASE_MAINNET_EAS_CONTRACT = "0x4200000000000000000000000000000000000021" as const;
export const GSI_TX_SOS_FILING_NUMBER = "15043440630001" as const;
export const HCB_FISCAL_SPONSOR_EIN = "81-2908499" as const;

export function atOrThrow<T>(items: readonly T[], index: number, context: string): T {
  const item = items[index];
  if (item === undefined) {
    throw new RangeError(`Bounds violation at index ${index} in ${context} (length=${items.length})`);
  }
  return item;
}

export function recordGetOrDefault<V>(
  map: Readonly<Record<string, V>>,
  key: string,
  fallback: V,
): V {
  const found = map[key];
  return found !== undefined ? found : fallback;
}

export function normalizeUtf8Nfc(raw: string): string {
  return raw.normalize("NFC").replace(/[\u0000-\u001F\u007F]/g, "").trim();
}

export function formatConfidenceBadge(score0To100: number): string {
  if (!Number.isFinite(score0To100)) {
    throw new Error("Non-finite score supplied to formatConfidenceBadge");
  }
  const rounded = Math.max(0, Math.min(100, Math.round(score0To100)));
  return `${rounded}/100`;
}

export type AutonomousVerb = "find" | "draft" | "monitor" | "rank" | "package" | "report";
export type FounderGatedVerb = "send" | "submit" | "post" | "pay" | "deploy";
export type OperationalVerb = AutonomousVerb | FounderGatedVerb;

export interface ActionGovernanceGateResult {
  readonly verb: OperationalVerb;
  readonly canExecuteAutonomously: boolean;
  readonly status: "EXECUTED_AUTONOMOUSLY" | "QUEUED_FOR_FOUNDER_APPROVAL";
  readonly approvalQueueTicketId?: string;
}

const AUTONOMOUS_VERBS: ReadonlySet<string> = new Set<AutonomousVerb>([
  "find",
  "draft",
  "monitor",
  "rank",
  "package",
  "report",
]);

export function enforceAutonomousBoundary(
  verb: OperationalVerb,
  actionReference: string,
): ActionGovernanceGateResult {
  if (AUTONOMOUS_VERBS.has(verb)) {
    return {
      verb,
      canExecuteAutonomously: true,
      status: "EXECUTED_AUTONOMOUSLY",
    };
  }
  const ticketHash = createHash("sha256")
    .update(`${verb}:${actionReference}`)
    .digest("hex")
    .slice(0, 12);
  return {
    verb,
    canExecuteAutonomously: false,
    status: "QUEUED_FOR_FOUNDER_APPROVAL",
    approvalQueueTicketId: `founder-gate-${verb}-${ticketHash}`,
  };
}

const FORBIDDEN_PUBLIC_JARGON: readonly string[] = [
  "Brier",
  "de-vig",
  "dvig",
  "ECE",
  "CRPS",
  "DAKOTA",
  "ANY/A",
  "PROE",
  "TPRR",
  "WOPR",
  "RYOE",
  "CPOE",
];

export function sanitizePublicCustomerCopy(copy: string): string {
  const clean = normalizeUtf8Nfc(copy);
  if (/\b\d{1,3}(?:\.\d+)?%\s*(?:confidence|lock|win\s*rate)\b/i.test(clean)) {
    throw new Error("00-TRUTH-FILE Violation: Percentage confidence or win-rate headline prohibited.");
  }
  if (/\b\d{1,3}-\d{1,3}-\d{1,2}\b/.test(clean)) {
    throw new Error("00-TRUTH-FILE Violation: Unreconciled W-L-T record string prohibited in public copy.");
  }
  for (const term of FORBIDDEN_PUBLIC_JARGON) {
    if (clean.includes(term)) {
      throw new Error(`Astra Anti-Jargon Fence Violation: Customer surface exposed internal token '${term}'.`);
    }
  }
  return clean.includes(PUBLIC_CALIBRATION_LEDGER_URL)
    ? clean
    : `${clean} ${PUBLIC_LEDGER_LINE}`;
}

// ============================================================================
// SECTION 1: STRIPE GATEWAY ABSTRACTION & SKU CATALOG (STREAMS 1, 2, 3, 4)
// ============================================================================

export type SkuId =
  | "showdown_early_19"
  | "showdown_gameday_29"
  | "sunday_360_early_29"
  | "sunday_360_gameday_39"
  | "founding_all_access_5999"
  | "elite_standard_7999"
  | "ros_playoffs_pass_249"
  | "syndicate_x402_499";

export interface SkuDefinition {
  readonly skuId: SkuId;
  readonly streamNumber: 1 | 2 | 3 | 4;
  readonly displayName: string;
  readonly amountCents: number;
  readonly billingMode: "payment" | "subscription";
  readonly storeCreditAlignmentEligible: boolean;
  readonly upgradeBridgeEligible: boolean;
  readonly entitlements: readonly string[];
}

export const GSE_SKU_CATALOG: Readonly<Record<SkuId, SkuDefinition>> = {
  showdown_early_19: {
    skuId: "showdown_early_19",
    streamNumber: 1,
    displayName: "Galaxy Prime-Time Showdown Pack (Pre-Kickoff Cutoff)",
    amountCents: 1900,
    billingMode: "payment",
    storeCreditAlignmentEligible: true,
    upgradeBridgeEligible: false,
    entitlements: ["showdown_action_card", "showdown_captain_milp_preview", "store_credit_100pct_alignment"],
  },
  showdown_gameday_29: {
    skuId: "showdown_gameday_29",
    streamNumber: 1,
    displayName: "Galaxy Prime-Time Showdown Pack (Gameday T-90m)",
    amountCents: 2900,
    billingMode: "payment",
    storeCreditAlignmentEligible: true,
    upgradeBridgeEligible: false,
    entitlements: ["showdown_action_card", "showdown_captain_milp_preview", "store_credit_100pct_alignment"],
  },
  sunday_360_early_29: {
    skuId: "sunday_360_early_29",
    streamNumber: 1,
    displayName: "Galaxy Sunday 360° Full-Slate Pack (Early-Week)",
    amountCents: 2900,
    billingMode: "payment",
    storeCreditAlignmentEligible: true,
    upgradeBridgeEligible: false,
    entitlements: ["sunday_360_board", "prop_finder_weekend", "dfs_cash_builder", "store_credit_100pct_alignment"],
  },
  sunday_360_gameday_39: {
    skuId: "sunday_360_gameday_39",
    streamNumber: 1,
    displayName: "Galaxy Sunday 360° Full-Slate Pack (Sunday Pre-Kickoff)",
    amountCents: 3900,
    billingMode: "payment",
    storeCreditAlignmentEligible: true,
    upgradeBridgeEligible: false,
    entitlements: ["sunday_360_board", "prop_finder_weekend", "dfs_cash_builder", "store_credit_100pct_alignment"],
  },
  founding_all_access_5999: {
    skuId: "founding_all_access_5999",
    streamNumber: 2,
    displayName: "Founding All-Access Membership (First 100 Members Locked)",
    amountCents: 5999,
    billingMode: "subscription",
    storeCreditAlignmentEligible: false,
    upgradeBridgeEligible: true,
    entitlements: [
      "tier1_sovereign_locks",
      "tier2_verified_board",
      "dfs_classic_showdown_150max_milp",
      "parlay_mri_pro",
      "live_halftime_fatigue_alerts",
      "t90m_sinkhorn_reallocation",
    ],
  },
  elite_standard_7999: {
    skuId: "elite_standard_7999",
    streamNumber: 2,
    displayName: "Galaxy All-Access Membership",
    amountCents: 7999,
    billingMode: "subscription",
    storeCreditAlignmentEligible: false,
    upgradeBridgeEligible: true,
    entitlements: [
      "tier1_sovereign_locks",
      "tier2_verified_board",
      "dfs_classic_showdown_150max_milp",
      "parlay_mri_pro",
      "live_halftime_fatigue_alerts",
      "t90m_sinkhorn_reallocation",
    ],
  },
  ros_playoffs_pass_249: {
    skuId: "ros_playoffs_pass_249",
    streamNumber: 2,
    displayName: "Galaxy Rest-of-Season + NFL Playoffs All-Access Pass",
    amountCents: 24900,
    billingMode: "payment",
    storeCreditAlignmentEligible: false,
    upgradeBridgeEligible: true,
    entitlements: [
      "tier1_sovereign_locks",
      "tier2_verified_board",
      "dfs_classic_showdown_150max_milp",
      "parlay_mri_pro",
      "playoffs_and_super_bowl_full_access",
    ],
  },
  syndicate_x402_499: {
    skuId: "syndicate_x402_499",
    streamNumber: 4,
    displayName: "Galaxy Syndicate B2B Seat & x402 Telemetry Feed",
    amountCents: 49900,
    billingMode: "subscription",
    storeCreditAlignmentEligible: false,
    upgradeBridgeEligible: false,
    entitlements: [
      "stats_api_keyed",
      "mcp_equations_server_keyed",
      "x402_realtime_stream",
      "raw_10k_world_simulation_exports",
    ],
  },
};

export interface StripeCheckoutCreateParams {
  readonly customerId: string;
  readonly customerEmail: string;
  readonly skuId: SkuId;
  readonly grossAmountCents: number;
  readonly appliedStoreCreditCents: number;
  readonly netChargeCents: number;
  readonly mode: "payment" | "subscription";
  readonly metadata: Readonly<Record<string, string>>;
  readonly successUrl: string;
  readonly cancelUrl: string;
}

export interface StripeMeterEventParams {
  readonly eventName: "gse_stats_api_call" | "gse_mcp_equation_call" | "gse_openrouter_tokens";
  readonly stripeCustomerId: string;
  readonly value: number;
  readonly idempotencyKey: string;
  readonly timestampEpochSec: number;
}

export interface StripeBillingAdapter {
  createCheckoutSession(params: StripeCheckoutCreateParams): Promise<{ sessionId: string; checkoutUrl: string }>;
  creditCustomerBalance(
    customerId: string,
    creditCents: number,
    reasonMemo: string,
    idempotencyKey: string,
  ): Promise<{ ledgerEntryId: string; updatedCreditBalanceCents: number }>;
  getCustomerCreditBalanceCents(customerId: string): Promise<number>;
  recordMeterEvent(params: StripeMeterEventParams): Promise<{ meterEventId: string }>;
}

// ============================================================================
// STREAM 1: FREE VIRAL `/parlay-mri` SGP VIG SCANNER -> CAPTURE -> PACKS
//           + CONTRACTUAL `100% STORE-CREDIT ALIGNMENT`
// ============================================================================

export type ParlayLegRole =
  | "QB_PASS_YDS"
  | "WR1_REC_YDS"
  | "WR2_REC_YDS"
  | "TE1_REC_YDS"
  | "RB1_RUSH_YDS"
  | "TEAM_SPREAD"
  | "GAME_TOTAL_OVER"
  | "OPP_WR1_REC_YDS";

export interface ParlayMriLeg {
  readonly gameId: string;
  readonly team: string;
  readonly legRole: ParlayLegRole;
  readonly offeredDecimalOdds: number;
  readonly fairTwoWayCounterpartDecimalOdds: number;
}

export interface ParlayMriScanReport {
  readonly scanId: string;
  readonly legCount: number;
  readonly independentFairProb: number;
  readonly correlatedSpinGlassProb: number;
  readonly bookImpliedProb: number;
  readonly hiddenBookHoldBps: number;
  readonly slipHealthBadge: string; // Strictly XX/100 format
  readonly plainEnglishSummary: string;
  readonly recommendedPackSku: "showdown_early_19" | "showdown_gameday_29" | "sunday_360_early_29" | "sunday_360_gameday_39";
}

const SIGNED_PAIR_CORRELATION: Readonly<Record<string, number>> = {
  "QB_PASS_YDS|WR1_REC_YDS": 0.385,
  "QB_PASS_YDS|WR2_REC_YDS": 0.295,
  "QB_PASS_YDS|TE1_REC_YDS": 0.307,
  "QB_PASS_YDS|RB1_RUSH_YDS": -0.080,
  "RB1_RUSH_YDS|WR1_REC_YDS": -0.060,
  "QB_PASS_YDS|GAME_TOTAL_OVER": 0.340,
  "QB_PASS_YDS|OPP_WR1_REC_YDS": 0.190,
};

export function shinDevigSingleSide(
  sideDecimalOdds: number,
  counterpartDecimalOdds: number,
  z: number = 0.0476,
): number {
  const qA = 1.0 / sideDecimalOdds;
  const qB = 1.0 / counterpartDecimalOdds;
  const sumQ = qA + qB;
  if (sumQ <= 1.0 + 1e-9) {
    return qA / sumQ;
  }
  const calc = (q: number): number =>
    (Math.sqrt(z * z + (4.0 * (1.0 - z) * q * q) / sumQ) - z) / (2.0 * (1.0 - z));
  const pA = calc(qA);
  const pB = calc(qB);
  return pA / (pA + pB);
}

export function runParlayMriScanner(
  legs: readonly ParlayMriLeg[],
  parlayOfferedDecimalOdds: number,
  isPrimeTimeShowdownWindow: boolean,
  hoursUntilKickoff: number,
): ParlayMriScanReport {
  if (legs.length < 2) {
    throw new Error("Parlay MRI requires at least 2 legs.");
  }

  let indepProb = 1.0;
  for (const leg of legs) {
    const pFair = shinDevigSingleSide(leg.offeredDecimalOdds, leg.fairTwoWayCounterpartDecimalOdds);
    indepProb *= pFair;
  }

  let logInteractionFactor = 0.0;
  for (let i = 0; i < legs.length; i++) {
    for (let j = i + 1; j < legs.length; j++) {
      const legI = atOrThrow(legs, i, "legs");
      const legJ = atOrThrow(legs, j, "legs");
      if (legI.gameId !== legJ.gameId) {
        continue;
      }
      const sameTeam = legI.team === legJ.team;
      const sortedKey = [legI.legRole, legJ.legRole].sort().join("|");
      let tau = 0.0;
      if (sameTeam) {
        tau = recordGetOrDefault(SIGNED_PAIR_CORRELATION, `${legI.legRole}|${legJ.legRole}`, 0.0);
        if (tau === 0.0) {
          tau = recordGetOrDefault(SIGNED_PAIR_CORRELATION, sortedKey, 0.0);
        }
      } else if (
        (legI.legRole === "QB_PASS_YDS" && legJ.legRole === "WR1_REC_YDS") ||
        (legJ.legRole === "QB_PASS_YDS" && legI.legRole === "WR1_REC_YDS")
      ) {
        tau = 0.19;
      }
      logInteractionFactor += 0.55 * tau;
    }
  }

  const correlatedProb = Math.max(0.001, Math.min(0.95, indepProb * Math.exp(logInteractionFactor)));
  const bookImpliedProb = 1.0 / parlayOfferedDecimalOdds;
  const hiddenBookHoldBps = Math.round(Math.max(0, (bookImpliedProb - correlatedProb) * 10000));

  const rawHealth = Math.max(5, Math.min(98, 92 - hiddenBookHoldBps / 35));
  const slipHealthBadge = formatConfidenceBadge(rawHealth);

  const recommendedPackSku = isPrimeTimeShowdownWindow
    ? hoursUntilKickoff >= 6
      ? "showdown_early_19"
      : "showdown_gameday_29"
    : hoursUntilKickoff >= 18
      ? "sunday_360_early_29"
      : "sunday_360_gameday_39";

  const summary = sanitizePublicCustomerCopy(
    `Parlay MRI Slip Rating: ${slipHealthBadge}. Sportsbook pricing charges ${hiddenBookHoldBps} bps of hidden multi-leg fee against true game-script interaction.`,
  );

  const scanId = createHash("sha256")
    .update(JSON.stringify({ legs, parlayOfferedDecimalOdds }))
    .digest("hex")
    .slice(0, 16);

  return {
    scanId,
    legCount: legs.length,
    independentFairProb: indepProb,
    correlatedSpinGlassProb: correlatedProb,
    bookImpliedProb,
    hiddenBookHoldBps,
    slipHealthBadge,
    plainEnglishSummary: summary,
    recommendedPackSku,
  };
}

export interface ViralLeadCaptureRecord {
  readonly leadId: string;
  readonly email: string;
  readonly smsE164?: string;
  readonly originatingScanId: string;
  readonly posthogProjectId: typeof POSTHOG_PROJECT_ID;
  readonly capturedAtEpochMs: number;
}

export interface PackPurchaseReceipt {
  readonly purchaseId: string;
  readonly customerId: string;
  readonly skuId: "showdown_early_19" | "showdown_gameday_29" | "sunday_360_early_29" | "sunday_360_gameday_39";
  readonly slateId: string;
  readonly paidCents: number;
  readonly alignmentSettled: boolean;
}

export class StoreCreditAlignmentLedger {
  private readonly purchases = new Map<string, PackPurchaseReceipt>();

  public registerPackPurchase(receipt: PackPurchaseReceipt): void {
    this.purchases.set(receipt.purchaseId, receipt);
  }

  /**
   * Contractual `100% Store-Credit Alignment` (Stream 1):
   * If a settled slate fails the pre-stated net unit alignment criterion (`netSlateUnits <= 0`),
   * issues an automatic, idempotent 100% Stripe Customer Balance store credit equal to `paidCents`.
   */
  public async settleSlateAlignment(
    purchaseId: string,
    netSlateUnits: number,
    stripeAdapter: StripeBillingAdapter,
  ): Promise<{ creditedCents: number; ledgerEntryId: string | null }> {
    const purchase = this.purchases.get(purchaseId);
    if (!purchase) {
      throw new Error(`Unknown pack purchaseId: ${purchaseId}`);
    }
    if (purchase.alignmentSettled) {
      return { creditedCents: 0, ledgerEntryId: null };
    }

    this.purchases.set(purchaseId, { ...purchase, alignmentSettled: true });
    if (netSlateUnits > 0) {
      return { creditedCents: 0, ledgerEntryId: null };
    }

    const creditRes = await stripeAdapter.creditCustomerBalance(
      purchase.customerId,
      purchase.paidCents,
      `100% Store-Credit Alignment on slate ${purchase.slateId} (${purchase.skuId})`,
      `align-100pct-${purchase.purchaseId}`,
    );
    return { creditedCents: purchase.paidCents, ledgerEntryId: creditRes.ledgerEntryId };
  }
}

// ============================================================================
// STREAM 2: `$59.99/mo` FOUNDING ALL-ACCESS (FIRST 100) & `$249` ROS+PLAYOFFS
//           WITH AUTOMATIC `$35` STORE-CREDIT UPGRADE BRIDGE
// ============================================================================

export const FOUNDING_MEMBER_SEAT_CAP = 100 as const;
export const AUTOMATIC_UPGRADE_BRIDGE_CREDIT_CENTS = 3500 as const; // $35.00 automatic bridge

function resolveUpgradeBridgeFloorCents(existingCents: number): number {
  return Math.max(existingCents, AUTOMATIC_UPGRADE_BRIDGE_CREDIT_CENTS);
}

export class FoundingMembershipAndCheckoutEngine {
  private activeFoundingSeats: number;
  private readonly priorPackCustomers = new Set<string>();

  constructor(initialFoundingSeats: number = 0) {
    this.activeFoundingSeats = initialFoundingSeats;
  }

  public recordPackBuyerForUpgradeBridge(customerId: string): void {
    this.priorPackCustomers.add(customerId);
  }

  public getRemainingFoundingSeats(): number {
    return Math.max(0, FOUNDING_MEMBER_SEAT_CAP - this.activeFoundingSeats);
  }

  /**
   * Resolves SKU cap & applies automatic `$35` store-credit upgrade bridge (plus any existing
   * customer store credit balance) with ZERO 21+ age gate per Astra Mandate #1.
   */
  public async createStreamCheckout(params: {
    readonly customerId: string;
    readonly customerEmail: string;
    readonly requestedSkuId: SkuId;
    readonly originUrl?: string;
    readonly stripeAdapter: StripeBillingAdapter;
  }): Promise<{
    readonly effectiveSkuId: SkuId;
    readonly grossAmountCents: number;
    readonly appliedBridgeAndStoreCreditCents: number;
    readonly netChargeCents: number;
    readonly foundingSeatNumber: number | null;
    readonly checkoutUrl: string;
  }> {
    let effectiveSkuId: SkuId = params.requestedSkuId;
    let foundingSeatNumber: number | null = null;

    if (params.requestedSkuId === "founding_all_access_5999") {
      if (this.activeFoundingSeats < FOUNDING_MEMBER_SEAT_CAP) {
        this.activeFoundingSeats += 1;
        foundingSeatNumber = this.activeFoundingSeats;
      } else {
        effectiveSkuId = "elite_standard_7999";
      }
    }

    const sku = GSE_SKU_CATALOG[effectiveSkuId];
    const existingBalanceCents = await params.stripeAdapter.getCustomerCreditBalanceCents(params.customerId);

    const qualifiesFor35Bridge =
      sku.upgradeBridgeEligible && this.priorPackCustomers.has(params.customerId);
    const bridgeCents = qualifiesFor35Bridge
      ? resolveUpgradeBridgeFloorCents(existingBalanceCents)
      : existingBalanceCents;
    const appliedCredit = Math.min(sku.amountCents, bridgeCents);
    const netChargeCents = Math.max(0, sku.amountCents - appliedCredit);

    if (qualifiesFor35Bridge && existingBalanceCents < AUTOMATIC_UPGRADE_BRIDGE_CREDIT_CENTS) {
      const topUp = AUTOMATIC_UPGRADE_BRIDGE_CREDIT_CENTS - existingBalanceCents;
      await params.stripeAdapter.creditCustomerBalance(
        params.customerId,
        topUp,
        "Automatic $35.00 Store-Credit Upgrade Bridge into All-Access / ROS+Playoffs",
        `upgrade-bridge-35-${params.customerId}-${effectiveSkuId}`,
      );
    }

    const baseOrigin = normalizeUtf8Nfc(params.originUrl ?? "https://galaxysportsedge.com");
    const session = await params.stripeAdapter.createCheckoutSession({
      customerId: normalizeUtf8Nfc(params.customerId),
      customerEmail: normalizeUtf8Nfc(params.customerEmail),
      skuId: effectiveSkuId,
      grossAmountCents: sku.amountCents,
      appliedStoreCreditCents: appliedCredit,
      netChargeCents,
      mode: sku.billingMode,
      metadata: {
        legal_entity: COMMERCIAL_LEGAL_ENTITY,
        sku_id: effectiveSkuId,
        stream_number: String(sku.streamNumber),
        founding_seat: foundingSeatNumber !== null ? String(foundingSeatNumber) : "none",
        age_gate_removed: "true_astra_mandate_1",
        rosca_one_click_cancel: "true",
      },
      successUrl: `${baseOrigin}/board?checkout=success&sku=${effectiveSkuId}`,
      cancelUrl: `${baseOrigin}/plans?checkout=cancelled`,
    });

    if (sku.streamNumber === 1) {
      this.priorPackCustomers.add(params.customerId);
    }

    return {
      effectiveSkuId,
      grossAmountCents: sku.amountCents,
      appliedBridgeAndStoreCreditCents: appliedCredit,
      netChargeCents,
      foundingSeatNumber,
      checkoutUrl: session.checkoutUrl,
    };
  }
}

// ============================================================================
// STREAM 3: DRAFTKINGS CLASSIC & SHOWDOWN MILP PORTFOLIO OPTIMIZER TIER
//           (`gse-dfs-pool-preview` LIVE AT 100% IN POSTHOG `516325`)
// ============================================================================

export interface PostHogFeatureFlagState {
  readonly projectId: typeof POSTHOG_PROJECT_ID;
  readonly flagKey: typeof POSTHOG_DFS_PREVIEW_FLAG;
  readonly rolloutPercentage: 100;
  readonly enabled: true;
}

export interface DfsDraftablePlayer {
  readonly playerId: string;
  readonly gsisId: string;
  readonly name: string;
  readonly position: "QB" | "RB" | "WR" | "TE" | "DST";
  readonly rosterSlotId: number; // 70 = FLEX duplicate slot in DK payload
  readonly salary: number;
  readonly team: string;
}

export interface DfsOptimizerEntitlementCheck {
  readonly posthogFlag: PostHogFeatureFlagState;
  readonly canViewLiveSlatePool: boolean;
  readonly maxClassicLineupsAllowed: number;
  readonly canRunShowdownCaptainMilp: boolean;
  readonly deduplicatedPoolCount: number;
}

export function evaluateDfsMilpTierAccess(
  rawCachedPlayers: readonly DfsDraftablePlayer[],
  activeEntitlements: readonly string[],
): DfsOptimizerEntitlementCheck {
  const uniqueByPlayerId = new Map<string, DfsDraftablePlayer>();
  for (const p of rawCachedPlayers) {
    if (p.rosterSlotId === 70 && uniqueByPlayerId.has(p.playerId)) {
      continue;
    }
    if (!uniqueByPlayerId.has(p.playerId) || p.rosterSlotId !== 70) {
      uniqueByPlayerId.set(p.playerId, p);
    }
  }

  const has150Max =
    activeEntitlements.includes("dfs_classic_showdown_150max_milp") ||
    activeEntitlements.includes("raw_10k_world_simulation_exports");
  const hasCashOrShowdownPack =
    activeEntitlements.includes("dfs_cash_builder") ||
    activeEntitlements.includes("showdown_captain_milp_preview");

  return {
    posthogFlag: {
      projectId: POSTHOG_PROJECT_ID,
      flagKey: POSTHOG_DFS_PREVIEW_FLAG,
      rolloutPercentage: 100,
      enabled: true,
    },
    canViewLiveSlatePool: true,
    maxClassicLineupsAllowed: has150Max ? 150 : hasCashOrShowdownPack ? 20 : 3,
    canRunShowdownCaptainMilp: has150Max || activeEntitlements.includes("showdown_captain_milp_preview"),
    deduplicatedPoolCount: uniqueByPlayerId.size,
  };
}

// ============================================================================
// STREAM 4: OPENROUTER `STEALTH-SKELETON` B2B API + x402 USDC + STRIPE METERED
//           DEVELOPER API (`packages/stats-api` & `packages/mcp-equations-server`)
// ============================================================================

export const OPENROUTER_STEALTH_PRICING = {
  modelIdAlpha: "gse/stealth-skeleton-alpha",
  modelIdProd: "gse/skeleton-v1",
  inputUsdPerMillionTokens: 1.50,
  outputUsdPerMillionTokens: 6.00,
  cacheReadUsdPerMillionTokens: 0.30,
  x402UsdcPerCallMicros: 150_000, // $0.15 USDC (6 decimals) on Base Mainnet
} as const;

export interface RegisteredApiKeyRecord {
  readonly keyId: string;
  readonly keySha256Hex: string;
  readonly stripeCustomerId: string;
  readonly scopes: readonly ("stats-api" | "mcp-equations-server" | "openrouter-bridge")[];
  readonly rateLimitPerMinute: number;
}

export interface x402PaymentProof {
  readonly chainId: 8453; // Base Mainnet
  readonly txHash: string;
  readonly usdcMicrosPaid: number;
  readonly easContract: typeof BASE_MAINNET_EAS_CONTRACT;
  readonly hmacSignatureHex: string;
}

export class B2BMeteredApiAndOpenRouterGateway {
  private readonly keysByHash = new Map<string, RegisteredApiKeyRecord>();
  private readonly minuteWindowCounts = new Map<string, { minuteBucket: number; count: number }>();
  private readonly x402VerifierSecret: string;

  constructor(x402VerifierSecret: string) {
    this.x402VerifierSecret = x402VerifierSecret;
  }

  public registerDeveloperApiKey(rawBearerKey: string, meta: Omit<RegisteredApiKeyRecord, "keySha256Hex">): void {
    const keySha256Hex = createHash("sha256").update(rawBearerKey, "utf8").digest("hex");
    this.keysByHash.set(keySha256Hex, { ...meta, keySha256Hex });
  }

  public verifyX402PaymentHeader(proof: x402PaymentProof): boolean {
    if (
      proof.chainId !== 8453 ||
      proof.easContract !== BASE_MAINNET_EAS_CONTRACT ||
      proof.usdcMicrosPaid < OPENROUTER_STEALTH_PRICING.x402UsdcPerCallMicros
    ) {
      return false;
    }
    const expectedHex = createHmac("sha256", this.x402VerifierSecret)
      .update(`${proof.chainId}:${proof.txHash}:${proof.usdcMicrosPaid}:${proof.easContract}`)
      .digest("hex");
    const a = Buffer.from(expectedHex, "utf8");
    const b = Buffer.from(proof.hmacSignatureHex, "utf8");
    return a.length === b.length && timingSafeEqual(a, b);
  }

  public async authorizeAndMeterDeveloperCall(params: {
    readonly targetSurface: "stats-api" | "mcp-equations-server";
    readonly rawApiKey?: string;
    readonly x402Proof?: x402PaymentProof;
    readonly requestId: string;
    readonly nowEpochMs: number;
    readonly stripeAdapter: StripeBillingAdapter;
  }): Promise<
    | { readonly authorized: true; readonly mode: "stripe_metered_key" | "x402_usdc"; readonly meterEventId?: string }
    | { readonly authorized: false; readonly httpStatus: 401 | 402 | 403 | 429; readonly challengeHeader?: string }
  > {
    if (params.x402Proof !== undefined) {
      if (this.verifyX402PaymentHeader(params.x402Proof)) {
        return { authorized: true, mode: "x402_usdc" };
      }
      return {
        authorized: false,
        httpStatus: 402,
        challengeHeader: `x402 chain="base-mainnet", amount_usdc="0.15", eas="${BASE_MAINNET_EAS_CONTRACT}"`,
      };
    }

    if (!params.rawApiKey) {
      return {
        authorized: false,
        httpStatus: 402,
        challengeHeader: `x402 chain="base-mainnet", amount_usdc="0.15", eas="${BASE_MAINNET_EAS_CONTRACT}"`,
      };
    }

    const digest = createHash("sha256").update(params.rawApiKey, "utf8").digest("hex");
    const keyRec = this.keysByHash.get(digest);
    if (!keyRec) {
      return { authorized: false, httpStatus: 401 };
    }
    if (!keyRec.scopes.includes(params.targetSurface)) {
      return { authorized: false, httpStatus: 403 };
    }

    const bucket = Math.floor(params.nowEpochMs / 60_000);
    const cur = this.minuteWindowCounts.get(keyRec.keyId);
    const nextCount = cur && cur.minuteBucket === bucket ? cur.count + 1 : 1;
    if (nextCount > keyRec.rateLimitPerMinute) {
      return { authorized: false, httpStatus: 429 };
    }
    this.minuteWindowCounts.set(keyRec.keyId, { minuteBucket: bucket, count: nextCount });

    const eventName =
      params.targetSurface === "stats-api" ? "gse_stats_api_call" : "gse_mcp_equation_call";
    const meterRes = await params.stripeAdapter.recordMeterEvent({
      eventName,
      stripeCustomerId: keyRec.stripeCustomerId,
      value: 1,
      idempotencyKey: `meter-${keyRec.keyId}-${params.requestId}`,
      timestampEpochSec: Math.floor(params.nowEpochMs / 1000),
    });

    return { authorized: true, mode: "stripe_metered_key", meterEventId: meterRes.meterEventId };
  }

  public quoteOpenRouterUsageUsd(params: {
    readonly promptTokens: number;
    readonly completionTokens: number;
    readonly cachedPromptTokens: number;
  }): { readonly totalUsd: number; readonly modelId: string } {
    const uncachedIn = Math.max(0, params.promptTokens - params.cachedPromptTokens);
    const totalUsd =
      (uncachedIn / 1_000_000) * OPENROUTER_STEALTH_PRICING.inputUsdPerMillionTokens +
      (params.cachedPromptTokens / 1_000_000) * OPENROUTER_STEALTH_PRICING.cacheReadUsdPerMillionTokens +
      (params.completionTokens / 1_000_000) * OPENROUTER_STEALTH_PRICING.outputUsdPerMillionTokens;
    return {
      totalUsd: Number(totalUsd.toFixed(6)),
      modelId: OPENROUTER_STEALTH_PRICING.modelIdProd,
    };
  }
}

// ============================================================================
// STREAM 5: DUAL-USE COMMERCIAL SBIR/STTR, DEFENSE TELEMETRY & PRIZE ROUTER
//           WHILE GSI CLEARS TX SOS `#15043440630001` 501(c)(3) REVISION
// ============================================================================

export type NonDilutiveTrackId =
  | "nsf_sbir_phase1_305k"
  | "dod_mtec_26_04_ota_7m"
  | "nfl_big_data_bowl_100k"
  | "arpa_h_precise_paradigm_9_3m"
  | "gsi_nonprofit_restricted_filings_hold";

export interface DualUseTrackPackage {
  readonly trackId: NonDilutiveTrackId;
  readonly title: string;
  readonly primeApplicantEntity: typeof COMMERCIAL_LEGAL_ENTITY | "Galaxy Science Institute";
  readonly targetAwardUsd: number;
  readonly statutoryOrContestAuthority: string;
  readonly gsiTxSosDependencyStatus:
    | "UNBLOCKED_COMMERCIAL_SBC_PRIME"
    | "HELD_UNTIL_TX_SOS_15043440630001_501C3_CLEARED_OR_HCB_81_2908499_SPONSORED";
  readonly dataRightsRetention:
    | "SBIR_DATA_RIGHTS_20YR_100PCT_GSE_GSI"
    | "OPEN_COMPETITION_REPRODUCIBLE_CODE"
    | "501C3_PUBLIC_CHARITY_GRANT";
  readonly submissionGate: ActionGovernanceGateResult;
}

export function buildStream5DualUseCapitalPackages(
  gsiTxSosRevisionCleared: boolean = false,
): readonly DualUseTrackPackage[] {
  return [
    {
      trackId: "nsf_sbir_phase1_305k",
      title: "NSF SBIR Phase I ($305k) — Bitemporal Viscoelastic & Rough-Path Telemetry Kernel",
      primeApplicantEntity: COMMERCIAL_LEGAL_ENTITY,
      targetAwardUsd: 305_000,
      statutoryOrContestAuthority: "15 U.S.C. § 638 (For-Profit SBC Prime: Galaxy Sports Network LLC)",
      gsiTxSosDependencyStatus: "UNBLOCKED_COMMERCIAL_SBC_PRIME",
      dataRightsRetention: "SBIR_DATA_RIGHTS_20YR_100PCT_GSE_GSI",
      submissionGate: enforceAutonomousBoundary("submit", "nsf-sbir-phase1-305k-gsn-llc"),
    },
    {
      trackId: "dod_mtec_26_04_ota_7m",
      title: "DoD / DHA MTEC-26-04 Commercial Performer Track — WHIM/Prony Blast & Blunt TBI Telemetry",
      primeApplicantEntity: COMMERCIAL_LEGAL_ENTITY,
      targetAwardUsd: 7_000_000,
      statutoryOrContestAuthority: "10 U.S.C. § 4022 Prototype OTA (W81XWH-15-9-0001; Commercial NTDC Prime + <=30% TRC4 Sub)",
      gsiTxSosDependencyStatus: "UNBLOCKED_COMMERCIAL_SBC_PRIME",
      dataRightsRetention: "SBIR_DATA_RIGHTS_20YR_100PCT_GSE_GSI",
      submissionGate: enforceAutonomousBoundary("submit", "dod-mtec-26-04-gsn-llc"),
    },
    {
      trackId: "nfl_big_data_bowl_100k",
      title: "NFL Big Data Bowl ($100k Kaggle Track) — Bitemporal SkeleTrack v2 & Coverage Separation",
      primeApplicantEntity: COMMERCIAL_LEGAL_ENTITY,
      targetAwardUsd: 100_000,
      statutoryOrContestAuthority: "NFL Football Operations / Kaggle Competition (mu=close CRPS <= 7.099 & Zero Lookahead)",
      gsiTxSosDependencyStatus: "UNBLOCKED_COMMERCIAL_SBC_PRIME",
      dataRightsRetention: "OPEN_COMPETITION_REPRODUCIBLE_CODE",
      submissionGate: enforceAutonomousBoundary("submit", "nfl-bdb-100k-kaggle"),
    },
    {
      trackId: "arpa_h_precise_paradigm_9_3m",
      title: "ARPA-H Open BAA / PRECISE-AI & PARADIGM ($125k Day-15 Payable Milestone 1A)",
      primeApplicantEntity: COMMERCIAL_LEGAL_ENTITY,
      targetAwardUsd: 9_300_000,
      statutoryOrContestAuthority: "42 U.S.C. § 290c Other Transaction Authority (ARPA-H-SOL-24-104 / 25-113)",
      gsiTxSosDependencyStatus: "UNBLOCKED_COMMERCIAL_SBC_PRIME",
      dataRightsRetention: "SBIR_DATA_RIGHTS_20YR_100PCT_GSE_GSI",
      submissionGate: enforceAutonomousBoundary("submit", "arpa-h-9-3m-gsn-llc"),
    },
    {
      trackId: "gsi_nonprofit_restricted_filings_hold",
      title: `Galaxy Science Institute Direct 501(c)(3) Research Grants (TX SOS #${GSI_TX_SOS_FILING_NUMBER})`,
      primeApplicantEntity: "Galaxy Science Institute",
      targetAwardUsd: 250_000,
      statutoryOrContestAuthority: gsiTxSosRevisionCleared
        ? `Direct 501(c)(3) Public Charity (TX SOS #${GSI_TX_SOS_FILING_NUMBER} Cleared)`
        : `Held pending TX SOS #${GSI_TX_SOS_FILING_NUMBER} 501(c)(3) revision (or routed via HCB EIN ${HCB_FISCAL_SPONSOR_EIN})`,
      gsiTxSosDependencyStatus: gsiTxSosRevisionCleared
        ? "UNBLOCKED_COMMERCIAL_SBC_PRIME"
        : "HELD_UNTIL_TX_SOS_15043440630001_501C3_CLEARED_OR_HCB_81_2908499_SPONSORED",
      dataRightsRetention: "501C3_PUBLIC_CHARITY_GRANT",
      submissionGate: enforceAutonomousBoundary(
        gsiTxSosRevisionCleared ? "submit" : "draft",
        `gsi-tx-sos-${GSI_TX_SOS_FILING_NUMBER}`,
      ),
    },
  ];
}
