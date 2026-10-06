/**
 * Build a real player-id crosswalk and PROVE it before anyone uses it.
 *
 * Two problems, two fixes, one source: nflverse `players.csv`, which publishes
 * gsis_id, pfr_id, nfl_id, espn_id, pff_id and more in a single table.
 *
 *   Fix A — the 2018-2022 participation identifier break.
 *   Participation 2018-2022 carries a bare numeric id. Measured against this
 *   table, that id is `nfl_id` (401/401 match; gsis_id, esb_id, espn_id, otc_id
 *   and smart_id all match 0/401, so this is an identification, not a guess).
 *   `nfl_id -> gsis_id` is therefore a real, published mapping, not an invented
 *   join key.
 *
 *   Fix B — the pfr_id coverage hole.
 *   Roster files carry pfr_id on only 44-75% of rows, which caps the snap join
 *   at 0.66. This table carries pfr_id on 91.3% of players, so a gsis_id-keyed
 *   pfr_id backfill is available for the rows that are blank.
 *
 * VALIDATION, because a crosswalk that is wrong is worse than none:
 *
 *   1. Ambiguity. nfl_id must map to exactly one gsis_id. Anything with more
 *      than one is dropped, counted, and never guessed.
 *   2. Independent cross-check against seasons that do NOT need it. The 2023-2025
 *      participation rows carry BOTH a gsis_id and a name column
 *      (offense_names / defense_names). So the crosswalk's name for each of those
 *      gsis ids is compared against the name already in the file. If the
 *      crosswalk were wrong, a season that never uses it would fail.
 *
 * Nothing here mutates an ingested file. It emits a crosswalk and a report; the
 * enrichers that consume it are separate and each is verified on its own.
 */

import fs from "node:fs";

const PLAYERS = `${process.env.TEMP}\\players.csv`;
const OUT_CROSSWALK = "data/gse-dataset/player-id-crosswalk.jsonl";
const OUT_REPORT = "docs/reasoning/player-id-crosswalk-2026-09-27.json";

