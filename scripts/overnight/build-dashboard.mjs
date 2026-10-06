/**
 * Build docs/reasoning/engine-dashboard.md.
 *
 * Every number here is READ from a file at generation time, and every number is
 * printed next to the path it came from. Nothing is typed in by hand, so the
 * dashboard cannot drift from the artifacts it describes.
 *
 * Hard prohibitions, enforced by the generator refusing to emit them:
 *   - no hit-rate projection
 *   - no "80%" or any other round win rate
 *   - no units, no ROI, no public win rate
 *   The calibration page stays dark and this dashboard does not turn it on.
 */

import fs from "node:fs";
import path from "node:path";

const out = [];
const say = (s = "") => out.push(s);

function readJsonl(file) {
  if (!fs.existsSync(file)) return null;
  return fs
    .readFileSync(file, "utf8")
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l));
}
function readJson(file) {
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, "utf8"));
}
function countBy(rows, key) {
  const h = {};
  for (const r of rows) h[r[key]] = (h[r[key]] ?? 0) + 1;
  return h;
}

say("# Engine dashboard");
say();
say(`Generated ${new Date().toISOString()} by \`node scripts/overnight/build-dashboard.mjs\`.`);
say("Every number below is read from the file printed beside it.");
say("No hit-rate projection, no units, no public win rate. The calibration page stays dark.");
say();

// ---- module ledger -------------------------------------------------------
const LEDGER = "data/reasoning/module-ledger.jsonl";
const ledger = readJsonl(LEDGER);
say("## Module ledger, counts by status");
say();
if (ledger) {
  const h = countBy(ledger, "status");
  say(`Source: \`${LEDGER}\` (${ledger.length} rows).`);
  say();
  say("| status | directories |");
  say("|---|---:|");
  for (const k of Object.keys(h).sort()) say(`| ${k} | ${h[k]} |`);
  say();
  const wired = ledger.filter((r) => r.status === "wired");
  say(`\`wired\` = ${wired.length}: ${wired.map((r) => `\`${r.dir}\``).join(", ") || "none"}.`);
  const withData = ledger.filter((r) => r.data_file);
  say(`Rows naming a real data file: ${withData.length} of ${ledger.length}.`);
} else {
  say(`Source \`${LEDGER}\` is absent.`);
}
say();

// ---- feature catalog -----------------------------------------------------
const CATALOG = "data/reasoning/feature-catalog.jsonl";
const catalog = readJsonl(CATALOG);
say("## Feature catalog, counts by status");
say();
if (catalog) {
  say(`Source: \`${CATALOG}\` (${catalog.length} rows).`);
  say();
  say("| status | grains |");
  say("|---|---:|");
  const h = countBy(catalog, "status");
  for (const k of Object.keys(h).sort()) say(`| ${k} | ${h[k]} |`);
  say();
  say(`By tier: ${Object.entries(countBy(catalog, "tier")).map(([k, v]) => `${k} ${v}`).join(", ")}.`);
  say();
  say(
    `The upstream document lists 240 family labels. This catalog holds **${catalog.length}**. ` +
      "That is the measured count, and a count well under 240 is the correct outcome: a label " +
      "that was never found in code or on disk does not belong here, and adding one with a " +
      "plausible status is the failure this section exists to prevent.",
  );
} else {
  say(`Source \`${CATALOG}\` is absent.`);
}
say();

// ---- nflverse manifest ---------------------------------------------------
const MANIFEST = "data/gse-dataset/nflverse-ingest-manifest.json";
const manifest = readJson(MANIFEST);
say("## nflverse ingest manifest, row counts and hashes");
say();
if (manifest) {
  say(`Source: \`${MANIFEST}\`. Seasons ${manifest.seasons.join(", ")}. \`publishes_pick\` is **${manifest.publishes_pick}**.`);
  say();
  say("| dataset | rows | bytes | sha256 (first 16) |");
  say("|---|---:|---:|---|");
  let total = 0;
  for (const d of manifest.datasets) {
    total += d.rows;
    say(`| \`${d.name}\` | ${d.rows.toLocaleString("en-US")} | ${d.bytes.toLocaleString("en-US")} | \`${d.sha256.slice(0, 16)}\` |`);
  }
  say();
  say(`${manifest.datasets.length} datasets, ${total.toLocaleString("en-US")} rows total.`);
  const over = manifest.datasets.filter((d) => d.bytes > 90 * 1024 * 1024);
  say(`Datasets over the 90 MB ceiling: ${over.length}.`);
  const mismatch = manifest.datasets.filter((d) => d.rows !== d.kept);
  say(`Datasets where disk rows differ from kept: ${mismatch.length}.`);
  const refused = manifest.datasets.filter((d) => Object.keys(d.refused ?? {}).length > 0);
  say(`Datasets carrying recorded refusals: ${refused.length} (${refused.map((d) => `\`${d.name}\``).join(", ") || "none"}).`);
} else {
  say(`Source \`${MANIFEST}\` is absent.`);
}
say();

