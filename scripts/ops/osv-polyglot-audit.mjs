#!/usr/bin/env node
/**
 * Polyglot OSV vulnerability & manifest integrity audit (`google/osv.dev`).
 *
 * Inspects lockfiles and dependency manifests across npm + Python ecosystems:
 *   - `package-lock.json`
 *   - `apps/mobile/package-lock.json`
 *   - `pyproject.toml`
 *   - `../gse-ml-service/requirements.txt` (when sidecar checkout exists)
 *
 * Usage:
 *   node scripts/ops/osv-polyglot-audit.mjs                        # Live OSV querybatch
 *   node scripts/ops/osv-polyglot-audit.mjs --offline-manifest-check
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const REPO_ROOT = resolve(process.cwd());
const OSV_QUERYBATCH_URL = "https://api.osv.dev/v1/querybatch";
const WAIVERS_PATH = resolve(REPO_ROOT, "docs/ops/osv-waivers.json");
const BATCH_SIZE = 500;

function extractNpmPackages(lockPath) {
  if (!existsSync(lockPath)) return [];
  const raw = JSON.parse(readFileSync(lockPath, "utf8"));
  const results = [];
  const seen = new Set();

  if (raw.packages && typeof raw.packages === "object") {
    for (const [pkgPath, meta] of Object.entries(raw.packages)) {
      if (!pkgPath || !meta || typeof meta !== "object" || !meta.version) continue;
      const match = pkgPath.match(/(?:^|node_modules\/)(@[^/]+\/[^/]+|[^/]+)$/);
      const name = meta.name || (match ? match[1] : null);
      if (!name) continue;
      const key = `${name}@${meta.version}`;
      if (seen.has(key)) continue;
      seen.add(key);
      results.push({ ecosystem: "npm", name, version: String(meta.version), source: lockPath });
    }
  }
  return results;
}

function extractPyprojectPackages(tomlPath) {
  if (!existsSync(tomlPath)) return [];
  const text = readFileSync(tomlPath, "utf8");
  const pkgs = [];
  const seen = new Set();
  const matches = text.matchAll(/"([a-zA-Z0-9._-]+)(?:\[[^\]]+\])?\s*(==|>=|~=)\s*([0-9]+\.[0-9]+(?:\.[0-9]+)?)"/g);
  for (const m of matches) {
    const name = m[1].toLowerCase();
    const version = m[3];
    const key = `${name}@${version}`;
    if (seen.has(key)) continue;
    seen.add(key);
    pkgs.push({ ecosystem: "PyPI", name, version, source: tomlPath });
  }
  return pkgs;
}

function extractRequirementsTxt(reqPath) {
  if (!existsSync(reqPath)) return [];
  const lines = readFileSync(reqPath, "utf8").split(/\r?\n/);
  const pkgs = [];
  for (const line of lines) {
    const clean = line.split("#")[0].trim();
    if (!clean) continue;
    const m = clean.match(/^([a-zA-Z0-9._-]+)(?:\[[^\]]+\])?\s*(?:==|>=|~=)\s*([0-9]+\.[0-9]+(?:\.[0-9]+)?)/);
    if (m) {
      pkgs.push({ ecosystem: "PyPI", name: m[1].toLowerCase(), version: m[2], source: reqPath });
    }
  }
  return pkgs;
}

function loadActiveWaivers(now = new Date()) {
  if (!existsSync(WAIVERS_PATH)) return new Map();
  const parsed = JSON.parse(readFileSync(WAIVERS_PATH, "utf8"));
  const entries = Array.isArray(parsed.waivers) ? parsed.waivers : [];
  const active = new Map();
  for (const w of entries) {
    if (!w || !w.id || !w.expiresAt) continue;
    if (new Date(w.expiresAt).getTime() >= now.getTime()) {
      active.set(String(w.id), w);
    }
  }
  return active;
}

async function queryOsvBatch(packages) {
  const findings = [];
  for (let i = 0; i < packages.length; i += BATCH_SIZE) {
    const slice = packages.slice(i, i + BATCH_SIZE);
    const payload = {
      queries: slice.map((p) => ({
        version: p.version,
        package: { name: p.name, ecosystem: p.ecosystem },
      })),
    };
    const res = await fetch(OSV_QUERYBATCH_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      throw new Error(`OSV querybatch HTTP ${res.status}`);
    }
    const body = await res.json();
    if (!body || !Array.isArray(body.results) || body.results.length !== slice.length) {
      throw new Error("Malformed OSV response: result count mismatch (failing closed).");
    }
    for (let j = 0; j < slice.length; j++) {
      const vulns = body.results[j]?.vulns ?? [];
      for (const v of vulns) {
        findings.push({ pkg: slice[j], id: v.id, modified: v.modified });
      }
    }
  }
  return findings;
}

async function main() {
  const offlineOnly = process.argv.includes("--offline-manifest-check");
  const inventory = [
    ...extractNpmPackages(resolve(REPO_ROOT, "package-lock.json")),
    ...extractNpmPackages(resolve(REPO_ROOT, "apps/mobile/package-lock.json")),
    ...extractPyprojectPackages(resolve(REPO_ROOT, "pyproject.toml")),
    ...extractRequirementsTxt(resolve(REPO_ROOT, "../gse-ml-service/requirements.txt")),
  ];

  if (inventory.length === 0) {
    console.error("[osv-polyglot-audit] FAIL - zero packages parsed across polyglot manifests.");
    process.exit(2);
  }

  const npmCount = inventory.filter((p) => p.ecosystem === "npm").length;
  const pypiCount = inventory.filter((p) => p.ecosystem === "PyPI").length;
  console.log(
    `[osv-polyglot-audit] Parsed ${inventory.length} dependencies (${npmCount} npm, ${pypiCount} PyPI).`,
  );

  if (offlineOnly) {
    console.log("[osv-polyglot-audit] OK (--offline-manifest-check verified polyglot inventory).");
    return;
  }

  const waivers = loadActiveWaivers();
  const findings = await queryOsvBatch(inventory);
  const unwaived = findings.filter((f) => !waivers.has(f.id));

  if (unwaived.length > 0) {
    console.error(`[osv-polyglot-audit] FAIL - ${unwaived.length} unwaived OSV finding(s):`);
    for (const f of unwaived.slice(0, 25)) {
      console.error(`  ${f.id} (${f.pkg.ecosystem}:${f.pkg.name}@${f.pkg.version})`);
    }
    process.exit(1);
  }

  console.log(
    `[osv-polyglot-audit] OK - 0 unwaived vulnerabilities across ${inventory.length} packages.`,
  );
}

main().catch((err) => {
  console.error("[osv-polyglot-audit] ERROR:", err instanceof Error ? err.message : String(err));
  process.exit(2);
});
