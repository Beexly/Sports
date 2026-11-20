#!/usr/bin/env node
/**
 * verify-checkout-and-tnf-readiness.mjs
 * Verifies Week 11 TNF (IND @ HOU) readiness, Stripe/Whop (biz_jzvuDvevsatKWi /
 * app_PrbVglxvAeazeA) checkout posture, PR #1291/#1301 state, and origin/main alignment.
 */
import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const REPO_ROOT = resolve(import.meta.dirname || process.cwd(), "../..");

function parseEnvFile(path) {
  const out = {};
  if (!existsSync(path)) return out;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq > 0) out[t.slice(0, eq).trim()] = t.slice(eq + 1).trim();
  }
  return out;
}

function runCmd(cmd, args) {
  const r = spawnSync(cmd, args, { cwd: REPO_ROOT, encoding: "utf8", timeout: 15_000, shell: process.platform === "win32" });
  return { status: r.status, stdout: (r.stdout || "").trim(), stderr: (r.stderr || "").trim() };
}

async function main() {
  const envMerged = {
    ...parseEnvFile(resolve(REPO_ROOT, ".env")),
    ...parseEnvFile(resolve(REPO_ROOT, ".env.local")),
    ...parseEnvFile(resolve(REPO_ROOT, "apps/web/.env.local")),
    ...process.env,
  };

  const tnfPath = resolve(REPO_ROOT, "docs/predictions/research/2026-11-18/cadence_v25_injury_overlay_tnf_w11.json");
  const tnfOverlay = existsSync(tnfPath) ? JSON.parse(readFileSync(tnfPath, "utf8")) : null;

  const stripePriceKeys = Object.keys(envMerged).filter((k) => k.startsWith("STRIPE_") && k.includes("PRICE_ID"));
  const whopEnvKeys = Object.keys(envMerged).filter((k) => k.startsWith("WHOP_CHECKOUT_"));

  let whopSite = null;
  try {
    const r = await fetch("https://galaxy-sports-edge.whop.site", { method: "HEAD", signal: AbortSignal.timeout(8000) });
    whopSite = { status: r.status, appId: r.headers.get("x-whop-app"), ok: r.ok };
  } catch (err) {
    whopSite = { ok: false, error: err instanceof Error ? err.message : String(err) };
  }

  let prodProductsJson = null;
  try {
    const r = await fetch("https://www.galaxysportsedge.com/products.json", { signal: AbortSignal.timeout(8000) });
    prodProductsJson = { status: r.status, ok: r.ok, note: r.status === 404 ? "Will go live once PR/branch deploys /products.json" : "Live" };
  } catch (err) {
    prodProductsJson = { ok: false, error: err instanceof Error ? err.message : String(err) };
  }

  const branch = runCmd("git", ["branch", "--show-current"]).stdout;
  const pr1291 = runCmd("gh", ["pr", "view", "1291", "--repo", "Beexly/Sports", "--json", "number,state,mergedAt,title"]);
  const pr1301 = runCmd("gh", ["pr", "view", "1301", "--repo", "Beexly/Sports", "--json", "number,state,mergeable,title"]);

  const summary = {
    checkedAt: new Date().toISOString(),
    gitBranch: branch,
    tnfWeek11Overlay: {
      exists: Boolean(tnfOverlay),
      path: "docs/predictions/research/2026-11-18/cadence_v25_injury_overlay_tnf_w11.json",
      matchup: tnfOverlay?.matchup || "IND @ HOU",
    },
    stripe: {
      secretKeyConfigured: Boolean(envMerged.STRIPE_SECRET_KEY),
      isLiveKey: Boolean(envMerged.STRIPE_SECRET_KEY?.startsWith("sk_live_")),
      priceEnvVarsFound: stripePriceKeys.length,
    },
    whop: {
      companyId: "biz_jzvuDvevsatKWi",
      appId: "app_PrbVglxvAeazeA",
      whopCheckoutEnvsFound: whopEnvKeys.length,
      whopSite,
      prodProductsJson,
    },
    prs: {
      pr1291: pr1291.status === 0 ? JSON.parse(pr1291.stdout) : { error: pr1291.stderr },
      pr1301: pr1301.status === 0 ? JSON.parse(pr1301.stdout) : { error: pr1301.stderr },
    },
  };

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((err) => {
  console.error("[verify-checkout-and-tnf-readiness] FAIL:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
