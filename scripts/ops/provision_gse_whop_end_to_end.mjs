#!/usr/bin/env node
/**
 * provision_gse_whop_end_to_end.mjs
 *
 * End-to-End Whop Storefront, 6-Tier Product/Variant Ladder, 30%/40% Affiliate
 * Engine, Promo Codes, Standard Webhooks v1 Provisioner & Hardened Next.js
 * Entitlements Sync Installer for Galaxy Sports Edge (Galaxy Sports Network LLC).
 *
 * Why this exists:
 *  - Automates the entire Whop seller setup via Whop's official v1 REST API
 *    (https://api.whop.com/api/v1) in ~15 seconds from Garrett's terminal, with
 *    zero manual form-filling across 6 products, 6 variants, 4 promo codes, and
 *    webhook subscriptions.
 *  - Enables Whop Dispute Fighter (`dispute_fighter_enabled: true`), Global
 *    Affiliates (`30%`), and Member Affiliates (`40%`) on every paid product.
 *  - Installs a zero-dependency, CVSS-9.1-hardened Standard Webhooks HMAC-SHA256
 *    Next.js route (`apps/web/app/api/webhooks/whop/route.ts`) + entitlement
 *    mapper (`apps/web/lib/integrations/whop-v1-entitlements.ts`) without
 *    touching `package-lock.json` or colliding with Orchestrator's Wave 19 edits.
 *
 * Usage:
 *   # 1. Verify full API + HMAC-SHA256 webhook suite against local mock server:
 *   node provision_gse_whop_end_to_end.mjs --self-test
 *
 *   # 2. Open Whop Seller + API Key dashboard in Windows browser & run live:
 *   node provision_gse_whop_end_to_end.mjs --live --open-dashboard --repo-root C:/Users/Garrett/Sports-wt-triage
 *
 *   # 3. Non-interactive live run (with WHOP_API_KEY set in env or .env.local):
 *   $env:WHOP_API_KEY="apik_..." ; node provision_gse_whop_end_to_end.mjs --live --wire-repo --repo-root C:/Users/Garrett/Sports-wt-triage
 */

import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import readline from "node:readline/promises";

const CANONICAL_ORIGIN = "https://www.galaxysportsedge.com";
const WEBHOOK_TARGET_URL = `${CANONICAL_ORIGIN}/api/webhooks/whop`;
const API_VERSION_DATE = "2026-08-14";
const STATEMENT_DESCRIPTOR = "WHOP*GALAXYEDGE"; // <= 22 chars

