#!/usr/bin/env node
/**
 * Turn a harvested artifact into a steal sheet, the thing a human reads.
 *
 * Input is a file written by harvest.ts, never a live fetch, so the sheet is reproducible from
 * the artifact alone and carries that artifact's provenance verbatim.
 *
 * Usage:
 *   npx tsx scripts/competitive-intel/steal-sheet.ts --in .ci-out/fantasylabs-price_sheet-*.json --out .ci-out
 *
 * Exit: 0 written, 2 usage or unreadable artifact.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import type { RivalPrice } from "../../packages/competitive-intel/src/adapters/fantasylabs-products.js";
import type { RivalFeature } from "../../packages/competitive-intel/src/adapters/fantasylabs-filters.js";
import type { Provenance } from "../../packages/competitive-intel/src/types.js";

interface Artifact<T> {
  org: string;
  assetType: string;
  provenance: Provenance;
  rowCount: number;
  rows: T[];
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
}

const inPath = arg("in");
const outDir = arg("out") ?? ".";
if (!inPath) {
  console.error("usage: steal-sheet.ts --in <artifact.json> [--out <dir>]");
  process.exit(2);
}

let artifact: Artifact<unknown>;
try {
  artifact = JSON.parse(readFileSync(inPath, "utf8")) as Artifact<unknown>;
} catch (err) {
  console.error(`cannot read artifact: ${(err as Error).message}`);
  process.exit(2);
}

const money = (cents: number): string => `$${(cents / 100).toFixed(2)}`;
const lines: string[] = [];

lines.push(`# Steal sheet: ${artifact.org}`);
lines.push("");
lines.push(`Source artifact: \`${basename(inPath)}\` · ${artifact.rowCount} rows`);
lines.push(
  `Provenance: ${artifact.provenance.source_url} · retrieved ${artifact.provenance.retrieved_at} · ` +
    `tier ${artifact.provenance.harvest_tier} · ${artifact.provenance.license_class} · ` +
    `commercial_ok ${artifact.provenance.commercial_ok} · hash ${artifact.provenance.content_hash}`,
);
lines.push("");

if (artifact.assetType === "price_sheet") {
  const rows = artifact.rows as RivalPrice[];
  const live = rows.filter((r) => !r.archived);
  const paid = live.filter((r) => r.priceCents > 0).sort((a, b) => a.priceCents - b.priceCents);
  const trials = live.filter((r) => r.isTrial);
  const comped = live.filter((r) => r.isComped);

  lines.push("## Price posture");
  lines.push("");
  lines.push(`- ${live.length} live SKUs, ${paid.length} paid, ${trials.length} with a trial, ${comped.length} comped.`);
  if (paid.length > 0) {
    lines.push(`- Floor ${money(paid[0]!.priceCents)}, median ${money(paid[Math.floor(paid.length / 2)]!.priceCents)}, ceiling ${money(paid[paid.length - 1]!.priceCents)}.`);
    lines.push(`- Cheapest ten: ${paid.slice(0, 10).map((r) => `${money(r.priceCents)} ${r.name}`).join(" · ")}`);
  }
  if (trials.length > 0) {
    const carded = trials.filter((r) => r.requireCreditCard).length;
    const shortest = trials.reduce((m, r) => (r.trialInterval < m.trialInterval ? r : m), trials[0]!);
    lines.push(
      `- ${carded} of ${trials.length} trials require a card; shortest trial is ${shortest.trialInterval} day(s) at ${money(shortest.trialPriceCents)}.`,
    );
  }
  const families = new Map<string, number>();
  for (const row of paid) families.set(row.familyHandle, Math.min(families.get(row.familyHandle) ?? Infinity, row.priceCents));
  lines.push(`- Entry price by family: ${[...families].map(([f, c]) => `${f} ${money(c)}`).join(" · ")}`);
  lines.push("");
  lines.push("## Wedge");
  lines.push("");
  lines.push(
    paid.length === 0
      ? "- No paid SKU in this artifact, re-harvest before pricing against it."
      : `- Undercut the floor (${money(paid[0]!.priceCents)}) on the same family, then make the differentiator the thing their ladder cannot copy: a settled, provenance-stamped record rather than a projection count.`,
  );
} else if (artifact.assetType === "projection_file") {
  const rows = artifact.rows as RivalFeature[];
  const counts = new Map<string, number>();
  for (const row of rows) counts.set(row.family, (counts.get(row.family) ?? 0) + 1);
  const ordered = [...counts].sort((a, b) => a[1] - b[1]);
  const total = rows.length || 1;

  lines.push("## Feature coverage by family");
  lines.push("");
  for (const [family, n] of [...ordered].reverse()) {
    lines.push(`- ${family}: ${n} (${((n / total) * 100).toFixed(1)}%)`);
  }
  lines.push("");
  lines.push("## Wedge");
  lines.push("");
  const thin = ordered.filter(([, n]) => n <= Math.max(3, total * 0.02));
  if (thin.length > 0) {
    lines.push(`- Their thinnest families are ${thin.map(([f, n]) => `${f} (${n})`).join(", ")}. A differentiator is cheapest exactly here, because the copy is not a re-skin of a crowded surface.`);
  }
  lines.push("- Cross-check the histogram against our own SignalFamily table before claiming a gap; a thin family they do not sell is not a gap, it is a choice.");
  const byTable = new Map<string, number>();
  for (const row of rows) byTable.set(row.table, (byTable.get(row.table) ?? 0) + 1);
  const topTables = [...byTable].sort((a, b) => b[1] - a[1]).slice(0, 5);
  lines.push(`- Heaviest warehouse tables: ${topTables.map(([t, n]) => `${t} (${n})`).join(", ")}.`);
} else {
  lines.push(`No sheet template for asset type "${artifact.assetType}" yet.`);
}

lines.push("");
lines.push("## Provenance rules that apply to anything built on this");
lines.push("");
lines.push("- ToS-scraped stays `commercial_ok: false` until a terms read and written permission exist.");
lines.push("- Re-harvest before quoting a number: a price sheet changes without a deploy.");
lines.push("- Nothing here publishes a pick; `publishes_pick` stays false.");

const stamp = artifact.provenance.retrieved_at.replace(/[:.]/g, "-");
const outPath = join(outDir, `steal-sheet-${artifact.org}-${stamp}.md`);
writeFileSync(outPath, `${lines.join("\n")}\n`);
console.log(`[steal-sheet] ${outPath}`);
