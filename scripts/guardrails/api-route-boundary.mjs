#!/usr/bin/env node
/**
 * API route boundary guardrail.
 *
 * PROBLEM IT SOLVES
 * -----------------
 * `apps/web/middleware.ts` matches only ["/dashboard/:path*", "/admin/:path*",
 * "/cockpit/:path*", "/waitlist/:path*"]. It does NOT match `/api/*`. So none
 * of the ~218 API routes is gated centrally: every route must self-protect,
 * and nothing catches a route that forgets.
 *
 * Measured 2026-11-04: 114 of 218 routes contain a recognized guard; 104 do
 * not. Most of those 104 are public by design (health, proof, verify, the gse
 * catalog). The defect is that NOTHING DISTINGUISHES intentional from
 * accidental — a new route that omits its guard looks exactly like a
 * deliberately public one.
 *
 * RATCHET, NOT A BLANKET DEMAND
 * -----------------------------
 * This guard does not require all 218 routes to be guarded tomorrow. It
 * snapshots the current unguarded set into a baseline file and fails only when
 * a route is unguarded AND absent from that baseline. Existing debt is frozen;
 * new debt is refused. Shrinking the baseline is then a deliberate act.
 *
 * Usage:
 *   node scripts/guardrails/api-route-boundary.mjs            # check
 *   node scripts/guardrails/api-route-boundary.mjs --update   # rewrite baseline
 *   node scripts/guardrails/api-route-boundary.mjs --list     # print baseline
 *   node scripts/guardrails/api-route-boundary.mjs --root <dir>
 */

import { readdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";

const DEFAULT_ROOT = resolve(process.cwd());
const API_ROOT = "apps/web/app/api";
const BASELINE = "scripts/guardrails/api-route-boundary.baseline.json";

/**
 * A route counts as guarded if it references any of these. Deliberately broad:
 * a false "guarded" verdict here would let a real gap through, so the list
 * covers every mechanism actually used in this repo (verified by reading the
 * routes, not guessed).
 */
const GUARD_PATTERNS = [
  // session / role
  /\bauth\(\)/,
  /getServerSession/,
  /requireAdmin|requireSession|requireAuth|requireRole|assertAdmin/,
  // API key / entitlement
  /requireApiKey|verifyApiKey|api[_-]?key|API_KEY/,
  // sovereign operator key (x-gse-operator-key), used on storefront maintenance routes
  /x-gse-operator-key|GSE_OPERATOR_KEY|OPERATOR_KEY/,
  /entitlement|requireEntitlement/i,
  // durable public-form budget: not auth, but the accepted floor for a public writer
  /consumePublicFormRateLimit|consumeRateLimit/,
  // cron
  /cronAuthError|cronAuthorize|assertCron|CRON_SECRET/,
  // webhook signatures
  /stripe-signature|constructEvent/,
  /whop-signature|verifyWhopWebhookSignature/,
  /secret_token|X-Telegram-Bot-Api-Secret/,
];

function rel(root, p) {
  return relative(root, p).split(sep).join("/");
}

async function routeFiles(dir) {
  const out = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await routeFiles(p)));
    else if (e.name === "route.ts" || e.name === "route.js") out.push(p);
  }
  return out;
}

function routePath(root, file) {
  const apiDir = join(root, API_ROOT);
  const relDir = relative(apiDir, join(file, "..")).split(sep).join("/");
  const segs = relDir === "." ? [] : relDir.split("/");
  const normalised = segs.map((s) => s.replace(/^\[(\.\.\.)?(.+)\]$/, "{$2}"));
  return "/api" + (normalised.length ? "/" + normalised.join("/") : "");
}

/**
 * An alias route that re-exports or delegates to another route handler inherits that handler's
 * guard. Static analysis cannot follow the import target here, so a delegation import counts
 * on its own: `import { GET as x, POST as y } from "../other/route"`.
 */