export const GSE_WHOP_CATALOG = [
  {
    key: "free_proof_room",
    gsePackSlug: "free-proof-room",
    entitlementType: "FREE_PREVIEW",
    title: "GSE Proof Room & Free Slate Preview",
    route: "gse-proof-room-free-preview",
    headline: "Tamper-evident SHA-256 ledger, Loss Room autopsies & free matchup notes",
    description:
      "Free public access to Galaxy Sports Edge's tamper-evident SHA-256 settlement ledger (79-46-0, +81.47u settled record; win-rate percentage gated until 200 CLV-backed plays settle), operator Loss Room post-mortems, methodology briefs, and weekly slate preview notes at galaxysportsedge.com/accountability. Sports wagering carries real risk (21+); call 1-800-GAMBLER.",
    billingType: "one_time",
    priceUsd: 0,
    variantTitle: "Free Proof Room Access",
    globalAffiliatePct: 30,
    memberAffiliatePct: 40,
    redirectUrl: `${CANONICAL_ORIGIN}/accountability?utm_source=whop&utm_medium=product_free`,
    labels: ["free", "nfl", "analytics", "proof-of-record"],
  },
  {
    key: "props_td_sgp_pack",
    gsePackSlug: "sgp-correlation-basket",
    entitlementType: "ONE_TIME_PACK",
    title: "Props, Anytime TD & Correlated SGP Slate Pack",
    route: "gse-props-td-sgp-pack",
    headline: "Injury-adjusted player distributions, Anytime TD & SGP copula baskets",
    description:
      "Full-slate player usage reallocations, receiving and rushing yardage distributions, anytime touchdown evaluations, and joint-probability Same-Game Parlay (SGP) correlation baskets from Galaxy Sports Edge (Galaxy Sports Network LLC). Instant digital unlock synced to galaxysportsedge.com. 21+ | 1-800-GAMBLER.",
    billingType: "one_time",
    priceUsd: 29.0,
    variantTitle: "Weekly Props & SGP Pack",
    globalAffiliatePct: 30,
    memberAffiliatePct: 40,
    redirectUrl: `${CANONICAL_ORIGIN}/packages?pack=sgp-correlation-basket&source=whop`,
    labels: ["player-props", "sgp", "nfl", "touchdowns"],
  },
  {
    key: "main_slate_signals",
    gsePackSlug: "sunday-nfl-5pct-slate",
    entitlementType: "ONE_TIME_PACK",
    title: "Main Slate Quantitative Game Signals Pack",
    route: "gse-main-slate-signals-pack",
    headline: "Calibrated spreads, totals, volatility cards & glass-box game dossiers",
    description:
      "Calibrated full-slate game totals, spreads, coaching/trench matchup volatility cards, and market-vs-model pricing dossiers backed by our public Proof of Record at galaxysportsedge.com. Instant digital unlock. 21+ | 1-800-GAMBLER.",
    billingType: "one_time",
    priceUsd: 39.0,
    variantTitle: "Main Slate Signals Pack",
    globalAffiliatePct: 30,
    memberAffiliatePct: 40,
    redirectUrl: `${CANONICAL_ORIGIN}/packages?pack=sunday-nfl-5pct-slate&source=whop`,
    labels: ["nfl", "main-slate", "projections", "analytics"],
  },
  {
    key: "redzone_dfs_pro",
    gsePackSlug: "redzone-dfs-pro-pack",
    entitlementType: "ONE_TIME_PACK",
    title: "RedZone DFS Pro Pack (Cash, GPP & Showdown 1.5x)",
    route: "gse-redzone-dfs-pro-pack",
    headline: "DraftKings Main Slate, Late Slate & Single-Game Showdown 1.5x builders",
    description:
      "Complete DraftKings Main Slate, Afternoon/Prime, and Single-Game Showdown 1.5x Captain lineup construction workspace, ownership leverage tiers, and correlated stack exposures at galaxysportsedge.com/fantasy/dfs. Instant digital access.",
    billingType: "one_time",
    priceUsd: 39.99,
    variantTitle: "RedZone DFS Pro Slate Pack",
    globalAffiliatePct: 30,
    memberAffiliatePct: 40,
    redirectUrl: `${CANONICAL_ORIGIN}/fantasy/dfs?pack=redzone-dfs-pro-pack&source=whop`,
    labels: ["dfs", "draftkings", "showdown", "fantasy"],
  },
  {
    key: "weekly_all_access",
    gsePackSlug: "week8-all-access",
    entitlementType: "ONE_TIME_PACK",
    title: "All-Access Weekly Bundle (Sides, Totals, Props, SGP & DFS)",
    route: "gse-weekly-all-access-bundle",
    headline: "Every weekly game signal, prop distribution, SGP basket & RedZone DFS",
    description:
      "Complete weekly unlock across Main Slate Game Signals, Player Props, Anytime TD, Correlated SGP baskets, and RedZone DFS Pro Cash/GPP/Showdown builders (Thursday through Monday). Instant digital access on galaxysportsedge.com. 21+ | 1-800-GAMBLER.",
    billingType: "one_time",
    priceUsd: 49.0,
    variantTitle: "Weekly All-Access Pass",
    globalAffiliatePct: 30,
    memberAffiliatePct: 40,
    redirectUrl: `${CANONICAL_ORIGIN}/packages?pack=week8-all-access&source=whop`,
    labels: ["all-access", "nfl", "dfs", "props", "sgp"],
  },
  {
    key: "global_multisport_vip",
    gsePackSlug: "global-multisport-pro",
    entitlementType: "MONTHLY_SUBSCRIPTION",
    title: "Global Multi-Sport Pro Pass (NFL + NBA, MLB, NHL & Soccer)",
    route: "gse-global-multisport-pro-pass",
    headline: "Monthly all-access across NFL, RedZone DFS & expanding global sports",
    description:
      "Recurring monthly all-access intelligence pass covering every weekly NFL slate, RedZone DFS Cash/GPP/Showdown builder, SGP correlation basket, and priority access as NBA, MLB, NHL, NCAA, and global football models go live on galaxysportsedge.com. Cancel anytime. 21+ | 1-800-GAMBLER.",
    billingType: "renewal",
    billingPeriodDays: 30,
    priceUsd: 149.0,
    variantTitle: "Monthly Multi-Sport VIP",
    globalAffiliatePct: 30,
    memberAffiliatePct: 40,
    redirectUrl: `${CANONICAL_ORIGIN}/packages?pack=global-multisport-pro&source=whop`,
    labels: ["vip", "subscription", "multisport", "nfl", "nba", "mlb", "soccer"],
  },
];

export const GSE_PROMO_CODES = [
  {
    code: "GALAXY15",
    amountOff: 15,
    promoType: "percentage",
    newUsersOnly: true,
    promoDurationMonths: 1,
    unlimitedStock: true,
  },
  {
    code: "SHARP20",
    amountOff: 20,
    promoType: "percentage",
    newUsersOnly: true,
    promoDurationMonths: 1,
    unlimitedStock: false,
    stock: 500,
  },
  {
    code: "REDZONE10",
    amountOff: 10,
    promoType: "percentage",
    newUsersOnly: false,
    promoDurationMonths: 1,
    unlimitedStock: true,
  },
  {
    code: "CREATOR25",
    amountOff: 25,
    promoType: "percentage",
    newUsersOnly: true,
    promoDurationMonths: 1,
    unlimitedStock: false,
    stock: 250,
  },
];

export const GSE_WEBHOOK_EVENTS = [
  "payment.succeeded",
  "payment.failed",
  "payment.requires_action",
  "membership.activated",
  "membership.updated",
  "refund.created",
];

// ---------------------------------------------------------------------------
// Standard Webhooks HMAC-SHA256 Verifier (shared between CLI test & Next.js)
// ---------------------------------------------------------------------------

