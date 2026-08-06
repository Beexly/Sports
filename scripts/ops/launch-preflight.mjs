#!/usr/bin/env node
/**
 * Launch preflight — black-box probe of production (read-only).
 * Usage:
 *   node scripts/ops/launch-preflight.mjs
 *   BASE_URL=… CRON_SECRET=… node scripts/ops/launch-preflight.mjs
 */
const BASE = (process.env.BASE_URL || "https://www.galaxysportsedge.com").replace(/\/$/, "");

async function get(path, opts = {}) {
  const headers = { "User-Agent": "gse-launch-preflight", ...(opts.headers || {}) };
  const res = await fetch(`${BASE}${path}`, { headers, redirect: "manual" });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* not json */
  }
  return { status: res.status, text, json, headers: res.headers };
}

function line(ok, msg) {
  console.log(`${ok ? "OK " : "!! "} ${msg}`);
}

async function main() {
  console.log(`GSE launch preflight → ${BASE}`);
  console.log(`at ${new Date().toISOString()}\n`);

  const health = await get("/api/health");
  line(
    health.status === 200 && health.json?.status === "healthy",
    `health ${health.status} ${health.json?.status}`,
  );

  const home = await get("/");
  const csp = home.headers?.get?.("content-security-policy") || home.headers?.get?.("Content-Security-Policy") || "";
  // fetch Headers in node
  const cspVal =
    (typeof home.headers?.get === "function" &&
      (home.headers.get("content-security-policy") || home.headers.get("Content-Security-Policy"))) ||
    "";
  line(home.status === 200, `home ${home.status}`);
  line(
    Boolean(cspVal && cspVal.includes("default-src")),
    `CSP default-src present=${Boolean(cspVal && cspVal.includes("default-src"))}`,
  );

  const ops = await get("/api/ops/public-surface-truth");
  const d = ops.json || {};
  const sha = d.deployment?.sha || "(none)";
  const markers = d.deployment?.expectedMainFeatures?.length ?? 0;
  line(ops.status === 200, `ops truth ${ops.status} sha=${String(sha).slice(0, 12)} markers=${markers}`);
  const settle = d.settlement || {};
  line(settle.overduePending === 0, `settlement overdue=${settle.overduePending} health=${settle.health}`);
  line(d.contestStorage === "postgres", `contestStorage=${d.contestStorage}`);
  line(d.waitlistStorage === "postgres", `waitlistStorage=${d.waitlistStorage}`);
  line(d.gates?.statsPublic === false, `STATS_PUBLIC=${d.gates?.statsPublic} (expect false)`);
  line(
    d.gates?.canExposePublicPicks === false,
    `publicPicks=${d.gates?.canExposePublicPicks} (expect false until proof)`,
  );

  const credit = d.creditStack || {};
  line(
    true,
    `claudeProvider=${credit.claudeProvider} freeLane=${credit.freeLaneConfigured} jynxAuto=${credit.jynx?.auto}`,
  );
  if (!credit.freeLaneConfigured) line(false, "free-lane env not configured (CONTENT_FREE_LANE + host keys)");
  if (credit.claudeProvider === "anthropic" && !credit.jynx?.auto) {
    line(false, "Claude still cash path — set CLAUDE_PROVIDER=auto + cloud maps to burn credits");
  }

  if (d.revenueLadder && typeof d.revenueLadder === "object") {
    line(
      d.revenueLadder.canHonestlyMonetizePublicTrackRecord === false,
      `revenueLadder step=${d.revenueLadder.currentStep} monetizePublic=${d.revenueLadder.canHonestlyMonetizePublicTrackRecord} (expect false until proof+flags)`,
    );
  } else {
    line(false, "revenueLadder missing — prod SHA lags main (#339+)");
  }

  if (Array.isArray(d.founderNextSteps) && d.founderNextSteps.length) {
    console.log("\nfounderNextSteps:");
    for (const s of d.founderNextSteps) {
      console.log(`  [${s.priority}] ${s.domain}: ${s.action}`);
    }
    const ids = new Set(d.founderNextSteps.map((s) => s.id));
    if (!ids.has("stripe-webhook-audit")) {
      line(false, "founderNextSteps missing stripe-webhook-audit (expect #338+)");
    }
  } else {
    line(false, "founderNextSteps missing — prod SHA likely lags main");
  }

  const picks = await get("/api/picks");
  line(picks.status === 503, `picks API ${picks.status} (expect 503 gated)`);

  const cron = await get("/api/cron/settle-picks");
  line(cron.status === 401, `settle-picks unauth ${cron.status} (expect 401)`);

  if (process.env.CRON_SECRET?.trim()) {
    const auth = await get("/api/cron/settle-picks", {
      headers: { Authorization: `Bearer ${process.env.CRON_SECRET.trim()}` },
    });
    line(auth.status >= 200 && auth.status < 300, `settle-picks auth ${auth.status}`);
    if (auth.json) {
      const keys = Object.keys(auth.json);
      console.log("  settle body keys:", keys.slice(0, 24).join(", "));
      for (const k of ["clvRepair", "snapshotRepair", "teamGameLogRepair"]) {
        if (keys.includes(k) || (auth.json.free && k in (auth.json.free || {}))) {
          line(true, `settle exposes ${k}`);
        } else {
          line(false, `settle missing ${k} (expect free or paid path fields)`);
        }
      }
    }
  } else {
    console.log("  (skip auth settle — set CRON_SECRET to verify 2xx settle + repair fields)");
  }

  for (const p of [
    "/.well-known/security.txt",
    "/ads.txt",
    "/humans.txt",
    "/llms.txt",
    "/site.webmanifest",
    "/robots.txt",
    "/podcast/feed.xml",
    "/news-sitemap.xml",
    "/sitemap.xml",
  ]) {
    const r = await get(p);
    line(r.status === 200 || r.status === 308, `${p} → ${r.status}`);
  }

  console.log("\nDone. Fix !! lines before marketing launch. Do not flip LIVE_BOARD/PUBLIC_PICKS/STATS.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
