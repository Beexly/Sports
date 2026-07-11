#!/usr/bin/env node
/**
 * resource-radar-import.mjs — deterministic CSV → JSON for the R&D Radar.
 *
 * Usage: node scripts/resource-radar-import.mjs <snapshot.csv> <observedAt YYYY-MM-DD>
 *
 * Converts a founder-verified radar snapshot (docs/rnd/radar-snapshots/*.csv)
 * into the committed JSON fixture the radar module reads
 * (apps/web/lib/resource-intelligence/radar/generated/<date>.json).
 *
 * Deterministic by construction: same CSV in → byte-identical JSON out.
 * - No network access. No timestamps other than the one passed in.
 * - Rows are sorted (window order, then normalized repository).
 * - Unknown numerics stay null — never invented.
 * - The raw posture string is preserved; an 8-value normalized posture is
 *   derived by prefix rules (see normalizePosture) so free-text postures like
 *   "PROTOTYPE_RIGHTS_CLEARED" stay visible while policy code gets an enum.
 */

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const [, , csvPathArg, observedAt] = process.argv;
if (!csvPathArg || !/^\d{4}-\d{2}-\d{2}$/.test(observedAt ?? "")) {
  console.error("Usage: node scripts/resource-radar-import.mjs <snapshot.csv> <YYYY-MM-DD>");
  process.exit(1);
}

const csvPath = resolve(csvPathArg);
const csvText = readFileSync(csvPath, "utf8");

// Minimal RFC-4180 CSV parser (quoted fields, embedded commas/quotes).
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ",") { row.push(field); field = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.length > 1 || row[0] !== "") rows.push(row);
      row = [];
    } else field += ch;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows;
}

const WINDOWS = ["daily", "weekly", "monthly", "targeted"];

function normalizeRepository(raw) {
  const trimmed = raw.trim().replace(/\.git$/i, "").replace(/\s+/g, " ");
  if (/^[\w.-]+\/[\w.-]+$/.test(trimmed)) return trimmed.toLowerCase();
  // Non-repo concept (screenshot reference, product concept): stable slug.
  return "concept:" + trimmed.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function normalizePosture(raw) {
  const p = raw.trim().toUpperCase();
  if (p.startsWith("QUARANTINE")) return "QUARANTINE";
  if (p.startsWith("OWNER") ) return "OWNER_REVIEW";
  if (p === "REJECT") return "REJECT";
  if (p.startsWith("ADOPT_PATTERNS")) return "ADOPT_PATTERNS";
  if (p.startsWith("PROTOTYPE")) return "PROTOTYPE";
  if (p.startsWith("PILOT")) return "PILOT";
  if (p.startsWith("REFERENCE") || p === "DESIGN_REFERENCE" || p === "UNVERIFIED_REFERENCE") return "REFERENCE_ONLY";
  if (p === "OBSERVE" || p === "EVALUATE") return "OBSERVE";
  return "OBSERVE";
}

function toIntOrNull(s) {
  const t = (s ?? "").trim();
  if (t === "" || t === "N/A") return null;
  const n = Number(t);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function toStrOrNull(s) {
  const t = (s ?? "").trim();
  return t === "" || t === "N/A" || t === "Unknown" ? null : t;
}

function sourceKind(window, repoRaw) {
  if (window !== "targeted") return "GITHUB_TRENDING";
  const lower = repoRaw.toLowerCase();
  if (lower.includes("screenshot") || lower.includes("concept")) return "OWNER_SCREENSHOT";
  return "PRIMARY_REPO";
}

const rows = parseCsv(csvText);
const header = rows[0].map((h) => h.trim());
const expected = ["window", "repo", "trend_gain", "total_stars", "language", "license", "category", "gse_mapping", "posture", "risk", "reason"];
if (JSON.stringify(header) !== JSON.stringify(expected)) {
  console.error(`CSV header mismatch.\n  expected: ${expected.join(",")}\n  got:      ${header.join(",")}`);
  process.exit(1);
}

// Closed risk set. An unknown label (typo or expanded value like
// "BLOCKED_RIGHTS") must FAIL the import, not flow into the fixture — the
// runtime policy caps exact values only, so a novel label would silently
// skip the hard caps.
const RISKS = ["LOW", "MEDIUM", "HIGH", "CRITICAL", "BLOCKED"];

const observations = rows.slice(1).map((r) => {
  const [window, repo, trendGain, totalStars, language, license, category, gseMapping, posture, risk, reason] = r;
  if (!WINDOWS.includes(window.trim())) {
    console.error(`Unknown window "${window}" for repo "${repo}"`);
    process.exit(1);
  }
  if (!RISKS.includes(risk.trim().toUpperCase())) {
    console.error(`Unknown risk "${risk}" for repo "${repo}" — allowed: ${RISKS.join(", ")}`);
    process.exit(1);
  }
  return {
    id: `${window.trim()}:${normalizeRepository(repo)}`,
    window: window.trim(),
    repository: repo.trim(),
    normalizedRepository: normalizeRepository(repo),
    observedAt,
    totalStars: toIntOrNull(totalStars),
    trendGain: toIntOrNull(trendGain),
    language: toStrOrNull(language),
    license: toStrOrNull(license),
    category: category.trim(),
    gseMapping: gseMapping.trim(),
    proposedPosture: posture.trim(),
    normalizedPosture: normalizePosture(posture),
    risk: risk.trim().toUpperCase(),
    reason: reason.trim(),
    sourceKind: sourceKind(window.trim(), repo),
  };
});

observations.sort((a, b) =>
  WINDOWS.indexOf(a.window) - WINDOWS.indexOf(b.window) ||
  a.normalizedRepository.localeCompare(b.normalizedRepository)
);

const snapshot = {
  schemaVersion: 1,
  observedAt,
  sourceFile: csvPath.split("/").slice(-1)[0],
  sourceSha256: createHash("sha256").update(csvText, "utf8").digest("hex"),
  observationCount: observations.length,
  observations,
};

const generatedDir = resolve(
  dirname(new URL(import.meta.url).pathname),
  "..",
  "apps/web/lib/resource-intelligence/radar/generated"
);
mkdirSync(generatedDir, { recursive: true });
const json = JSON.stringify(snapshot, null, 2) + "\n";
// Dated file = immutable history; latest.json = the runtime pointer the
// module imports. Writing both means a new import is live without editing
// snapshot.ts (Codex P2 on #76) — and the dated file keeps provenance.
const datedPath = resolve(generatedDir, `${observedAt}.json`);
const latestPath = resolve(generatedDir, "latest.json");
writeFileSync(datedPath, json, "utf8");
writeFileSync(latestPath, json, "utf8");
console.log(`[radar-import] wrote ${observations.length} observations -> ${datedPath}`);
console.log(`[radar-import] runtime pointer updated -> ${latestPath}`);
console.log(`[radar-import] source sha256 ${snapshot.sourceSha256}`);