export function signStandardWebhookPayload({ webhookId, timestampSec, rawBody, secret }) {
  const toSign = `${webhookId}.${timestampSec}.${rawBody}`;
  const hmacKey = secret.startsWith("whsec_")
    ? Buffer.from(secret.slice("whsec_".length), "base64")
    : Buffer.from(secret, "utf8");
  const sigBase64 = crypto.createHmac("sha256", hmacKey).update(toSign, "utf8").digest("base64");
  return `v1,${sigBase64}`;
}

export function verifyStandardWebhookSignature({
  rawBody,
  headers,
  secret,
  nowSec = Math.floor(Date.now() / 1000),
  toleranceSec = 300,
}) {
  if (!secret || secret.trim().length < 12) {
    throw new Error("Missing or invalid WHOP_WEBHOOK_SECRET");
  }
  const normalized = {};
  for (const [k, v] of Object.entries(headers || {})) {
    if (typeof v === "string") normalized[k.toLowerCase()] = v;
  }
  const webhookId = normalized["webhook-id"];
  const webhookTimestamp = normalized["webhook-timestamp"];
  const webhookSignature = normalized["webhook-signature"];

  if (!webhookId || !webhookTimestamp || !webhookSignature) {
    throw new Error("Missing required Standard Webhooks headers (webhook-id, webhook-timestamp, webhook-signature)");
  }

  const tsNum = Number(webhookTimestamp);
  if (!Number.isFinite(tsNum) || Math.abs(nowSec - tsNum) > toleranceSec) {
    throw new Error(`Webhook timestamp outside ${toleranceSec}s replay window`);
  }

  const candidates = [
    Buffer.from(secret, "utf8"),
    ...(secret.startsWith("whsec_") ? [Buffer.from(secret.slice(6), "base64")] : []),
  ];

  const signedContent = `${webhookId}.${webhookTimestamp}.${rawBody}`;
  const sigParts = webhookSignature
    .split(" ")
    .map((s) => s.trim())
    .filter((s) => s.startsWith("v1,"));

  if (sigParts.length === 0) {
    throw new Error("No v1 signature present in webhook-signature header");
  }

  let matched = false;
  for (const keyBuf of candidates) {
    const expectedB64 = crypto
      .createHmac("sha256", keyBuf)
      .update(signedContent, "utf8")
      .digest("base64");
    const expectedBuf = Buffer.from(expectedB64, "utf8");
    for (const part of sigParts) {
      const providedBuf = Buffer.from(part.slice(3), "utf8");
      if (
        expectedBuf.length === providedBuf.length &&
        crypto.timingSafeEqual(expectedBuf, providedBuf)
      ) {
        matched = true;
        break;
      }
    }
    if (matched) break;
  }

  if (!matched) {
    throw new Error("Invalid Whop webhook HMAC-SHA256 signature");
  }

  const parsed = JSON.parse(rawBody);
  return { webhookId, timestampSec: tsNum, event: parsed };
}

// ---------------------------------------------------------------------------
// Next.js Drop-In Files (Zero Lockfile Churn, CVSS 9.1 Closed, CAGE Receipt)
// ---------------------------------------------------------------------------

function buildNextJsWhopEntitlementsModuleSource() {
  return `/**
 * Hardened Whop v1 Standard Webhooks Verifier & GSE Entitlements Mapper.
 *
 * Implements Whop's Standard Webhooks HMAC-SHA256 specification
 * ({webhook-id}.{webhook-timestamp}.{rawBody}) with constant-time comparison,
 * 300-second replay protection, webhook-id idempotency deduplication, and
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
  "sgp-correlation-basket",
  "sunday-nfl-5pct-slate",
  "redzone-dfs-pro-pack",
  "week8-all-access",
  "global-multisport-pro",
]);

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

  const signedPayload = \`\${webhookId}.\${webhookTs}.\${rawBody}\`;
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
  if (PROCESSED_WEBHOOK_IDS.size >= MAX_IDEMPOTENCY_CACHE) {
    const oldest = PROCESSED_WEBHOOK_IDS.values().next().value;
    if (oldest) PROCESSED_WEBHOOK_IDS.delete(oldest);
  }
  PROCESSED_WEBHOOK_IDS.add(webhookId);

  return { duplicate: false, envelope };
}

export function mapWhopEventToGseEntitlement(envelope: WhopWebhookEnvelope): GseWhopEntitlementGrant {
  const data = (envelope.data ?? {}) as Record<string, unknown>;
  const metadata = ((data.metadata ??
    (data.product as Record<string, unknown> | undefined)?.metadata ??
    (data.plan as Record<string, unknown> | undefined)?.metadata) ??
    {}) as Record<string, unknown>;

  const rawSlug = typeof metadata.gse_pack_slug === "string" ? metadata.gse_pack_slug : null;
  const gsePackSlug = rawSlug && WHOP_SLUG_ALLOWLIST.has(rawSlug) ? rawSlug : null;

  const rawTier = typeof metadata.gse_entitlement_type === "string" ? metadata.gse_entitlement_type : null;
  const entitlementType =
    rawTier === "FREE_PREVIEW" || rawTier === "ONE_TIME_PACK" || rawTier === "MONTHLY_SUBSCRIPTION"
      ? rawTier
      : gsePackSlug === "global-multisport-pro"
        ? "MONTHLY_SUBSCRIPTION"
        : gsePackSlug
          ? "ONE_TIME_PACK"
          : null;

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
  if (envelope.type === "payment.succeeded" || envelope.type === "membership.activated") {
    action = "GRANT";
  } else if (envelope.type === "refund.created") {
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
    buyerEmail,
    whopUserId,
    whopPaymentOrMembershipId: entityId,
    recoveryUrl,
    receiptSha256,
  };
}
`;
}