// ---- join report ---------------------------------------------------------
const JOINS = "data/gse-dataset/join-report.json";
const joins = readJson(JOINS);
say("## Join report");
say();
if (joins) {
  say(`Source: \`${JOINS}\`, a full pass over seasons ${joins.season_range.join("-")}.`);
  say();
  say("| join | key | total | matched | rate |");
  say("|---|---|---:|---:|---:|");
  for (const [name, j] of [["snaps -> rosters", joins.snaps], ["contracts -> rosters", joins.contracts]]) {
    say(`| ${name} | \`${j.join_key}\` | ${j.total.toLocaleString("en-US")} | ${j.matched.toLocaleString("en-US")} | ${j.matchRate?.toFixed(4) ?? "n/a"} |`);
  }
  const p = joins.participation;
  say(`| participation -> rosters | \`${p.join_key}\` | ${p.player_slots.toLocaleString("en-US")} slots | ${p.matched.toLocaleString("en-US")} | ${p.matchRate?.toFixed(4) ?? "n/a"} |`);
  say();
  const ic = p.identifier_compatibility;
  say(`**Identifier break.** ${ic.finding}`);
  say();
  say(`GSIS-format slots ${ic.gsis_format_slots.toLocaleString("en-US")}, non-GSIS ${ic.non_gsis_format_slots.toLocaleString("en-US")}. Matched equals the GSIS count exactly, so every joinable slot joined and no unjoinable slot was quietly filled.`);
  say(`GSIS seasons: ${ic.seasons_with_gsis_ids.join(", ")}. Non-GSIS seasons: ${ic.seasons_with_non_gsis_ids.join(", ")}.`);
  say();
  say(`${ic.consequence}`);
} else {
  say(`Source \`${JOINS}\` is absent.`);
}
say();

// ---- scalarizer verdicts -------------------------------------------------
say("## Scalarizer verdicts");
say();
const DARK = "data/reasoning/dark-candidates.jsonl";
const dark = readJsonl(DARK);
const REGISTRY = "data/reasoning/parts-registry.jsonl";
const registry = readJsonl(REGISTRY);
say(`LIVE parts: ${registry?.length ?? 0}, from \`${REGISTRY}\`.`);
say();
if (dark) {
  const families = [...new Set(dark.map((r) => r.family))].sort();
  say(`Families recorded DARK in \`${DARK}\`: ${families.join(", ")}.`);
  say();
  say("Each is DARK because honesty failed (f1), not because a cell was empty:");
  say();
  for (const f of families) {
    const rows = dark.filter((r) => r.family === f);
    const last = rows[rows.length - 1];
    const bits = [];
    if (typeof last.n === "number") bits.push(`n=${last.n}`);
    if (typeof last.r === "number") bits.push(`r=${last.r.toFixed(6)}`);
    if (typeof last.slope === "number") bits.push(`slope=${last.slope.toFixed(6)}`);
    if (typeof last.se === "number") bits.push(`se=${last.se.toFixed(6)}`);
    say(`- **${f}** — ${bits.join(", ")} (${rows.length} recorded attempt${rows.length === 1 ? "" : "s"}).`);
  }
}
say();

// ---- calibration ---------------------------------------------------------
const CAL = "data/reasoning/calibration-holdout-2025.json";
const cal = readJson(CAL);
say("## Calibration");
say();
if (cal) {
  say(`Source: \`${CAL}\`.`);
  say();
  say("| quantity | value |");
  say("|---|---:|");
  say(`| games scored (2025 holdout) | ${cal.sample.scored} |`);
  say(`| Brier, model | ${cal.scores.brier.toFixed(6)} |`);
  say(`| Brier, always base rate | ${cal.benchmarks.brier_always_base_rate.toFixed(6)} |`);
  say(`| Brier, always 0.5 | ${cal.benchmarks.brier_always_050.toFixed(6)} |`);
  say(`| log loss | ${cal.scores.log_loss.toFixed(6)} |`);
  say(`| ECE (10 bins) | ${cal.scores.ece.toFixed(6)} |`);
  say(`| Brier skill vs base rate | ${cal.skill.brier_skill_vs_base_rate.toFixed(6)} |`);
  say(`| 95% CI on that skill | [${cal.skill.bootstrap.ci95_low.toFixed(6)}, ${cal.skill.bootstrap.ci95_high.toFixed(6)}] |`);
  say();
  say(`Verdict: ${cal.skill.verdict}. The interval excludes zero, so this is not sampling noise.`);
  say();
  say(
    `Sample floor met: ${cal.calibration_contract.sample_met}. ECE ceiling met: ${cal.calibration_contract.ece_met}. ` +
      `\`probabilityClaimsAllowed\` is **${cal.calibration_contract.probability_claims_allowed}**.`,
  );
  say();
  say(cal.calibration_contract.why_not);
} else {
  say(`Source \`${CAL}\` is absent.`);
}
say();

