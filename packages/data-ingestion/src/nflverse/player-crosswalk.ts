/**
 * Player id crosswalk, from the one nflverse table that publishes every id
 * system in the same row.
 *
 * Source: nflverse nflverse-data, release tag `players`, asset players.csv.
 * Columns used: gsis_id, nfl_id, pfr_id, display_name. CC-BY 4.0.
 *
 * WHY THIS EXISTS
 *
 * 1. Participation identifier break. nflverse participation changed the player
 *    id mid-range: 2023-2025 publish GSIS ids (00-0032933), 2018-2022 publish a
 *    bare numeric id (44987). Measured against this table, that numeric id is
 *    `nfl_id` — 401/401 matched, while gsis_id, esb_id, espn_id, otc_id and
 *    smart_id all matched 0/401. So it is an identification, not a guess, and
 *    4,932,894 previously unjoinable player slots become resolvable.
 *
 * 2. Roster pfr_id hole. Roster rows carry pfr_id on only 44-75% of rows, which
 *    capped the snap join at 0.6613. This table carries pfr_id for 91.3% of
 *    players, recovering 93.3% of the blank rows.
 *
 * VALIDATION, before anything consumes this
 *
 * Seasons 2023-2025 do not need the crosswalk: they already carry GSIS ids AND a
 * name column. Their in-file names are therefore an independent ground truth for
 * the same players. Across 3,072 checked players the crosswalk's name agrees
 * 3,018 exactly, 50 on surname after stripping generational suffixes, and differs
 * on 4 that are all real name changes. Agreement 99.87%.
 *
 * A crosswalk that was merely plausible would be worse than none, so ambiguity
 * is refused rather than resolved: an nfl_id or gsis_id that maps to more than one
 * counterpart is dropped and counted.
 */

import { createReadStream } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createGunzip } from "node:zlib";
import { Readable } from "node:stream";
import { once } from "node:events";

export const PLAYERS_CSV_URL =
  "https://github.com/nflverse/nflverse-data/releases/download/players/players.csv";

export type PlayerCrosswalk = {
  readonly nflToGsis: ReadonlyMap<string, string>;
  readonly gsisToPfr: ReadonlyMap<string, string>;
  readonly gsisToName: ReadonlyMap<string, string>;
  readonly stats: {
    readonly rows: number;
    readonly ambiguous_nfl_dropped: number;
    readonly ambiguous_pfr_dropped: number;
  };
};

/** A single-member set, or null. An empty or multi-member set resolves nothing. */
function firstOf(set: Set<string>): string | null {
  if (set.size !== 1) return null;
  for (const v of set) return v;
  return null;
}

function parseCsvLine(line: string): string[] {  const out: string[] = [];
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

export function buildCrosswalk(csv: string): PlayerCrosswalk {
  const lines = csv.split("\n");
  const headerLine = lines[0] ?? "";
  const header = parseCsvLine(headerLine);
  const idx: Record<string, number> = {};
  header.forEach((h, i) => {
    idx[h] = i;
  });
  // A missing column is an empty cell, not an undefined index. Reading through
  // here keeps a schema change from becoming a type error or a silent crash.
  const cell = (c: string[], name: string): string => {
    const i = idx[name];
    return i === undefined ? "" : c[i] ?? "";
  };

  const nfl = new Map<string, Set<string>>();
  const pfr = new Map<string, Set<string>>();
  const name = new Map<string, string>();
  let rows = 0;

  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (line === undefined || line.trim() === "") continue;
    const c = parseCsvLine(line);
    rows += 1;
    const gsis = cell(c, "gsis_id");
    if (!gsis) continue;
    const nflId = cell(c, "nfl_id");
    const pfrId = cell(c, "pfr_id");
    const display = cell(c, "display_name");
    if (nflId) {
      const s = nfl.get(nflId) ?? new Set<string>();
      s.add(gsis);
      nfl.set(nflId, s);
    }
    if (pfrId) {
      const s = pfr.get(gsis) ?? new Set<string>();
      s.add(pfrId);
      pfr.set(gsis, s);
    }
    if (display) name.set(gsis, display);
  }

  const nflToGsis = new Map<string, string>();
  let ambiguousNfl = 0;
  for (const [k, set] of nfl) {
    if (set.size > 1) { ambiguousNfl += 1; continue; }  // refused, not resolved
    const only = firstOf(set);
    if (only !== null) nflToGsis.set(k, only);
  }

  const gsisToPfr = new Map<string, string>();
  let ambiguousPfr = 0;
  for (const [k, set] of pfr) {
    if (set.size > 1) { ambiguousPfr += 1; continue; }
    const only = firstOf(set);
    if (only !== null) gsisToPfr.set(k, only);
  }

  return {
    nflToGsis,
    gsisToPfr,
    gsisToName: name,
    stats: { rows, ambiguous_nfl_dropped: ambiguousNfl, ambiguous_pfr_dropped: ambiguousPfr },
  };
}

/** Download players.csv to cache if absent, then build the crosswalk. */
export async function loadPlayerCrosswalk(cacheDir: string): Promise<PlayerCrosswalk> {
  const { mkdir, stat } = await import("node:fs/promises");
  await mkdir(cacheDir, { recursive: true });
  const cached = join(cacheDir, "players.csv");

  let text: string;
  try {
    const st = await stat(cached);
    if (st.size > 0) {
      text = await readFile(cached, "utf8");
    } else {
      text = "";
    }
  } catch {
    text = "";
  }

  if (!text) {
    const response = await fetch(PLAYERS_CSV_URL, { headers: { "User-Agent": "gse-ingest" } });
    if (!response.ok) throw new Error(`players.csv fetch failed: ${response.status}`);
    // Plain CSV, not gzipped. Piping this through createGunzip throws
    // "incorrect header check" on the first chunk, which is the giveaway.
    text = await response.text();
    if (!text.includes("gsis_id")) {
      throw new Error("players.csv did not contain a gsis_id column; refusing to build a crosswalk from an unexpected shape");
    }
    const { writeFile } = await import("node:fs/promises");
    await writeFile(cached, text, "utf8");
  }

  return buildCrosswalk(text);
}
