/**
 * C-395 live smoke: pull small free public nflverse releases and write them
 * under packages/verifier/data (gitignored) with the SHA-256 manifest.
 * Large assets (contracts, ngs, weekly_rosters) are intentionally NOT pulled
 * here — fixtures cover their schema; a full backfill is a later operator run.
 *
 * Run: npx tsx scripts/verifier/c395-live-smoke.ts
 * (from packages/verifier: npx tsx ../../scripts/verifier/c395-live-smoke.ts
 *  OR simply: npx tsx src/cli/c395-live-smoke.ts)
 */
import { loadNflverseRelease, defaultVerifierDataDir } from "../loaders/nflverse-releases.js";
import type { NflverseReleaseDataset } from "../loaders/nflverse-releases.js";

async function main(): Promise<void> {
  console.log("dataDir:", defaultVerifierDataDir());
  const small: readonly NflverseReleaseDataset[] = ["officials", "trades", "draft_picks"];
  for (const dataset of small) {
    const r = await loadNflverseRelease({ dataset, timeoutMs: 60_000 });
    if (r.status === "ok") {
      console.log(
        dataset,
        "OK",
        `rows=${r.rowCount}`,
        `sha=${r.sha256.slice(0, 12)}`,
        `file=${r.writtenPath ?? "none"}`,
      );
    } else {
      console.log(dataset, r.status, "error" in r ? r.error : r.reason);
    }
  }
  const ftn = await loadNflverseRelease({ dataset: "ftn_charting", season: 2024, timeoutMs: 120_000 });
  if (ftn.status === "ok") {
    console.log(
      "ftn_charting",
      "OK",
      `rows=${ftn.rowCount}`,
      `sha=${ftn.sha256.slice(0, 12)}`,
      `file=${ftn.writtenPath ?? "none"}`,
    );
  } else {
    console.log("ftn_charting", ftn.status, "error" in ftn ? ftn.error : ftn.reason);
  }
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