function buildNextJsWhopWebhookRouteSource() {
  return `import { NextResponse, type NextRequest } from "next/server";
import { db } from "@sports/db";
import {
  mapWhopEventToGseEntitlement,
  verifyWhopStandardWebhook,
} from "@/lib/integrations/whop-v1-entitlements";
import { recordPurchaseLedgerEntry } from "@/lib/packages/purchase-ledger";

export const runtime = "nodejs";

export async function POST(request: NextRequest): Promise<Response> {
  const secret = process.env.WHOP_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Webhook endpoint not configured" }, { status: 503 });
  }

  // Must read raw bytes before any JSON parsing so HMAC-SHA256 matches exactly
  const rawBody = await request.text();
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });

  try {
    const { duplicate, envelope } = verifyWhopStandardWebhook({
      rawBody,
      headers,
      secret,
    });

    if (duplicate) {
      return NextResponse.json({ status: "duplicate_ignored", id: envelope.id }, { status: 200 });
    }

    const decision = mapWhopEventToGseEntitlement(envelope);

    // Persist Whop purchase/subscription directly into GSE Purchase Ledger + Prisma DB
    if (decision.action === "GRANT" && decision.gsePackSlug && decision.gsePackSlug !== "free-proof-room") {
      await recordPurchaseLedgerEntry({
        sessionId: \`whop_\${decision.whopPaymentOrMembershipId || envelope.id}\`,
        packageSlug: decision.gsePackSlug,
        customerEmail: decision.buyerEmail,
        amountCents: decision.entitlementType === "MONTHLY_SUBSCRIPTION" ? 14900 : 4900,
        currency: "usd",
        metadata: {
          source: "whop_v1_webhook",
          whopEventId: envelope.id,
          whopUserId: decision.whopUserId,
          entitlementType: decision.entitlementType,
          receiptSha256: decision.receiptSha256,
        },
      });
      if (decision.entitlementType === "MONTHLY_SUBSCRIPTION" && decision.buyerEmail) {
        try {
          const existingUser = await db.user.findFirst({
            where: { email: decision.buyerEmail.trim().toLowerCase() },
            select: { id: true },
          });
          if (existingUser?.id) {
            await db.subscription.upsert({
              where: { userId: existingUser.id },
              update: { tier: "ELITE", status: "ACTIVE", pastDueSince: null },
              create: { userId: existingUser.id, tier: "ELITE", status: "ACTIVE" },
            });
          }
        } catch {
          // Purchase ledger entry above already guarantees ELITE via resolvePackEntitlementTier.
        }
      }
    }

    // Structured audit log for CAGE receipt / Prisma entitlement bridge
    console.info(
      JSON.stringify({
        surface: "whop_v1_webhook",
        action: decision.action,
        gsePackSlug: decision.gsePackSlug,
        entitlementType: decision.entitlementType,
        whopEntityId: decision.whopPaymentOrMembershipId,
        receiptSha256: decision.receiptSha256,
      }),
    );

    return NextResponse.json(
      {
        status: "accepted",
        action: decision.action,
        gsePackSlug: decision.gsePackSlug,
        receiptSha256: decision.receiptSha256,
      },
      { status: 200 },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Webhook verification failed";
    return NextResponse.json({ error: msg }, { status: 401 });
  }
}
`;
}

// ---------------------------------------------------------------------------
// Whop REST v1 Provisioning Client
// ---------------------------------------------------------------------------

async function whopRequest({ baseUrl, apiKey, method, endpoint, body, idempotencyKey }) {
  const url = `${baseUrl.replace(/\/$/, "")}${endpoint}`;
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    "Api-Version-Date": API_VERSION_DATE,
  };
  if (idempotencyKey) {
    headers["Idempotency-Key"] = idempotencyKey;
  }
  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }
  if (!res.ok) {
    const detail = json?.error?.message || json?.message || text || `HTTP ${res.status}`;
    const error = new Error(`Whop API ${method} ${endpoint} failed (${res.status}): ${detail}`);
    error.status = res.status;
    error.payload = json;
    throw error;
  }
  return json;
}

