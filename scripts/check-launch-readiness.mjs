#!/usr/bin/env node
/**
 * Launch readiness — one command, read-only, no secrets.
 *
 *   node scripts/check-launch-readiness.mjs            # production (www host)
 *   node scripts/check-launch-readiness.mjs --base https://preview.example
 *   node scripts/check-launch-readiness.mjs --json     # machine-readable
 *
 * Probes the live public endpoints and the repo, then prints one verdict per
 * item: PASS / WARN / FAIL. Exit 1 on any FAIL. It never invents a number: a
 * value the endpoint does not return is reported as "unknown", not guessed.
 *
 * Why this exists: the launch checklists in docs/ops disagreed with each other
 * and with production (2026-09-02: PUBLIC_PICKS was on, settlement was CRITICAL,
 * the health endpoint stayed HTTP 200). This script reads the same truth the
 * platform publishes about itself and applies the platform's own gates.
 */
import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const baseArg = args.indexOf("--base");
const BASE = (baseArg >= 0 ? args[baseArg + 1] : null) ?? process.env.LAUNCH_BASE_URL ?? "https://www.galaxysportsedge.com";
const JSON_OUT = args.includes("--json");
const TIMEOUT_MS = 20_000;

const rows = [];
function verdict(status, item, detail) {
  rows.push({ status, item, detail });
}

