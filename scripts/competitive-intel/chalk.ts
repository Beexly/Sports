#!/usr/bin/env node
/**
 * Slate chalk board from the strongest entrants in a contest artifact.
 *
 * One usersummary request is one entrant. A board needs many, so this takes the entrants with
 * the most lineups out of a harvested contest artifact, pulls their lineups at four concurrent,
 * merges them and reports field exposure against entrant count.
 *
 * The point is not the average. It is the disagreement: a player at high field percent is chalk,
 * a player a good entrant is over-weight on while the field is not is leverage, and the two lists
 * side by side are how a slate is actually attacked.
 *
 * Usage:
 *   npx tsx scripts/competitive-intel/chalk.ts --in .ci-out/<contest>.json --owners 25 --out .ci-out
 *
 * Exit: 0 written, 2 nothing to read.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fetchArtifact, runAdapter } from "../../packages/competitive-intel/src/adapter.js";
import {
  chalkBoard,
  ownershipAdapter,
  type RivalOwnership,
} from "../../packages/competitive-intel/src/adapters/fantasylabs-ownership.js";
import type { RivalEntrant } from "../../packages/competitive-intel/src/adapters/fantasylabs-contests.js";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
}

const inPath = arg("in");
const ownerCount = Number(arg("owners") ?? 20);
const outDir = arg("out") ?? ".";
const sport = Number(arg("sport") ?? 5);

if (!inPath) {
  console.error("usage: chalk.ts --in <contest artifact.json> [--owners 20] [--out dir]");
  process.exit(2);
}

const artifact = JSON.parse(readFileSync(inPath, "utf8")) as { rows: RivalEntrant[]; provenance: { source_url: string } };
const contestId = artifact.rows[0]?.contestId;
if (!contestId) {
  console.error("artifact has no contestId");
  process.exit(2);
}

const top = [...artifact.rows].sort((a, b) => b.lineupCount - a.lineupCount).slice(0, ownerCount);
console.log(`[chalk] contest ${contestId}, ${top.length} entrant(s) of ${artifact.rows.length}`);

async function main(): Promise<void> {
  const merged: RivalOwnership[] = [];
  const failures: number[] = [];
  const queue = [...top];
  const workers = Array.from({ length: 4 }, async () => {
    for (;;) {
      const entrant = queue.shift();
      if (!entrant) return;
      try {
        const adapter = ownershipAdapter(sport, contestId, entrant.ownerId);
        const raw = await fetchArtifact(adapter.url, adapter.tier);
        const run = await runAdapter(adapter, raw);
        merged.push(...run.rows);
      } catch {
        failures.push(entrant.ownerId);
      }
    }
  });
  await Promise.all(workers);

  if (merged.length === 0) {
    console.error("[chalk] no lineups pulled");
    process.exit(2);
  }

  const board = chalkBoard(merged);
  const leverage = [...merged]
    .sort((a, b) => b.variance - a.variance)
    .slice(0, 20);

  const lines: string[] = [];
  lines.push(`# Chalk board: contest ${contestId}`);
  lines.push("");
  lines.push(`${top.length} strongest entrant(s) pulled, ${merged.length} lineup row(s), ${failures.length} failed`);
  lines.push("");
  lines.push("## Field exposure, highest first");
  lines.push("");
  for (const row of board.slice(0, 25)) {
    lines.push(`- ${row.playerName} (${row.position}) · field ${row.fieldPercent}% · ${row.entrantCount} of ${top.length} entrants`);
  }
  lines.push("");
  lines.push("## Leverage, where a strong entrant is over the field");
  lines.push("");
  for (const row of leverage) {
    lines.push(`- ${row.playerName} (${row.position}) · own ${row.ownPercent}% vs field ${row.fieldPercent}% · gap ${row.variance.toFixed(2)}`);
  }
  lines.push("");
  lines.push("## Provenance");
  lines.push("");
  lines.push(`- Contest artifact: ${artifact.provenance.source_url}`);
  lines.push(`- ${top.length} usersummary calls at tier 3, four concurrent, ToS-scraped, commercial_ok false`);
  lines.push("- Field percent is the source's own number and is repeated by every entrant row for the same player, so it is maxed rather than summed.");

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outPath = join(outDir, `chalk-${contestId}-${stamp}.md`);
  writeFileSync(outPath, `${lines.join("\n")}\n`);
  writeFileSync(join(outDir, `chalk-${contestId}-${stamp}.json`), JSON.stringify({ contestId, top: top.length, merged }, null, 1));
  console.log(`[chalk] ${outPath}`);
  console.log(`[chalk] chalkiest: ${board.slice(0, 3).map((r) => `${r.playerName} ${r.fieldPercent}%`).join(", ")}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
