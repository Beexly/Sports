#!/usr/bin/env node
/**
 * Gate-flip readiness CLI.
 *
 * Makes flipping the production gates PUBLIC_PICKS_ENABLED and
 * PERFORMANCE_STATS_ENABLED a SAFE, mechanically-verified, near-one-step
 * operation. Run it BEFORE flipping the env flag in production; a red result
 * means do not flip.
 *
 * Usage:
 *   node scripts/check-gate-flip-readiness.mjs public-picks
 *   node scripts/check-gate-flip-readiness.mjs performance-stats
 *
 * Loads .env.production.local (preferred, gitignored) → .env.production →
 * existing process.env, in that order. Pure Node — uses pg + the local
 * filesystem; no new dependency.
 *
 * Pre-flight conditions (decision logic lives in, and is unit-tested via,
 * ./lib/gate-flip-readiness.mjs):
 *
 *   public-picks:
 *     (a) ZERO Pick rows with modelVersion = "v5.0.0-seed" (seed-leak guard —
 *         /api/picks does NOT filter seed rows, so this must be clean).
 *     (b) DEMO_PICKS_ENABLED is not "true".
 *     (c) Latest SUCCESS IngestionRun.completedAt within the Refresh SLA
 *         (240 min; see refresh-sla.ts → REFRESH_STALE_AFTER_MINUTES).
 *     (d) >= 1 published, non-bootstrap, FREE-tier pick passing the quality
 *         floor for today (so the public board isn't empty).
 *     (e) DERIVED_MODEL_HISTORY_ENABLED is on (sequencing).
 *     (f) CANONICAL_HISTORY_ENABLED is on (else new picks are written as
 *         bootstrap and /api/picks filters them out — empty board).
 *
 *   performance-stats:
 *     (a) >= 100 settled (WIN/LOSS/PUSH), non-bootstrap, non-seed picks.
 *     (b) PUBLIC_PICKS_ENABLED is on.
 *     (c) ZERO seed rows.
 *
 *   always:
 *     hard-FAIL if DEV_FAKE_ADMIN=true or DEMO_PICKS_ENABLED=true; print a
 *     LOUD warning that CALIBRATION_ADJUSTMENTS_ENABLED must NOT be flipped by
 *     this process.
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  evaluateGateFlip,
  GATE_TARGETS,
  REFRESH_STALE_AFTER_MINUTES,
  MIN_SETTLED_PICKS_FOR_PERFORMANCE,
  SEED_MODEL_VERSION,
} from "./lib/gate-flip-readiness.mjs";

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

// ── Arg parsing ────────────────────────────────────────────────────────────

const target = (process.argv[2] ?? "").trim();
if (!GATE_TARGETS.includes(target)) {
  console.error(
    `\n${COLOR.red}Usage: node scripts/check-gate-flip-readiness.mjs <${GATE_TARGETS.join("|")}>${COLOR.reset}\n`
  );
  process.exit(2);
}

const getBool = (k) => (process.env[k] ?? "").toLowerCase() === "true";

const gates = {
  devFakeAdmin: getBool("DEV_FAKE_ADMIN"),
  demoPicksEnabled: getBool("DEMO_PICKS_ENABLED"),
  derivedModelHistoryEnabled: getBool("DERIVED_MODEL_HISTORY_ENABLED"),
  canonicalHistoryEnabled: getBool("CANONICAL_HISTORY_ENABLED"),
  publicPicksEnabled: getBool("PUBLIC_PICKS_ENABLED"),
};

// Quality floor for a "publishable" FREE pick — mirrors
// apps/web/lib/public-picks-quality.ts → MIN_PUBLIC_PICK_DATA_QUALITY_SCORE.
const MIN_PUBLIC_PICK_DATA_QUALITY_SCORE = 70;

// ── DB facts ────────────────────────────────────────────────────────────────

function todayBoundsUtc() {
  // Use UTC day bounds so this preflight counts the SAME day the deployed
  // /api/picks route does: that route runs date-fns startOfDay/endOfDay on the
  // server, which on Vercel runs in UTC. Machine-local setHours/setDate would
  // count a different window on a non-UTC operator box, masking or inventing
  // "FREE picks today".
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setUTCHours(23, 59, 59, 999);
  return { start, end };
}

/**
 * Gathers the live facts the decision logic needs. Returns null on a DB
 * problem (caller treats that as a hard failure — never a fake green).
 */