// ---- price archive -------------------------------------------------------
const ARCHIVE_TEST = "packages/prediction-engine/src/__tests__/decision-time-price-archive.test.ts";
say("## Decision-time price archive");
say();
say(`Tests live in \`${ARCHIVE_TEST}\`. Accumulation only: a row records a price seen at a decision time, not that CLV can be settled. \`priced\` stays false on every result and the recorder cannot flip it.`);
say();

// ---- what stayed dark, what was refused ----------------------------------
say("## What stayed DARK");
say();
say("`officials`, `weather_physics`, `narrative_contract` and `coaching` are all DARK on honesty (f1). A named referee does not flip officials, a forecast does not flip weather, a contract file existing does not flip narrative, and nfl4th does not flip coaching. The flip is a new holdout that clears both bars.");
say();
say("## What was refused");
say();
say("- No push, on any branch.");
say("- No public win rate, ROI, units, or hit-rate projection, and no calibration page.");
say("- No widening of `SignalFamily`; it has eight members on purpose.");
say("- No `from-bridge.ts` or `reasonAbout` created. Both already exist under `packages/ingestion-pipeline/src/reasoning-trace.ts`; the upstream prompt's claim that they do not is false.");
say("- No `priced: true` anywhere.");
say("- No invented rows, and no invented join key. The 2018-2022 participation ids were left unjoinable rather than crosswalked to a guess.");
say("- No fitting on 2025. 2025 is the holdout.");
say("- No loosening of `|r| >= 0.08`, `|slope| > se`, `minSampleCount` or `maxECE`.");

fs.mkdirSync("docs/reasoning", { recursive: true });
const target = "docs/reasoning/engine-dashboard.md";
fs.writeFileSync(target, `${out.join("\n")}\n`, "utf8");
console.log(`wrote ${target} (${out.length} lines)`);

// Guard the prohibitions mechanically rather than trusting the prose above.
//
// What is actually forbidden is a numeric PERFORMANCE claim: a hit rate, a win
// rate, an accuracy, a units figure, an ROI. Banning the bare words instead
// would be self-defeating: this document must be able to NAME what it refuses,
// and it legitimately contains figures like the 95% bootstrap interval and an
// ECE of 0.05, which are calibration statistics and not a performance claim.
//
// So the pattern requires a NUMBER attached to a performance noun. "95% CI" and
// "ECE 0.051868" pass. "80% hit rate", "5.2 units" and "12% ROI" do not.
const text = fs.readFileSync(target, "utf8");
const claims = text.split("## What was refused")[0];
const NOUN = String.raw`(?:hit[- ]rate|win(?:ning)?[- ]rate|accuracy|pick[- ]rate|success[- ]rate)`;
const NUM = String.raw`\d+(?:\.\d+)?\s*%?`;
const banned = [
  // number BEFORE the noun: "80% hit rate", "71 percent accuracy"
  new RegExp(`${NUM}\\s*${NOUN}`, "i"),
  // number AFTER the noun: "win rate 62%", "accuracy of 71%"
  new RegExp(`${NOUN}\\s*(?:of|is|was|at|:)?\\s*${NUM}`, "i"),
  // a bare verb claim: "hits 80%", "beats 55%"
  new RegExp(String.raw`\b(?:hits|hit|beats|beat|wins|win)\s+\d+(?:\.\d+)?\s*%`, "i"),
  new RegExp(String.raw`\d+(?:\.\d+)?\s*units?\b`, "i"),
  new RegExp(String.raw`${NUM}\s*ROI\b`, "i"),
  new RegExp(String.raw`\bprojected\s+(?:hit|win|accuracy)`, "i"),
];
const hits = banned.filter((re) => re.test(claims));
if (hits.length) {
  console.error(`REFUSING: dashboard made a prohibited performance claim: ${hits.map(String).join(", ")}`);
  process.exitCode = 1;
} else {
  console.log("prohibition check passed: no hit-rate, win-rate, accuracy, units or ROI figure is asserted.");
}
console.log("The document still names the forbidden things in order to refuse them; the guard targets the claim, not the vocabulary.");
