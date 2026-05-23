#!/usr/bin/env node
/**
 * Source health alarm — polls the cockpit API and exits non-zero when
 * any HIGH-severity alert is present. Designed for a scheduled GitHub
 * Action: a non-zero exit creates an Actions failure notification
 * which routes via your existing notification preferences.
 *
 * Hard Rule §6 compatible:
 *   - No auto-publish path (read-only API call)
 *   - No external posting unless the operator wires it (this script
 *     only exits with a code; downstream notification is the workflow's
 *     job, and is rate-limited by the cron cadence)
 *
 * Env vars:
 *   SOURCE_HEALTH_URL   — full URL to GET /api/cockpit/source-health
 *                         (e.g. https://galaxysportsedge.com/api/cockpit/source-health)
 *   SOURCE_HEALTH_TOKEN — value for the Cookie header used to auth as
 *                         an admin (operator-issued via the cockpit;
 *                         see "How to issue" comment below)
 *   ALERT_FAIL_LEVEL    — minimum severity to fail on (default HIGH)
 *
 * Exit codes:
 *   0  no alerts at-or-above ALERT_FAIL_LEVEL
 *   1  one or more alerts at-or-above ALERT_FAIL_LEVEL
 *   2  fetch failure (network, non-2xx) — surfaced loudly
 */

const SEVERITY_RANK = { LOW: 1, MEDIUM: 2, HIGH: 3 };

function rankFor(s) {
  return SEVERITY_RANK[s] ?? 0;
}

const url = process.env.SOURCE_HEALTH_URL;
const token = process.env.SOURCE_HEALTH_TOKEN ?? "";
const minLevel = (process.env.ALERT_FAIL_LEVEL ?? "HIGH").toUpperCase();
const minRank = rankFor(minLevel);

if (!url) {
  console.error("[source-health-alarm] SOURCE_HEALTH_URL not set");
  process.exit(2);
}
if (!minRank) {
  console.error(`[source-health-alarm] ALERT_FAIL_LEVEL=${minLevel} invalid (use LOW|MEDIUM|HIGH)`);
  process.exit(2);
}

async function poll() {
  const headers = { accept: "application/json" };
  if (token) headers.cookie = token;

  let res;
  try {
    res = await fetch(url, { headers, cache: "no-store" });
  } catch (err) {
    console.error(`[source-health-alarm] fetch failed: ${err.message ?? err}`);
    process.exit(2);
  }
  if (!res.ok) {
    console.error(`[source-health-alarm] HTTP ${res.status} from source-health endpoint`);
    process.exit(2);
  }
  const body = await res.json();
  const alerts = Array.isArray(body.alerts) ? body.alerts : [];
  const firing = alerts.filter((a) => rankFor(a.severity) >= minRank);

  console.log(JSON.stringify({
    composedAt: body.composedAt,
    totalSources: body.sources?.length ?? 0,
    totalAlerts: alerts.length,
    firingAtOrAbove: minLevel,
    firingCount: firing.length,
    narrative: body.narrative,
  }));

  if (firing.length > 0) {
    console.error(`[source-health-alarm] ${firing.length} alert(s) at or above ${minLevel}:`);
    for (const a of firing) {
      console.error(`  [${a.severity}] ${a.provider}: ${a.message}`);
    }
    process.exit(1);
  }
  console.log(`[source-health-alarm] clean — no alerts at or above ${minLevel}`);
  process.exit(0);
}

await poll();
