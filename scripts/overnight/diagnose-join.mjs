// Diagnostic: WHY do participation players fail to join the roster?
// Distinguishes a season-key bug from genuinely absent ids.
import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { join } from "node:path";

const DATA = "data/gse-dataset";
const SEASONS = [2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025];

async function* jsonl(path) {
  const rl = createInterface({ input: createReadStream(path, { encoding: "utf8" }), crlfDelay: Infinity });
  for await (const line of rl) if (line.trim()) yield JSON.parse(line);
}

const seasonOf = (g) => {
  const h = String(g).split("_")[0];
  return /^\d{4}$/.test(h) ? Number(h) : null;
};

// 1. pfr_id availability by season
console.log("=== roster pfr_id coverage by season ===");
const bySeasonAll = new Map();   // gsis -> Set(season)
for (const s of SEASONS) {
  let rows = 0, withPfr = 0, withGsis = 0, withFullName = 0;
  for await (const r of jsonl(join(DATA, `rosters-${s}.jsonl`))) {
    rows++;
    if (r.pfr_id != null) withPfr++;
    if (r.gsis_id != null) withGsis++;
    if (r.full_name != null) withFullName++;
    if (!bySeasonAll.has(r.gsis_id)) bySeasonAll.set(r.gsis_id, new Set());
    bySeasonAll.get(r.gsis_id).add(r.season);
  }
  console.log(
    `${s}  rows=${String(rows).padStart(6)}  pfr_id=${String(withPfr).padStart(6)} ` +
      `(${((withPfr / rows) * 100).toFixed(1)}%)  gsis=${String(withGsis).padStart(6)}  name=${String(withFullName).padStart(6)}`,
  );
}
console.log(`distinct gsis ids across all seasons: ${bySeasonAll.size}`);

// 2. For unmatched participation ids: do they exist in ANY season?
console.log("\n=== participation join failure breakdown (per season) ===");
for (const s of SEASONS) {
  let slots = 0, ok = 0, missingEverywhere = 0, wrongSeason = 0;
  const examplesMissing = [];
  const examplesWrongSeason = [];
  for await (const p of jsonl(join(DATA, `participation-${s}.jsonl`))) {
    if (!Array.isArray(p.players_on_field)) continue;
    const ps = seasonOf(p.nflverse_game_id) ?? s;
    for (const id of p.players_on_field) {
      slots++;
      const seasons = bySeasonAll.get(id);
      if (!seasons) {
        missingEverywhere++;
        if (examplesMissing.length < 3) examplesMissing.push(id);
      } else if (!seasons.has(ps)) {
        wrongSeason++;
        if (examplesWrongSeason.length < 3) examplesWrongSeason.push(`${id} in[${[...seasons].sort().join(",")}]`);
      } else ok++;
    }
  }
  console.log(
    `${s}  slots=${String(slots).padStart(7)}  matched=${String(ok).padStart(7)}  ` +
      `wrongSeason=${String(wrongSeason).padStart(7)}  absentFromRosterEntirely=${String(missingEverywhere).padStart(7)}`,
  );
  if (examplesMissing.length) console.log(`        absent e.g. ${examplesMissing.join(" ")}`);
  if (examplesWrongSeason.length) console.log(`        wrong-season e.g. ${examplesWrongSeason.join("  ")}`);
}
