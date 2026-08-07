#!/usr/bin/env node
/**
 * impeccable-probe.mjs — 24h continuous-repair invariants (public surfaces).
 *
 * Multi-path SENSE: free-spine, settlement, free-lane, money, autonomy, LAWS.
 * Exit 0 only when honesty spine holds. Never invents scores. Never requires
 * open public gates.
 *
 *   node scripts/ops/impeccable-probe.mjs
 *   node scripts/ops/impeccable-probe.mjs --base https://www.galaxysportsedge.com
 *   node scripts/ops/impeccable-probe.mjs --expect-sha <prefix>
 *   node scripts/ops/impeccable-probe.mjs --strict-spine   # fail if freeSpine missing/stale
 *   node scripts/ops/impeccable-probe.mjs --strict-money   # fail if billingMoney moneyPathReady false
 *
 * Exit 0 = pass
 * Exit 1 = invariant fail (JSON report)
 * Exit 2 = unreachable / parse error
 *
 * Invariants (I2/I3/I5/I8/I9 + LAWS + multi-path):
 *   - database ok (via /api/health)
 *   - ingestion ageMinutes ≤ 240 (hard); warn if > 120
 *   - settlement overdue === 0 (or HEALTHY with 0)
 *   - freeLaneConfigured true
 *   - public picks closed (canExposePublicPicks false + /api/picks 503)
 *   - freeSpine within SLA when present (optional --strict-spine for must-present)
 *   - freeSpine oddsPath honesty when present (report paid single-path ABSENT)
 *   - billingMoney posture when field present (optional --strict-money)
 *   - autonomy default dry-run honesty when field present
 *   - capability money leaves not forever-unknown when money probes ship
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
const strictMoney = hasFlag("--strict-money") || process.env.GSE_STRICT_MONEY === "1";
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
const billingMoney = T.billingMoney ?? null;
const autonomy = T.autonomy ?? null;
const graph = Array.isArray(H.capabilityGraph) ? H.capabilityGraph : [];

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

  // Multi-path honesty: dual-path catalog gaps are structural (not live failure).
  // Always report; never fail the spine on paid odds ABSENT (founder/legal clear).
  const gaps = freeSpine.criticalGaps;
  const spend = freeSpine.requireSpend;
  const oddsPath = freeSpine.oddsPath;
  if (typeof gaps === "number") {
    check(
      "freeSpine dual-path catalog reported",
      true,
      oddsPath
        ? `criticalGaps=${gaps} requireSpend=${spend ?? "?"} paidSingle=${oddsPath.paidSinglePath} — ${oddsPath.operatorHint}`
        : `criticalGaps=${gaps} requireSpend=${spend ?? "?"} freeCovered=${freeSpine.freeCovered ?? "?"}`,
    );
  }
} else if (strictSpine) {
  check(
    "freeSpine field present (--strict-spine)",
    false,
    "public-surface-truth has no freeSpine — redeploy free-spine stack or drop --strict-spine",
  );
} else {
  check(
    "freeSpine field (optional until deploy)",
    true,
    "absent — not failing (use --strict-spine after freeSpine ships)",
  );
}

// Money path — soft unless --strict-money (secrets are founder-owned)
if (billingMoney && typeof billingMoney === "object") {
  const ready = billingMoney.moneyPathReady === true;
  check(
    strictMoney ? "billingMoney moneyPathReady (--strict-money)" : "billingMoney posture present",
    strictMoney ? ready : true,
    `secret=${billingMoney.stripeSecretConfigured} webhook=${billingMoney.webhookSecretConfigured} prices=${billingMoney.envPriceSlotsConfigured}/${billingMoney.envPriceSlotsTotal} ready=${ready} — ${billingMoney.operatorHint ?? ""}`,
  );
} else if (strictMoney) {
  check(
    "billingMoney field present (--strict-money)",
    false,
    "billingMoney missing — redeploy multi-path money posture or drop --strict-money",
  );
} else {
  check(
    "billingMoney field (optional until deploy)",
    true,
    "absent — not failing (ships with multi-path money PR)",
  );
}

// Autonomy I9 — default dry-run honesty
if (autonomy && typeof autonomy === "object") {
  check(
    "autonomy posture present",
    typeof autonomy.executeEnabled === "boolean" && typeof autonomy.defaultDryRun === "boolean",
    `execute=${autonomy.executeEnabled} dryRun=${autonomy.defaultDryRun} sla=${autonomy.freeSpineSlaMinutes}m — ${autonomy.operatorHint ?? ""}`,
  );
  // Invariant: defaultDryRun must mirror !executeEnabled
  check(
    "autonomy dry-run mirrors execute flag",
    autonomy.defaultDryRun === !autonomy.executeEnabled,
    `defaultDryRun=${autonomy.defaultDryRun} executeEnabled=${autonomy.executeEnabled}`,
  );
} else {
  check(
    "autonomy field (optional until deploy)",
    true,
    "absent — not failing (ships with autonomy-posture PR)",
  );
}

// Capability graph money leaves — when money probes ship, checkout must not stay unknown
const checkoutNode = graph.find((n) => n.capabilityId === "route:/checkout");
const revenueNode = graph.find((n) => n.capabilityId === "revenue:checkout");
if (checkoutNode || revenueNode) {
  const checkoutUnknown = checkoutNode?.status === "unknown";
  const revenueUnknown = revenueNode?.status === "unknown";
  // Soft until money probes deploy: report only; fail only if --strict-money AND still unknown
  if (strictMoney) {
    check(
      "capability money leaves probed (--strict-money)",
      !checkoutUnknown && !revenueUnknown,
      `checkout=${checkoutNode?.status ?? "?"} revenue=${revenueNode?.status ?? "?"}`,
    );
  } else {
    check(
      "capability money leaves observed",
      true,
      `checkout=${checkoutNode?.status ?? "?"} revenue=${revenueNode?.status ?? "?"} (unknown until money probes deploy)`,
    );
  }
}


// Stripe webhook host audit — soft until field ships; hard when present
const webhookHosts = T.stripeWebhookHosts ?? null;
if (webhookHosts && typeof webhookHosts === "object") {
  check(
    "GSE Stripe webhook healthy",
    webhookHosts.gsePrimaryHealthy === true && webhookHosts.auditRequired !== true,
    `gse=${webhookHosts.gsePrimaryHealthy} auditRequired=${webhookHosts.auditRequired} enabled=${webhookHosts.enabledCount} — ${webhookHosts.operatorHint ?? ""}`,
  );
} else {
  check(
    "stripeWebhookHosts field (optional until deploy)",
    true,
    "absent — not failing",
  );
}

// Waitlist growth posture — informational (never fails closed-funnel policy)
const waitlist = T.waitlist ?? null;
if (waitlist && typeof waitlist === "object") {
  check(
    "waitlist posture observed",
    typeof waitlist.publicPageOpen === "boolean",
    `publicOpen=${waitlist.publicPageOpen} gate=${waitlist.gateEnabled} — ${waitlist.operatorHint ?? ""}`,
  );
}

// LAWS: never require open public track-record gates
check(
  "revenue ladder not inventing public monetization",
  T.revenueLadder == null || T.revenueLadder.canHonestlyMonetizePublicTrackRecord === false || gates?.canExposePublicPicks === true,
  T.revenueLadder
    ? `step=${T.revenueLadder.currentStep} monetize=${T.revenueLadder.canHonestlyMonetizePublicTrackRecord}`
    : "revenueLadder absent",
);

const failed = checks.filter((c) => !c.pass);
const report = {
  ok: failed.length === 0,
  base,
  sha,
  generatedAt: new Date().toISOString(),
  ageMinutes: age,
  freeSpine,
  billingMoney: billingMoney
    ? {
        moneyPathReady: billingMoney.moneyPathReady,
        stripeSecretConfigured: billingMoney.stripeSecretConfigured,
        webhookSecretConfigured: billingMoney.webhookSecretConfigured,
        envPriceSlotsConfigured: billingMoney.envPriceSlotsConfigured,
      }
    : null,
  waitlist: waitlist
    ? { publicPageOpen: waitlist.publicPageOpen, gateEnabled: waitlist.gateEnabled }
    : null,
  stripeWebhookHosts: webhookHosts
    ? {
        gsePrimaryHealthy: webhookHosts.gsePrimaryHealthy,
        auditRequired: webhookHosts.auditRequired,
      }
    : null,
  autonomy: autonomy
    ? {
        executeEnabled: autonomy.executeEnabled,
        defaultDryRun: autonomy.defaultDryRun,
        freeSpineSlaMinutes: autonomy.freeSpineSlaMinutes,
      }
    : null,
  checks,
  failed: failed.map((c) => c.name),
};

console.log(JSON.stringify(report, null, 2));
process.exit(failed.length === 0 ? 0 : 1);