async function getJson(pathname) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE}${pathname}`, { signal: ctrl.signal, headers: { accept: "application/json" } });
    let body = null;
    try {
      body = await res.json();
    } catch {
      body = null;
    }
    return { status: res.status, body };
  } catch (err) {
    return { status: 0, body: null, error: err instanceof Error ? err.message : String(err) };
  } finally {
    clearTimeout(t);
  }
}

function num(v) {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

// 1. Health (strict mode: settlement counts against readiness)
{
  const strict = await getJson("/api/health?strict=1");
  const b = strict.body ?? {};
  const settlement = Array.isArray(b.capabilities) ? b.capabilities.find((c) => c?.capabilityId === "settlement") : null;
  if (strict.status === 200 && b.ok === true) {
    verdict("PASS", "health (strict)", `HTTP 200, status=${b.status}, settlement=${settlement?.status ?? "unknown"}`);
  } else if (strict.status === 0) {
    verdict("FAIL", "health (strict)", `unreachable: ${strict.error ?? "no response"}`);
  } else {
    const ingestion = b.checks?.ingestion?.status ?? "unknown";
    verdict(
      "FAIL",
      "health (strict)",
      `HTTP ${strict.status}, status=${b.status ?? "unknown"}, ingestion=${ingestion}, settlement=${settlement?.status ?? "unknown"} (${settlement?.reason ?? "no reason"})`,
    );
  }
  const liveness = b.schedulerLiveness;
  if (liveness && typeof liveness === "object") {
    const st = liveness.status;
    verdict(st === "healthy" ? "PASS" : st === "degraded" ? "WARN" : "FAIL", "scheduler liveness", `${st ?? "unknown"} (last cron success ${num(liveness.ageMinutes) ?? "?"}m ago)`);
  } else {
    verdict("WARN", "scheduler liveness", "not reported");
  }
}

// 2. Ops truth: settlement, calibration, gates, sample, odds, ladder
{
  const ops = await getJson("/api/ops/public-surface-truth");
  const d = ops.body ?? {};
  if (ops.status !== 200) {
    verdict("FAIL", "ops truth", `HTTP ${ops.status} ${ops.error ?? ""}`.trim());
  } else {
    const s = d.settlement ?? {};
    const overdue = num(s.overduePending);
    if (s.health === "HEALTHY" && overdue === 0) verdict("PASS", "settlement", `HEALTHY, 0 overdue of ${num(s.commencedTotal) ?? "?"} commenced`);
    else if (s.health === "DEGRADED") verdict("WARN", "settlement", `${s.health}: ${overdue ?? "?"} overdue past the 6h grace`);
    else verdict("FAIL", "settlement", `${s.health ?? "unknown"}: ${overdue ?? "?"} overdue past the 6h grace (run settle-picks with CRON_SECRET; RCA if it does not drain)`);

    const cal = d.calibrationEligibility ?? null;
    if (cal) {
      const detail = `n=${num(cal.n) ?? "?"} brier=${cal.brier ?? "?"} (floor ${cal.floors?.brier ?? "?"}) ece=${cal.ece ?? "?"} (floor ${cal.floors?.ece ?? "?"}) streak ${num(cal.consecutiveGreen) ?? "?"}/${num(cal.streakRequired) ?? "?"}`;
      verdict(cal.status === "GREEN" ? "PASS" : "WARN", "calibration eligibility", `${cal.status}: ${detail}`);
    } else {
      verdict("WARN", "calibration eligibility", "not reported");
    }

    const g = d.gates ?? {};
    verdict("PASS", "gates", `publicPicks=${g.canExposePublicPicks ?? "?"} performanceStats=${g.canExposePerformanceStats ?? "?"} statsPublic=${g.statsPublic ?? "?"} calibrationPublished=${g.calibrationPublished ?? "?"}`);
    if (g.canExposePerformanceStats === true && cal?.status !== "GREEN") {
      verdict("FAIL", "record gate", `PERFORMANCE_STATS is on while calibration eligibility is ${cal?.status ?? "unknown"}: a record is exposed without proof`);
    } else {
      verdict("PASS", "record gate", "performance stats closed unless eligibility is GREEN");
    }

    const sample = d.sample ?? {};
    verdict("PASS", "canonical sample", `settled=${num(sample.canonicalSettled) ?? "?"} pending=${num(sample.canonicalPending) ?? "?"} floor=${num(sample.minSettledForLearning) ?? "?"}`);

    const odds = d.oddsInserting ?? {};
    if (odds.withinRefreshSla === true) verdict("PASS", "odds freshness", `last insert ${num(odds.ageMinutes) ?? "?"}m ago (${odds.sport ?? "?"}), key present=${odds.dualPath?.oddsKeyPresent ?? "?"}`);
    else verdict("FAIL", "odds freshness", `outside refresh SLA (age ${num(odds.ageMinutes) ?? "?"}m)`);

    const spine = d.freeSpine ?? {};
    if (spine.present === true && spine.withinSla === true && num(spine.sportsWithGames) !== 0) {
      verdict("PASS", "free score spine", `${num(spine.sportsWithGames) ?? "?"}/${num(spine.sportsProbed) ?? "?"} sports returned games (${num(spine.ageMinutes) ?? "?"}m ago)`);
    } else if (spine.present === true && num(spine.sportsWithGames) === 0) {
      verdict("FAIL", "free score spine", `probe returned games for 0 of ${num(spine.sportsProbed) ?? "?"} sports: free-path settlement cannot see finals`);
    } else {
      verdict("WARN", "free score spine", `present=${spine.present ?? "?"} withinSla=${spine.withinSla ?? "?"}`);
    }

    const ladder = d.revenueLadder ?? {};
    verdict("PASS", "pricing ladder", `${ladder.currentStep ?? "?"} → ${ladder.nextStep ?? "?"}; blockers: ${(ladder.blockersToNext ?? []).join("; ") || "none"}`);

    const clv = d.clvPosture ?? null;
    if (clv) verdict("PASS", "closing-line value", `graded=${clv.gradedSampleSize} beat=${clv.beatCloseCount} matched=${clv.matchedCloseCount} lost=${clv.lostToCloseCount} rate=${clv.beatCloseRate === null ? "n/a" : (clv.beatCloseRate * 100).toFixed(1) + "%"}`);
    else verdict("WARN", "closing-line value", "clvPosture not reported (deploy carries the ops-truth CLV change?)");

    const money = d.billingMoney ?? {};
    if (money.moneyPathReady === true) verdict("PASS", "money path", `stripe secret + webhook + ${num(money.envPriceSlotsConfigured) ?? "?"}/${num(money.envPriceSlotsTotal) ?? "?"} price slots`);
    else verdict("FAIL", "money path", money.operatorHint ?? "not ready");

    const steps = Array.isArray(d.founderNextSteps) ? d.founderNextSteps : [];
    const p0 = steps.filter((s) => s?.priority === "P0");
    verdict(p0.length ? "WARN" : "PASS", "founder P0 queue", p0.length ? p0.map((s) => `${s.id}: ${s.action}`).join(" | ") : "empty");
  }
}

// 3. Public surfaces
for (const [pathname, expect] of [
  ["/api/picks", [200, 503]],
  ["/api/proof/ledger", [200]],
  ["/api/proof/openapi.json", [200]],
]) {
  const r = await getJson(pathname);
  verdict(expect.includes(r.status) ? "PASS" : "FAIL", `GET ${pathname}`, `HTTP ${r.status}${r.error ? " " + r.error : ""}`);
}

// 4. Repo-side checks (no network)
{
  const vercel = path.join(ROOT, "apps", "web", "vercel.json");
  const rootVercel = path.join(ROOT, "vercel.json");
  if (existsSync(vercel)) {
    const live = readFileSync(vercel, "utf8");
    const crons = JSON.parse(live).crons ?? [];
    const mirrored = existsSync(rootVercel) && readFileSync(rootVercel, "utf8") === live;
    verdict(mirrored ? "PASS" : "FAIL", "cron config", `${crons.length} schedules in apps/web/vercel.json; root mirror ${mirrored ? "identical" : "DRIFTED"}`);
  } else {
    verdict("FAIL", "cron config", "apps/web/vercel.json missing");
  }

  const ops = spawnSync(process.execPath, [path.join(ROOT, "scripts", "check-operator-tasks.mjs")], { encoding: "utf8" });
  const summary = (ops.stdout ?? "").split("\n").find((l) => l.includes("open,")) ?? "no summary";
  verdict(ops.status === 0 ? "PASS" : "FAIL", "operator tasks", summary.replace("[operator-tasks] ", ""));
}

// 5. nflverse currency (network; the script is the source of truth, this just relays its verdict)
{
  const probe = spawnSync("npx", ["tsx", path.join(ROOT, "scripts", "check-nflverse-currency.ts")], {
    encoding: "utf8",
    env: { ...process.env, NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ""} --use-system-ca`.trim() },
    timeout: 120_000,
  });
  const out = `${probe.stdout ?? ""}${probe.stderr ?? ""}`;
  const failures = out.match(/FAILURES \((\d+)\)/);
  if (probe.status === 0) verdict("PASS", "nflverse currency", "every required dataset reaches the current season");
  else if (failures) verdict("WARN", "nflverse currency", `${failures[1]} dataset(s) not yet at the current season (expected before week 1; re-check after kickoff)`);
  else verdict("WARN", "nflverse currency", `probe exit ${probe.status ?? "?"}: ${out.trim().split("\n").slice(-1)[0] ?? ""}`);
}

const fails = rows.filter((r) => r.status === "FAIL").length;
const warns = rows.filter((r) => r.status === "WARN").length;
if (JSON_OUT) {
  console.log(JSON.stringify({ base: BASE, checkedAt: new Date().toISOString(), fails, warns, rows }, null, 2));
} else {
  console.log(`[launch-readiness] ${BASE} at ${new Date().toISOString()}`);
  for (const r of rows) console.log(`  ${r.status.padEnd(4)} ${r.item.padEnd(24)} ${r.detail}`);
  console.log(`[launch-readiness] ${fails} FAIL, ${warns} WARN, ${rows.length - fails - warns} PASS`);
}
process.exit(fails ? 1 : 0);
