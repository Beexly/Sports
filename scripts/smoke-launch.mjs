#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const appRoot = resolve(repoRoot, "apps", "web", "app");

const checks = [];

function normalizeText(value) {
  return value.toLowerCase().replace(/\s+/g, " ");
}

function file(path) {
  return resolve(repoRoot, path);
}

function routePagePath(route) {
  if (!route) return resolve(appRoot, "page.tsx");
  return resolve(appRoot, route, "page.tsx");
}

function routeExists(route) {
  return existsSync(routePagePath(route));
}

function read(path) {
  return readFileSync(path, "utf8");
}

function addCheck(name, pass, detail = "") {
  checks.push({ name, pass, detail });
}

const requiredRoutes = [
  { label: "home", route: "" },
  { label: "board", route: "board" },
  { label: "picks", route: "picks" },
  { label: "pricing", route: "pricing" },
  { label: "methodology", route: "methodology" },
  { label: "journal", route: "journal" },
  { label: "responsible-play", route: "responsible-play" },
  { label: "privacy", route: "privacy" },
  { label: "terms", route: "terms" },
  { label: "contact", route: "contact" },
];

for (const entry of requiredRoutes) {
  addCheck(
    `required route exists: /${entry.label}`,
    routeExists(entry.route),
    `Missing ${entry.route ? `apps/web/app/${entry.route}/page.tsx` : "apps/web/app/page.tsx"}`
  );
}

const forbiddenTerms = [
  "guaranteed pick",
  "guaranteed win",
  "sure thing",
  "risk-free bet",
  "can't lose",
  "cannot lose",
  "easy money",
  "free money",
  "100% win",
  "lock of the",
];

const scanRoutes = ["", "board", "picks", "pricing", "methodology", "journal"];
for (const route of scanRoutes) {
  const page = routePagePath(route);
  if (!existsSync(page)) continue;
  const content = normalizeText(read(page));
  for (const term of forbiddenTerms) {
    addCheck(
      `forbidden phrase absent "${term}" on /${route || ""}`,
      !content.includes(term),
      `Found "${term}" in ${page}`
    );
  }
}

const legalPage = routePagePath("responsible-play");
if (existsSync(legalPage)) {
  const content = normalizeText(read(legalPage));
  addCheck(
    "responsible-play includes helpline language",
    content.includes("1-800-522-4700") || content.includes("ncpgambling"),
    "Missing NCPG/helpline marker on responsible-play"
  );
}

const robotsPath = file("apps/web/app/robots.ts");
if (existsSync(robotsPath)) {
  const robots = normalizeText(read(robotsPath));
  const requiredDisallow = ["/cockpit", "/admin", "/api/"];
  for (const blocked of requiredDisallow) {
    addCheck(
      `robots disallows ${blocked}`,
      robots.includes(blocked.toLowerCase()),
      `robots.ts missing disallow for ${blocked}`
    );
  }
}
addCheck("no public crawler route", !existsSync(resolve(appRoot, "crawler")), "apps/web/app/crawler should not exist");

const brainPath = resolve(appRoot, "brain", "page.tsx");
if (existsSync(brainPath)) {
  const text = normalizeText(read(brainPath));
  const gateMarkers = ["gated", "waitlist", "preview", "demo", "beta", "elite"];
  addCheck(
    "brain route has gate/demo marker",
    gateMarkers.some((marker) => text.includes(marker)),
    "Brain route exists without explicit gated/demo marker"
  );
} else {
  addCheck("no unrestricted public brain route", true);
}

const demoRoutes = ["fantasy", "market-gravity", "brain", "rumor-radar", "developer"];
for (const route of demoRoutes) {
  const page = routePagePath(route);
  if (!existsSync(page)) continue;
  const text = normalizeText(read(page));
  addCheck(
    `demo label present when /${route} exists`,
    ["demo", "preview", "beta", "waitlist"].some((token) => text.includes(token)),
    `Route /${route} exists without demo/preview marker`
  );
}

let passCount = 0;
let failCount = 0;
for (const result of checks) {
  if (result.pass) {
    passCount += 1;
    console.log(`PASS ${result.name}`);
  } else {
    failCount += 1;
    console.error(`FAIL ${result.name}${result.detail ? ` :: ${result.detail}` : ""}`);
  }
}

console.log(`\nSmoke summary: ${passCount} passed, ${failCount} failed`);
if (failCount > 0) {
  process.exit(1);
}
