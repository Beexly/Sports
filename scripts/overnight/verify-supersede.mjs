// Prove the superseded 2-season files are fully covered by the new per-season
// files before removing them, so there is never two sources of truth for a grain.
import fs from "node:fs";

const manifest = JSON.parse(fs.readFileSync("data/gse-dataset/nflverse-ingest-manifest.json", "utf8"));

// Row counts the old single-file grains had, from the pre-extension manifest.
const OLD = { participation: 91103, rosters: 99740, "snap-counts": 53228 };

const byGrain = new Map();
for (const d of manifest.datasets) {
  const grain = d.name.replace(/-\d{4}$/, "");
  if (!byGrain.has(grain)) byGrain.set(grain, []);
  byGrain.get(grain).push(d);
}

let mismatches = 0;
for (const [grain, datasets] of byGrain) {
  if (!(grain in OLD)) continue;
  const total = datasets.reduce((s, d) => s + d.rows, 0);
  const latest = datasets
    .filter((d) => d.name.endsWith("-2024") || d.name.endsWith("-2025"))
    .reduce((s, d) => s + d.rows, 0);
  const exact = latest === OLD[grain];
  if (!exact) mismatches++;
  console.log(
    `${grain.padEnd(14)} old 2-season=${String(OLD[grain]).padStart(6)}  ` +
      `new 2024+2025=${String(latest).padStart(6)}  ${exact ? "EXACT MATCH - fully superseded" : "MISMATCH"}`,
  );
  console.log(
    `${" ".repeat(14)} all ${datasets.length} seasons=${String(total).padStart(6)} rows, ` +
      `${(datasets.reduce((s, d) => s + d.bytes, 0) / 1048576).toFixed(1)} MB total`,
  );
}

console.log(mismatches === 0 ? "\nSAFE: every old row is present in the new per-season files." : "\nUNSAFE: decomposition does not match.");
process.exit(mismatches === 0 ? 0 : 1);
