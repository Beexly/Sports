#!/usr/bin/env node
/**
 * impeccable-probe.mjs — 24h continuous-repair invariants (public surfaces).
 *
 * Sense health + public-surface-truth. Exit 0 only when honesty spine holds.
 * Never invents scores. Never requires open public gates.
 *
 *   node scripts/ops/impeccable-probe.mjs
 *   node scripts/ops/impeccable-probe.mjs --base https://www.galaxysportsedge.com
 *   node scripts/ops/impeccable-probe.mjs --expect-sha <prefix>
 *   node scripts/ops/impeccable-probe.mjs --strict-spine   # fail if freeSpine missing/stale
 *
 * Exit 0 = pass
 * Exit 1 = invariant fail (JSON report)
 * Exit 2 = unreachable / parse error
 *
 * Invariants (I2/I3/I5/I8 + LAWS):
 *   - database ok (via /api/health)
 *   - ingestion ageMinutes ≤ 240 (hard); warn if > 120
 *   - settlement overdue === 0 (or HEALTHY with 0)
 *   - freeLaneConfigured true
 *   - public picks closed (canExposePublicPicks false + /api/picks 503)
 *   - freeSpine within SLA when present (optional --strict-spine for must-present)
 */

const DEFAULT_BASE = "https://www.galaxysportsedge.com";

function arg(flag) {
  const i = process.argv.indexOf(flag);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : undefined;
}

function hasFlag(flag) {
  return process.argv.includes(flag);
}

const base = (arg("--base") ?? process.env.GSE_BASE_URL ?? DEFAULT_BASE).replace(/\/+$/, "");
const expectSha = arg("--expect-sha") ?? process.env.GSE_EXPECT_SHA;
const strictSpine = hasFlag("--strict-spine") || process.env.GSE_STRICT_SPINE === "1";
const maxIngestionAge = Number(arg("--max-ingestion-age") ?? process.env.GSE_MAX_INGESTION_AGE ?? 240);

async function getJson(path) {
  const url = `${base}${path}`;
  const res = await fetch(url, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(12_000),
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* leave null */
  }
  return { url, status: res.status, json, text };
}

const checks = [];
const check = (name, pass, detail) => {
  checks.push({ name, pass: Boolean(pass), detail: detail ?? "" });
};

let health;
let truth;
let picksStatus;

try {
  const [h, t, p] = await Promise.all([
    getJson("/api/health"),
    getJson("/api/ops/public-surface-truth"),
    fetch(`${base}/api/picks`, { signal: AbortSignal.timeout(12_000) }).then((r) => r.status),
  ]);
  health = h;
  truth = t;
  picksStatus = p;
} catch (error) {
  console.error(
    JSON.stringify(
      {
        ok: false,
        reason: "unreachable",
        base,
        error: error instanceof Error ? error.message : String(error),
      },
      null,
      2,
    ),
  );
  process.exit(2);
}

if (health.status !== 200 || !health.json?.ok) {
  console.error(
    JSON.stringify(
      { ok: false, reason: "health_http", status: health.status, body: health.text?.slice(0, 200) },
      null,
      2,
    ),
  );
  process.exit(2);
}

if (truth.status !== 200 || !truth.json?.ok) {
  console.error(
    JSON.stringify(
      { ok: false, reason: "truth_http", status: truth.status, body: truth.text?.slice(0, 200) },
      null,
      2,
    ),
  );
  process.exit(2);
}

const H = health.json;
const T = truth.json;
const sha = T.deployment?.sha ?? null;
const age = H.checks?.ingestion?.ageMinutes ?? null;
const settle = T.settlement;
const credit = T.creditStack;
const gates = T.gates;
const freeSpine = T.freeSpine ?? null;

check(
  "database ok",
  H.checks?.database?.status === "ok" || H.status === "healthy",
  `health.status=${H.status} db=${H.checks?.database?.status ?? "?"}`,
);

check(
  "ingestion age within hard max",
  typeof age === "number" && age <= maxIngestionAge,
  `ageMinutes=${age} max=${maxIngestionAge}`,
);

check(
  "settlement overdue = 0",
  settle && settle.overduePending === 0 && settle.health === "HEALTHY",
  settle
    ? `${settle.health} overdue=${settle.overduePending}/${settle.commencedTotal}`
    : "settlement missing",
);

check(
  "freeLaneConfigured",
  credit?.freeLaneConfigured === true,
  credit
    ? `primary=${credit.jynx?.contentPlanPrimary ?? "?"} surfaces=${(credit.freeLaneSurfaces ?? []).join(",")}`
    : "creditStack missing",
);

check(
  "public picks closed (LAWS)",
  gates?.canExposePublicPicks === false && picksStatus === 503,
  `canExposePublicPicks=${gates?.canExposePublicPicks} picksHTTP=${picksStatus}`,
);

check(
  "demo/stub off",
  T.host?.stubMode === false && T.host?.demoPicksEnabled === false,
  `stub=${T.host?.stubMode} demo=${T.host?.demoPicksEnabled}`,
);

if (expectSha) {
  const ok = typeof sha === "string" && sha.startsWith(expectSha);
  check("deployment sha", ok, `sha=${sha} expect prefix=${expectSha}`);
}

// I3/I8 free-spine — soft when field not yet deployed; strict with --strict-spine
if (freeSpine && typeof freeSpine === "object") {
  check(
    "freeSpine within SLA (I8)",
    freeSpine.present === true && freeSpine.withinSla === true,
    freeSpine.present
      ? `age=${freeSpine.ageMinutes}m source=${freeSpine.source} withinSla=${freeSpine.withinSla}`
      : "freeSpine present=false (empty labelled ok for offseason if cron wrote snap)",
  );
} else if (strictSpine) {
  check(
    "freeSpine field present (--strict-spine)",
    false,
    "public-surface-truth has no freeSpine — redeploy #358+ or drop --strict-spine",
  );
} else {
  check(
    "freeSpine field (optional until deploy)",
    true,
    "absent — not failing (use --strict-spine after freeSpine ships)",
  );
}

const failed = checks.filter((c) => !c.pass);
const report = {
  ok: failed.length === 0,
  base,
  sha,
  generatedAt: new Date().toISOString(),
  ageMinutes: age,
  freeSpine,
  checks,
  failed: failed.map((c) => c.name),
};

console.log(JSON.stringify(report, null, 2));
process.exit(failed.length === 0 ? 0 : 1);
