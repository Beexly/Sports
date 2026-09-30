/**
 * Runs the family-reliability harness over real settled picks.
 *
 * Usage:
 *   tsx scripts/ops/family-reliability-harness.ts <observations.json>
 *
 * The JSON is the output of family-reliability-extract.sql. Kept as a file
 * argument rather than a live DB call so the measurement is reproducible from
 * an immutable snapshot: a reliability number that changes when you re-read the
 * database is not a number you can hold a calibration decision against.
 */
import { readFileSync, writeFileSync } from "node:fs";
import {
  formatReliabilityReport,
  measureAllFamilies,
  type SettledPickObservation,
} from "../../packages/prediction-engine/src/calibration/family-reliability.js";

const SETTLEMENT_EVENT: Record<string, "team-win" | "cover" | "over-under" | "unspecified"> = {
  MONEYLINE: "team-win",
  SPREAD: "cover",
  TOTAL: "over-under",
};

interface RawRow {
  pick_id: string;
  game_id: string;
  pick_type: string;
  outcome: number;
  true_prob: number | null;
  families: string[];
  era: string;
}

const path = process.argv[2];
if (!path) {
  console.error("usage: tsx family-reliability-harness.ts <observations.json>");
  process.exit(2);
}

const raw = JSON.parse(readFileSync(path, "utf-8")) as RawRow[];

const observations: SettledPickObservation[] = raw.map((r) => ({
  pickId: r.pick_id,
  gameId: r.game_id,
  pickType: r.pick_type,
  // null stays null. It is the measured state of 2322 of 3499 rows.
  probability: r.true_prob,
  outcome: r.outcome === 1 ? 1 : 0,
  families: r.families ?? [],
  probabilityEvent: SETTLEMENT_EVENT[r.pick_type] ?? "unspecified",
  era: r.era,
}));

// Every family that appears in the record, so a family whose flag is true
// everywhere still gets a row in the report — its verdict is `no-contrast`,
// and that verdict is the finding.
const families = Array.from(new Set(observations.flatMap((o) => o.families))).sort();
const cells = measureAllFamilies(families, observations);
console.log(formatReliabilityReport(cells));

// Machine-readable, so a later calibration commit can be diffed against this
// run rather than against someone's memory of it.
const outPath = process.argv[3];
if (outPath) {
  writeFileSync(
    outPath,
    JSON.stringify(
      { rows: observations.length, families, generatedFrom: path, cells },
      null,
      2,
    ) + "\n",
  );
  console.error(`\nwrote ${outPath}`);
}
