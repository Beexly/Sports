#!/usr/bin/env node
/**
 * Ingestion source-clearance guardrail.
 *
 * WHY THIS EXISTS
 * `source-rights-registry.ts` is the single place that says what we are allowed
 * to do with each upstream dataset, and CLAUDE.md makes it non-negotiable: every
 * extraction job passes the clearance engine first, and a `permission_required`
 * source stops the job. But nothing checked that the *ingestion code* honoured
 * it. The existing rights guardrails look at API payload fixtures
 * (`api-payload-rights-scan`) and at customer-visible copy
 * (`no-raw-ngs-export`) — both downstream of the parser. So a parser could be
 * written against a restricted release, describe it in its own header as
 * openly licensed, and land with every check green. That happened:
 * `nflverse-pfr-def.ts` calls the PFR advanced-stats release "CC-BY-4.0" while
 * the registry has `pfr-advstats-via-nflverse` as `permission_required`,
 * `automation_allowed: false`, verdict "YELLOW internal / RED public — HOLD
 * both". The blanket nflverse CC-BY approval explicitly carves that release out
 * (nflverse's repo-level licence is self-declared and cannot grant rights over
 * Sportradar-licensed content).
 *
 * WHAT IT CHECKS
 * Two rules, both aimed at the moment a restricted dataset first appears in
 * code, which is the last cheap moment to catch it. Both are deliberately
 * SAME-LINE rules — see "why proximity" below.
 *
 *   RULE 1 — LICENCE CONTRADICTION. A line that names a restricted dataset must
 *   not also assert a permissive licence for it. This is the documentation lie
 *   that makes every later reviewer's job harder: the next person reads
 *   "CC-BY-4.0" in the header and reasonably stops asking.
 *
 *   RULE 2 — UNGATED FETCH. A line that fetches a restricted dataset by name
 *   requires the file to call the clearance engine somewhere. A pure parser
 *   handed a table is not the hazard; code that fetches its own input is,
 *   because that is an extraction job by any reading of the policy.
 *
 * WHY PROXIMITY, AND NOT FILE-LEVEL CO-OCCURRENCE
 * The first cut of this guard asked "does this FILE mention a restricted
 * dataset and also mention a permissive licence?" — and it flagged eight files
 * on main, every one of them a false positive. The worst was
 * `apps/web/lib/ingestion/pfr-adv-stats.ts`, which is the exemplar we want
 * copied: it says in as many words that the release is "NOT the generic
 * nflverse CC-BY-4.0 envelope", names the `permission_required` entry, and
 * calls `checkClearance` before fetching. A guard that fails the file doing it
 * right teaches people to delete the guard. Catalogues (`nflverse-source.ts`),
 * rights registries and fixture files hit the same problem: they legitimately
 * hold many datasets and many licence strings, and pairing them across a file
 * proves nothing. Requiring the claim and the dataset on ONE line is what
 * separates "CC-BY-4.0 advstats_week_def_<season>.csv" — an actual false
 * attribution — from a file that discusses both correctly.
 *
 * WHAT IT DELIBERATELY DOES NOT DO
 * It does not fail a pure parser for merely existing. `parsePfrDef` today has no
 * production caller — the risk is latent, not live, and a guardrail that cried
 * wolf on every restricted-source parser would be routed around within a week.
 * Rule 2 fires the moment someone wires the fetch, which is the transition that
 * actually matters.
 *
 * FAIL-CLOSED ON ITS OWN INPUTS
 * If the registry cannot be read or parses to zero entries, this exits non-zero
 * rather than reporting a clean scan. A rights guardrail that silently passes
 * when it cannot find the rights file is worse than no guardrail, because it
 * produces a green check that means nothing.
 */