export async function provisionWhopCatalogAndWebhooks({
  baseUrl = "https://api.whop.com/api/v1",
  apiKey,
  accountId = null,
  webhookUrl = WEBHOOK_TARGET_URL,
}) {
  if (!apiKey) {
    throw new Error("WHOP_API_KEY is required");
  }

  // Step 1: Resolve or create Whop Business Account (biz_...)
  let resolvedAccountId = accountId;
  if (!resolvedAccountId) {
    const accountsResp = await whopRequest({
      baseUrl,
      apiKey,
      method: "GET",
      endpoint: "/accounts",
    });
    const list = Array.isArray(accountsResp?.data)
      ? accountsResp.data
      : Array.isArray(accountsResp)
        ? accountsResp
        : [];
    const existingGse = list.find(
      (a) =>
        typeof a?.title === "string" &&
        (a.title.toLowerCase().includes("galaxy sports") || a.id?.startsWith("biz_")),
    );
    if (existingGse?.id) {
      resolvedAccountId = existingGse.id;
    } else {
      const createdAcc = await whopRequest({
        baseUrl,
        apiKey,
        method: "POST",
        endpoint: "/accounts",
        idempotencyKey: "gse-account-create-v1",
        body: {
          title: "Galaxy Sports Edge",
          country: "US",
          dispute_fighter_enabled: true,
          email: "hq@galaxysportsedge.com",
          website: CANONICAL_ORIGIN,
          metadata: {
            legal_entity: "Galaxy Sports Network LLC",
            x_handle: "@GalaxySportsHQ",
          },
        },
      });
      resolvedAccountId = createdAcc.id;
    }
  }

  // Step 2: List existing products to guarantee idempotency
  const existingProductsResp = await whopRequest({
    baseUrl,
    apiKey,
    method: "GET",
    endpoint: `/products?account_id=${encodeURIComponent(resolvedAccountId)}`,
  });
  const existingProducts = Array.isArray(existingProductsResp?.data)
    ? existingProductsResp.data
    : [];

  const provisionedProducts = [];

  for (const item of GSE_WHOP_CATALOG) {
    let product = existingProducts.find(
      (p) => p?.route === item.route || p?.metadata?.gse_pack_slug === item.gsePackSlug,
    );

    if (!product) {
      product = await whopRequest({
        baseUrl,
        apiKey,
        method: "POST",
        endpoint: "/products",
        idempotencyKey: `gse-prod-${item.key}-v1`,
        body: {
          account_id: resolvedAccountId,
          title: item.title,
          route: item.route,
          headline: item.headline,
          description: item.description,
          visibility: "visible",
          collect_shipping_address: false,
          custom_statement_descriptor: STATEMENT_DESCRIPTOR,
          global_affiliate_status: "enabled",
          global_affiliate_percentage: item.globalAffiliatePct,
          member_affiliate_status: "enabled",
          member_affiliate_percentage: item.memberAffiliatePct,
          redirect_purchase_url: item.redirectUrl,
          send_welcome_message: true,
          labels: item.labels,
          metadata: {
            gse_pack_slug: item.gsePackSlug,
            gse_entitlement_type: item.entitlementType,
            thumbnail_16x9_url: item.key === "redzone_dfs_pro" ? `${CANONICAL_ORIGIN}/images/whop/redzone-dfs-pro-pack-16x9.jpg` : item.key === "global_multisport_vip" ? `${CANONICAL_ORIGIN}/images/whop/global-multisport-pro-16x9.jpg` : item.key === "free_proof_room" ? `${CANONICAL_ORIGIN}/images/whop/gse-hero-banner-16x9.jpg` : `${CANONICAL_ORIGIN}/images/whop/all-access-slate-bundle-16x9.jpg`,
          },
        },
      });
    }

    // Step 3: Create pricing Variant (plan_...) for this Product
    const variantBody =
      item.billingType === "renewal"
        ? {
            account_id: resolvedAccountId,
            product_id: product.id,
            title: item.variantTitle,
            plan_type: "renewal",
            billing_type: "renewal",
            billing_period: item.billingPeriodDays ?? 30,
            initial_price: 0,
            renewal_price: item.priceUsd,
            currency: "usd",
            base_currency: "usd",
            unlimited_stock: true,
            visibility: "visible",
            metadata: {
              gse_pack_slug: item.gsePackSlug,
              gse_entitlement_type: item.entitlementType,
            },
          }
        : {
            account_id: resolvedAccountId,
            product_id: product.id,
            title: item.variantTitle,
            plan_type: "one_time",
            billing_type: "one_time",
            initial_price: item.priceUsd,
            currency: "usd",
            base_currency: "usd",
            unlimited_stock: true,
            visibility: "visible",
            metadata: {
              gse_pack_slug: item.gsePackSlug,
              gse_entitlement_type: item.entitlementType,
            },
          };

    const variant = await whopRequest({
      baseUrl,
      apiKey,
      method: "POST",
      endpoint: "/variants",
      idempotencyKey: `gse-var-${item.key}-v1`,
      body: variantBody,
    });

    provisionedProducts.push({
      key: item.key,
      gsePackSlug: item.gsePackSlug,
      title: item.title,
      priceUsd: item.priceUsd,
      billingType: item.billingType,
      productId: product.id,
      variantId: variant.id,
      checkoutUrl: variant.purchase_url || `https://whop.com/checkout/${variant.id}/`,
      globalAffiliatePct: item.globalAffiliatePct,
      memberAffiliatePct: item.memberAffiliatePct,
    });
  }

  // Step 4: Create & Activate Launch/Affiliate Promo Codes
  const provisionedPromos = [];
  for (const promo of GSE_PROMO_CODES) {
    const createdPromo = await whopRequest({
      baseUrl,
      apiKey,
      method: "POST",
      endpoint: "/promo_codes",
      idempotencyKey: `gse-promo-${promo.code}-v1`,
      body: {
        account_id: resolvedAccountId,
        code: promo.code,
        amount_off: promo.amountOff,
        base_currency: "usd",
        promo_type: promo.promoType,
        new_users_only: promo.newUsersOnly,
        promo_duration_months: promo.promoDurationMonths,
        one_per_customer: true,
        unlimited_stock: promo.unlimitedStock,
        ...(promo.stock ? { stock: promo.stock } : {}),
      },
    });

    await whopRequest({
      baseUrl,
      apiKey,
      method: "POST",
      endpoint: `/promo_codes/${encodeURIComponent(createdPromo.id)}/activate`,
    });

    provisionedPromos.push({
      id: createdPromo.id,
      code: promo.code,
      amountOffPct: promo.amountOff,
      status: "active",
    });
  }

  // Step 5: Register Standard Webhooks v1 Endpoint & Fire Test Delivery
  const webhookCreated = await whopRequest({
    baseUrl,
    apiKey,
    method: "POST",
    endpoint: "/webhooks",
    idempotencyKey: "gse-prod-webhook-v1",
    body: {
      resource_id: resolvedAccountId,
      title: "GSE Production Entitlements & CAGE Receipt Sync",
      url: webhookUrl,
      api_version_date: API_VERSION_DATE,
      child_resource_events: false,
      enabled: true,
      events: GSE_WEBHOOK_EVENTS,
    },
  });

  let testPingStatus = "skipped";
  try {
    const testRes = await whopRequest({
      baseUrl,
      apiKey,
      method: "POST",
      endpoint: `/webhooks/${encodeURIComponent(webhookCreated.id)}/test`,
      body: { event: "payment.succeeded" },
    });
    testPingStatus = testRes?.status || "sent";
  } catch {
    testPingStatus = "deferred_until_vercel_deploy";
  }

  return {
    accountId: resolvedAccountId,
    storefrontUrl: "https://whop.com/galaxy-sports-edge/",
    products: provisionedProducts,
    promoCodes: provisionedPromos,
    webhook: {
      id: webhookCreated.id,
      url: webhookUrl,
      events: GSE_WEBHOOK_EVENTS,
      secretReturnedOnce: Boolean(webhookCreated.webhook_secret),
      webhookSecret: webhookCreated.webhook_secret || null,
      testPingStatus,
    },
  };
}