async function gatherFacts() {
  if (!process.env.DATABASE_URL) {
    bad("Postgres reachability", "DATABASE_URL unset");
    return null;
  }
  let pg;
  try {
    pg = await import("pg");
  } catch {
    bad("Postgres reachability", "`pg` not installed; run `npm install pg`");
    return null;
  }
  const client = new pg.default.Client({ connectionString: process.env.DATABASE_URL });
  try {
    await client.connect();

    // (a) seed-row count
    const seedRes = await client.query(
      `SELECT COUNT(*)::int AS n FROM picks WHERE "modelVersion" = $1`,
      [SEED_MODEL_VERSION]
    );
    const seedCount = seedRes.rows[0]?.n ?? 0;

    // settled, non-bootstrap, non-seed picks.
    // isPublished = true mirrors /api/performance (route.ts filters isPublished),
    // so this pre-flight settled count matches what the public route reports.
    const settledRes = await client.query(
      `SELECT COUNT(*)::int AS n FROM picks
        WHERE "result" IN ('WIN','LOSS','PUSH')
          AND "isBootstrap" = false
          AND "isPublished" = true
          AND "modelVersion" <> $1`,
      [SEED_MODEL_VERSION]
    );
    const settledCount = settledRes.rows[0]?.n ?? 0;

    // latest SUCCESS ingestion completedAt
    const ingRes = await client.query(
      `SELECT "completedAt" FROM ingestion_runs
        WHERE "status" = 'SUCCESS' AND "completedAt" IS NOT NULL
        ORDER BY "completedAt" DESC LIMIT 1`
    );
    const lastSuccessAt = ingRes.rows[0]?.completedAt ?? null;
    const ingestionAgeMinutes =
      lastSuccessAt === null
        ? null
        : Math.round((Date.now() - new Date(lastSuccessAt).getTime()) / 60000);

    // today's published, non-bootstrap, FREE-tier picks passing the quality floor
    const { start, end } = todayBoundsUtc();
    const freeRes = await client.query(
      `SELECT COUNT(*)::int AS n
         FROM picks p
         JOIN games g ON g.id = p."gameId"
        WHERE p."isPublished" = true
          AND p."isBootstrap" = false
          AND p."tier" = 'FREE'
          AND p."modelVersion" <> $1
          AND p."generatedAt" >= $2 AND p."generatedAt" < $3
          AND g."dataQualityScore" >= $4`,
      [SEED_MODEL_VERSION, start, end, MIN_PUBLIC_PICK_DATA_QUALITY_SCORE]
    );
    const freePicksToday = freeRes.rows[0]?.n ?? 0;

    ok("Postgres reachable", "facts gathered");
    return { seedCount, settledCount, ingestionAgeMinutes, freePicksToday, lastSuccessAt };
  } catch (err) {
    bad("Postgres query", err.message);
    return null;
  } finally {
    try { await client.end(); } catch {}
  }
}

// ── Report the gathered facts as a checklist ─────────────────────────────────

