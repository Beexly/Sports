#!/usr/bin/env node
// GSE Nightly Sentinel v2 — CLI runner.
//
// Wraps nightly-sentinel-checks.mjs's runAllChecks() into: an exit code
// (0=SHIP, 1=WATCH, 2=FAIL, mirroring scripts/smoke-prod.sh's convention),
// a durable JSON artifact (uploaded by the workflow, never committed to the
// repo -- this campaign does not auto-publish), a human report written to
// $GITHUB_STEP_SUMMARY when present, and -- on FAIL only -- filing or
// updating one marker-labeled GitHub issue so repeated nightly failures
// don't create a duplicate-alert storm.
//
// Read-only against the target site: no login, no mutation, no request body.

import { runAllChecks, SEVERITY, redactSensitive } from "./nightly-sentinel-checks.mjs";
import { writeFile, appendFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const BASE_URL = process.env.SENTINEL_BASE_URL ?? "https://www.galaxysportsedge.com";
const TIMEOUT_MS = Number(process.env.SENTINEL_TIMEOUT_MS ?? 8000);
const ARTIFACT_PATH = process.env.SENTINEL_ARTIFACT_PATH ?? "nightly-sentinel-result.json";
const ISSUE_LABEL = "nightly-sentinel-failure";
const GITHUB_API = "https://api.github.com";

export function overallSeverity(results) {
  if (results.some((r) => r.severity === SEVERITY.FAIL)) return SEVERITY.FAIL;
  if (results.some((r) => r.severity === SEVERITY.WARN)) return SEVERITY.WARN;
  return SEVERITY.PASS;
}

export function exitCodeFor(severity) {
  if (severity === SEVERITY.FAIL) return 2;
  if (severity === SEVERITY.WARN) return 1;
  return 0;
}

export function shipLabelFor(severity) {
  if (severity === SEVERITY.FAIL) return "FAIL";
  if (severity === SEVERITY.WARN) return "WATCH";
  return "SHIP";
}

/** Redacts every result's detail before it's written anywhere durable (JSON artifact, human report, issue body). */
export function buildArtifact({ baseUrl, startedAt, finishedAt, results, overall }) {
  return {
    baseUrl,
    startedAt,
    finishedAt,
    overall,
    results: results.map((r) => ({ ...r, detail: redactSensitive(r.detail) })),
  };
}

export function renderHumanReport({ baseUrl, startedAt, finishedAt, results, overall }) {
  const lines = [];
  lines.push(`## Nightly Sentinel v2 — ${shipLabelFor(overall)}`);
  lines.push("");
  lines.push(`Target: \`${baseUrl}\``);
  lines.push(`Started: ${startedAt}`);
  lines.push(`Finished: ${finishedAt}`);
  lines.push("");
  lines.push("| Check | Severity | Category | Detail |");
  lines.push("|---|---|---|---|");
  for (const r of results) {
    const detail = redactSensitive(r.detail).replace(/\|/g, "\\|");
    lines.push(`| ${r.id} | ${r.severity} | ${r.category ?? "-"} | ${detail} |`);
  }
  lines.push("");
  const failCount = results.filter((r) => r.severity === SEVERITY.FAIL).length;
  const warnCount = results.filter((r) => r.severity === SEVERITY.WARN).length;
  lines.push(`${failCount} FAIL, ${warnCount} WARN, ${results.length - failCount - warnCount} PASS out of ${results.length} checks.`);
  return lines.join("\n");
}

export async function fileOrUpdateIssue({ token, repo, humanReport, overall, fetchImpl = fetch }) {
  if (overall !== SEVERITY.FAIL) return { action: "none", reason: `overall severity is ${overall}, not FAIL` };
  if (!token || !repo) return { action: "none", reason: "GITHUB_TOKEN or GITHUB_REPOSITORY not set (not running in CI, or intentionally dry)" };

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "User-Agent": "gse-nightly-sentinel",
  };

  const searchUrl = `${GITHUB_API}/repos/${repo}/issues?state=open&labels=${encodeURIComponent(ISSUE_LABEL)}&per_page=5`;
  const searchRes = await fetchImpl(searchUrl, { headers });
  if (!searchRes.ok) {
    return { action: "none", reason: `issue search failed: ${searchRes.status} ${await searchRes.text()}` };
  }
  const openIssues = await searchRes.json();
  const body = `Automated nightly production sentinel detected a FAIL. Redacted report below.\n\n${redactSensitive(humanReport)}\n\n_This issue is updated in place on each new failure, not duplicated. It auto-resolves manually once the underlying check passes again -- the sentinel does not auto-close._`;

  if (Array.isArray(openIssues) && openIssues.length > 0) {
    const issue = openIssues[0];
    const commentRes = await fetchImpl(`${GITHUB_API}/repos/${repo}/issues/${issue.number}/comments`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    if (!commentRes.ok) {
      return { action: "none", reason: `comment-on-existing-issue failed: ${commentRes.status} ${await commentRes.text()}` };
    }
    return { action: "commented", issueNumber: issue.number };
  }

  const createRes = await fetchImpl(`${GITHUB_API}/repos/${repo}/issues`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Nightly Sentinel v2: production check FAIL",
      body,
      labels: [ISSUE_LABEL],
    }),
  });
  if (!createRes.ok) {
    return { action: "none", reason: `issue creation failed: ${createRes.status} ${await createRes.text()}` };
  }
  const created = await createRes.json();
  return { action: "created", issueNumber: created.number };
}

async function main() {
  const startedAt = new Date().toISOString();
  const results = await runAllChecks({ baseUrl: BASE_URL, timeoutMs: TIMEOUT_MS });
  const finishedAt = new Date().toISOString();
  const overall = overallSeverity(results);

  const artifact = buildArtifact({ baseUrl: BASE_URL, startedAt, finishedAt, results, overall });

  await writeFile(ARTIFACT_PATH, JSON.stringify(artifact, null, 2), "utf8");

  const humanReport = renderHumanReport({ baseUrl: BASE_URL, startedAt, finishedAt, results, overall });
  console.log(humanReport);

  if (process.env.GITHUB_STEP_SUMMARY) {
    await appendFile(process.env.GITHUB_STEP_SUMMARY, `\n${humanReport}\n`, "utf8");
  }

  const issueOutcome = await fileOrUpdateIssue({
    token: process.env.GITHUB_TOKEN,
    repo: process.env.GITHUB_REPOSITORY,
    humanReport,
    overall,
  });
  if (issueOutcome.action !== "none" || overall === SEVERITY.FAIL) {
    const redactedOutcome = issueOutcome.reason ? { ...issueOutcome, reason: redactSensitive(issueOutcome.reason) } : issueOutcome;
    console.log(`Issue action: ${JSON.stringify(redactedOutcome)}`);
  }

  process.exitCode = exitCodeFor(overall);
}

// Run as a script (not when imported by the test).
const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : "";
if (import.meta.url === invokedPath) {
  main().catch((err) => {
    console.error(`Nightly Sentinel runner crashed: ${redactSensitive(err?.stack ?? String(err))}`);
    process.exitCode = 2;
  });
}
