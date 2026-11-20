#!/usr/bin/env node
/**
 * sync-whop-storefront-catalog.mjs
 * Syncs `infra/whop-storefront/storefront-products.json` with live env checkout links,
 * probes `https://galaxy-sports-edge.whop.site`, and optionally queries Whop v5 products API
 * when `WHOP_API_KEY` is configured.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const REPO_ROOT = resolve(import.meta.dirname || process.cwd(), "../..");
const STOREFRONT_JSON = resolve(REPO_ROOT, "infra/whop-storefront/storefront-products.json");
const WHOP_SITE_URL = "https://galaxy-sports-edge.whop.site";

async function main() {
  const payload = JSON.parse(readFileSync(STOREFRONT_JSON, "utf8"));
  for (const prod of payload.products || []) {
    const envVal = process.env[prod.whopCheckoutEnv]?.trim();
    if (envVal) prod.checkoutUrl = envVal;
  }
  payload.lastSyncedAt = new Date().toISOString();
  writeFileSync(STOREFRONT_JSON, JSON.stringify(payload, null, 2) + "\n", "utf8");

  let siteStatus = null;
  try {
    const r = await fetch(WHOP_SITE_URL, { method: "HEAD", signal: AbortSignal.timeout(10_000) });
    siteStatus = {
      status: r.status,
      xWhopApp: r.headers.get("x-whop-app"),
      ok: r.ok,
    };
  } catch (err) {
    siteStatus = { ok: false, error: err instanceof Error ? err.message : String(err) };
  }

  let whopApiProducts = null;
  const whopApiKey = process.env.WHOP_API_KEY?.trim();
  if (whopApiKey) {
    try {
      const r = await fetch("https://api.whop.com/api/v5/products?company_id=biz_jzvuDvevsatKWi", {
        headers: { Authorization: `Bearer ${whopApiKey}` },
        signal: AbortSignal.timeout(10_000),
      });
      whopApiProducts = { status: r.status, count: r.ok ? ((await r.json())?.data?.length ?? 0) : 0 };
    } catch (err) {
      whopApiProducts = { error: err instanceof Error ? err.message : String(err) };
    }
  } else {
    whopApiProducts = { configured: false, note: "Set WHOP_API_KEY to query api.whop.com/api/v5/products directly." };
  }

  console.log(
    JSON.stringify(
      {
        storefrontCatalogCount: (payload.products || []).length,
        storefrontPath: "infra/whop-storefront/storefront-products.json",
        whopSiteUrl: WHOP_SITE_URL,
        siteStatus,
        whopApiProducts,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error("[sync-whop-storefront-catalog] FAIL:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