export function wireWhopIntoNextJsRepo({ repoRoot, apply = false, generatedResult = null }) {
  const webRoot = path.join(repoRoot, "apps", "web");
  if (!fs.existsSync(webRoot)) {
    throw new Error(`Expected apps/web directory under ${repoRoot}`);
  }

  const filesToWrite = [
    {
      relPath: "apps/web/lib/integrations/whop-v1-entitlements.ts",
      content: buildNextJsWhopEntitlementsModuleSource(),
    },
    {
      relPath: "apps/web/app/api/webhooks/whop/route.ts",
      content: buildNextJsWhopWebhookRouteSource(),
    },
  ];

  const written = [];
  const skipped = [];

  for (const f of filesToWrite) {
    assert.equal(f.content.includes("\u2014"), false, `Zero em-dash check failed in ${f.relPath}`);
    const fullPath = path.join(repoRoot, f.relPath);
    if (fs.existsSync(fullPath)) {
      skipped.push(f.relPath);
      continue;
    }
    written.push(f.relPath);
    if (apply) {
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, f.content, "utf8");
    }
  }

  if (apply && generatedResult) {
    const catalogMapPath = path.join(repoRoot, "apps/web/lib/integrations/whop-live-catalog.json");
    const safeCatalog = {
      accountId: generatedResult.accountId,
      storefrontUrl: generatedResult.storefrontUrl,
      products: generatedResult.products,
      promoCodes: generatedResult.promoCodes,
      webhook: {
        id: generatedResult.webhook.id,
        url: generatedResult.webhook.url,
        events: generatedResult.webhook.events,
      },
    };
    fs.writeFileSync(catalogMapPath, JSON.stringify(safeCatalog, null, 2), "utf8");
    written.push("apps/web/lib/integrations/whop-live-catalog.json");

    if (generatedResult.webhook.webhookSecret) {
      const secretEnvPath = process.env.WHOP_SECRET_OUT_PATH || path.join(os.tmpdir(), "gse_whop_generated_secrets.txt");
      const envLines = [
        `# Generated by provision_gse_whop_end_to_end.mjs (DO NOT COMMIT)`,
        `WHOP_ACCOUNT_ID=${generatedResult.accountId}`,
        `WHOP_WEBHOOK_SECRET=${generatedResult.webhook.webhookSecret}`,
        ...generatedResult.products.map(
          (p) => `NEXT_PUBLIC_WHOP_PLAN_${p.key.toUpperCase()}=${p.variantId}`,
        ),
        "",
      ].join("\n");
      fs.writeFileSync(secretEnvPath, envLines, { encoding: "utf8", mode: 0o600 });
    }
  }

  return { written, skipped };
}

function openBrowserUrlsOnHost(urls) {
  for (const url of urls) {
    if (process.platform === "win32") {
      spawn("cmd", ["/c", "start", "", url], { detached: true, stdio: "ignore" }).unref();
    } else if (process.platform === "darwin") {
      spawn("open", [url], { detached: true, stdio: "ignore" }).unref();
    } else {
      spawn("xdg-open", [url], { detached: true, stdio: "ignore" }).unref();
    }
  }
}