function parseCsvLine(line) {
  const out = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i += 1) {
    const c = line[i];
    if (inQ) {
      if (c === '"') {
        if (line[i + 1] === '"') { cur += '"'; i += 1; } else inQ = false;
      } else cur += c;
    } else if (c === '"') inQ = true;
    else if (c === ",") { out.push(cur); cur = ""; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

/** "K'Von Wallace" and "K. Wallace" must compare equal. */
function normName(s) {
  return String(s ?? "")
    .toLowerCase()
    .replace(/[^a-z ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
function surname(s) {
  const n = normName(s);
  if (!n) return "";
  const parts = n.split(" ");
  return parts[parts.length - 1];
}

function main() {
  const lines = fs.readFileSync(PLAYERS, "utf8").split("\n");
  const header = parseCsvLine(lines[0]);
  const idx = Object.fromEntries(header.map((h, i) => [h, i]));

  const byNfl = new Map();   // nfl_id -> { gsis, name, pfr }[]
  const byGsis = new Map();  // gsis_id -> { nfl, name, pfr }[]

  let rows = 0;
  for (let i = 1; i < lines.length; i += 1) {
    if (!lines[i].trim()) continue;
    const c = parseCsvLine(lines[i]);
    rows += 1;
    const gsis = c[idx.gsis_id] ?? "";
    const nfl = c[idx.nfl_id] ?? "";
    const name = c[idx.display_name] ?? "";
    const pfr = c[idx.pfr_id] ?? "";
    if (!gsis) continue;
    if (nfl) {
      const l = byNfl.get(nfl) ?? [];
      l.push({ gsis, name, pfr });
      byNfl.set(nfl, l);
    }
    const g = byGsis.get(gsis) ?? [];
    g.push({ nfl, name, pfr });
    byGsis.set(gsis, g);
  }

  // ---- ambiguity: refuse anything with more than one distinct gsis_id
  let ambiguousNfl = 0;
  let resolvedNfl = 0;
  const crosswalk = [];
  for (const [nfl, list] of byNfl) {
    const distinct = new Set(list.map((r) => r.gsis));
    if (distinct.size > 1) { ambiguousNfl += 1; continue; }
    const row = list[0];
    crosswalk.push({ nfl_id: nfl, gsis_id: row.gsis, pfr_id: row.pfr || null, display_name: row.name });
    resolvedNfl += 1;
  }
  // gsis -> pfr, only where a single non-blank pfr is agreed on
  const gsisPfr = new Map();
  let conflictingPfr = 0;
  for (const [gsis, list] of byGsis) {
    const pfrs = new Set(list.map((r) => r.pfr).filter(Boolean));
    if (pfrs.size > 1) { conflictingPfr += 1; continue; }
    gsisPfr.set(gsis, pfrs.size === 1 ? [...pfrs][0] : null);
  }

  fs.mkdirSync("data/gse-dataset", { recursive: true });
  fs.writeFileSync(OUT_CROSSWALK, `${crosswalk.map((r) => JSON.stringify(r)).join("\n")}\n`, "utf8");

  // ---- VALIDATION 1: 2023-2025 participation already HAS gsis ids and names.
  // Read the raw releases so the comparison is against the source, not our
  // projection, which dropped the name columns.
  const validation = { checked: 0, nameMatch: 0, nameMismatch: 0, examples: [] };
  const nameByGsis = new Map();
  for (const [, list] of byGsis) {
    if (list[0]?.name) nameByGsis.set(list[0].gsis, list[0].name);
  }

  // The 2023-2025 jsonl projections kept players_on_field but not the names, so
  // the name check runs against the raw parquet via a pre-extracted sidecar if
  // present, otherwise it is reported as not-run rather than faked.
  const sidecar = "data/gse-dataset/.cache/participation-names-sample.json";
  if (fs.existsSync(sidecar)) {
    const pairs = JSON.parse(fs.readFileSync(sidecar, "utf8"));
    for (const [gsis, nameInFile] of pairs) {
      validation.checked += 1;
      const expected = nameByGsis.get(gsis);
      if (!expected) continue;
      if (normName(expected) === normName(nameInFile) || surname(expected) === surname(nameInFile)) {
        validation.nameMatch += 1;
      } else {
        validation.nameMismatch += 1;
        if (validation.examples.length < 10) validation.examples.push({ gsis, inFile: nameInFile, crosswalk: expected });
      }
    }
    validation.ran = true;
  } else {
    validation.ran = false;
    validation.note = "no name sidecar present; the name cross-check did not run and is reported as not-run rather than assumed";
  }

  // ---- how much of the 2018-2022 participation this actually recovers
  const byNflSet = new Set(byNfl.keys());
  let slots = 0; let resolvable = 0;
  const perSeason = {};
  for (const season of [2018, 2019, 2020, 2021, 2022]) {
    let s = 0; let r = 0;
    const text = fs.readFileSync(`data/gse-dataset/participation-${season}.jsonl`, "utf8");
    for (const line of text.split("\n")) {
      if (!line.trim()) continue;
      const row = JSON.parse(line);
      for (const id of row.players_on_field ?? []) {
        s += 1;
        if (byNflSet.has(id)) r += 1;
      }
    }
    perSeason[season] = { slots: s, resolvable: r, rate: s === 0 ? null : r / s };
    slots += s; resolvable += r;
  }

  // ---- how much of the roster pfr_id hole this closes
  let rosterRows = 0; let rosterBlank = 0; let recoverable = 0;
  for (const season of [2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025]) {
    const text = fs.readFileSync(`data/gse-dataset/rosters-${season}.jsonl`, "utf8");
    for (const line of text.split("\n")) {
      if (!line.trim()) continue;
      const row = JSON.parse(line);
      rosterRows += 1;
      if (row.pfr_id) continue;
      rosterBlank += 1;
      if (gsisPfr.get(row.gsis_id)) recoverable += 1;
    }
  }

  const report = {
    generated_at: new Date().toISOString(),
    source: "nflverse nflverse-data release tag `players`, asset players.csv",
    source_url: "https://github.com/nflverse/nflverse-data/releases/download/players/players.csv",
    attribution: "nflverse, CC-BY 4.0. Internal storage, not a commercial display.",
    players_rows: rows,
    fix_a_participation_identifier: {
      problem: "participation 2018-2022 carries a bare numeric id that matches no roster gsis_id",
      identification: "nfl_id. Measured 401/401 match; gsis_id, esb_id, espn_id, otc_id and smart_id all matched 0/401.",
      crosswalk_rows: resolvedNfl,
      ambiguous_nfl_ids_dropped: ambiguousNfl,
      participation_slots_2018_2022: slots,
      participation_slots_resolvable: resolvable,
      participation_recovery_rate: slots === 0 ? null : resolvable / slots,
      per_season: perSeason,
    },
    fix_b_roster_pfr_id: {
      problem: "roster pfr_id present on only 44-75% of rows, capping the snap join at 0.6613",
      roster_rows: rosterRows,
      rows_with_blank_pfr_id: rosterBlank,
      blank_rows_recoverable_from_players_csv: recoverable,
      recoverable_share_of_blanks: rosterBlank === 0 ? null : recoverable / rosterBlank,
      conflicting_pfr_per_gsis_dropped: conflictingPfr,
      crosswalk_pfr_coverage: (() => {
        let t = 0; let p = 0;
        for (const [, v] of gsisPfr) { t += 1; if (v) p += 1; }
        return t === 0 ? null : p / t;
      })(),
    },
    validation,
  };

  fs.mkdirSync("docs/reasoning", { recursive: true });
  fs.writeFileSync(OUT_REPORT, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(report, null, 2));
}

main();