const DELEGATION_PATTERNS = [
  /import\s*\{[^}]*\b(GET|POST|PUT|PATCH|DELETE)\s+as\s+\w+[^}]*\}\s*from\s*"[^"]*\/route"/,
];

function isGuarded(text) {
  return GUARD_PATTERNS.some((re) => re.test(text)) || DELEGATION_PATTERNS.some((re) => re.test(text));
}

function parseArgs(argv) {
  const arg = (name, fallback) => {
    const i = argv.indexOf(name);
    return i === -1 ? fallback : argv[i + 1];
  };
  return {
    root: resolve(arg("--root", DEFAULT_ROOT)),
    update: argv.includes("--update"),
    list: argv.includes("--list"),
  };
}

async function main() {
  const { root, update, list } = parseArgs(process.argv.slice(2));
  const apiDir = join(root, API_ROOT);
  if (!existsSync(apiDir)) {
    // Not a failure: guardrails run from many roots. Say so and pass.
    console.log(`[api-route-boundary] SKIP - ${API_ROOT} not found under ${root}`);
    return;
  }

  const files = await routeFiles(apiDir);
  const unguarded = [];
  let guardedCount = 0;
  for (const f of files) {
    const text = await readFile(f, "utf8").catch(() => "");
    if (isGuarded(text)) guardedCount += 1;
    else unguarded.push(routePath(root, f));
  }
  unguarded.sort();

  console.log(
    `[api-route-boundary] ${files.length} route(s): ${guardedCount} guarded, ` +
      `${unguarded.length} without a recognized guard`
  );

  const baselinePath = join(root, BASELINE);

  if (list) {
    const base = existsSync(baselinePath)
      ? JSON.parse(await readFile(baselinePath, "utf8"))
      : { unguarded: [] };
    console.log(
      `[api-route-boundary] baseline has ${base.unguarded.length} accepted route(s):`
    );
    for (const p of base.unguarded) console.log(`  ${p}`);
    return;
  }

  if (update) {
    const payload = {
      note:
        "Routes allowed to have no recognized auth/key/signature guard. " +
        "Frozen 2026-11-04 because middleware.ts does not cover /api/*. " +
        "Shrink this list deliberately; never grow it to make a build pass.",
      count: unguarded.length,
      unguarded,
    };
    await writeFile(baselinePath, JSON.stringify(payload, null, 1) + "\n", "utf8");
    console.log(
      `[api-route-boundary] wrote baseline with ${unguarded.length} route(s) -> ${BASELINE}`
    );
    return;
  }

  const baseline = existsSync(baselinePath)
    ? JSON.parse(await readFile(baselinePath, "utf8"))
    : { unguarded: [] };
  const accepted = new Set(baseline.unguarded);
  const newUnguarded = unguarded.filter((p) => !accepted.has(p));
  const fixed = [...accepted].filter((p) => !unguarded.includes(p)).sort();

  if (fixed.length) {
    console.log(
      `[api-route-boundary] ${fixed.length} baseline route(s) now have a guard - ` +
        `run --update to shrink the baseline:`
    );
    for (const p of fixed) console.log(`  ${p}`);
  }

  if (newUnguarded.length) {
    console.error(
      `[api-route-boundary] FAIL - ${newUnguarded.length} new unguarded route(s).`
    );
    console.error(
      "  middleware.ts does not cover /api/*, so these have no auth, no key, " +
        "and no signature check."
    );
    for (const p of newUnguarded) console.error(`  ${p}`);
    console.error(
      "  Fix: add a guard, or add the route to " +
        `${BASELINE} with a reason if it is public by design.`
    );
    process.exitCode = 1;
    return;
  }

  console.log(
    `[api-route-boundary] OK - no new unguarded routes beyond the ` +
      `${accepted.size} accepted in the baseline.`
  );
}

main().catch((error) => {
  console.error("[api-route-boundary] unexpected error:", error);
  process.exit(2);
});
