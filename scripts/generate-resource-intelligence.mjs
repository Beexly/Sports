#!/usr/bin/env node
/**
 * Generate the Resource Intelligence artifacts from the verified Garrett dump.
 *
 *   npx tsx scripts/generate-resource-intelligence.mjs
 *   (or:  npm run resource-intel:generate)
 *
 * Must run under `tsx` so the TypeScript engine imports resolve — that engine,
 * under apps/web/lib/resource-intelligence, is the single source of truth, so
 * the script never duplicates classification logic.
 *
 * Reads:   handoff/incoming/garrett-resource-dump-2026-06-15.md  (verified SHA-256)
 * Writes:  handoff/codex/galaxy-2026-limit-push/NORMALIZED_RESOURCE_LEDGER.csv
 *          handoff/codex/galaxy-2026-limit-push/IMPLEMENT_NOW_QUEUE.md
 *          handoff/codex/galaxy-2026-limit-push/OWNER_REVIEW_QUEUE.md
 *          handoff/codex/galaxy-2026-limit-push/QUARANTINE_LEDGER.md
 *          handoff/codex/galaxy-2026-limit-push/RESOURCE_INTELLIGENCE_SUMMARY.md
 *          apps/web/lib/resource-intelligence/generated/summary.json
 */

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import {
  buildLedger,
  implementNowQueue,
  ownerReviewQueue,
  quarantineQueue,
  findGatedLeaks,
  buildCockpitSummary,
} from "../apps/web/lib/resource-intelligence/index.ts";

const ROOT = process.cwd();
const DUMP = path.join(ROOT, "handoff/incoming/garrett-resource-dump-2026-06-15.md");
const EXPECTED_SHA = "957f68dec09222d9c636dae64b0eaaa4f1c09732048a47189fdd24908f0cb3c4";
const OUT_DIR = path.join(ROOT, "handoff/codex/galaxy-2026-limit-push");
const GEN_DIR = path.join(ROOT, "apps/web/lib/resource-intelligence/generated");

// ── Read + verify the dump ──────────────────────────────────────────────────────
const raw = readFileSync(DUMP, "utf8");
const sha = createHash("sha256").update(readFileSync(DUMP)).digest("hex");
if (sha !== EXPECTED_SHA) {
  console.error(`\nABORT: dump SHA-256 mismatch.\n  expected ${EXPECTED_SHA}\n  actual   ${sha}\n`);
  process.exit(1);
}

const ledger = buildLedger(raw, { sourceFile: path.basename(DUMP), sourceSha256: sha });

// ── Hard safety gate: no gated item may leak into implement-now ──────────────────
const leaks = findGatedLeaks(ledger);
if (leaks.length > 0) {
  console.error(`\nABORT: ${leaks.length} gated resource(s) leaked into implement-now:\n${leaks.join("\n")}\n`);
  process.exit(1);
}

