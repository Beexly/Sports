/**
 * Hardened Whop v1 Standard Webhooks Verifier & GSE Entitlements Mapper.
 *
 * Implements Whop's Standard Webhooks HMAC-SHA256 specification
 * ({webhook-id}.{webhook-timestamp}.{rawBody}) with constant-time comparison,
 * 300-second replay protection, explicit post-commit idempotency marking, and
 * deterministic SHA-256 receipt digests.
 */
import crypto from "node:crypto";

export interface WhopWebhookEnvelope<T = Record<string, unknown>> {
  id: string;
  type: string;
  api_version: string;
  api_version_date?: string | null;
  timestamp: string;
  account_id?: string | null;
  company_id?: string | null;
  data: T;
}

export interface GseWhopEntitlementGrant {
  webhookId: string;
  eventType: string;
  action: "GRANT" | "REVOKE" | "RECOVERY_REQUIRED" | "IGNORE";
  gsePackSlug: string | null;
  entitlementType: "FREE_PREVIEW" | "ONE_TIME_PACK" | "MONTHLY_SUBSCRIPTION" | null;
  planTier: "PRO" | "ELITE" | "FANTASY" | null;
  buyerEmail: string | null;
  whopUserId: string | null;
  whopPaymentOrMembershipId: string | null;
  recoveryUrl: string | null;
  receiptSha256: string;
}

const PROCESSED_WEBHOOK_IDS = new Set<string>();
const MAX_IDEMPOTENCY_CACHE = 5000;

export const WHOP_SLUG_ALLOWLIST = new Set<string>([
  "free-proof-room",
  "open-field-pass",
  "primetime-showdown-pack",
  "thanksgiving-5game-pack",
  "sunday-full-slate-pack",
  "season-membership",
  "season-membership-monthly",
  "pro-monthly",
  "elite-monthly",
  "sgp-correlation-basket",
  "sunday-nfl-5pct-slate",
  "redzone-dfs-pro-pack",
  "week8-all-access",
  "week8-all-access-gameday-pass",
  "global-multisport-pro",
]);

/** Marks a verified Whop webhook id as processed ONLY after durable commit succeeds. */
export function markWhopWebhookProcessed(webhookId: string): void {
  if (!webhookId) return;
  if (PROCESSED_WEBHOOK_IDS.size >= MAX_IDEMPOTENCY_CACHE) {
    const oldest = PROCESSED_WEBHOOK_IDS.values().next().value;
    if (oldest) PROCESSED_WEBHOOK_IDS.delete(oldest);
  }
  PROCESSED_WEBHOOK_IDS.add(webhookId);
}

/** Clears processed Whop webhook cache (tests only). */
export function clearProcessedWhopWebhooksForTests(): void {
  PROCESSED_WEBHOOK_IDS.clear();
}

export function verifyWhopStandardWebhook(params: {
  rawBody: string;
  headers: Record<string, string | undefined>;
  secret: string;
  nowSec?: number;
  toleranceSec?: number;
}): { duplicate: boolean; envelope: WhopWebhookEnvelope } {
  const { rawBody, headers, secret, toleranceSec = 300 } = params;
  const nowSec = params.nowSec ?? Math.floor(Date.now() / 1000);

  if (!secret || secret.trim().length < 12) {
    throw new Error("WHOP_WEBHOOK_SECRET is unset or too short");
  }

  const lower: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) {
    if (typeof v === "string") lower[k.toLowerCase()] = v;
  }

  const webhookId = lower["webhook-id"];
  const webhookTs = lower["webhook-timestamp"];
  const webhookSig = lower["webhook-signature"];

  if (!webhookId || !webhookTs || !webhookSig) {
    throw new Error("Missing Standard Webhooks signature headers");
  }

  const tsNum = Number(webhookTs);
  if (!Number.isFinite(tsNum) || Math.abs(nowSec - tsNum) > toleranceSec) {
    throw new Error("Whop webhook timestamp outside allowed 300s window");
  }

  const signedPayload = `${webhookId}.${webhookTs}.${rawBody}`;
  const keyCandidates: Buffer[] = [Buffer.from(secret, "utf8")];
  if (secret.startsWith("whsec_")) {
    keyCandidates.push(Buffer.from(secret.slice(6), "base64"));
  }

  const v1Parts = webhookSig
    .split(" ")
    .map((p) => p.trim())
    .filter((p) => p.startsWith("v1,"));

  if (v1Parts.length === 0) {
    throw new Error("Missing v1 signature prefix in webhook-signature");
  }

  let verified = false;
  for (const keyBuf of keyCandidates) {
    const expected = Buffer.from(
      crypto.createHmac("sha256", keyBuf).update(signedPayload, "utf8").digest("base64"),
      "utf8",
    );
    for (const part of v1Parts) {
      const actual = Buffer.from(part.slice(3), "utf8");
      if (expected.length === actual.length && crypto.timingSafeEqual(expected, actual)) {
        verified = true;
        break;
      }
    }
    if (verified) break;
  }

  if (!verified) {
    throw new Error("Whop webhook HMAC-SHA256 verification failed");
  }

  const envelope = JSON.parse(rawBody) as WhopWebhookEnvelope;
  if (PROCESSED_WEBHOOK_IDS.has(webhookId)) {
    return { duplicate: true, envelope };
  }

  return { duplicate: false, envelope };
}

