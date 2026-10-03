// Two more repairs to the loop log, both found by checking rather than assuming.
//
// 1. Cycle 7 (joins) is MISSING from the log. It was written and committed in
//    34c9dd790, and its measured content is still recoverable from that commit
//    and from data/gse-dataset/join-report.json. A dropped row is a silent hole
//    in the run's provenance, which is worse than a wrong one because nothing
//    flags it.
//
// 2. The crosswalk row carried a hand-written time and no utc_source. The real
//    measured time for that work is the generated_at the join report itself
//    stamped when it ran, so that is used rather than an invented clock reading.
import fs from "node:fs";
import { execFileSync } from "node:child_process";

const LOG = "data/reasoning/overnight-loop.jsonl";

const isoOf = (sha) =>
  new Date(execFileSync("git", ["show", "-s", "--format=%aI", sha], { encoding: "utf8" }).trim())
    .toISOString()
    .replace(/\.\d{3}Z$/, "Z");

const joinsUtc = isoOf("34c9dd790");
const joinReport = JSON.parse(fs.readFileSync("data/gse-dataset/join-report.json", "utf8"));
const crosswalkUtc = new Date(joinReport.generated_at).toISOString().replace(/\.\d{3}Z$/, "Z");

const rows = fs.readFileSync(LOG, "utf8").split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l));

// drop the two rows that need rewriting, then reinsert in cycle order
const kept = rows.filter(
  (r) => !(r.slice === "joins" || r.slice === "crosswalk-fix"),
);

const joinsRow = {
  session: "A",
  cycle: 7,
  utc: joinsUtc,
  utc_source: "git author date of 34c9dd790",
  slice: "joins",
  verdict: "PASS",
  measured:
    "BUILT packages/data-ingestion/src/nflverse/joins.ts (pure) + joins.test.ts (26 tests) + join-report.ts driver. Tests 26 passed (26), tsc --noEmit exit 0. Full pass, all 8 seasons. KEY FINDING AT THE TIME: nflverse published two participant id spaces, GSIS for 2023-2025 and a bare numeric id for 2018-2022, and the correlation between id format and join outcome was total: matched 3019631 equalled GSIS-format slots exactly and unmatched 4932894 equalled non-GSIS slots exactly. Per-season rate 0.0000 for 2018-2022 and 1.0000 for 2023-2025. Joins: snaps 205355/135808/0.6613, contracts 35944/35138/0.9776. Two bugs found in my own joiner first: the roster key omitted week so ~18 weekly rows collapsed into one ambiguous key (22941/24850 marked ambiguous, corrected to 1), and consumers still used entries.length>1 which counted an 18-week time series as a conflict (100% of matched rows marked ambiguous). Row restored after it was found missing from this log; its content is unchanged and traceable to 34c9dd790 and data/gse-dataset/join-report.json.",
  commit: "34c9dd790d0a9cc9c7507de0d6edca71520b5850",
  next: "unblock-typecheck",
  blocker: null,
};

const crosswalkRow = {
  session: "A",
  cycle: 13,
  utc: crosswalkUtc,
  utc_source: "generated_at stamped by data/gse-dataset/join-report.json when the enriched join pass ran",
  slice: "crosswalk-fix",
  verdict: "PASS",
  measured:
    "FIXED both blockers rather than only recording them. Source nflverse players.csv (gsis_id, nfl_id, pfr_id, display_name in one table, CC-BY 4.0). FIX A: the 2018-2022 bare numeric participant id is nfl_id, identified not assumed, 401/401 match while gsis_id, esb_id, espn_id, otc_id and smart_id all match 0/401. Resolves 4932894/4932894 slots, 100 percent, zero ambiguous dropped. FIX B: players.csv pfr_id coverage 91.3 percent against the roster's 44-75 percent, recovering 168652 of 180775 blank roster rows with zero conflicts. VALIDATED before use against seasons that never need it: 2023-2025 carry GSIS ids AND a name column, so their in-file names are independent ground truth; 3072 checked, 3018 exact, 50 surname after stripping generational suffixes, 4 real name changes, 99.87 percent agreement. The first validation run showed 95 percent MISMATCH which was a bug in the validator, not the crosswalk: players_on_play is the union of DEFENSE then OFFENSE. RESULT: participation join 0.3797 to 1.000000, 7952525 of 7952525 slots, zero unmatched, all eight seasons at 1.0000. snaps join 0.6613 to 0.9988, unmatched 69547 to 250. contracts unchanged at 0.9776. Non-destructive: players_on_field keeps the published id, players_on_field_gsis is additive and null when any slot fails. data-ingestion 2438 tests, prediction-engine 6131 tests, both tsc exit 0.",
  commit: null,
  next: "unlock-previously-blocked-measurements",
  blocker: null,
};

const all = [...kept, joinsRow, crosswalkRow].sort((a, b) => {
  if (a.cycle !== b.cycle) return a.cycle - b.cycle;
  const order = { joins: 0, "redteam-correction": 1, "crosswalk-fix": 2 };
  return (order[a.slice] ?? 0) - (order[b.slice] ?? 0);
});

fs.writeFileSync(LOG, `${all.map((r) => JSON.stringify(r)).join("\n")}\n`, "utf8");
console.log(`loop log now has ${all.length} rows`);
for (const r of all) {
  console.log(`  cycle ${String(r.cycle).padStart(2)}  ${r.utc}  ${String(r.utc_source ?? "NO-SOURCE").slice(0, 46).padEnd(46)}  ${r.slice}`);
}
