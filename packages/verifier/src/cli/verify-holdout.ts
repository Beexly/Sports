#!/usr/bin/env tsx
/**
 * npm run verify:holdout
 *
 * Re-grades v5.0.0→v5.2.7 on PICKS-H1. All must score worse than market or
 * the harness is wrong (LAST_PLAN §4.2 / C-362 DoD).
 *
 * Reads verifier/picks-h1.json (or the committed fixture when the export is
 * missing). Never touches the DB.
 */

import path from "node:path";
import {
  RE_GRADED_MODEL_VERSIONS,
  loadPicksH1,
  regradeVersions,
  scorecardMarkdown,
  selectPicksH1,
} from "../index";

function repoRootFromCwd(): string {
  // Prefer cwd (npm scripts run from repo root). Fall back to package-relative.
  const cwd = process.cwd();
  if (cwd.endsWith(path.join("packages", "verifier"))) {
    return path.resolve(cwd, "..", "..");
  }
  return cwd;
}

function main(): number {
  const repoRoot = repoRootFromCwd();
  let loaded;
  try {
    loaded = loadPicksH1(repoRoot);
  } catch (e) {
    console.error(`[verify:holdout] ${e instanceof Error ? e.message : String(e)}`);
    return 2;
  }

  const holdout = selectPicksH1(loaded.export.rows);
  const versions = regradeVersions(holdout, RE_GRADED_MODEL_VERSIONS);

  console.log(`[verify:holdout] source=${loaded.path}`);
  console.log(`[verify:holdout] fromFixture=${loaded.fromFixture}`);
  console.log(`[verify:holdout] PICKS-H1 n=${holdout.length}`);
  console.log("");

  if (versions.length === 0) {
    console.log("NOT RUN — no re-gradable model versions present in the export.");
    console.log("DoD (v5.0.0→v5.2.7 all worse than market) can be NOT RUN until the export exists.");
    return loaded.fromFixture ? 0 : 1;
  }

  const failures: string[] = [];
  for (const v of versions) {
    const sc = v.scorecard;
    const flag = v.beatsMarket ? "FAIL" : "ok";
    console.log(
      `[verify:holdout] ${v.modelVersion} n=${v.n} candBrier=${sc.candidateBrier.toFixed(5)} mktBrier=${sc.marketBrier.toFixed(5)} Δ=${sc.deltaBrier.toFixed(5)} P(better)=${sc.pBetter.toFixed(3)} ${flag}`,
    );
    if (v.beatsMarket) failures.push(v.modelVersion);
    console.log(scorecardMarkdown(`PICKS-H1 regrade ${v.modelVersion}`, sc));
    console.log("");
  }

  if (failures.length > 0) {
    console.error(
      `[verify:holdout] HARNESS WRONG — versions beat market on PICKS-H1: ${failures.join(", ")}`,
    );
    return 1;
  }

  if (loaded.fromFixture) {
    console.log(
      "[verify:holdout] PASS on committed fixture. Real-export DoD is NOT RUN until verifier/picks-h1.json exists.",
    );
    return 0;
  }
  console.log("[verify:holdout] PASS on committed export — all re-graded versions worse than market.");
  return 0;
}

process.exit(main());
