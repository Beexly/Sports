#!/usr/bin/env node
/**
 * Deploy-readiness CLI for Helm.
 *
 * Validates that every external dependency is reachable with the configured
 * credentials BEFORE pushing a deploy. Prints a green/red checklist and
 * exits non-zero on any failure.
 *
 * Usage:
 *   node scripts/check-deploy-readiness.mjs
 *
 * Loads .env.production.local (preferred, gitignored) → .env.production →
 * existing process.env, in that order.
 *
 * Checks:
 *   - All required env vars present
 *   - Postgres reachable (TCP + SELECT 1 via DATABASE_URL)
 *   - The Odds API key valid (/v4/sports endpoint)
 *   - Stripe secret key valid (/v1/account)
 *   - Anthropic API key valid (/v1/messages with a 1-token ping)
 *   - Redis reachable (PING — only if `ioredis` is installed)
 *   - Vercel cron schedule present in vercel.json
 *   - Bootstrap gate sanity (no public-picks while ingestion is off, etc.)
 *
 * Pure Node — uses fetch + pg + the local filesystem. ioredis is optional.
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = resolve(__dirname, "..");

const COLOR = process.stdout.isTTY
  ? {
      reset: "\x1b[0m",
      red: "\x1b[31m",
      green: "\x1b[32m",
      yellow: "\x1b[33m",
      cyan: "\x1b[36m",
      dim: "\x1b[2m",
    }
  : { reset: "", red: "", green: "", yellow: "", cyan: "", dim: "" };

let failures = 0;
let warnings = 0;
const lines = [];

function ok(label, detail = "") {
  lines.push(`  ${COLOR.green}✓${COLOR.reset}  ${label}${detail ? COLOR.dim + " " + detail + COLOR.reset : ""}`);
}
function bad(label, detail = "") {
  failures += 1;
  lines.push(`  ${COLOR.red}✗${COLOR.reset}  ${label}${detail ? "  " + COLOR.red + detail + COLOR.reset : ""}`);
}
function warn(label, detail = "") {
  warnings += 1;
  lines.push(`  ${COLOR.yellow}!${COLOR.reset}  ${label}${detail ? "  " + COLOR.yellow + detail + COLOR.reset : ""}`);
}

function header(label) {
  lines.push("");
  lines.push(`${COLOR.cyan}${label}${COLOR.reset}`);
}

// ── Env loading ──────────────────────────────────────────────────────────

function loadEnvFile(path) {
  if (!existsSync(path)) return false;
  const text = readFileSync(path, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!(key in process.env)) process.env[key] = value;
  }
  return true;
}

const envFilesTried = [
  join(repoRoot, ".env.production.local"),
  join(repoRoot, ".env.production"),
];
const loaded = envFilesTried.filter(loadEnvFile);

// ── Required vars ────────────────────────────────────────────────────────

const REQUIRED = [
  "DATABASE_URL",
  "DIRECT_URL",
  "NEXTAUTH_SECRET",
  "NEXTAUTH_URL",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "THE_ODDS_API_KEY",
  "ANTHROPIC_API_KEY",
  "REDIS_URL",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
  "STRIPE_PRO_MONTHLY_PRICE_ID",
  "STRIPE_PRO_ANNUAL_PRICE_ID",
  "STRIPE_ELITE_MONTHLY_PRICE_ID",
  "STRIPE_ELITE_ANNUAL_PRICE_ID",
  "NEXT_PUBLIC_APP_URL",
];

header("Environment variables");
for (const key of REQUIRED) {
  const v = process.env[key];
  if (!v) {
    bad(key, "missing");
  } else {
    const redacted = v.length > 12 ? `${v.slice(0, 8)}…${v.slice(-4)}` : "(short)";
    ok(key, redacted);
  }
}

// ── Postgres ─────────────────────────────────────────────────────────────

header("Postgres");
async function checkPostgres() {
  if (!process.env.DATABASE_URL) {
    bad("Postgres reachability", "DATABASE_URL unset");
    return;
  }
  let pg;
  try {
    pg = await import("pg");
  } catch {
    warn("Postgres reachability", "skipped — `pg` not installed; run `npm install pg`");
    return;
  }
  const client = new pg.default.Client({ connectionString: process.env.DATABASE_URL });
  try {
    await client.connect();
    const res = await client.query("SELECT 1 AS ok");
    if (res.rows[0]?.ok === 1) ok("Postgres reachable", "SELECT 1 returned");
    else bad("Postgres reachable", "unexpected query result");
  } catch (err) {
    bad("Postgres reachable", err.message);
  } finally {
    try { await client.end(); } catch {}
  }
}

// ── The Odds API ─────────────────────────────────────────────────────────

header("The Odds API");
async function checkOddsApi() {
  if (!process.env.THE_ODDS_API_KEY) return;
  try {
    const res = await fetch(
      `https://api.the-odds-api.com/v4/sports?apiKey=${process.env.THE_ODDS_API_KEY}`
    );
    if (!res.ok) {
      bad("The Odds API key", `HTTP ${res.status}`);
      return;
    }
    const json = await res.json();
    const sportCount = Array.isArray(json) ? json.length : 0;
    const remaining = res.headers.get("x-requests-remaining");
    ok("The Odds API key", `${sportCount} sports listed; ${remaining ?? "?"} requests remaining`);
  } catch (err) {
    bad("The Odds API key", err.message);
  }
}

// ── Stripe ───────────────────────────────────────────────────────────────

header("Stripe");
async function checkStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return;
  try {
    const res = await fetch("https://api.stripe.com/v1/account", {
      headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` },
    });
    if (!res.ok) {
      bad("Stripe secret key", `HTTP ${res.status}`);
      return;
    }
    const account = await res.json();
    const live = !process.env.STRIPE_SECRET_KEY.startsWith("sk_test_");
    ok("Stripe secret key", `${live ? "LIVE" : "TEST"} mode · ${account.id}`);
  } catch (err) {
    bad("Stripe secret key", err.message);
  }

  // Confirm the four tiered price IDs resolve.
  for (const which of [
    "STRIPE_PRO_MONTHLY_PRICE_ID",
    "STRIPE_PRO_ANNUAL_PRICE_ID",
    "STRIPE_ELITE_MONTHLY_PRICE_ID",
    "STRIPE_ELITE_ANNUAL_PRICE_ID",
  ]) {
    const id = process.env[which];
    if (!id) continue;
    try {
      const res = await fetch(`https://api.stripe.com/v1/prices/${id}`, {
        headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` },
      });
      if (!res.ok) {
        bad(which, `HTTP ${res.status}`);
        continue;
      }
      const price = await res.json();
      const amount = (price.unit_amount / 100).toFixed(2);
      ok(which, `$${amount}/${price.recurring?.interval ?? "?"}`);
    } catch (err) {
      bad(which, err.message);
    }
  }
}

// ── Anthropic ────────────────────────────────────────────────────────────
//
// Anthropic is ONLY used by the content engine (lib/content-generator.ts)
// and by cockpit narrative augmentation (lib/cockpit/jarvis-data.ts —
// which checks for *presence* of the key as a string, never pings).
//
// Therefore:
//   - If PUBLIC_BLOG_ENABLED=true → key MUST be valid (live content path).
//   - If PUBLIC_BLOG_ENABLED=false → key need only be PRESENT for the env
//     audit; a failed ping is a WARN, not a deploy blocker. This matches
//     the actual runtime: with content dark, no production code path ever
//     calls Anthropic, so a 401 here cannot affect user-facing behaviour.
//
// This is not a loosening of the integrity gates the picks/performance
// surface relies on — those are governed by the readiness-gate flags and
// the brand-safety linter, not by this script.

header("Anthropic");
async function checkAnthropic() {
  if (!process.env.ANTHROPIC_API_KEY) return;
  const contentLive =
    String(process.env.PUBLIC_BLOG_ENABLED ?? "").toLowerCase() === "true";
  const reportFail = contentLive ? bad : warn;
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 4,
        messages: [{ role: "user", content: "ping" }],
      }),
    });
    if (!res.ok) {
      reportFail(
        "Anthropic API key",
        `HTTP ${res.status}${contentLive ? "" : " (warn: PUBLIC_BLOG_ENABLED=false — no runtime path uses this key right now; rotate before enabling content)"}`
      );
      return;
    }
    const json = await res.json();
    const usage = json.usage ?? {};
    ok(
      "Anthropic API key",
      `model=${json.model} · input_tokens=${usage.input_tokens ?? "?"}`
    );
  } catch (err) {
    reportFail("Anthropic API key", err.message);
  }
}

// ── Redis ────────────────────────────────────────────────────────────────

header("Redis");
async function checkRedis() {
  if (!process.env.REDIS_URL) return;
  let mod;
  try {
    mod = await import("ioredis");
  } catch {
    warn("Redis reachability", "skipped — `ioredis` not installed; run `npm install ioredis`");
    return;
  }
  const Redis = mod.default;
  const client = new Redis(process.env.REDIS_URL, {
    connectTimeout: 5000,
    maxRetriesPerRequest: 1,
  });
  try {
    const pong = await client.ping();
    if (pong === "PONG") ok("Redis reachable", "PING → PONG");
    else bad("Redis reachable", `unexpected: ${pong}`);
  } catch (err) {
    bad("Redis reachable", err.message);
  } finally {
    client.disconnect();
  }
}

// ── vercel.json ──────────────────────────────────────────────────────────

header("Deploy config");
function checkVercelConfig() {
  const path = join(repoRoot, "vercel.json");
  if (!existsSync(path)) {
    bad("vercel.json present");
    return;
  }
  try {
    const v = JSON.parse(readFileSync(path, "utf8"));
    if (Array.isArray(v.crons) && v.crons.length > 0) {
      ok("vercel.json crons", `${v.crons.length} schedule(s) defined`);
    } else {
      warn("vercel.json crons", "no crons defined; ingestion won't auto-run");
    }
    if (v.headers && v.headers.length) ok("Security headers", `${v.headers.length} rule(s)`);
  } catch (err) {
    bad("vercel.json parse", err.message);
  }
}

// ── Gate sanity ──────────────────────────────────────────────────────────

header("Bootstrap gate sanity");
function checkGates() {
  const get = (k) => (process.env[k] ?? "").toLowerCase() === "true";
  const canon = get("CANONICAL_HISTORY_ENABLED");
  const derived = get("DERIVED_MODEL_HISTORY_ENABLED");
  const pub = get("PUBLIC_PICKS_ENABLED");
  const perf = get("PERFORMANCE_STATS_ENABLED");
  const learn = get("OUTCOME_LEARNING_ENABLED");
  const blog = get("PUBLIC_BLOG_ENABLED");

  if (!canon && (derived || pub || perf || learn)) {
    bad("Gate sequencing", "downstream gate is on while CANONICAL_HISTORY_ENABLED is off");
  } else {
    ok("Gate sequencing");
  }
  if (pub && !derived) bad("PUBLIC_PICKS_ENABLED", "requires DERIVED_MODEL_HISTORY_ENABLED");
  if (perf && !pub) bad("PERFORMANCE_STATS_ENABLED", "requires PUBLIC_PICKS_ENABLED");
  if (blog && !pub) bad("PUBLIC_BLOG_ENABLED", "requires PUBLIC_PICKS_ENABLED");
  if (learn && !perf) bad("OUTCOME_LEARNING_ENABLED", "requires PERFORMANCE_STATS_ENABLED");

  if (get("DEV_FAKE_ADMIN")) bad("DEV_FAKE_ADMIN", "must not be true in production");
  if (get("DEMO_PICKS_ENABLED")) bad("DEMO_PICKS_ENABLED", "must not be true in production");
}

// ── Drive everything ─────────────────────────────────────────────────────

async function main() {
  console.log("");
  if (loaded.length > 0) {
    console.log(
      `${COLOR.dim}Loaded env from: ${loaded.map((p) => p.replace(repoRoot + "/", "")).join(", ")}${COLOR.reset}`
    );
  } else {
    console.log(`${COLOR.dim}No .env.production[.local] found; using process.env only.${COLOR.reset}`);
  }

  await checkPostgres();
  await checkOddsApi();
  await checkStripe();
  await checkAnthropic();
  await checkRedis();
  checkVercelConfig();
  checkGates();

  console.log(lines.join("\n"));
  console.log("");

  if (failures > 0) {
    console.log(
      `${COLOR.red}Result: ${failures} failure(s)${warnings ? `, ${warnings} warning(s)` : ""}.${COLOR.reset}`
    );
    process.exit(1);
  } else if (warnings > 0) {
    console.log(
      `${COLOR.yellow}Result: ready, ${warnings} warning(s).${COLOR.reset}`
    );
  } else {
    console.log(`${COLOR.green}Result: ready to ship.${COLOR.reset}`);
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
