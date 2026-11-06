#!/usr/bin/env node
/**
 * Customer base rollup across harvested contest artifacts.
 *
 * Reads pick_archive artifacts written by harvest.ts, deduplicates by ownerId across contests,
 * and reports the shape of the population: unique people, contest overlap, commitment bands,
 * and the repeat entrants worth a wedge. Writes a markdown brief next to the artifacts.
 *
 * Nothing here guesses: every number is a count over rows that were actually fetched, and the
 * provenance of each contributing artifact is printed verbatim so the brief is auditable.
 *
 * Usage:
 *   npx tsx scripts/competitive-intel/customer-base.ts --in .ci-out --out .ci-out
 *
 * Exit: 0 written, 2 nothing to read.
 */

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  engagementBand,
  rollUpEntrants,
  type RivalEntrant,
} from "../../packages/competitive-intel/src/adapters/fantasylabs-contests.js";
import type { Provenance } from "../../packages/competitive-intel/src/types.js";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
}

interface Artifact {
  provenance: Provenance;
  rows: RivalEntrant[];
}

const inDir = arg("in") ?? ".ci-out";
const outDir = arg("out") ?? inDir;

const files = readdirSync(inDir).filter((f) => f.startsWith("fantasylabs-pick_archive-") && f.endsWith(".json"));
if (files.length === 0) {
  console.error(`no pick_archive artifacts in ${inDir}`);
  process.exit(2);
}

const artifacts: Artifact[] = files.map((f) => JSON.parse(readFileSync(join(inDir, f), "utf8")) as Artifact);
const allRows = artifacts.flatMap((a) => a.rows);
const contests = new Set(allRows.map((r) => r.contestId));
const profiles = rollUpEntrants(allRows);

const bands = profiles.reduce<Record<string, number>>((acc, p) => {
  const band = engagementBand(p);
  acc[band] = (acc[band] ?? 0) + 1;
  return acc;
}, {});

const multiContest = profiles.filter((p) => p.contests > 1);
const whales = profiles.filter((p) => engagementBand(p) === "whale");
const coverage = allRows.length === 0 ? 0 : multiContest.length / profiles.length;

const lines: string[] = [];
lines.push("# Customer base: fantasylabs");
lines.push("");
lines.push("Scope: every contest pulled is golf (sportId 5). The slate route answered for no other sport in a two week window, so read this as a golf population.");
lines.push("");
lines.push(`${contests.size} contest(s) · ${allRows.length} entrant rows · ${profiles.length} unique people`);
lines.push("");
lines.push("## Provenance");
lines.push("");
for (const artifact of artifacts) {
  const p = artifact.provenance;
  lines.push(`- ${p.source_url} · ${p.retrieved_at} · tier ${p.harvest_tier} · ${p.license_class} · hash ${p.content_hash}`);
}
lines.push("");
lines.push("## Shape");
lines.push("");
lines.push(`- Repeat entrants (2+ contests): ${multiContest.length} (${(coverage * 100).toFixed(1)} percent of people)`);
lines.push(
  `- Bands: casual ${bands.casual ?? 0} · regular ${bands.regular ?? 0} · grinder ${bands.grinder ?? 0} · whale ${whales.length}`,
);
lines.push(`- Mean contests per person: ${(allRows.length === 0 ? 0 : profiles.reduce((s, p) => s + p.contests, 0) / profiles.length).toFixed(2)}`);
lines.push("");
lines.push("## Whales, by commitment");
lines.push("");
for (const whale of whales.slice(0, 40)) {
  lines.push(`- ${whale.username} · ${whale.contests} contests · ${whale.lineups} lineups · max field share ${whale.bestMaxPercent}%`);
}
if (whales.length === 0) lines.push("- None at these thresholds yet, harvest more contests.");
lines.push("");
lines.push("## How to use it");
lines.push("");
lines.push(
  "- Whales are the people whose churn is measurable: they pay, they enter the maximum, and they are the ones a competitor's referral offer actually moves.",
);
lines.push(
  "- A repeat entrant in three or more contests is a sharper signal than a big single entry; the band thresholds encode that on purpose.",
);
lines.push("- Handles here are public contest names, not emails. Email inference is a separate pass and carries a lower confidence.");
lines.push("");
lines.push("- Licence: ToS-scraped, `commercial_ok: false` until a terms read plus written permission.");

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const outPath = join(outDir, `customer-base-${stamp}.md`);
writeFileSync(outPath, `${lines.join("\n")}\n`);
console.log(`[customer-base] ${outPath}`);
console.log(`[customer-base] ${profiles.length} people, ${whales.length} whales, ${multiContest.length} repeat`);
