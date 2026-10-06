/**
 * Which players.csv column is the numeric id that nflverse participation
 * 2018-2022 actually uses?
 *
 * The crosswalk is buildable if some column matches. This measures each candidate
 * column against a real sample of participation ids instead of assuming one.
 */
import fs from "node:fs";
import readline from "node:readline";

function parseCsvLine(line) {
  const out = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i += 1) {
    const c = line[i];
    if (inQ) {
      if (c === '"') {
        if (line[i + 1] === '"') { cur += '"'; i += 1; }
        else inQ = false;
      } else cur += c;
    } else if (c === '"') inQ = true;
    else if (c === ",") { out.push(cur); cur = ""; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

async function main() {
  // --- a sample of participation ids from 2018
  const sample = new Set();
  const rl = readline.createInterface({
    input: fs.createReadStream("data/gse-dataset/participation-2018.jsonl", { encoding: "utf8" }),
    crlfDelay: Infinity,
  });
  for await (const line of rl) {
    if (!line.trim()) continue;
    const row = JSON.parse(line);
    for (const id of row.players_on_field ?? []) { sample.add(id); if (sample.size > 400) break; }
    if (sample.size > 400) break;
  }
  rl.close();
  console.log(`sample of ${sample.size} participation ids from 2018`);
  console.log(`examples: ${[...sample].slice(0, 8).join(", ")}\n`);

  // --- players.csv
  const text = fs.readFileSync(process.env.TEMP + "\\players.csv", "utf8");
  const lines = text.split("\n");
  const header = parseCsvLine(lines[0]);
  const idx = Object.fromEntries(header.map((h, i) => [h, i]));

  const candidates = ["gsis_id", "esb_id", "nfl_id", "espn_id", "pff_id", "otc_id", "smart_id"];
  const present = candidates.filter((c) => idx[c] !== undefined);
  console.log(`candidate id columns present: ${present.join(", ")}\n`);

  const sets = Object.fromEntries(present.map((c) => [c, new Set()]));
  for (let i = 1; i < lines.length; i += 1) {
    if (!lines[i].trim()) continue;
    const cells = parseCsvLine(lines[i]);
    for (const c of present) {
      const v = cells[idx[c]];
      if (v) sets[c].add(v);
    }
  }

  for (const c of present) {
    let hit = 0;
    for (const id of sample) if (sets[c].has(id)) hit += 1;
    console.log(
      `${c.padEnd(10)} distinct=${String(sets[c].size).padStart(7)}  ` +
        `matches ${hit}/${sample.size} participation ids (${((hit / sample.size) * 100).toFixed(1)}%)`,
    );
  }

  // pfr_id coverage is a separate prize: the roster files are only 44-75% filled.
  const pfrIdx = idx.pfr_id;
  let withPfr = 0; let total = 0;
  for (let i = 1; i < lines.length; i += 1) {
    if (!lines[i].trim()) continue;
    const cells = parseCsvLine(lines[i]);
    if (cells[idx.gsis_id]) { total += 1; if (cells[pfrIdx]) withPfr += 1; }
  }
  console.log(`\nplayers.csv pfr_id coverage: ${withPfr}/${total} (${((withPfr / total) * 100).toFixed(1)}%)`);
  console.log(`roster pfr_id coverage for reference: 44-75% by season, 180775/404653 rows blank.`);
}

main().catch((e) => { process.stderr.write(String(e?.stack ?? e) + "\n"); process.exitCode = 1; });