export function mapWhopEventToGseEntitlement(envelope: WhopWebhookEnvelope): GseWhopEntitlementGrant {
  const data = (envelope.data ?? {}) as Record<string, unknown>;
  const metadata = ((data.metadata ??
    (data.product as Record<string, unknown> | undefined)?.metadata ??
    (data.plan as Record<string, unknown> | undefined)?.metadata) ??
    {}) as Record<string, unknown>;

  const rawSlug =
    typeof metadata.gse_pack_slug === "string"
      ? metadata.gse_pack_slug
      : typeof metadata.packageSlug === "string"
        ? metadata.packageSlug
        : typeof metadata.slug === "string"
          ? metadata.slug
          : null;
  const gsePackSlug = rawSlug && WHOP_SLUG_ALLOWLIST.has(rawSlug) ? rawSlug : null;

  const isMonthlySlug =
    gsePackSlug === "global-multisport-pro" ||
    gsePackSlug === "season-membership" ||
    gsePackSlug === "season-membership-monthly" ||
    gsePackSlug === "pro-monthly" ||
    gsePackSlug === "elite-monthly";

  const rawTier = typeof metadata.gse_entitlement_type === "string" ? metadata.gse_entitlement_type : null;
  const entitlementType =
    rawTier === "FREE_PREVIEW" || rawTier === "ONE_TIME_PACK" || rawTier === "MONTHLY_SUBSCRIPTION"
      ? rawTier
      : gsePackSlug === "free-proof-room" || gsePackSlug === "open-field-pass"
        ? "FREE_PREVIEW"
        : isMonthlySlug
          ? "MONTHLY_SUBSCRIPTION"
          : gsePackSlug
            ? "ONE_TIME_PACK"
            : null;

  const rawAmt = Number(data.amount ?? data.final_amount ?? 0);
  const rawPlanTier =
    typeof metadata.gse_plan_tier === "string" ? metadata.gse_plan_tier.trim().toUpperCase() : null;
  let planTier: GseWhopEntitlementGrant["planTier"] = null;
  if (entitlementType === "MONTHLY_SUBSCRIPTION") {
    if (rawPlanTier === "PRO" || rawPlanTier === "ELITE") {
      planTier = rawPlanTier;
    } else if (gsePackSlug === "pro-monthly") {
      planTier = "PRO";
    } else if (gsePackSlug === "elite-monthly" || gsePackSlug === "global-multisport-pro") {
      planTier = "ELITE";
    } else if (rawAmt > 0 && rawAmt <= 4500) {
      planTier = "PRO";
    } else {
      planTier = "ELITE";
    }
  } else if (entitlementType === "ONE_TIME_PACK") {
    if (gsePackSlug === "redzone-dfs-pro-pack") {
      planTier = "FANTASY";
    } else if (gsePackSlug === "week8-all-access" || gsePackSlug === "week8-all-access-gameday-pass") {
      planTier = "ELITE";
    } else {
      planTier = "PRO";
    }
  }

  const userObj = (data.user ?? data.member ?? {}) as Record<string, unknown>;
  const buyerEmail =
    typeof data.email === "string"
      ? data.email
      : typeof userObj.email === "string"
        ? userObj.email
        : null;
  const whopUserId = typeof userObj.id === "string" ? userObj.id : null;
  const entityId = typeof data.id === "string" ? data.id : null;
  const recoveryUrl = typeof data.recovery_url === "string" ? data.recovery_url : null;

  let action: GseWhopEntitlementGrant["action"] = "IGNORE";
  if (
    envelope.type === "payment.succeeded" ||
    envelope.type === "membership.activated" ||
    envelope.type === "membership.went_valid"
  ) {
    action = "GRANT";
  } else if (
    envelope.type === "refund.created" ||
    envelope.type === "membership.deactivated" ||
    envelope.type === "membership.went_invalid" ||
    envelope.type === "membership.canceled"
  ) {
    action = "REVOKE";
  } else if (envelope.type === "payment.requires_action" || envelope.type === "payment.failed") {
    action = "RECOVERY_REQUIRED";
  }

  const receiptSha256 = crypto
    .createHash("sha256")
    .update(
      JSON.stringify({
        webhookId: envelope.id,
        eventType: envelope.type,
        action,
        gsePackSlug,
        buyerEmail,
        entityId,
      }),
    )
    .digest("hex");

  return {
    webhookId: envelope.id,
    eventType: envelope.type,
    action,
    gsePackSlug,
    entitlementType,
    planTier,
    buyerEmail,
    whopUserId,
    whopPaymentOrMembershipId: entityId,
    recoveryUrl,
    receiptSha256,
  };
}
