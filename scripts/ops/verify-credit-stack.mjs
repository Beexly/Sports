#!/usr/bin/env node
/**
 * Post-redeploy verification: did the credit-stack env actually land?
 *
 * `smoke-free-lane.mjs` proves the Cerebras transport works from wherever you
 * run it. This proves the *deployed* surface is armed — the two are not the
 * same, and only this one catches "set the var, forgot to redeploy".
 *
 *   node scripts/ops/verify-credit-stack.mjs
 *   node scripts/ops/verify-credit-stack.mjs --base https://sports-web-git-x.vercel.app
 *   node scripts/ops/verify-credit-stack.mjs --expect-sha <git-sha>
 *
 * Exit 0 = free lane armed AND Claude routed off the cash path.
 * Exit 1 = surface reachable but a lane is still cash/off (details on stdout).
 * Exit 2 = could not reach or parse the surface.
 */

const DEFAULT_BASE = "https://www.galaxysportsedge.com";

function arg(flag) {
  const i = process.argv.indexOf(flag);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : undefined;
}

const base = (arg("--base") ?? process.env.GSE_BASE_URL ?? DEFAULT_BASE).replace(/\/+$/, "");
const expectSha = arg("--expect-sha") ?? process.env.GSE_EXPECT_SHA;
const url = `${base}/api/ops/public-surface-truth`;

let truth;
try {
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) {
    console.error(JSON.stringify({ ok: false, reason: "http", status: res.status, url }, null, 2));
    process.exit(2);
  }
  truth = await res.json();
} catch (error) {
  console.error(
    JSON.stringify(
      { ok: false, reason: "unreachable", url, error: error instanceof Error ? error.message : String(error) },
      null,
      2,
    ),
  );
  process.exit(2);
}

const credit = truth?.creditStack;
const jynx = credit?.jynx;
if (!credit || !jynx) {
  console.error(
    JSON.stringify(
      { ok: false, reason: "no_credit_stack", hint: "Deployment predates credit-stack-posture — redeploy main.", url },
      null,
      2,
    ),
  );
  process.exit(2);
}

const checks = [];
const check = (name, pass, detail) => checks.push({ name, pass: Boolean(pass), detail });

check(
  "free lane armed",
  credit.freeLaneConfigured,
  credit.freeLaneConfigured
    ? `surfaces: ${(credit.freeLaneSurfaces ?? []).join(", ")}`
    : "CONTENT_FREE_LANE_ENABLED=true + CEREBRAS_API_KEY (or FREE_LANE_SECONDARY_BASE_URL + FREE_LANE_SECONDARY_MODEL)",
);

check(
  "content generation is $0",
  jynx.contentPlanPrimary === "cerebras_free",
  `primary lane: ${jynx.contentPlanPrimary}`,
);

// `auto` reads as configured-and-delegating; `anthropic` means nothing was picked.
check(
  "Claude provider selected",
  credit.claudeProvider !== "anthropic" && credit.claudeProvider !== "unknown",
  `CLAUDE_PROVIDER resolves to "${credit.claudeProvider}" (jynx mode "${jynx.mode}")`,
);

check(
  "a credit cloud will actually be tried",
  Array.isArray(jynx.attemptOrder) && jynx.attemptOrder.length > 0,
  jynx.attemptOrder?.length
    ? `attempt order: ${jynx.attemptOrder.join(" → ")}`
    : `configured clouds: ${(jynx.configuredClouds ?? []).join(", ") || "none"} — creds + model map must BOTH be set`,
);

if (expectSha) {
  const sha = truth?.deployment?.sha;
  check("deployment SHA matches", sha === expectSha, `live ${sha ?? "?"} vs expected ${expectSha}`);
}

const failed = checks.filter((c) => !c.pass);

console.log(`\n  Credit stack — ${base}\n`);
for (const c of checks) {
  console.log(`  ${c.pass ? "PASS" : "FAIL"}  ${c.name}`);
  console.log(`        ${c.detail}`);
}
console.log(`\n  operator hint: ${credit.operatorHint}`);

const openSteps = (truth.founderNextSteps ?? []).filter(
  (s) => s.domain === "free_lane" || s.domain === "jynx_credits",
);
if (openSteps.length > 0) {
  console.log("\n  still open:");
  for (const s of openSteps) console.log(`    [${s.priority}] ${s.action}`);
}

console.log(
  `\n  ${failed.length === 0 ? "ARMED — free lane live, Claude off the cash path." : `${failed.length} check(s) failing — still on cash.`}\n`,
);

process.exit(failed.length === 0 ? 0 : 1);
