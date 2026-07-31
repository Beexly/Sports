#!/usr/bin/env node
/**
 * Orbit unlock smoke — maximum operator leverage, zero invented secrets.
 *
 * Modes:
 *   1) Local law check (default, no network): path selection + vercel cron matrix
 *   2) Production probe when CRON_SECRET + optional BASE_URL set:
 *        ORBIT_SMOKE_BASE=https://www.galaxysportsedge.com CRON_SECRET=... node scripts/ops/orbit-unlock-smoke.mjs --prod
 *
 * Never prints secret values. Exit 0 when local laws hold; prod mode fails on non-2xx.
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const prod = process.argv.includes("--prod");

function selectSettlementPath(oddsApiKey) {
  const key = typeof oddsApiKey === "string" ? oddsApiKey.trim() : "";
  return key ? "odds-api" : "free";
}

const failed = [];

// 1. Path law pure
const cases = [
  [undefined, "free"],
  ["", "free"],
  ["  ", "free"],
  ["x", "odds-api"],
  ["deactivated", "odds-api"],
];
for (const [k, expect] of cases) {
  const got = selectSettlementPath(k);
  if (got !== expect) failed.push(`path-select(${JSON.stringify(k)})=${got} want ${expect}`);
}

// 2. Source of truth: settle-picks uses selectSettlementPath
const settleSrc = readFileSync(
  join(root, "apps/web/app/api/cron/settle-picks/route.ts"),
  "utf8",
);
if (!settleSrc.includes("selectSettlementPath")) {
  failed.push("settle-picks must use selectSettlementPath");
}

// 3. vercel cron matrix — required high-leverage schedules
const vercel = JSON.parse(readFileSync(join(root, "vercel.json"), "utf8"));
const cronMap = Object.fromEntries(
  (vercel.crons || []).map((c) => [c.path, c.schedule]),
);
const required = {
  "/api/cron/settle-picks": "0 */3 * * *",
  "/api/cron/health-alert": "*/15 * * * *",
  "/api/cron/refresh-player-stats": "0,30 * * * *",
  "/api/cron/free-spine-health": "0 10 * * *",
  "/api/cron/reconcile-entitlements": "0 8 * * *",
  "/api/cron/repair-checkout-attempts": "30 8 * * *",
};
for (const [path, schedule] of Object.entries(required)) {
  if (cronMap[path] !== schedule) {
    failed.push(`cron ${path} schedule=${cronMap[path] ?? "MISSING"} want ${schedule}`);
  }
}

// 4. Embed surfaces exist + frame policy
for (const rel of [
  "apps/web/app/embed/edge-index/[gameId]/page.tsx",
  "apps/web/lib/embed/edge-index.ts",
  "apps/web/lib/settlement/path-select.ts",
]) {
  if (!existsSync(join(root, rel))) failed.push(`missing ${rel}`);
}
const vercelSrc = readFileSync(join(root, "vercel.json"), "utf8");
if (!vercelSrc.includes("frame-ancestors *")) {
  failed.push("vercel.json must allow embed frame-ancestors *");
}

// 5. Live env diagnosis (local process env only — no invent)
const localKey = process.env.THE_ODDS_API_KEY;
const diagnosis = {
  path: selectSettlementPath(localKey),
  keyPresentInThisProcess: Boolean(localKey && localKey.trim()),
  note:
    "This process env is NOT production. Production blanking is a Vercel portal click.",
};

const report = {
  mode: prod ? "prod" : "local",
  cronsScheduled: (vercel.crons || []).length,
  diagnosis,
  failed,
  operatorCopyPaste: {
    blankKey:
      "Vercel → Project → Settings → Env → Production → DELETE THE_ODDS_API_KEY → Redeploy",
    settleSmoke:
      'curl -sS -H "Authorization: Bearer $CRON_SECRET" "https://www.galaxysportsedge.com/api/cron/settle-picks" | jq \'{ok,path,picksSettled,picksHeld}\'',
    healthAlert:
      'curl -sS -H "Authorization: Bearer $CRON_SECRET" "https://www.galaxysportsedge.com/api/cron/health-alert"',
    freeSpine:
      'curl -sS -H "Authorization: Bearer $CRON_SECRET" "https://www.galaxysportsedge.com/api/cron/free-spine-health"',
    reconcile:
      'curl -sS -H "Authorization: Bearer $CRON_SECRET" "https://www.galaxysportsedge.com/api/cron/reconcile-entitlements"',
    stripeEvents: "checkout.session.completed + checkout.session.expired + subscription/invoice events on www webhook",
  },
};

if (prod) {
  const secret = process.env.CRON_SECRET?.trim();
  const base = (
    process.env.ORBIT_SMOKE_BASE || "https://www.galaxysportsedge.com"
  ).replace(/\/$/, "");
  if (!secret) {
    failed.push("CRON_SECRET required for --prod (set in env; never commit)");
  } else {
    const headers = { Authorization: `Bearer ${secret}` };
    for (const path of [
      "/api/cron/settle-picks",
      "/api/cron/health-alert",
      "/api/cron/free-spine-health",
    ]) {
      try {
        const res = await fetch(`${base}${path}`, { headers });
        const body = await res.text();
        let pathField = null;
        try {
          pathField = JSON.parse(body)?.path ?? null;
        } catch {
          /* ignore */
        }
        report[`prod${path}`] = {
          status: res.status,
          path: pathField,
          okHttp: res.status >= 200 && res.status < 300,
        };
        if (res.status < 200 || res.status >= 300) {
          failed.push(`${path} HTTP ${res.status}`);
        }
        if (path === "/api/cron/settle-picks" && pathField && pathField !== "free") {
          report.settlePathWarning =
            "settle path is not free — blank THE_ODDS_API_KEY in Production";
        }
      } catch (e) {
        failed.push(`${path} fetch failed: ${e instanceof Error ? e.message : e}`);
      }
    }
  }
}

report.failed = failed;
report.ok = failed.length === 0;
console.log(JSON.stringify(report, null, 2));
process.exit(failed.length ? 1 : 0);