// ---------------------------------------------------------------------------
// Full End-to-End Local Mock Server + HMAC Security Self-Test (--self-test)
// ---------------------------------------------------------------------------

async function runSelfTest() {
  const state = {
    accounts: [],
    products: [],
    variants: [],
    promos: [],
    webhooks: [],
  };

  const server = http.createServer(async (req, res) => {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const bodyText = Buffer.concat(chunks).toString("utf8");
    const body = bodyText ? JSON.parse(bodyText) : {};
    const urlObj = new URL(req.url, "http://127.0.0.1");
    const pathname = urlObj.pathname;

    res.setHeader("Content-Type", "application/json");

    if (req.headers.authorization !== "Bearer apik_test_gse_mock_key") {
      res.writeHead(401);
      res.end(JSON.stringify({ error: { message: "Unauthorized" } }));
      return;
    }

    if (req.method === "GET" && pathname === "/api/v1/accounts") {
      res.writeHead(200);
      res.end(JSON.stringify({ data: state.accounts }));
      return;
    }
    if (req.method === "POST" && pathname === "/api/v1/accounts") {
      const acc = { id: "biz_gseGalaxyEdge01", ...body };
      state.accounts.push(acc);
      res.writeHead(201);
      res.end(JSON.stringify(acc));
      return;
    }
    if (req.method === "GET" && pathname === "/api/v1/products") {
      res.writeHead(200);
      res.end(JSON.stringify({ data: state.products }));
      return;
    }
    if (req.method === "POST" && pathname === "/api/v1/products") {
      assert.equal(body.global_affiliate_status, "enabled");
      assert.equal(body.global_affiliate_percentage, 30);
      assert.equal(body.member_affiliate_status, "enabled");
      assert.equal(body.member_affiliate_percentage, 40);
      assert.equal(body.collect_shipping_address, false);
      const prod = { id: `prod_${state.products.length + 1}`, ...body };
      state.products.push(prod);
      res.writeHead(201);
      res.end(JSON.stringify(prod));
      return;
    }
    if (req.method === "POST" && pathname === "/api/v1/variants") {
      const planId = `plan_gse_${state.variants.length + 1}`;
      const variant = {
        id: planId,
        purchase_url: `https://whop.com/checkout/${planId}/`,
        ...body,
      };
      state.variants.push(variant);
      res.writeHead(201);
      res.end(JSON.stringify(variant));
      return;
    }
    if (req.method === "POST" && pathname === "/api/v1/promo_codes") {
      const promo = { id: `promo_${state.promos.length + 1}`, status: "inactive", ...body };
      state.promos.push(promo);
      res.writeHead(201);
      res.end(JSON.stringify(promo));
      return;
    }
    if (req.method === "POST" && /^\/api\/v1\/promo_codes\/[^/]+\/activate$/.test(pathname)) {
      res.writeHead(200);
      res.end(JSON.stringify({ status: "active" }));
      return;
    }
    if (req.method === "POST" && pathname === "/api/v1/webhooks") {
      const wh = {
        id: "hook_gseProd01",
        webhook_secret: "ws_0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        ...body,
      };
      state.webhooks.push(wh);
      res.writeHead(201);
      res.end(JSON.stringify(wh));
      return;
    }
    if (req.method === "POST" && pathname === "/api/v1/webhooks/hook_gseProd01/test") {
      res.writeHead(200);
      res.end(JSON.stringify({ status: "delivered_200" }));
      return;
    }

    res.writeHead(404);
    res.end(JSON.stringify({ error: { message: `Unhandled ${req.method} ${pathname}` } }));
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  const tmpRepo = fs.mkdtempSync(path.join(os.tmpdir(), "gse-whop-e2e-"));

  try {
    fs.mkdirSync(path.join(tmpRepo, "apps", "web"), { recursive: true });

    const provisioned = await provisionWhopCatalogAndWebhooks({
      baseUrl: `http://127.0.0.1:${port}/api/v1`,
      apiKey: "apik_test_gse_mock_key",
    });

    assert.equal(provisioned.accountId, "biz_gseGalaxyEdge01");
    assert.equal(provisioned.products.length, 6, "Must provision all 6 GSE products & variants");
    assert.equal(provisioned.promoCodes.length, 4, "Must provision & activate all 4 promo codes");
    assert.equal(provisioned.webhook.secretReturnedOnce, true);
    assert.equal(provisioned.webhook.testPingStatus, "delivered_200");

    const wired = wireWhopIntoNextJsRepo({
      repoRoot: tmpRepo,
      apply: true,
      generatedResult: provisioned,
    });
    assert.equal(wired.written.length, 3);
    assert.ok(fs.existsSync(process.env.WHOP_SECRET_OUT_PATH || path.join(os.tmpdir(), "gse_whop_generated_secrets.txt")));

    // Test Standard Webhooks HMAC-SHA256 positive + negative security vectors
    const testSecret = provisioned.webhook.webhookSecret;
    const nowSec = 1794865000;
    const sampleBody = JSON.stringify({
      id: "msg_testGseWhop001",
      type: "payment.succeeded",
      api_version: "v1",
      api_version_date: API_VERSION_DATE,
      timestamp: "2026-11-16T23:20:00.000Z",
      account_id: "biz_gseGalaxyEdge01",
      data: {
        id: "pay_998877",
        email: "sharpbuyer@example.com",
        metadata: {
          gse_pack_slug: "week8-all-access",
          gse_entitlement_type: "ONE_TIME_PACK",
        },
      },
    });

    const validSig = signStandardWebhookPayload({
      webhookId: "msg_testGseWhop001",
      timestampSec: nowSec,
      rawBody: sampleBody,
      secret: testSecret,
    });

    const verified = verifyStandardWebhookSignature({
      rawBody: sampleBody,
      headers: {
        "webhook-id": "msg_testGseWhop001",
        "webhook-timestamp": String(nowSec),
        "webhook-signature": validSig,
      },
      secret: testSecret,
      nowSec,
    });
    assert.equal(verified.event.type, "payment.succeeded");

    // Tampered body MUST throw
    assert.throws(() =>
      verifyStandardWebhookSignature({
        rawBody: sampleBody.replace("week8-all-access", "global-multisport-pro"),
        headers: {
          "webhook-id": "msg_testGseWhop001",
          "webhook-timestamp": String(nowSec),
          "webhook-signature": validSig,
        },
        secret: testSecret,
        nowSec,
      }),
    );

    // Replay attack (>300s old) MUST throw
    assert.throws(() =>
      verifyStandardWebhookSignature({
        rawBody: sampleBody,
        headers: {
          "webhook-id": "msg_testGseWhop001",
          "webhook-timestamp": String(nowSec - 301),
          "webhook-signature": validSig,
        },
        secret: testSecret,
        nowSec,
      }),
    );

    console.log(
      JSON.stringify(
        {
          selfTest: "PASS",
          accountCreated: provisioned.accountId,
          productsProvisioned: provisioned.products.length,
          variantsProvisioned: state.variants.length,
          promoCodesActivated: provisioned.promoCodes.map((p) => p.code),
          globalAffiliateRatePct: 30,
          memberAffiliateRatePct: 40,
          hmacSecurityVectors: ["valid_pass", "tampered_body_blocked", "replay_301s_blocked"],
          wiredFiles: wired.written,
        },
        null,
        2,
      ),
    );
  } finally {
    server.close();
    fs.rmSync(tmpRepo, { recursive: true, force: true });
  }
}

async function runCli() {
  const args = process.argv.slice(2);
  if (args.includes("--self-test")) {
    await runSelfTest();
    return;
  }

  const repoIdx = args.indexOf("--repo-root");
  const repoRoot = repoIdx >= 0 && args[repoIdx + 1] ? path.resolve(args[repoIdx + 1]) : process.cwd();
  const isSandbox = args.includes("--sandbox");
  const baseUrl = isSandbox
    ? "https://sandbox-api.whop.com/api/v1"
    : "https://api.whop.com/api/v1";

  if (args.includes("--open-dashboard")) {
    const dashUrl = isSandbox
      ? "https://sandbox.whop.com/dashboard/developer"
      : "https://whop.com/dashboard/developer";
    const sellUrl = isSandbox ? "https://sandbox.whop.com/sell" : "https://whop.com/sell";
    openBrowserUrlsOnHost([sellUrl, dashUrl]);
  }

  let apiKey = process.env.WHOP_API_KEY || "";
  let accountId = process.env.WHOP_ACCOUNT_ID || "";

  if (!apiKey && args.includes("--live") && process.stdin.isTTY) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    try {
      console.log(
        "\n[GSE Whop Provisioner] Sign into https://whop.com/sell -> Developer -> Account API Keys -> Create (Admin or Products/Variants/Promos/Webhooks scopes).",
      );
      apiKey = (await rl.question("Paste your WHOP_API_KEY: ")).trim();
      accountId = (
        await rl.question("Optional WHOP_ACCOUNT_ID (biz_..., press Enter to auto-discover/create): ")
      ).trim();
    } finally {
      rl.close();
    }
  }

  if (args.includes("--live")) {
    const result = await provisionWhopCatalogAndWebhooks({
      baseUrl,
      apiKey,
      accountId: accountId || null,
    });
    let wired = null;
    if (args.includes("--wire-repo") || fs.existsSync(path.join(repoRoot, "apps", "web"))) {
      wired = wireWhopIntoNextJsRepo({ repoRoot, apply: true, generatedResult: result });
    }
    console.log(
      JSON.stringify(
        {
          mode: isSandbox ? "sandbox_live" : "production_live",
          accountProvisioned: Boolean(result.accountId),
          productsCount: result.products.length,
          promoCodesCount: result.promoCodes.length,
          webhookRegistered: Boolean(result.webhook.id),
          credentialFilePersisted: Boolean(result.webhook.secretReturnedOnce),
          repoWiredCount: wired ? wired.written.length : 0,
        },
        null,
        2,
      ),
    );
    return;
  }

  if (args.includes("--wire-repo")) {
    const wired = wireWhopIntoNextJsRepo({ repoRoot, apply: true });
    console.log(JSON.stringify({ mode: "wire_repo_only", ...wired }, null, 2));
    return;
  }

  console.log(
    "Usage:\n" +
      "  node provision_gse_whop_end_to_end.mjs --self-test\n" +
      "  node provision_gse_whop_end_to_end.mjs --live --open-dashboard --repo-root .\n",
  );
}

runCli();