import { readdir, readFile, stat } from "node:fs/promises";
import { extname, join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = resolve(process.cwd());
const REGISTRY_PATH = resolve(ROOT, "apps/web/lib/scraping/source-rights-registry.ts");

/** Roots where an extraction job could plausibly live. */
const SCAN_TARGETS = [
  "packages/data-ingestion/src",
  "packages/prediction-engine/src",
  "apps/web/lib/ingestion",
  "apps/web/lib/nflverse",
  "apps/web/lib/intelligence",
  "workers",
  "scripts/ingest",
];

const SOURCE_EXTS = new Set([".ts", ".tsx", ".mjs", ".js"]);
const SKIP_DIRS = new Set(["__tests__", "node_modules", ".next", "dist", "coverage", "fixtures"]);

/**
 * Test and fixture files, which legitimately hold licence strings and mocked
 * fetches for many sources at once. Skipped by filename because this repo also
 * keeps `*.test.ts` beside its source rather than only under `__tests__/`.
 */
const SKIP_FILE_PATTERNS = [/\.test\./, /\.spec\./, /fixtures?/i, /\.d\.ts$/];

function shouldSkipFile(file) {
  const name = file.split(/[\\/]/).pop() ?? "";
  return SKIP_FILE_PATTERNS.some((re) => re.test(name));
}

/**
 * Registry statuses that permit automated ingestion. Anything NOT in this set is
 * treated as restricted — an allow-list, so a status added to the registry later
 * is restricted by default rather than silently permitted.
 */
const CLEARED_STATUSES = new Set([
  "approved_public_logged_off",
  "approved_api",
  "approved_open_license",
  "approved_written_permission",
]);

/**
 * Code-visible dataset identifiers → the registry entry that governs them.
 *
 * This mapping is the one hand-maintained part, and it exists because the
 * identifier a developer types (`pfr_advstats`, `advstats_week_def`) is a
 * release-asset name, not the registry's `source_id`. Each entry below is a
 * claim about which registry row applies; keep it in step with the registry's
 * own carve-out notes.
 */
const DATASET_MARKERS = [
  // The registry's nflverse entry carves this release out of the blanket
  // CC-BY-4.0 approval and gives it its own permission_required row.
  { marker: "pfr_advstats", sourceId: "pfr-advstats-via-nflverse" },
  { marker: "advstats_week_def", sourceId: "pfr-advstats-via-nflverse" },
  { marker: "advstats_week_pass", sourceId: "pfr-advstats-via-nflverse" },
  { marker: "advstats_week_rec", sourceId: "pfr-advstats-via-nflverse" },
  { marker: "advstats_week_rush", sourceId: "pfr-advstats-via-nflverse" },
  { marker: "pro-football-reference.com", sourceId: "pfr-advstats-via-nflverse" },
  { marker: "sports-reference.com", sourceId: "pfr-advstats-via-nflverse" },
];

/** Phrases that assert a permissive licence. Rule 1 looks for these. */
const PERMISSIVE_LICENCE_CLAIMS = [
  "CC-BY-4.0",
  "CC-BY 4.0",
  "CC0",
  "CC-BY-SA",
  "public domain",
  "openly licensed",
  "open license",
  "open licence",
  "MIT licensed",
  "Apache-2.0",
];

/** Signals that a file performs network I/O. Rule 2 looks for these. */
const NETWORK_MARKERS = [
  "fetch(",
  "fetchNflverse",
  "axios",
  "undici",
  "node-fetch",
  "https.get",
  "http.get",
  "XMLHttpRequest",
];

/** Signals that a file consults the clearance engine. */
const CLEARANCE_MARKERS = ["checkClearance", "assertIngestible", "wrapExtractedRecord"];

function rel(file) {
  return relative(ROOT, file).split(/[\\/]/).join("/");
}

/**
 * Parse the registry into { source_id -> { status, automation_allowed } }.
 *
 * Deliberately a regex read rather than an import: this guard runs under plain
 * node with no TypeScript pipeline, and the alternative (a build step) is a
 * reason for someone to drop the guard from CI.
 */
export function parseRegistry(registryText) {
  const entries = new Map();
  const blocks = registryText.split(/source_id:\s*"/).slice(1);
  for (const block of blocks) {
    const idMatch = block.match(/^([^"]+)"/);
    if (!idMatch) continue;
    const sourceId = idMatch[1];
    const statusMatch = block.match(/status:\s*"([^"]+)"/);
    const automationMatch = block.match(/automation_allowed:\s*(true|false)/);
    entries.set(sourceId, {
      status: statusMatch ? statusMatch[1] : "unknown",
      automationAllowed: automationMatch ? automationMatch[1] === "true" : false,
    });
  }
  return entries;
}

export function isRestricted(entry) {
  if (!entry) return true; // unknown source → restricted, never the reverse
  if (!entry.automationAllowed) return true;
  return !CLEARED_STATUSES.has(entry.status);
}

/**
 * Evaluate one file's text against both rules.
 *
 * Exported so the fixture suite can exercise it on literal strings with
 * hand-assigned verdicts, rather than re-deriving the implementation.
 */
export function scanFileText(text, filePath, registry) {
  const findings = [];
  const hasClearance = CLEARANCE_MARKERS.some((m) => text.includes(m));
  const lines = text.split(/\r?\n/);

  // One finding per (rule, source) per file — a dataset named on six lines is
  // one problem to fix, not six.
  const reported = new Set();

  lines.forEach((line, index) => {
    const lowerLine = line.toLowerCase();
    for (const { marker, sourceId } of DATASET_MARKERS) {
      if (!lowerLine.includes(marker.toLowerCase())) continue;
      const entry = registry.get(sourceId);
      if (!isRestricted(entry)) continue;

      const claimed = PERMISSIVE_LICENCE_CLAIMS.find((claim) =>
        lowerLine.includes(claim.toLowerCase()),
      );
      if (claimed && !reported.has(`L:${sourceId}`)) {
        reported.add(`L:${sourceId}`);
        findings.push({
          rule: "LICENCE_CONTRADICTION",
          file: filePath,
          line: index + 1,
          sourceId,
          marker,
          detail:
            `asserts "${claimed}" on the same line as ${marker}, but the registry has ` +
            `${sourceId} as status=${entry?.status ?? "unknown"}, ` +
            `automation_allowed=${entry?.automationAllowed ?? false}`,
        });
      }

      const fetchesHere = NETWORK_MARKERS.some((m) => line.includes(m));
      if (fetchesHere && !hasClearance && !reported.has(`F:${sourceId}`)) {
        reported.add(`F:${sourceId}`);
        findings.push({
          rule: "UNGATED_FETCH",
          file: filePath,
          line: index + 1,
          sourceId,
          marker,
          // Worded as "names a fetch of" rather than "fetches": the line may be
          // a docstring describing where the caller gets its table. That is
          // still the finding — a file whose stated contract is "hand me the
          // result of fetching a restricted release" is the place the clearance
          // call belongs — but the message should not claim more than it saw.
          detail:
            `names a fetch of ${marker}, and the file never calls ` +
            `${CLEARANCE_MARKERS.join(" / ")}`,
        });
      }
    }
  });

  return findings;
}

async function walk(dir, out = []) {
  let listing;
  try {
    listing = await readdir(dir, { withFileTypes: true });
  } catch {
    return out; // an optional scan target that does not exist is not a failure
  }
  for (const item of listing) {
    if (item.isDirectory()) {
      if (SKIP_DIRS.has(item.name)) continue;
      await walk(join(dir, item.name), out);
    } else if (SOURCE_EXTS.has(extname(item.name))) {
      out.push(join(dir, item.name));
    }
  }
  return out;
}

async function main() {
  let registryText;
  try {
    registryText = await readFile(REGISTRY_PATH, "utf8");
  } catch (error) {
    console.error(
      `[ingestion-source-clearance] FAIL - cannot read the rights registry at ` +
        `${rel(REGISTRY_PATH)}: ${error.message}`,
    );
    process.exitCode = 1;
    return;
  }

  const registry = parseRegistry(registryText);
  if (registry.size === 0) {
    console.error(
      "[ingestion-source-clearance] FAIL - the rights registry parsed to zero entries; " +
        "refusing to report a clean scan against an empty policy.",
    );
    process.exitCode = 1;
    return;
  }

  const findings = [];
  let scanned = 0;
  for (const target of SCAN_TARGETS) {
    const dir = resolve(ROOT, target);
    try {
      const info = await stat(dir);
      if (!info.isDirectory()) continue;
    } catch {
      continue;
    }
    for (const file of await walk(dir)) {
      if (shouldSkipFile(file)) continue;
      scanned += 1;
      const text = await readFile(file, "utf8");
      findings.push(...scanFileText(text, rel(file), registry));
    }
  }

  if (findings.length === 0) {
    console.log(
      `[ingestion-source-clearance] OK - scanned ${scanned} file(s) against ` +
        `${registry.size} registry entries; no restricted-source violations.`,
    );
    return;
  }

  console.error(
    `[ingestion-source-clearance] FAIL - ${findings.length} restricted-source violation(s):`,
  );
  for (const f of findings) {
    console.error(`  ${f.file} [${f.rule}] ${f.marker} -> ${f.detail}`);
  }
  console.error(
    "\n  A restricted source needs written clearance recorded in " +
      "apps/web/lib/scraping/source-rights-registry.ts before ingestion code targets it.",
  );
  process.exitCode = 1;
}

const isMain = import.meta.url === pathToFileURL(process.argv[1] ?? "").href;
if (isMain) {
  main().catch((error) => {
    console.error("[ingestion-source-clearance] unexpected error:", error);
    process.exit(2);
  });
}
