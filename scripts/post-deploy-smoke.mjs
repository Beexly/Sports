#!/usr/bin/env node
/**
 * Post-deploy smoke test for Galaxy Sports Edge.
 *
 * Hits every public route on production, plus a small set of API
 * endpoints, and reports a green/red checklist. Run this the moment
 * Vercel reports a green build.
 *
 * Usage:
 *   node scripts/post-deploy-smoke.mjs
 *   node scripts/post-deploy-smoke.mjs --url=https://galaxysportsedge.com
 *
 * Defaults to https://galaxysportsedge.com. Exits non-zero on any failure.
 */

const COLOR = process.stdout.isTTY
  ? {
      reset: "\x1b[0m",
      red: "\x1b[31m",
      green: "\x1b[32m",
      yellow: "\x1b[33m",
      cyan: "\x1b[36m",
      dim: "\x1b[2m",
    }
  : { reset: "", red: "", green: "", yellow: "", cyan: "", dim: "" };

const argUrl = process.argv.find((a) => a.startsWith("--url="));
const BASE = (argUrl ? argUrl.split("=")[1] : "https://galaxysportsedge.com").replace(/\/$/, "");

const PUBLIC_PAGES = [
  // Homepage hero splits the tagline with <em>, so we check for the surrounding
  // fragments rather than the full continuous string.
  { path: "/", mustContain: ["Galaxy Sports Edge", "Find the", "before the market moves"] },
  { path: "/picks", mustContain: ["Galaxy Sports Edge"] },
  { path: "/methodology", mustContain: ["Methodology"] },
  { path: "/performance", mustContain: ["Performance"] },
  { path: "/pricing", mustContain: ["Free", "Pro", "Elite"] },
  { path: "/observatory", mustContain: ["Observatory"] },
  { path: "/vault", mustContain: ["Vault"] },
  { path: "/about", mustContain: ["About"] },
  { path: "/press", mustContain: ["Press"] },
  { path: "/contact", mustContain: ["Contact", "support@"] },
  { path: "/responsible-play", mustContain: ["Responsible"] },
  { path: "/terms", mustContain: ["Terms"] },
  { path: "/privacy", mustContain: ["Privacy"] },
];

const SEO_FILES = [
  { path: "/robots.txt", mustContain: ["Sitemap:", "User-agent: *"] },
  { path: "/sitemap.xml", mustContain: ["<urlset", "galaxysportsedge.com"] },
  { path: "/opengraph-image", mustContainContentType: "image/png" },
];

const API_ENDPOINTS = [
  { path: "/api/health", expectJson: true, mustHaveKey: "ok" },
];

// Per Galaxy Sports Edge Brand Use Pack §8.
// NOTE: "lock" by itself is NOT banned — "Eclipse Lock" is a product
// surface name. Only "lock of the day" (the touting cliché) is banned.
const BANNED_PHRASES = [
  /\bguaranteed profit\b/i,
  /\bguaranteed winning\b/i,
  /\bguaranteed pick\b/i,
  /\block of the day\b/i,
  /\bfree money\b/i,
  /\bsure thing\b/i,
  /\brisk-free\b/i,
  /\beasy money\b/i,
  /\bcan't lose\b/i,
];

let failures = 0;
let warnings = 0;
const lines = [];

function ok(label, detail = "") {
  lines.push(`  ${COLOR.green}✓${COLOR.reset}  ${label}${detail ? COLOR.dim + " — " + detail + COLOR.reset : ""}`);
}
function bad(label, detail = "") {
  failures += 1;
  lines.push(`  ${COLOR.red}✗${COLOR.reset}  ${label}${detail ? "  " + COLOR.red + detail + COLOR.reset : ""}`);
}
function warn(label, detail = "") {
  warnings += 1;
  lines.push(`  ${COLOR.yellow}!${COLOR.reset}  ${label}${detail ? "  " + COLOR.yellow + detail + COLOR.reset : ""}`);
}
function header(label) {
  lines.push("");
  lines.push(`${COLOR.cyan}${label}${COLOR.reset}`);
}

async function fetchWithTimeout(url, opts = {}, ms = 15000) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal });
  } finally {
    clearTimeout(id);
  }
}

