/**
 * populate-player-signals — run the C-074 population path end to end.
 *
 *   npx tsx scripts/dfs/populate-player-signals.ts            # dry run (default)
 *   npx tsx scripts/dfs/populate-player-signals.ts --write    # upsert into `signals`
 *
 * Reads the in-repo aggregates (intelligence/signals/player_week_pbp.jsonl +
 * its manifest), projects SignalWriteCandidates via the pbp loader, and
 * prints the load report. Dry-run writes NOTHING — it is the receipt that
 * the population path runs on real in-repo data. `--write` upserts through
 * the signal writer's own unique tuple, so a re-run converges instead of
 * double-voting; it requires DATABASE_URL and is the runbook-gated step.
 *
 * No row is ever invented: the projection emits only measured aggregates,
 * and a player-week with no plays in a role emits no rows for that role.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  projectPlayerWeekSignals,
  type PbpExtractionManifest,
  type PlayerWeekPbpRow,
} from "../../apps/web/lib/ops/player-signals-pbp-loader";
import type { SignalWriterDb } from "../../apps/web/lib/ops/signal-ledger-writer-types";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const AGGREGATES = join(ROOT, "intelligence", "signals", "player_week_pbp.jsonl");
const MANIFEST = join(ROOT, "intelligence", "signals", "player_week_pbp.manifest.json");

export function loadAggregates(): { rows: PlayerWeekPbpRow[]; manifest: PbpExtractionManifest } {
  const raw = JSON.parse(readFileSync(MANIFEST, "utf8")) as {
    extracted_at: string;
    files: { file: string; sha256: string }[];
  };
  const manifest: PbpExtractionManifest = {
    extractedAt: raw.extracted_at,
    files: raw.files.map((f) => ({ file: f.file, sha256: f.sha256 })),
  };
  const rows = readFileSync(AGGREGATES, "utf8")
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as PlayerWeekPbpRow);
  return { rows, manifest };
}

async function main(): Promise<void> {
  const write = process.argv.includes("--write");
  const { rows, manifest } = loadAggregates();
  const { candidates, report } = projectPlayerWeekSignals(rows, { now: new Date(), manifest });

  console.log(JSON.stringify({ mode: write ? "write" : "dry-run", ...report }, null, 2));

  if (!write) {
    console.log("dry run — nothing written. Re-run with --write (DATABASE_URL set) to upsert.");
    return;
  }
  // Dynamic imports so a dry run never needs the database package or a URL.
  const { db } = (await import("@sports/db")) as unknown as { db: SignalWriterDb };
  const { writeSignalCandidates } = await import("../../apps/web/lib/ops/signal-ledger-writer");
  const result = await writeSignalCandidates(db, candidates);
  console.log(JSON.stringify({ writeResult: result }, null, 2));
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