// ── CSV ──────────────────────────────────────────────────────────────────────────
function csvCell(v) {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
const CSV_HEADER = [
  "id", "name", "disposition", "risk_tier", "category", "gate_required",
  "occurrences", "source_file", "section", "first_line", "reasons", "description",
];
const csvRows = ledger.resources.map((r) =>
  [
    r.id, r.name, r.disposition, r.riskTier, r.category, r.gateRequired,
    r.occurrences, r.sourceFile, r.section, r.firstLine, r.reasons.join("; "), r.description,
  ].map(csvCell).join(","),
);
const csv = [CSV_HEADER.join(","), ...csvRows].join("\n") + "\n";

// ── Queue markdown ────────────────────────────────────────────────────────────────
function queueTable(rows, cols) {
  const head = `| ${cols.map((c) => c.h).join(" | ")} |`;
  const sep = `| ${cols.map(() => "---").join(" | ")} |`;
  const body = rows.map((r) => `| ${cols.map((c) => String(c.f(r)).replace(/\|/g, "\\|")).join(" | ")} |`);
  return [head, sep, ...body].join("\n");
}

const stamp = ledger.generatedAt;
const provenance =
  `Source: \`${ledger.sourceFile}\` · SHA-256 \`${ledger.sourceSha256}\` · ` +
  `generated ${stamp}\n\n` +
  `Raw lines ${ledger.rawLineCount} · candidate entries ${ledger.candidateEntryCount} · ` +
  `unique resources ${ledger.uniqueResourceCount}.\n`;

const implement = implementNowQueue(ledger);
const owner = ownerReviewQueue(ledger);
const quarantine = quarantineQueue(ledger);

const implementMd =
  `# IMPLEMENT NOW QUEUE — Galaxy 2026 Limit Push\n\n` +
  `${provenance}\n` +
  `Only **approved-direct** and **prototype** resources appear here. No owner-review or ` +
  `quarantined resource can ever reach this queue (enforced by \`findGatedLeaks\` + tests).\n\n` +
  `Total: **${implement.length}** safe, actionable resources.\n\n` +
  queueTable(implement, [
    { h: "Resource", f: (r) => r.name },
    { h: "Disposition", f: (r) => r.disposition },
    { h: "Category", f: (r) => r.category },
    { h: "Why", f: (r) => r.reasons.join("; ") },
    { h: "Note", f: (r) => r.description },
  ]) + "\n";

const ownerMd =
  `# OWNER REVIEW QUEUE — Galaxy 2026 Limit Push\n\n` +
  `${provenance}\n` +
  `These resources touch third-party sports data, scraping/crawling, or ` +
  `RSS/YouTube/podcast/API ingestion, or are legal-gray dual-use tools. They are **gated**: ` +
  `do NOT promote into public claims, StatKing evidence, Airwave feeds, or automation until ` +
  `the existing source-provider + clearance gates clear them.\n\n` +
  `Total: **${owner.length}** items awaiting owner/legal decision.\n\n` +
  queueTable(owner, [
    { h: "Resource", f: (r) => r.name },
    { h: "Category", f: (r) => r.category },
    { h: "Gate", f: (r) => (r.gateRequired ? "yes" : "no") },
    { h: "Why", f: (r) => r.reasons.join("; ") },
    { h: "Section", f: (r) => r.section },
  ]) + "\n";

const quarantineMd =
  `# QUARANTINE LEDGER — Galaxy 2026 Limit Push\n\n` +
  `${provenance}\n` +
  `**Hard-blocked, terminal.** Piracy, evasion, or access-control circumvention. ` +
  `These must never be used, prototyped, referenced in claims, or added to any registry.\n\n` +
  `Total: **${quarantine.length}** quarantined resources.\n\n` +
  queueTable(quarantine, [
    { h: "Resource", f: (r) => r.name },
    { h: "Reason", f: (r) => r.reasons.join("; ") },
    { h: "Section", f: (r) => r.section },
    { h: "Source", f: (r) => r.sourceFile },
  ]) + "\n";

// ── Summary ──────────────────────────────────────────────────────────────────────
const c = ledger.counts;
const summaryMd =
  `# RESOURCE INTELLIGENCE SUMMARY — Galaxy 2026 Limit Push\n\n` +
  `${provenance}\n` +
  `## Disposition counts\n\n` +
  queueTable(
    [
      ["approved_direct", c.approved_direct, "Vetted, safe, high-value — adopt directly"],
      ["prototype", c.prototype, "Safe + high-value category — trial behind a flag"],
      ["approved_internal_reference", c.approved_internal_reference, "Safe — reference only"],
      ["roadmap", c.roadmap, "Safe + relevant later"],
      ["owner_review", c.owner_review, "Gated — source-provider/legal decision required"],
      ["quarantine", c.quarantine, "Hard-blocked — piracy/evasion (terminal)"],
      ["rejected_noise", c.rejected_noise, "Not a real resource"],
    ],
    [
      { h: "Disposition", f: (r) => r[0] },
      { h: "Count", f: (r) => r[1] },
      { h: "Meaning", f: (r) => r[2] },
    ],
  ) +
  `\n\n## Continuation gates (do not cross without clearing)\n\n` +
  `- Quarantine is terminal — no promotion, ever.\n` +
  `- Owner-review items stay out of public claims, StatKing evidence, Airwave feeds, and ` +
  `automation until the source-provider + clearance gates clear them.\n` +
  `- Implement-now is limited to approved-direct + prototype, asserted leak-free at generation time.\n`;

// ── Cockpit summary JSON (committed; read by cockpit.ts at runtime) ───────────────
const cockpit = buildCockpitSummary(ledger, 25);

// ── Write ────────────────────────────────────────────────────────────────────────
mkdirSync(OUT_DIR, { recursive: true });
mkdirSync(GEN_DIR, { recursive: true });
writeFileSync(path.join(OUT_DIR, "NORMALIZED_RESOURCE_LEDGER.csv"), csv);
writeFileSync(path.join(OUT_DIR, "IMPLEMENT_NOW_QUEUE.md"), implementMd);
writeFileSync(path.join(OUT_DIR, "OWNER_REVIEW_QUEUE.md"), ownerMd);
writeFileSync(path.join(OUT_DIR, "QUARANTINE_LEDGER.md"), quarantineMd);
writeFileSync(path.join(OUT_DIR, "RESOURCE_INTELLIGENCE_SUMMARY.md"), summaryMd);
writeFileSync(path.join(GEN_DIR, "summary.json"), JSON.stringify(cockpit, null, 2) + "\n");

console.log("Resource Intelligence generated.");
console.log(`  unique resources : ${ledger.uniqueResourceCount}`);
console.log(`  approved_direct  : ${c.approved_direct}`);
console.log(`  prototype        : ${c.prototype}`);
console.log(`  internal_ref     : ${c.approved_internal_reference}`);
console.log(`  roadmap          : ${c.roadmap}`);
console.log(`  owner_review     : ${c.owner_review}`);
console.log(`  quarantine       : ${c.quarantine}`);
console.log(`  rejected_noise   : ${c.rejected_noise}`);
console.log(`  implement-now    : ${implement.length}`);
