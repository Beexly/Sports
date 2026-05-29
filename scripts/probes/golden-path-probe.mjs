#!/usr/bin/env node
/**
 * Golden Path Synthetic Probe
 *
 * Hits each surface on the golden path and verifies:
 *  - Status code is 2xx (or expected redirect)
 *  - No banned phrases (Constitution #5)
 *  - Demo / sample labels present where required
 *  - TrustStrip present on betting-adjacent surfaces
 *  - No accidental cockpit / private-route exposure
 *  - No confidential methodology terms leaked into public HTML
 *
 * Run against a preview URL:
 *   PROBE_BASE_URL=https://preview.example.com node scripts/probes/golden-path-probe.mjs
 *
 * Without PROBE_BASE_URL, defaults to http://localhost:3000.
 */

const BASE = process.env.PROBE_BASE_URL || "http://localhost:3000";
const TIMEOUT_MS = 15_000;

const BANNED_PHRASES = [
  "guaranteed",
  "lock of the day",
  "tail the sharps",
  "can't lose",
  "easy money",
  "ai picks the winners",
  "100% accurate",
];

const CONFIDENTIAL_TERMS = [
  "modelweights",
  "calibrationformula",
  "factorthreshold",
  "prompttext",
  "system prompt",
];

const PRIVATE_PATHS = [
  "/admin",
  "/cockpit",
  "/studio",
  "/api/admin",
  "/api/cockpit",
];

const PROBE_SURFACES = [
  { path: "/", requireTrust: false, requireDemoLabel: false },
  { path: "/today", requireTrust: true, requireDemoLabel: false },
  { path: "/picks", requireTrust: true, requireDemoLabel: false },
  { path: "/no-bet", requireTrust: false, requireDemoLabel: false },
  { path: "/parlay-mri", requireTrust: false, requireDemoLabel: false },
  { path: "/autopsy", requireTrust: false, requireDemoLabel: false },
  { path: "/command", requireTrust: true, requireDemoLabel: false },
  { path: "/reports", requireTrust: false, requireDemoLabel: false },
  { path: "/galaxy-demo", requireTrust: false, requireDemoLabel: true },
  { path: "/methodology", requireTrust: false, requireDemoLabel: false },
  { path: "/responsible-play", requireTrust: false, requireDemoLabel: false },
];

function red(s) { return `\x1b[31m${s}\x1b[0m`; }
function green(s) { return `\x1b[32m${s}\x1b[0m`; }
function dim(s) { return `\x1b[2m${s}\x1b[0m`; }

async function fetchSurface(path) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE}${path}`, {
      signal: controller.signal,
      redirect: "follow",
      headers: { "User-Agent": "galaxy-golden-path-probe/1.0" },
    });
    const text = await res.text();
    return { status: res.status, text, redirected: res.redirected, finalUrl: res.url };
  } finally {
    clearTimeout(timeout);
  }
}

function checkBannedPhrases(text, path) {
  const haystack = text.toLowerCase();
  return BANNED_PHRASES.filter((phrase) => haystack.includes(phrase.toLowerCase()))
    .map((phrase) => `banned phrase "${phrase}" found in ${path}`);
}

function checkConfidentialTerms(text, path) {
  const haystack = text.toLowerCase().replace(/\s+/g, "");
  return CONFIDENTIAL_TERMS.filter((term) => haystack.includes(term.replace(/\s+/g, "").toLowerCase()))
    .map((term) => `confidential term "${term}" surfaced in ${path}`);
}

function checkTrustStrip(text, path, required) {
  if (!required) return [];
  const hasTrustStrip = /data-trust-strip|trust-strip|surface[- ]?id=/i.test(text)
    || /SourceFreshness|Galaxy Sports Edge.*evidence/i.test(text);
  return hasTrustStrip ? [] : [`TrustStrip missing on ${path}`];
}

function checkDemoLabel(text, path, required) {
  if (!required) return [];
  const hasLabel = /demonstration data|demo data|not live picks|demo tour/i.test(text);
  return hasLabel ? [] : [`Demo label missing on ${path}`];
}

async function probePrivatePaths() {
  const issues = [];
  for (const p of PRIVATE_PATHS) {
    try {
      const res = await fetchSurface(p);
      if (res.status === 200 && !/sign in|unauthor|forbidden/i.test(res.text)) {
        issues.push(`private path ${p} returned 200 unauthenticated`);
      }
    } catch (e) {
      // network error → treat as non-exposure (path likely doesn't exist)
    }
  }
  return issues;
}

async function main() {
  console.log(dim(`Probing ${BASE}...`));
  const allIssues = [];
  let totalChecked = 0;

  for (const surface of PROBE_SURFACES) {
    totalChecked++;
    let res;
    try {
      res = await fetchSurface(surface.path);
    } catch (err) {
      const msg = `fetch failed for ${surface.path}: ${err?.message || err}`;
      allIssues.push(msg);
      console.log(red(`  ✗ ${surface.path}`));
      continue;
    }

    const issues = [];
    if (res.status < 200 || res.status >= 400) {
      issues.push(`non-success status ${res.status} on ${surface.path}`);
    }
    issues.push(...checkBannedPhrases(res.text, surface.path));
    issues.push(...checkConfidentialTerms(res.text, surface.path));
    issues.push(...checkTrustStrip(res.text, surface.path, surface.requireTrust));
    issues.push(...checkDemoLabel(res.text, surface.path, surface.requireDemoLabel));

    if (issues.length === 0) {
      console.log(green(`  ✓ ${surface.path}  (${res.status})`));
    } else {
      console.log(red(`  ✗ ${surface.path}  (${res.status})`));
      for (const i of issues) console.log(`      ${i}`);
      allIssues.push(...issues);
    }
  }

  console.log(dim("\nChecking private route exposure..."));
  const privateIssues = await probePrivatePaths();
  if (privateIssues.length === 0) {
    console.log(green("  ✓ no private routes exposed"));
  } else {
    for (const i of privateIssues) console.log(red(`  ✗ ${i}`));
    allIssues.push(...privateIssues);
  }

  console.log(`\nProbed ${totalChecked} surfaces.`);
  if (allIssues.length > 0) {
    console.log(red(`FAIL — ${allIssues.length} issue(s)`));
    process.exit(1);
  }
  console.log(green("PASS — golden path clean"));
}

main().catch((err) => {
  console.error(red(`probe error: ${err?.message || err}`));
  process.exit(2);
});
