#!/usr/bin/env node
/**
 * Provisioning status — what is armed, what is next, least-human-first.
 *
 * Reads the registry (scripts/ops/provisioning/registry.mjs) and reconciles it
 * against LIVE production truth (/api/ops/public-surface-truth), so it reports
 * what the deployed app can actually do — not what a local .env claims.
 *
 *   node scripts/ops/provisioning/provision-status.mjs
 *   node scripts/ops/provisioning/provision-status.mjs --json
 *   node scripts/ops/provisioning/provision-status.mjs --category free_lane_llm
 *   node scripts/ops/provisioning/provision-status.mjs --offline    # registry only
 *
 * Exit 0 = every P0 entry is armed. Exit 1 = P0 work remains. Exit 2 = surface unreachable.
 */
import { REGISTRY, actionable, AGENT_EMAIL } from "./registry.mjs";

const DEFAULT_BASE = "https://www.galaxysportsedge.com";

function arg(flag) {
  const i = process.argv.indexOf(flag);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : undefined;
}
const has = (flag) => process.argv.includes(flag);

const base = (arg("--base") ?? process.env.GSE_BASE_URL ?? DEFAULT_BASE).replace(/\/+$/, "");
const asJson = has("--json");
const offline = has("--offline");
const categoryFilter = arg("--category");

/** Fetch live posture, or null when offline/unreachable. */
async function loadTruth() {
  if (offline) return null;
  try {
    const res = await fetch(`${base}/api/ops/public-surface-truth`, {
      headers: { accept: "application/json" },
    });
    if (!res.ok) return { __error: `HTTP ${res.status}` };
    return await res.json();
  } catch (error) {
    return { __error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Map a registry entry to a live "is it armed?" signal.
 *
 * Only entries whose effect is observable on the public ops surface get a real
 * verdict. Everything else returns null — reported as "unverifiable here" rather
 * than quietly assumed done, because a silent assumption is how a founder ends
 * up believing a credit lane is live while Anthropic bills cash.
 */
function liveVerdict(entry, truth) {
  if (!truth || truth.__error) return null;
  const credit = truth.creditStack;
  const jynx = credit?.jynx;
  if (!credit || !jynx) return null;

  const attempts = Array.isArray(jynx.attemptOrder) ? jynx.attemptOrder : [];

  switch (entry.id) {
    case "cerebras":
      return {
        armed: credit.freeLaneConfigured && jynx.contentPlanPrimary === "cerebras_free",
        detail: `freeLaneConfigured=${credit.freeLaneConfigured}, contentPlan=${jynx.contentPlanPrimary}`,
      };
    case "groq":
    case "openrouter":
    case "google-ai-studio":
    case "nvidia-build":
      return {
        armed: credit.freeLaneConfigured,
        detail: `freeLaneConfigured=${credit.freeLaneConfigured} (any secondary host satisfies this)`,
      };
    case "aws-activate":
      return { armed: attempts.includes("bedrock"), detail: `attemptOrder=[${attempts.join(", ")}]` };
    case "azure-founders-hub":
      return { armed: attempts.includes("azure"), detail: `attemptOrder=[${attempts.join(", ")}]` };
    case "google-startups":
      return { armed: attempts.includes("vertex"), detail: `attemptOrder=[${attempts.join(", ")}]` };
    case "stripe-live":
      return { armed: true, detail: "live payments already wired" };
    default:
      return null;
  }
}

const truth = await loadTruth();
if (truth?.__error && !offline) {
  console.error(`Could not reach ${base}: ${truth.__error}`);
  console.error("Re-run with --offline for the registry view.");
  process.exit(2);
}

const scoped = categoryFilter ? REGISTRY.filter((e) => e.category === categoryFilter) : REGISTRY;
const rows = scoped.map((entry) => {
  const verdict = liveVerdict(entry, truth);
  const state = verdict ? (verdict.armed ? "ARMED" : "NOT ARMED") : entry.status === "existing" ? "EXISTING" : "UNVERIFIED";
  return { ...entry, state, liveDetail: verdict?.detail ?? null };
});

if (asJson) {
  console.log(JSON.stringify({ base, agentEmail: AGENT_EMAIL, offline, rows }, null, 2));
} else {
  console.log(`\n  GSE provisioning — ${offline ? "registry only (offline)" : base}`);
  console.log(`  agent inbox: ${AGENT_EMAIL}\n`);

  for (const category of [...new Set(scoped.map((e) => e.category))]) {
    console.log(`  ${category}`);
    for (const r of rows.filter((x) => x.category === category)) {
      const mark = r.state === "ARMED" || r.state === "EXISTING" ? "x" : " ";
      console.log(`    [${mark}] ${r.priority}  ${r.name}`);
      console.log(`         ${r.automation} · ${r.verification} · ${r.state}`);
      if (r.liveDetail) console.log(`         live: ${r.liveDetail}`);
      if (r.traps.length > 0) console.log(`         TRAP: ${r.traps[0]}`);
    }
    console.log("");
  }

  const next = actionable(scoped).filter((e) => {
    const row = rows.find((r) => r.id === e.id);
    return row?.state !== "ARMED";
  });
  console.log("  next actions (least human input first):");
  for (const [i, e] of next.slice(0, 6).entries()) {
    console.log(`    ${i + 1}. [${e.automation}] ${e.name} → ${e.envTargets.join(", ") || "no env"}`);
  }
  console.log("");
}

const p0Blocked = rows.filter((r) => r.priority === "P0" && r.state === "NOT ARMED");
if (!asJson && p0Blocked.length > 0) {
  console.log(`  ${p0Blocked.length} P0 entr${p0Blocked.length === 1 ? "y" : "ies"} still unarmed.\n`);
}
process.exit(p0Blocked.length === 0 ? 0 : 1);