function reportFacts(facts) {
  header("Facts");

  // Seed-leak guard
  if (facts.seedCount === 0) ok("Seed-row guard", `0 rows with modelVersion="${SEED_MODEL_VERSION}"`);
  else bad("Seed-row guard", `${facts.seedCount} seed row(s) — /api/picks does NOT filter these`);

  // Ingestion freshness
  if (facts.ingestionAgeMinutes === null) {
    bad("Ingestion freshness", "no successful IngestionRun found");
  } else if (facts.ingestionAgeMinutes > REFRESH_STALE_AFTER_MINUTES) {
    bad("Ingestion freshness", `${facts.ingestionAgeMinutes} min old (> ${REFRESH_STALE_AFTER_MINUTES} min SLA)`);
  } else {
    ok("Ingestion freshness", `${facts.ingestionAgeMinutes} min old (<= ${REFRESH_STALE_AFTER_MINUTES} min SLA)`);
  }

  if (target === "public-picks") {
    if (facts.freePicksToday >= 1) ok("FREE picks today", `${facts.freePicksToday} publishable`);
    else bad("FREE picks today", "0 publishable — board would be empty");
    if (gates.derivedModelHistoryEnabled) ok("DERIVED_MODEL_HISTORY_ENABLED", "on");
    else bad("DERIVED_MODEL_HISTORY_ENABLED", "off (required before public picks)");
    if (gates.canonicalHistoryEnabled) ok("CANONICAL_HISTORY_ENABLED", "on");
    else bad("CANONICAL_HISTORY_ENABLED", "off (new picks would be bootstrap; required before public picks)");
    if (!gates.demoPicksEnabled) ok("DEMO_PICKS_ENABLED", "off");
    else bad("DEMO_PICKS_ENABLED", "must be off");
  }

  if (target === "performance-stats") {
    if (facts.settledCount >= MIN_SETTLED_PICKS_FOR_PERFORMANCE) {
      ok("Settled canonical picks", `${facts.settledCount} (>= ${MIN_SETTLED_PICKS_FOR_PERFORMANCE})`);
    } else {
      bad("Settled canonical picks", `${facts.settledCount} (< ${MIN_SETTLED_PICKS_FOR_PERFORMANCE})`);
    }
    if (gates.publicPicksEnabled) ok("PUBLIC_PICKS_ENABLED", "on");
    else bad("PUBLIC_PICKS_ENABLED", "off (required before performance stats)");
  }
}

// ── Always-on safety ─────────────────────────────────────────────────────────

function reportAlwaysOn() {
  header("Always-on safety");
  if (gates.devFakeAdmin) bad("DEV_FAKE_ADMIN", "true — must never be true in production");
  else ok("DEV_FAKE_ADMIN", "not true");
  if (gates.demoPicksEnabled) bad("DEMO_PICKS_ENABLED", "true — must never be true in production");
  else ok("DEMO_PICKS_ENABLED", "not true");

  // LOUD warning: calibration is never an env flip here.
  warn(
    "CALIBRATION_ADJUSTMENTS_ENABLED",
    "DO NOT flip via this process. It requires the audited MODEL_VERSION step (held-out validation) in docs/path-to-70.md §7 — never an env flip."
  );
}

// ── Drive everything ─────────────────────────────────────────────────────────

async function main() {
  console.log("");
  console.log(`${COLOR.cyan}Gate-flip readiness — target: ${target}${COLOR.reset}`);
  if (loaded.length > 0) {
    console.log(
      `${COLOR.dim}Loaded env from: ${loaded.map((p) => p.replace(repoRoot + "/", "")).join(", ")}${COLOR.reset}`
    );
  } else {
    console.log(`${COLOR.dim}No .env.production[.local] found; using process.env only.${COLOR.reset}`);
  }

  header("Postgres");
  const facts = await gatherFacts();

  reportAlwaysOn();

  if (facts !== null) {
    reportFacts(facts);

    // Authoritative decision via the pure, unit-tested predicate.
    const decision = evaluateGateFlip(target, {
      seedCount: facts.seedCount,
      settledCount: facts.settledCount,
      ingestionAgeMinutes: facts.ingestionAgeMinutes,
      freePicksToday: facts.freePicksToday,
      gates,
    });
    header("Decision");
    if (decision.ok) {
      ok(`Safe to flip ${target}`, "all pre-flight conditions met");
    } else {
      for (const f of decision.failures) bad("Blocker", f);
    }
  } else {
    header("Decision");
    bad("Cannot decide", "DB facts unavailable — treat as NOT ready");
  }

  console.log(lines.join("\n"));
  console.log("");

  if (failures > 0) {
    console.log(
      `${COLOR.red}Result: NOT ready — ${failures} blocker(s)${warnings ? `, ${warnings} warning(s)` : ""}.${COLOR.reset}`
    );
    process.exit(1);
  } else if (warnings > 0) {
    console.log(
      `${COLOR.yellow}Result: ready to flip ${target}, ${warnings} warning(s) — read them.${COLOR.reset}`
    );
  } else {
    console.log(`${COLOR.green}Result: ready to flip ${target}.${COLOR.reset}`);
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
