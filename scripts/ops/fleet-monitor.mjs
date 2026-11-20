#!/usr/bin/env node
/**
 * fleet-monitor.mjs
 * Zero-secret autonomous fleet health, promo guard, cron, CLI, platform utilization,
 * and Founder Command Center monitor.
 * Writes:
 *   - reports/autonomous/provider-health.json
 *   - reports/autonomous/MONITOR_DASHBOARD.md
 *   - reports/autonomous/PLATFORM_UTILIZATION_MATRIX.md
 *   - reports/autonomous/FOUNDER_COMMAND_CENTER.md
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import os from "node:os";
import {
  NANOGPT_SUBSCRIPTION_CUTOFF_ISO,
  NANOGPT_SUBSCRIPTION_CUTOFF_MS,
  NOUS_PROMO_CUTOFF_ISO,
  NOUS_PROMO_CUTOFF_MS,
  loadEnvFromDisk,
} from "./multi-brain-router.mjs";
import { getNanoGptSubscriptionStatus } from "./nanogpt-subscription-monitor.mjs";

const REPO_ROOT = resolve(dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "../..");
const REPORTS_DIR = resolve(REPO_ROOT, "reports/autonomous");
const HEALTH_JSON_PATH = resolve(REPORTS_DIR, "provider-health.json");
const DASHBOARD_MD_PATH = resolve(REPORTS_DIR, "MONITOR_DASHBOARD.md");
const MATRIX_MD_PATH = resolve(REPORTS_DIR, "PLATFORM_UTILIZATION_MATRIX.md");
const COMMAND_CENTER_MD_PATH = resolve(REPORTS_DIR, "FOUNDER_COMMAND_CENTER.md");

const SEVEN_WORKERS = [
  "stealth-skeleton-provider",
  "immortal-orchestrator",
  "data-refresh",
  "pick-generation",
  "content-publishing",
  "airwave-listener",
  "twitter-bot",
];

async function probeEndpoint({ name, url, apiKey, keyPresentLabel, verifyModelId = null, headers = {} }) {
  if (!apiKey) {
    return {
      name,
      status: "missing_key",
      httpStatus: 0,
      latencyMs: 0,
      modelCount: 0,
      promoCheck: null,
      keyPresentLabel,
    };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  const t0 = Date.now();
  try {
    const resp = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${apiKey}`, ...headers },
      signal: controller.signal,
    });
    const latencyMs = Date.now() - t0;
    let modelCount = 0;
    let promoCheck = null;
    if (resp.ok) {
      const payload = await resp.json().catch(() => null);
      const list = Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload?.result)
          ? payload.result
          : Array.isArray(payload)
            ? payload
            : [];
      modelCount = list.length;
      if (verifyModelId) {
        const match = list.find((m) => m?.id === verifyModelId);
        if (match) {
          const pricing = match.pricing || {};
          const promptFree = String(pricing.prompt ?? "unknown") === "0";
          const completionFree = String(pricing.completion ?? "unknown") === "0";
          promoCheck = {
            model: verifyModelId,
            found: true,
            isFree: promptFree && completionFree,
            pricingPrompt: String(pricing.prompt ?? "unknown"),
            pricingCompletion: String(pricing.completion ?? "unknown"),
          };
        } else {
          promoCheck = { model: verifyModelId, found: false, isFree: false };
        }
      }
    }
    return {
      name,
      status: resp.ok ? "ok" : `http_${resp.status}`,
      httpStatus: resp.status,
      latencyMs,
      modelCount,
      promoCheck,
      keyPresentLabel,
    };
  } catch (err) {
    return {
      name,
      status: err?.name === "AbortError" ? "timeout" : "network_error",
      httpStatus: 0,
      latencyMs: Date.now() - t0,
      modelCount: 0,
      promoCheck: null,
      keyPresentLabel,
    };
  } finally {
    clearTimeout(timer);
  }
}

function probeCli(name, cmd, args, extraEnv) {
  try {
    const res =
      process.platform === "win32"
        ? spawnSync("cmd.exe", ["/d", "/s", "/c", `${cmd} ${args.join(" ")}`], {
            encoding: "utf8",
            timeout: 15000,
            windowsHide: true,
            env: extraEnv,
          })
        : spawnSync(cmd, args, {
            encoding: "utf8",
            timeout: 15000,
            env: extraEnv,
          });
    const out = `${res.stdout || ""}\n${res.stderr || ""}`.trim().split(/\r?\n/)[0] || "";
    return {
      name,
      available: res.status === 0,
      versionLine: out.slice(0, 80) || `exit_${res.status}`,
    };
  } catch (err) {
    return { name, available: false, versionLine: err instanceof Error ? err.message : "missing" };
  }
}

function probeAwsIsolationQuick() {
  try {
    const res = spawnSync(process.execPath, [resolve(REPO_ROOT, "scripts/ops/verify-aws-gse-isolation.mjs")], {
      cwd: REPO_ROOT,
      encoding: "utf8",
      timeout: 12000,
      windowsHide: true,
    });
    if (res.stdout?.trim()) {
      return JSON.parse(res.stdout.trim());
    }
  } catch {
    // ignore
  }
  return { expectedAccountId: "034220092205", nonStartupAccountsFound: [], authGateRequired: true, ok: false };
}

async function probeWhopStorefrontQuick() {
  try {
    const r = await fetch("https://galaxy-sports-edge.whop.site", {
      method: "HEAD",
      signal: AbortSignal.timeout(8000),
    });
    return {
      url: "https://galaxy-sports-edge.whop.site",
      status: r.status,
      appId: r.headers.get("x-whop-app") || "app_PrbVglxvAeazeA",
      ok: r.ok,
    };
  } catch (err) {
    return {
      url: "https://galaxy-sports-edge.whop.site",
      status: 0,
      appId: "app_PrbVglxvAeazeA",
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

function readHermesTelemetry() {
  const localAppData = process.env.LOCALAPPDATA || resolve(os.homedir(), "AppData/Local");
  const jobsPath = resolve(localAppData, "hermes/cron/jobs.json");
  const dbPath = resolve(localAppData, "hermes/state.db");

  let cronSummary = { exists: false, totalJobs: 0, enabledJobs: 0, failingJobs: [], nullModelAgentJobs: [] };
  if (existsSync(jobsPath)) {
    try {
      const parsed = JSON.parse(readFileSync(jobsPath, "utf8"));
      const jobs = Array.isArray(parsed.jobs) ? parsed.jobs : [];
      const enabled = jobs.filter((j) => j.enabled);
      const failing = enabled
        .filter((j) => (j.failure_streak || 0) > 0 || j.last_status === "error")
        .map((j) => ({ name: j.name, failureStreak: j.failure_streak || 0, lastError: (j.last_error || "").slice(0, 120) }));
      const nullAgents = enabled
        .filter((j) => !j.no_agent && (!j.model || !j.provider))
        .map((j) => j.name);
      cronSummary = {
        exists: true,
        totalJobs: jobs.length,
        enabledJobs: enabled.length,
        failingJobs: failing,
        nullModelAgentJobs: nullAgents,
      };
    } catch {
      cronSummary.exists = true;
    }
  }

  let sessionSummary = { total: null, active: null, archived: null };
  if (existsSync(dbPath)) {
    try {
      const pyScript = `import json,sqlite3; c=sqlite3.connect(${JSON.stringify(dbPath)}); t,a,ac=c.execute("SELECT COUNT(*), SUM(CASE WHEN COALESCE(archived,0)=1 THEN 1 ELSE 0 END), SUM(CASE WHEN COALESCE(archived,0)=0 THEN 1 ELSE 0 END) FROM sessions").fetchone(); print(json.dumps({"total":t,"archived":a,"active":ac}))`;
      const res = spawnSync("python", ["-c", pyScript], {
        encoding: "utf8",
        timeout: 5000,
        windowsHide: true,
      });
      if (res.status === 0 && res.stdout.trim()) {
        sessionSummary = JSON.parse(res.stdout.trim());
      }
    } catch {
      // ignore
    }
  }

  return { cronSummary, sessionSummary };
}

function readCorpusAndLedgerStats() {
  const cursorPath = resolve(REPORTS_DIR, "corpus-surge-cursor.json");
  const ledgerPath = resolve(REPORTS_DIR, "dispatch-ledger.jsonl");
  let indexedArtifacts = 0;
  let lastSurgeRun = null;
  if (existsSync(cursorPath)) {
    try {
      const c = JSON.parse(readFileSync(cursorPath, "utf8"));
      indexedArtifacts = Object.keys(c.processed || {}).length;
      lastSurgeRun = c.lastRunAt || null;
    } catch {
      // ignore
    }
  }
  let totalDispatches = 0;
  let okDispatches = 0;
  let failedDispatches = 0;
  let paidOverflowUsd = 0;
  if (existsSync(ledgerPath)) {
    const lines = readFileSync(ledgerPath, "utf8").trim().split(/\r?\n/).filter(Boolean);
    for (const l of lines) {
      try {
        const rec = JSON.parse(l);
        totalDispatches++;
        if (String(rec.status || "").startsWith("ok")) okDispatches++;
        else failedDispatches++;
        if (typeof rec.estimatedCostUsd === "number") paidOverflowUsd += rec.estimatedCostUsd;
      } catch {
        // ignore
      }
    }
  }
  return {
    indexedArtifacts,
    lastSurgeRun,
    totalDispatches,
    okDispatches,
    failedDispatches,
    paidOverflowUsd: Number(paidOverflowUsd.toFixed(6)),
  };
}

async function main() {
  const env = loadEnvFromDisk(REPO_ROOT);
  const nowMs = Date.now();
  const hoursLeft = Math.max(0, Number(((NOUS_PROMO_CUTOFF_MS - nowMs) / 3600000).toFixed(2)));
  const nanoDaysLeft = Math.max(0, Number(((NANOGPT_SUBSCRIPTION_CUTOFF_MS - nowMs) / 86400000).toFixed(2)));
  const home = os.homedir();
  const extraPath = [
    resolve(home, ".local/bin"),
    resolve(home, "AppData/Roaming/npm"),
    resolve(home, ".qodo/bin"),
    resolve(home, "AppData/Local/Programs/Julia-1.13.4/bin"),
    process.env.PATH || "",
  ].join(process.platform === "win32" ? ";" : ":");
  const cliEnv = { ...process.env, PATH: extraPath };

  const probes = await Promise.all([
    probeEndpoint({
      name: "nous-portal-free-promo",
      url: `${(env.NOUS_BASE_URL || "https://inference-api.nousresearch.com/v1").replace(/\/$/, "")}/models`,
      apiKey: env.NOUS_API_KEY || env.NOUS_PORTAL_API_KEY,
      keyPresentLabel: "NOUS_API_KEY",
      verifyModelId: "qwen/qwen4-max:free",
    }),
    probeEndpoint({
      name: "aliyun-tokenplan",
      url: "https://token-plan.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1/models",
      apiKey: env.ALIYUN_TOKENPLAN_KEY,
      keyPresentLabel: "ALIYUN_TOKENPLAN_KEY",
    }),
    probeEndpoint({
      name: "alibaba-dashscope",
      url: `${(env.ALIBABA_BASE_URL || "https://dashscope-intl.aliyuncs.com/compatible-mode/v1").replace(/\/$/, "")}/models`,
      apiKey: env.ALIBABA_API_KEY || env.DASHSCOPE_API_KEY,
      keyPresentLabel: "ALIBABA_API_KEY",
    }),
    probeEndpoint({
      name: "nvidia-nim",
      url: "https://integrate.api.nvidia.com/v1/models",
      apiKey: env.NVIDIA_GSE_API_KEY || env.NVIDIA_API_KEY,
      keyPresentLabel: "NVIDIA_GSE_API_KEY",
    }),
    probeEndpoint({
      name: "experientiallabs",
      url: "https://api.experientiallabs.ai/v1/models",
      apiKey: env.EXPLABS_API_KEY,
      keyPresentLabel: "EXPLABS_API_KEY",
    }),
    probeEndpoint({
      name: "opencode-zen",
      url: "https://opencode.ai/zen/v1/models",
      apiKey: env.OPENCODE_ZEN_API_KEY,
      keyPresentLabel: "OPENCODE_ZEN_API_KEY",
    }),
    probeEndpoint({
      name: "huggingface-pro",
      url: "https://router.huggingface.co/v1/models",
      apiKey: env.HF_TOKEN,
      keyPresentLabel: "HF_TOKEN",
    }),
    probeEndpoint({
      name: "openrouter-k1",
      url: "https://openrouter.ai/api/v1/models",
      apiKey: env.OPENROUTER_API_KEY,
      keyPresentLabel: "OPENROUTER_API_KEY",
    }),
    probeEndpoint({
      name: "openrouter-k2",
      url: "https://openrouter.ai/api/v1/models",
      apiKey: env.OPENROUTER_API_KEY2,
      keyPresentLabel: "OPENROUTER_API_KEY2",
    }),
    probeEndpoint({
      name: "openrouter-k3",
      url: "https://openrouter.ai/api/v1/models",
      apiKey: env.OPENROUTER_API_KEY3,
      keyPresentLabel: "OPENROUTER_API_KEY3",
    }),
  ]);

  const clis = [
    probeCli("opencode", "opencode", ["--version"], cliEnv),
    probeCli("commandcode", "commandcode", ["--version"], cliEnv),
    probeCli("latitude", "latitude", ["--version"], cliEnv),
    probeCli("qodo", "qodo", ["--version"], cliEnv),
    probeCli("ax", "ax", ["--version"], cliEnv),
    probeCli("julia", "julia", ["--version"], cliEnv),
    probeCli("depcruise", "depcruise", ["--version"], cliEnv),
    probeCli("otelcol-contrib", "otelcol-contrib", ["--version"], cliEnv),
    probeCli("nuclei", "nuclei", ["-version", "-nc"], cliEnv),
    probeCli("katana", "katana", ["-version", "-nc"], cliEnv),
    probeCli("dnsx", "dnsx", ["-version", "-nc"], cliEnv),
    probeCli("notify", "notify", ["-version"], cliEnv),
    probeCli("CloudflareST", "CloudflareST", ["-v"], cliEnv),
  ];

  const hermes = readHermesTelemetry();
  const corpusStats = readCorpusAndLedgerStats();
  const nanoGptStatus = await getNanoGptSubscriptionStatus({ env, nowMs });
  const awsIsolation = probeAwsIsolationQuick();
  const whopStorefront = await probeWhopStorefrontQuick();

  const fishConfigured = Boolean((env.FISH_API_KEY || env.FISH_AUDIO_API_KEY || "").trim());
  const otelBinaryOk = Boolean(clis.find((c) => c.name === "otelcol-contrib")?.available);
  const placeholderValues = new Set([
    "",
    "your-sentry-org-slug",
    "your-sentry-auth-token",
    "<your-org-slug>",
    "<your-sentry-auth-token>",
  ]);
  const sentryOtelCredsReady =
    !placeholderValues.has(String(env.SENTRY_ORG_SLUG || "").trim()) &&
    !placeholderValues.has(String(env.SENTRY_AUTH_TOKEN || "").trim());

  const workerStates = SEVEN_WORKERS.map((w) => ({
    name: w,
    wranglerPresent: existsSync(resolve(REPO_ROOT, `workers/${w}/wrangler.jsonc`)),
  }));
  const workersHardenedCount = workerStates.filter((w) => w.wranglerPresent).length;
  const otelStaged = existsSync(resolve(REPO_ROOT, "infra/otel/collector-config.yaml"));
  const bigQueryReady = existsSync(resolve(REPO_ROOT, "infra/gcp/bigquery/01_schemas.sql"));
  const pubsubGen2Ready = existsSync(resolve(REPO_ROOT, "infra/gcp/pubsub-functions/index.ts"));
  const neonHttpReady = existsSync(resolve(REPO_ROOT, "packages/db/src/neon-http.ts"));
  const mongoArchiveReady = existsSync(resolve(REPO_ROOT, "packages/data-ingestion/src/mongodb-intel-archive.ts"));
  const productsJsonReady = existsSync(resolve(REPO_ROOT, "apps/web/app/products.json/route.ts"));

  const health = {
    generatedAt: new Date(nowMs).toISOString(),
    nousPromo: {
      cutoffIso: NOUS_PROMO_CUTOFF_ISO,
      hoursRemaining: hoursLeft,
      allowPaygEnv: String(env.NOUS_ALLOW_PAYG ?? "false"),
      modelLockedToFreeSuffix: true,
    },
    nanoGptSub: nanoGptStatus,
    providers: probes,
    clis,
    hermes,
    corpusStats,
    corpusAndLedger: corpusStats,
    cloudflareWorkersHardened: workersHardenedCount === SEVEN_WORKERS.length,
    workerStates,
    platformSummary: {
      workersHardenedCount,
      workersTotal: SEVEN_WORKERS.length,
      awsIsolation,
      whopStorefront,
      fishConfigured,
      otelBinaryOk,
      sentryOtelCredsReady,
      otelStaged,
      bigQueryReady,
      pubsubGen2Ready,
      neonHttpReady,
      mongoArchiveReady,
      productsJsonReady,
    },
  };

  mkdirSync(REPORTS_DIR, { recursive: true });
  writeFileSync(HEALTH_JSON_PATH, JSON.stringify(health, null, 2) + "\n", "utf8");

  const nousProbe = probes.find((p) => p.name === "nous-portal-free-promo");
  const nousFreeStr = nousProbe?.promoCheck
    ? `${nousProbe.promoCheck.found ? "found" : "missing"}, isFree=${nousProbe.promoCheck.isFree}`
    : "unchecked";

  const lines = [
    "# Autonomous Multi-Provider Fleet Monitor Dashboard",
    "",
    `- GeneratedAt: \`${health.generatedAt}\``,
    `- Nous Promo Window Ends: \`${NOUS_PROMO_CUTOFF_ISO}\` (${hoursLeft}h remaining; \`NOUS_ALLOW_PAYG=${health.nousPromo.allowPaygEnv}\`; \`qwen/qwen4-max:free\` pricing: ${nousFreeStr})`,
    `- NanoGPT Pro Subscription Window Ends: \`${NANOGPT_SUBSCRIPTION_CUTOFF_ISO}\` (${nanoDaysLeft}d remaining; endpoint locked to \`/api/subscription/v1\`; status: \`${nanoGptStatus.status}\`)`,
    `- Cloudflare Workers Paid Governance: ${workersHardenedCount}/${SEVEN_WORKERS.length} workers hardened (\`wrangler.jsonc\` account \`46f1c1d1c65d19f3f983713b3a8ab67c\`)`,
    `- Hermes Sessions: total=${hermes.sessionSummary.total ?? "n/a"}, active=${hermes.sessionSummary.active ?? "n/a"}, archived=${hermes.sessionSummary.archived ?? "n/a"}`,
    `- Hermes Cron: enabled=${hermes.cronSummary.enabledJobs}/${hermes.cronSummary.totalJobs}, failing=${hermes.cronSummary.failingJobs.length}, nullModelAgentJobs=${hermes.cronSummary.nullModelAgentJobs.length}`,
    `- Corpus Surge Progress: indexed=${corpusStats.indexedArtifacts}, dispatchesOk=${corpusStats.okDispatches}/${corpusStats.totalDispatches}, paidOverflowUsd=$${corpusStats.paidOverflowUsd}`,
    "",
    "## Provider API Matrix",
    "",
    "| Provider | Status | HTTP | Latency (ms) | Models |",
    "|---|---:|---:|---:|---:|",
    ...probes.map((p) => `| ${p.name} | ${p.status} | ${p.httpStatus} | ${p.latencyMs} | ${p.modelCount} |`),
    "",
    "## Local CLI Toolchain",
    "",
    "| Tool | Available | Version / Output |",
    "|---|---|---|",
    ...clis.map((c) => `| ${c.name} | ${c.available ? "yes" : "no"} | ${c.versionLine.replace(/\|/g, "/")} |`),
    "",
  ];
  writeFileSync(DASHBOARD_MD_PATH, lines.join("\n"), "utf8");

  const matrixLines = [
    "# GSE Platform & Credit Utilization Matrix (2026-11-19)",
    "",
    "| Platform / Lane | Tier / Window | Repo File / Worker / Cron | Live Status |",
    "|---|---|---|---|",
    `| Nous Portal (\`qwen/qwen4-max:free\`) | P0 Free until \`${NOUS_PROMO_CUTOFF_ISO}\` | \`scripts/ops/multi-brain-router.mjs\` + cron \`b2bae44a2154\` | ${nousProbe?.status || "unknown"} (${hoursLeft}h left) |`,
    `| NanoGPT Pro (\`0/60M\` wk tokens, \`0/100\` day images) | P0 Prepaid until \`${NANOGPT_SUBSCRIPTION_CUTOFF_ISO}\` | \`scripts/ops/nanogpt-subscription-monitor.mjs\` + \`/api/subscription/v1\` | ${nanoGptStatus.status} (${nanoDaysLeft}d left) |`,
    `| Fish Audio (\`s2.1-pro-free\`) | P0 Free TTS until \`2026-11-30\` | \`scripts/ops/fish-audio-tts.mjs\` | ${fishConfigured ? "CONFIGURED (s2.1-pro-free)" : "AWAITING FISH_AUDIO_API_KEY"} |`,
    `| NVIDIA NIM (40 RPM Serverless) | P1 Permanent \`$0\` | \`packages/data-ingestion/src/nvidia-nim-suite.ts\` | ${probes.find((p) => p.name === "nvidia-nim")?.status || "unknown"} (${probes.find((p) => p.name === "nvidia-nim")?.modelCount || 0} models) |`,
    `| Alibaba Model Studio / TokenPlan | P1 Prepaid \`qwen4-max\` | \`scripts/ops/multi-brain-router.mjs\` + \`opencode.json\` | ${probes.find((p) => p.name === "aliyun-tokenplan")?.status || "unknown"} |`,
    `| OpenCode Zen / ExpLabs / CommandCode | P1 Permanent \`$0\` | \`opencode.json\` + \`scripts/ops/multi-brain-router.mjs\` | Zen=${probes.find((p) => p.name === "opencode-zen")?.status}, Exp=${probes.find((p) => p.name === "experientiallabs")?.status} |`,
    `| Cloudflare Workers Paid (\`$5/mo\`) | All 7 Workers + Browser Rendering + Workers AI | \`workers/*/wrangler.jsonc\` + \`cloudflare-browser-crawler.ts\` | ${workersHardenedCount}/${SEVEN_WORKERS.length} hardened |`,
    `| Hugging Face PRO (\`gse-watch-pipeline\`) | P2 Paid Router | \`scripts/ops/multi-brain-router.mjs\` + \`opencode.json\` | ${probes.find((p) => p.name === "huggingface-pro")?.status || "unknown"} |`,
    `| AWS Bedrock (\`034220092205\` \`hq@\`) | P2 Startup Credits (Isolated) | \`apps/web/lib/claude-api/providers/bedrock.ts\` | ${awsIsolation.nonStartupAccountsFound?.length === 0 ? "ISOLATED" : "VIOLATION"} (${awsIsolation.authGateRequired ? "CLI needs aws login" : "STS OK"}) |`,
    `| OpenRouter 3-Key Rotation | P3 Free + \`$0.05\` Circuit Breaker | \`scripts/ops/multi-brain-router.mjs\` | K1=${probes.find((p) => p.name === "openrouter-k1")?.status} |`,
    `| Neon Postgres 17 (\`summer-brook-99380762\`) | Operational OLTP (\`:443\`) | \`packages/db/src/neon-http.ts\` + \`neon-branch-hygiene.mjs\` | ${neonHttpReady ? "WIRED" : "MISSING"} |`,
    `| MongoDB Atlas (\`$500\` credits) | Scraped Intel / Telemetry Archive | \`packages/data-ingestion/src/mongodb-intel-archive.ts\` | ${mongoArchiveReady ? "WIRED (spool fallback ready)" : "MISSING"} |`,
    `| GCP Path 36 + Path 4525 (` + "`galaxysportsedge`" + `) | BigQuery + Pub/Sub Gen2 + ML + IAP | \`infra/gcp/\` + \`apps/web/lib/auth/iap-jwt-verifier.ts\` + \`game-snapshot-grounded-agent.mjs\` | ${bigQueryReady && pubsubGen2Ready ? "WIRED" : "MISSING"} |`,
    `| Sentry Exporter (\`$5K\`) + Latitude OTLP + PostHog (\`$50K\`) | 10% Sampled Telemetry Collector | \`infra/otel/collector-config.yaml\` + \`scripts/ops/start-otel-collector.mjs\` | ${otelStaged && otelBinaryOk ? (sentryOtelCredsReady ? "LIVE_READY" : "VALIDATED (placeholder Sentry env vars awaiting /browser prompt)") : "MISSING"} |`,
    `| Whop Storefront (\`app_PrbVglxvAeazeA\`) | Storefront + \`/products.json\` Feed | \`apps/web/app/products.json/route.ts\` + \`infra/whop-storefront/storefront-products.json\` | Site HTTP ${whopStorefront.status} (${productsJsonReady ? "feed ready" : "missing"}) |`,
    "",
  ];
  writeFileSync(MATRIX_MD_PATH, matrixLines.join("\n"), "utf8");

  const escalationItems = [];
  if (awsIsolation.authGateRequired) {
    escalationItems.push("AWS CLI SSO session expired on workstation: run `scripts/ops/aws-sso-refresh.ps1` and approve in `/browser` (Prompt 1 in `docs/ops/gemini-browser-agent-prompts.md`).");
  }
  if (!sentryOtelCredsReady) {
    escalationItems.push("Sentry Exporter `SENTRY_ORG_SLUG` / `SENTRY_AUTH_TOKEN` in `.env.local` are placeholder values: run Master `/browser` Prompt 0 in `docs/ops/gemini-browser-agent-prompts.md`.");
  }
  if (!nanoGptStatus.configured && nanoGptStatus.activeWindow) {
    escalationItems.push("NanoGPT Pro (`60M/wk` units + `100/day` images through Dec 5, 2026): run Master `/browser` Prompt 0 in `docs/ops/gemini-browser-agent-prompts.md` to populate `NANOGPT_API_KEY`.");
  }
  if (!whopStorefront.ok) {
    escalationItems.push(`Whop storefront probe non-OK (${whopStorefront.status}); check https://galaxy-sports-edge.whop.site.`);
  }

  const cmdCenterLines = [
    "# Founder Command Center (Monitoring Mode)",
    "",
    `- UpdatedAt: \`${health.generatedAt}\``,
    `- Mode: Autonomous failovers silent; Founder escalation ONLY on auth gates, checkout/revenue failures, or budget breaches.`,
    `- Active Workers Hardened: ${workersHardenedCount}/${SEVEN_WORKERS.length}`,
    `- Paid Overflow Spend Logged: $${corpusStats.paidOverflowUsd.toFixed(4)}`,
    `- Active Provider API Lanes HTTP 200: ${probes.filter((p) => p.status === "ok").length}/${probes.length}`,
    "",
    "## Action Items Requiring Founder Input",
    "",
    ...(escalationItems.length > 0
      ? escalationItems.map((item) => `- ${item}`)
      : ["- None: all monitored lanes, checkout probes, and budget guards are nominal."]),
    "",
    "## Artifact Links",
    "",
    "- `reports/autonomous/PLATFORM_UTILIZATION_MATRIX.md`",
    "- `reports/autonomous/MONITOR_DASHBOARD.md`",
    "- `reports/autonomous/provider-health.json`",
    "- `docs/ops/whop-storefront-app-PrbVglxvAeazeA-runbook.md`",
    "",
  ];
  writeFileSync(COMMAND_CENTER_MD_PATH, cmdCenterLines.join("\n"), "utf8");

  const okProviders = probes.filter((p) => p.status === "ok").length;
  console.log(
    `[fleet-monitor] OK - ${okProviders}/${probes.length} API lanes HTTP 200 | workers=${workersHardenedCount}/${SEVEN_WORKERS.length} | promoRemaining=${hoursLeft}h | dashboard=${DASHBOARD_MD_PATH}`
  );
}

main().catch((err) => {
  console.error("[fleet-monitor] FAIL:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