async function checkPage(p) {
  const url = `${BASE}${p.path}`;
  try {
    const res = await fetchWithTimeout(url);
    if (!res.ok) {
      bad(`${p.path}`, `HTTP ${res.status}`);
      return;
    }
    const body = await res.text();
    const missing = (p.mustContain ?? []).filter((needle) => !body.includes(needle));
    if (missing.length > 0) {
      bad(`${p.path}`, `200 but missing: ${missing.map((s) => `"${s}"`).join(", ")}`);
      return;
    }
    // Banned phrase scan on rendered HTML
    const bannedHit = BANNED_PHRASES.find((re) => re.test(body));
    if (bannedHit) {
      bad(`${p.path}`, `BANNED PHRASE matched: ${bannedHit}`);
      return;
    }
    ok(`${p.path}`, `200 · ${body.length.toLocaleString()} bytes`);
  } catch (err) {
    bad(`${p.path}`, err.message);
  }
}

async function checkSeo(p) {
  const url = `${BASE}${p.path}`;
  try {
    const res = await fetchWithTimeout(url);
    if (!res.ok) {
      bad(`${p.path}`, `HTTP ${res.status}`);
      return;
    }
    if (p.mustContainContentType) {
      const ct = res.headers.get("content-type") ?? "";
      if (!ct.includes(p.mustContainContentType)) {
        bad(`${p.path}`, `content-type ${ct} (expected ${p.mustContainContentType})`);
        return;
      }
      ok(`${p.path}`, `content-type ${ct.split(";")[0]}`);
      return;
    }
    const body = await res.text();
    const missing = (p.mustContain ?? []).filter((needle) => !body.includes(needle));
    if (missing.length > 0) {
      bad(`${p.path}`, `missing: ${missing.join(", ")}`);
      return;
    }
    ok(`${p.path}`);
  } catch (err) {
    bad(`${p.path}`, err.message);
  }
}

async function checkApi(p) {
  const url = `${BASE}${p.path}`;
  try {
    const res = await fetchWithTimeout(url);
    if (!res.ok) {
      warn(`${p.path}`, `HTTP ${res.status} (may be expected if route is unimplemented)`);
      return;
    }
    if (p.expectJson) {
      const json = await res.json();
      if (p.mustHaveKey && !(p.mustHaveKey in json)) {
        warn(`${p.path}`, `200 OK but missing key "${p.mustHaveKey}"`);
        return;
      }
    }
    ok(`${p.path}`);
  } catch (err) {
    warn(`${p.path}`, err.message);
  }
}

async function checkSecurityHeaders() {
  const url = `${BASE}/`;
  try {
    const res = await fetchWithTimeout(url);
    const headers = res.headers;
    const security = {
      "strict-transport-security": headers.get("strict-transport-security"),
      "x-content-type-options": headers.get("x-content-type-options"),
      "referrer-policy": headers.get("referrer-policy"),
    };
    for (const [name, val] of Object.entries(security)) {
      if (val) ok(name, val);
      else warn(name, "header missing — consider adding via next.config or vercel.json");
    }
  } catch (err) {
    warn("Security headers", err.message);
  }
}

async function main() {
  console.log("");
  console.log(`${COLOR.dim}Smoke testing: ${BASE}${COLOR.reset}`);

  header("Public pages");
  // Parallel — homepage and the others can run concurrently.
  await Promise.all(PUBLIC_PAGES.map(checkPage));

  header("SEO & social");
  await Promise.all(SEO_FILES.map(checkSeo));

  header("API endpoints");
  await Promise.all(API_ENDPOINTS.map(checkApi));

  header("Security headers");
  await checkSecurityHeaders();

  console.log(lines.join("\n"));
  console.log("");

  if (failures > 0) {
    console.log(`${COLOR.red}Result: ${failures} failure(s)${warnings ? `, ${warnings} warning(s)` : ""}.${COLOR.reset}`);
    process.exit(1);
  }
  if (warnings > 0) {
    console.log(`${COLOR.yellow}Result: live, ${warnings} warning(s).${COLOR.reset}`);
  } else {
    console.log(`${COLOR.green}Result: all green. Ship it.${COLOR.reset}`);
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
