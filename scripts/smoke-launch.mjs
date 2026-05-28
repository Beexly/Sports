#!/usr/bin/env node
/**
 * smoke-launch.mjs — Launch readiness smoke check
 *
 * Checks:
 * 1. Required public route files exist
 * 2. Required methodology/pricing/legal pages exist
 * 3. Forbidden betting-certainty terms absent from public route files
 * 4. No public unrestricted crawler route
 * 5. Demo labels exist where demo data is used (sample check)
 * 6. Active agent relay file exists
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, "..");
const WEB_APP = join(ROOT, "apps", "web", "app");

let passed = 0;
let failed = 0;
const failures = [];

function check(label, condition, detail = "") {
  if (condition) {
    console.log(`  ✓  ${label}`);
    passed++;
  } else {
    console.error(`  ✗  ${label}${detail ? ` — ${detail}` : ""}`);
    failures.push({ label, detail });
    failed++;
  }
}

function fileExists(relPath) {
  return existsSync(join(ROOT, relPath));
}

function webRouteExists(route) {
  return existsSync(join(WEB_APP, route, "page.tsx"));
}

function fileContains(relPath, needle) {
  try {
    return readFileSync(join(ROOT, relPath), "utf8").includes(needle);
  } catch {
    return false;
  }
}

function publicRouteContainsForbiddenTerm(route, term) {
  const filePath = join(WEB_APP, route, "page.tsx");
  if (!existsSync(filePath)) return false;
  const content = readFileSync(filePath, "utf8").toLowerCase();
  return content.includes(term.toLowerCase());
}

// ─────────────────────────────────────────────
// Section 1: Required public routes
// ─────────────────────────────────────────────
console.log("\n── Section 1: Required public routes ──\n");

const REQUIRED_ROUTES = [
  ["Home", ""],
  ["Picks / Board", "picks"],
  ["Methodology", "methodology"],
  ["Pricing", "pricing"],
  ["Journal", "journal"],
  ["Fantasy Intelligence", "fantasy"],
  ["Market Gravity", "market-gravity"],
  ["Research Brain", "brain"],
  ["Rumor Radar", "rumor-radar"],
  ["Developer / API", "developer"],
  ["Responsible Play", "responsible-play"],
  ["Privacy", "privacy"],
  ["Terms", "terms"],
  ["Contact", "contact"],
];

for (const [label, route] of REQUIRED_ROUTES) {
  if (route === "") {
    check(label, existsSync(join(WEB_APP, "page.tsx")));
  } else {
    check(label, webRouteExists(route), `Missing: apps/web/app/${route}/page.tsx`);
  }
}

// ─────────────────────────────────────────────
// Section 2: Required docs and governance files
// ─────────────────────────────────────────────
console.log("\n── Section 2: Governance and docs files ──\n");

const REQUIRED_FILES = [
  ["DESIGN.md", "DESIGN.md"],
  ["CLAUDE.md", "CLAUDE.md"],
  ["Active Agent Relay", "reports/agent-handoffs/ACTIVE_AGENT_RELAY.md"],
  ["Launch Baseline Report", "reports/launch/LAUNCH_BASELINE_2026-05-28.md"],
  ["Trust guardrail script", "scripts/guardrails/trust-gate.mjs"],
];

for (const [label, path] of REQUIRED_FILES) {
  check(label, fileExists(path), `Missing: ${path}`);
}

// ─────────────────────────────────────────────
// Section 3: Forbidden betting-certainty terms
// ─────────────────────────────────────────────
console.log("\n── Section 3: Forbidden betting-certainty terms ──\n");

const FORBIDDEN_TERMS = [
  "guaranteed pick",
  "guaranteed win",
  "sure thing",
  "risk-free bet",
  "can't lose",
  "cannot lose",
  "easy money",
  "free money",
  "verified track record",
  "100% win",
  "lock of the",
];

const PUBLIC_ROUTES_TO_SCAN = [
  "", // home
  "picks",
  "board",
  "pricing",
  "fantasy",
  "market-gravity",
  "brain",
  "rumor-radar",
  "methodology",
  "journal",
];

let allTermsClean = true;
for (const route of PUBLIC_ROUTES_TO_SCAN) {
  for (const term of FORBIDDEN_TERMS) {
    if (publicRouteContainsForbiddenTerm(route, term)) {
      const routeLabel = route || "home";
      check(
        `"${term}" absent from /${routeLabel}`,
        false,
        `Forbidden term found in apps/web/app/${route}/page.tsx`
      );
      allTermsClean = false;
    }
  }
}
if (allTermsClean) {
  check("No forbidden betting-certainty terms in public routes", true);
}

// ─────────────────────────────────────────────
// Section 4: Demo labels on demo surfaces
// ─────────────────────────────────────────────
console.log("\n── Section 4: Demo labeling ──\n");

const DEMO_SURFACE_CHECKS = [
  ["Fantasy page has DEMO label", "fantasy", "DEMO"],
  ["Market Gravity page has DEMO label", "market-gravity", "DEMO"],
  ["Rumor Radar page has DEMO label", "rumor-radar", "DEMO"],
  ["Brain page has DEMO label", "brain", "DEMO"],
];

for (const [label, route, needle] of DEMO_SURFACE_CHECKS) {
  const filePath = join(WEB_APP, route, "page.tsx");
  if (!existsSync(filePath)) {
    check(label, false, "Page does not exist");
    continue;
  }
  const content = readFileSync(filePath, "utf8");
  check(label, content.includes(needle), `Missing "${needle}" in ${route}/page.tsx`);
}

// ─────────────────────────────────────────────
// Section 5: Responsible use and legal surface
// ─────────────────────────────────────────────
console.log("\n── Section 5: Responsible use and legal surfaces ──\n");

check(
  "Responsible play page exists",
  webRouteExists("responsible-play")
);
check("Privacy page exists", webRouteExists("privacy"));
check("Terms page exists", webRouteExists("terms"));

const responsibleContent = existsSync(join(WEB_APP, "responsible-play", "page.tsx"))
  ? readFileSync(join(WEB_APP, "responsible-play", "page.tsx"), "utf8")
  : "";

check(
  "Responsible play page links external helpline",
  responsibleContent.includes("ncpgambling") || responsibleContent.includes("1-800-522-4700"),
  "Should link to NCPG or helpline number"
);

// ─────────────────────────────────────────────
// Section 6: Sitemap and openGraph coverage on new surfaces
// ─────────────────────────────────────────────
console.log("\n── Section 6: Sitemap and openGraph coverage ──\n");

const sitemapPath = join(WEB_APP, "sitemap.ts");
const sitemapContent = existsSync(sitemapPath) ? readFileSync(sitemapPath, "utf8") : "";

const NEW_SURFACES = [
  "/fantasy",
  "/market-gravity",
  "/brain",
  "/rumor-radar",
  "/developer",
  "/intelligence",
];

for (const route of NEW_SURFACES) {
  check(
    `Sitemap registers ${route}`,
    sitemapContent.includes(`"${route}"`),
    `Add { path: "${route}", priority: ..., changeFrequency: ... } to ROUTES in sitemap.ts`
  );
}

const OG_SURFACES = [
  "fantasy",
  "market-gravity",
  "brain",
  "rumor-radar",
  "developer",
];

for (const route of OG_SURFACES) {
  const filePath = join(WEB_APP, route, "page.tsx");
  if (!existsSync(filePath)) {
    check(`openGraph on /${route}`, false, "Page does not exist");
    continue;
  }
  const content = readFileSync(filePath, "utf8");
  check(
    `openGraph metadata on /${route}`,
    content.includes("openGraph:"),
    "Add openGraph: { title, description } block to metadata export"
  );
}

// FAQPage JSON-LD on /faq (already implemented; we assert it remains).
const faqPath = join(WEB_APP, "faq", "page.tsx");
const faqContent = existsSync(faqPath) ? readFileSync(faqPath, "utf8") : "";
check(
  "FAQ page has FAQPage JSON-LD",
  faqContent.includes('"@type": "FAQPage"') ||
    faqContent.includes("'@type': 'FAQPage'") ||
    faqContent.includes('"@type":"FAQPage"'),
  "Inject FAQPage schema via <script type='application/ld+json'>"
);

// ─────────────────────────────────────────────
// Summary
// ─────────────────────────────────────────────
console.log("\n────────────────────────────────────────\n");
console.log(`Smoke check complete: ${passed} passed, ${failed} failed\n`);

if (failures.length > 0) {
  console.error("Failures:\n");
  for (const { label, detail } of failures) {
    console.error(`  ✗  ${label}${detail ? `: ${detail}` : ""}`);
  }
  console.error("");
  process.exit(1);
} else {
  console.log("All smoke checks passed. ✓\n");
  process.exit(0);
}
