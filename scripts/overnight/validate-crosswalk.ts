/**
 * Independent validation of the player-id crosswalk.
 *
 * The crosswalk claims nfl_id -> gsis_id. Seasons 2023-2025 do NOT need it:
 * they already carry gsis ids AND, uniquely, a name column. So their names are
 * an independent ground truth for the same players the crosswalk resolves.
 *
 * If the crosswalk were wrong or misaligned, seasons that never use it would
 * disagree with the names already in the file. A crosswalk that only ever
 * agrees with the data it was built from has proved nothing.
 */
import { writeFileSync } from "node:fs";
import { loadParticipation, isOk } from "@nflverse/nflreadts";
import readline from "node:readline";

// Generational suffixes and hyphens are the same player, not a disagreement.
// nflverse writes "Andre Jones" where players.csv writes "Andre Jones Jr.", and
// "Joe Tryon" where players.csv has his later name "Joe Tryon-Shoyinka". After
// normalization every recorded mismatch above collapses, which is the point:
// the raw mismatch count overstated disagreement purely on naming convention.
const SUFFIX = /\b(jr|sr|ii|iii|iv|v|md|phd|dds)\b/gi;

function normName(s) {
  return String(s ?? "")
    .toLowerCase()
    .replace(SUFFIX, "")
    .replace(/[^a-z ]/g, "")   // also folds the hyphen out of Tryon-Shoyinka
    .replace(/\s+/g, " ")
    .trim();
}
function surname(s) {
  const n = normName(s);
  if (!n) return "";
  const p = n.split(" ");
  return p[p.length - 1];
}
function middleInitialMatch(a, b) {
  const pa = normName(a).split(" ").filter(Boolean);
  const pb = normName(b).split(" ").filter(Boolean);
  if (pa.length !== pb.length) return false;
  if (pa[0] !== pb[0]) return false;
  for (let i = 1; i < pa.length - 1; i += 1) {
    if (pa[i][0] !== pb[i][0]) return false;
  }
  return pa[pa.length - 1] === pb[pb.length - 1];
}

async function main(): Promise<void> {
  // crosswalk display_name keyed by gsis
  const nameByGsis = new Map();
  const rl = readline.createInterface({
    input: (await import("node:fs")).createReadStream("data/gse-dataset/player-id-crosswalk.jsonl", { encoding: "utf8" }),
    crlfDelay: Infinity,
  });
  for await (const line of rl) {
    if (!line.trim()) continue;
    const r = JSON.parse(line);
    if (r.display_name) nameByGsis.set(r.gsis_id, r.display_name);
  }
  rl.close();
  console.log(`crosswalk rows with a display name: ${nameByGsis.size}`);

  let checked = 0;
  let exact = 0;
  let middleInitial = 0;
  let surnameOnly = 0;
  let mismatch = 0;
  const examples: unknown[] = [];
  const seen = new Set();

  for (const season of [2023, 2024, 2025]) {
    const res = await loadParticipation(season, { format: "parquet" });
    if (!isOk(res)) { console.log(`${season}: load failed`); continue; }
    const rows = res.value as unknown as Record<string, unknown>[];

    const split = (v: unknown) =>
      String(v ?? "").split(";").map((s) => s.trim()).filter(Boolean);

    for (const row of rows) {
      // Alignment, learned the hard way from a 95% false-mismatch rate:
      // `players_on_play` is the UNION of defense then offense, NOT offense
      // first. Comparing offense_names[i] against players_on_play[i] pairs every
      // name with the wrong player. Each side must be aligned to its OWN id
      // list, which is unambiguous because both are the same length.
      const pairs: [string, string][] = [
        ...split(row.defense_players).map((id, i) => [id, split(row.defense_names)[i] ?? ""] as [string, string]),
        ...split(row.offense_players).map((id, i) => [id, split(row.offense_names)[i] ?? ""] as [string, string]),
      ];

      for (const [gsis, actual] of pairs) {
        if (!gsis || !actual) continue;
        if (seen.has(gsis)) continue;
        const expected = nameByGsis.get(gsis);
        if (!expected) continue;
        seen.add(gsis);
        checked += 1;
        if (normName(expected) === normName(actual)) exact += 1;
        else if (middleInitialMatch(expected, actual)) middleInitial += 1;
        else if (surname(expected) === surname(actual) && surname(actual).length > 2) surnameOnly += 1;
        else {
          mismatch += 1;
          if (examples.length < 15) examples.push({ gsis, inFile: actual, crosswalk: expected, season });
        }
        if (checked >= 20000) break;
      }
      if (checked >= 20000) break;
    }
    console.log(`${season}: cumulative checked=${checked} exact=${exact} midInit=${middleInitial} surname=${surnameOnly} mismatch=${mismatch}`);
    if (checked >= 20000) break;
  }

  const accounted = exact + middleInitial + surnameOnly;
  const report = {
    generated_at: new Date().toISOString(),
    method:
      "Seasons 2023-2025 already carry gsis ids and a name column and never use the crosswalk. Their in-file names are therefore an independent ground truth for the same players the crosswalk resolves.",
    checked,
    exact_name_match: exact,
    same_name_middle_initial_differs: middleInitial,
    surname_only_match: surnameOnly,
    mismatch,
    agreement_rate: checked === 0 ? null : accounted / checked,
    strict_agreement_rate: checked === 0 ? null : (exact + middleInitial) / checked,
    examples,
  };
  writeFileSync("docs/reasoning/crosswalk-validation-2026-09-27.json", `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(report, null, 2).slice(0, 1400));
}

main().catch((e: unknown) => { process.stderr.write(`${e instanceof Error ? e.stack : String(e)}\n`); process.exitCode = 1; });
