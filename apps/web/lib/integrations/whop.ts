/**
 * Whop Integration — Webhook Verification & Membership Validation
 *
 * Provides cryptographic signature verification for incoming Whop webhooks
 * and paid membership validation for pick packages.
 */

import { createHmac, timingSafeEqual } from "node:crypto";

/** Free-tier proof-room plan & slug must NEVER unlock paid storefronts. */
const FREE_ONLY_PLAN_IDS = new Set(["plan_vrjx4trkvp9qs"]);
const FREE_ONLY_SLUGS = new Set(["free-proof-room"]);

function isFreeMembershipRecord(m: Record<string, unknown>): boolean {
  const planObj = m?.plan as Record<string, unknown> | undefined;
  const planId = String(m?.plan_id || planObj?.id || "").trim().toLowerCase();
  if (planId && FREE_ONLY_PLAN_IDS.has(planId)) {
    return true;
  }
  const metaSlug = String(
    (m?.metadata as Record<string, unknown> | undefined)?.gse_pack_slug || "",
  )
    .trim()
    .toLowerCase();
  if (metaSlug && FREE_ONLY_SLUGS.has(metaSlug)) {
    return true;
  }
  const initialPrice = planObj?.initial_price;
  const renewalPrice = planObj?.renewal_price;
  if (initialPrice === 0 && (renewalPrice === 0 || renewalPrice === undefined || renewalPrice === null)) {
    return true;
  }
  return false;
}

function isConfiguredFounderCompCode(candidate: string): boolean {
  const raw = (process.env.WHOP_FOUNDER_COMP_CODES || "").trim();
  if (!raw) return false;
  const cleanBuf = Buffer.from(candidate.trim().toLowerCase(), "utf8");
  for (const part of raw.split(",")) {
    const code = part.trim().toLowerCase();
    if (!code) continue;
    const codeBuf = Buffer.from(code, "utf8");
    if (codeBuf.length === cleanBuf.length && timingSafeEqual(codeBuf, cleanBuf)) {
      return true;
    }
  }
  return false;
}

/**
 * Verifies the HMAC-SHA256 signature on an incoming Whop webhook payload.
 * Whop sends signatures in the `whop-signature` or `x-whop-signature` header.
 */
export function verifyWhopWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
): boolean {
  if (!signatureHeader || !secret) {
    return false;
  }

  try {
    const computedHmac = createHmac("sha256", secret).update(rawBody).digest("hex");
    const cleanHeader = signatureHeader.trim().toLowerCase();

    // Direct hex match
    if (cleanHeader === computedHmac.toLowerCase()) {
      return true;
    }

    // Header may have t=... v1=... format (similar to Stripe/Svix)
    if (cleanHeader.includes("v1=") || cleanHeader.includes("s=")) {
      const parts = cleanHeader.split(",");
      for (const part of parts) {
        const [k, v] = part.trim().split("=");
        if ((k === "v1" || k === "s" || k === "sig") && v) {
          const expected = Buffer.from(computedHmac);
          const received = Buffer.from(v);
          if (expected.length === received.length && timingSafeEqual(expected, received)) {
            return true;
          }
        }
      }
    }

    const expectedBuffer = Buffer.from(computedHmac);
    const receivedBuffer = Buffer.from(cleanHeader);
    if (expectedBuffer.length === receivedBuffer.length) {
      return timingSafeEqual(expectedBuffer, receivedBuffer);
    }
  } catch {
    return false;
  }

  return false;
}

/**
 * Verifies a Whop user access token / membership key against Whop API
 * or deterministic test tokens.
 */
export async function verifyWhopMembership(
  accessToken: string,
): Promise<{ valid: boolean; tier: string }> {
  if (!accessToken || accessToken.trim().length === 0) {
    return { valid: false, tier: "none" };
  }

  const clean = accessToken.trim();
  const isTestEnv = process.env.VITEST === "true" || process.env.NODE_ENV === "test";

  // 1. Test tokens are accepted ONLY in explicit automated test environments.
  if (isTestEnv && (clean.startsWith("whop_test_valid") || clean.startsWith("test_token_"))) {
    return { valid: true, tier: "standard" };
  }

  if (clean.startsWith("whop_test_invalid") || clean.startsWith("expired_")) {
    return { valid: false, tier: "none" };
  }

  // Optional owner-provisioned comp codes configured strictly in env (never hardcoded).
  if (isConfiguredFounderCompCode(clean)) {
    return { valid: true, tier: "founder_comp" };
  }

  // 2. Query Whop v1 API (fail closed when API key is absent; never accept prefix tokens).
  const apiKey = (process.env.WHOP_API_KEY || "").trim();
  if (!apiKey) {
    return { valid: false, tier: "none" };
  }

  const whopHeaders = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    "Api-Version-Date": "2026-08-14",
  };
  const validStatuses = new Set(["active", "valid", "trialing", "completed"]);

  try {
    // 2a. Direct v1 membership lookup when given a mem_... token
    if (clean.startsWith("mem_")) {
      const res = await fetch(
        `https://api.whop.com/api/v1/memberships/${encodeURIComponent(clean)}`,
        { headers: whopHeaders, cache: "no-store" },
      );
      if (res.ok) {
        const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
        const membership = (data?.membership as Record<string, unknown> | undefined) ?? data;
        const status = String(membership?.status || "").toLowerCase();
        if (validStatuses.has(status) && !isFreeMembershipRecord(membership)) {
          const prod = membership?.product as Record<string, unknown> | undefined;
          const tier = prod?.title || membership?.plan_id || "standard";
          return { valid: true, tier: String(tier) };
        }
      }
      return { valid: false, tier: "none" };
    }

    // 2b. Verify against active PAID company memberships on biz_jzvuDvevsatKWi
    //     only by exact membership id, user_id, or member_id.
    //     Never accept arbitrary redirects, plan/product/pack slugs, or free proof-room plans.
    const listRes = await fetch(
      "https://api.whop.com/api/v1/memberships?account_id=biz_jzvuDvevsatKWi",
      { headers: whopHeaders, cache: "no-store" },
    );
    if (!listRes.ok) {
      return { valid: false, tier: "none" };
    }

    const listData = (await listRes.json().catch(() => ({}))) as {
      data?: Array<Record<string, unknown>>;
    };
    const memberships = Array.isArray(listData?.data) ? listData.data : [];
    const activePaidMemberships = memberships.filter(
      (m) =>
        validStatuses.has(String(m?.status || "").toLowerCase()) &&
        !isFreeMembershipRecord(m),
    );

    if (activePaidMemberships.length === 0) {
      return { valid: false, tier: "none" };
    }

    const cleanLower = clean.toLowerCase();
    const matched = activePaidMemberships.find((m) => {
      const id = String(m?.id || "").toLowerCase();
      const userId = String(m?.user_id || "").toLowerCase();
      const memberId = String(m?.member_id || "").toLowerCase();
      return (
        (id.length > 0 && cleanLower === id) ||
        (userId.length > 0 && cleanLower === userId) ||
        (memberId.length > 0 && cleanLower === memberId)
      );
    });

    if (matched) {
      const prodTitle =
        (matched.product as Record<string, unknown> | undefined)?.title ||
        matched.plan_id ||
        "standard";
      return { valid: true, tier: String(prodTitle) };
    }

    return { valid: false, tier: "none" };
  } catch {
    return { valid: false, tier: "none" };
  }
}
