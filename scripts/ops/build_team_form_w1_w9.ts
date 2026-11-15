#!/usr/bin/env node
/**
 * Rebuild the team-form artefact from nflverse play-by-play.
 *
 *   node --import tsx scripts/ops/build_team_form_w1_w9.ts \
 *     --pbp data/nflverse/pbp_2026_slim_clean_checkout.csv.gz \
 *     --out data/engine/nfl_2026_w1_w9_trends_and_usage.json
 *
 * The existing artefact (nfl_2026_w1_w7_trends_and_usage.json) covers Weeks 1–7
 * and is what the slate pipeline reads. This script rebuilds the same shape from
 * the play-by-play so the coverage is measured rather than asserted.
 *
 * HONEST COVERAGE: the script reports the weeks it actually found. It does not
 * claim Weeks 1–9 because the file is named that. If Week 9 is absent from the
 * play-by-play, `weeks_covered` says so and the loader downstream reports the
 * real range.
 *
 * Field names are the ones the loaders read: off_epa_per_play, def_epa_per_play,
 * off_pass_epa, off_rush_epa, sack_rate_allowed_pct. The four dead keys
 * (sack_rate_allowed, epa_per_play, def_pressure_rate, def_epa_allowed) are
 * never written.
 */

import { createReadStream, writeFileSync, mkdirSync } from "node:fs";
import { createGunzip } from "node:zlib";
import { createInterface } from "node:readline";
import { dirname, resolve } from "node:path";
import { tryCanonicalTeamCode } from "@sports/prediction-engine/src/evidence/team-codes.js";

interface Args {
  pbp: string;
  out: string;
}

function parseArgs(argv: readonly string[]): Args {
  let pbp = "data/nflverse/pbp_2026_slim_clean_checkout.csv.gz";
  let out = "data/engine/nfl_2026_w1_w9_trends_and_usage.json";
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    const next = argv[i + 1];
    if (a === "--pbp" && next !== undefined) {
      pbp = next;
      i += 1;
    } else if (a === "--out" && next !== undefined) {
      out = next;
      i += 1;
    }
  }
  return { pbp, out };
}

interface TeamAccumulator {
  games: Set<string>;
  offPlays: number;
  offEpa: number;
  offPassPlays: number;
  offPassEpa: number;
  offRushPlays: number;
  offRushEpa: number;
  dropbacks: number;
  sacksAllowed: number;
  defPlays: number;
  defEpa: number;
}

function blank(): TeamAccumulator {
  return {
    games: new Set<string>(),
    offPlays: 0,
    offEpa: 0,
    offPassPlays: 0,
    offPassEpa: 0,
    offRushPlays: 0,
    offRushEpa: 0,
    dropbacks: 0,
    sacksAllowed: 0,
    defPlays: 0,
    defEpa: 0,
  };
}

function num(v: string | undefined): number | null {
  if (v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

async function main(): Promise<number> {
  const args = parseArgs(process.argv.slice(2));
  const pbpPath = resolve(process.cwd(), args.pbp);

  const stream = createReadStream(pbpPath).pipe(createGunzip());
  const rl = createInterface({ input: stream, crlfDelay: Infinity });

  let header: string[] | null = null;
  const idx: Record<string, number> = {};
  const teams = new Map<string, TeamAccumulator>();
  const weeks = new Set<number>();
  const games = new Set<string>();
  let rows = 0;

  for await (const line of rl) {
    if (header === null) {
      header = line.split(",");
      header.forEach((h, i) => {
        idx[h.trim()] = i;
      });
      continue;
    }
    if (line.length === 0) continue;
    const cols = line.split(",");
    rows += 1;

    const gameId = cols[idx.game_id ?? -1];
    if (gameId === undefined) continue;
    const parts = gameId.split("_");
    const weekRaw = parts[1];
    if (weekRaw !== undefined) {
      const w = Number.parseInt(weekRaw, 10);
      if (Number.isFinite(w)) weeks.add(w);
    }
    games.add(gameId);

    const posteamRaw = cols[idx.posteam ?? -1];
    const defteamRaw = cols[idx.defteam ?? -1];
    // nflverse writes WAS; the contract uses WSH. Canonicalise on the way in so
    // the artefact is keyed the same way every loader reads it.
    const posteam = posteamRaw === undefined ? undefined : tryCanonicalTeamCode(posteamRaw) ?? undefined;
    const defteam = defteamRaw === undefined ? undefined : tryCanonicalTeamCode(defteamRaw) ?? undefined;
    const epa = num(cols[idx.epa ?? -1]);
    const playType = cols[idx.play_type ?? -1] ?? "";
    const sack = num(cols[idx.sack ?? -1]) ?? 0;

    if (epa === null) continue;

    if (posteam !== undefined && posteam.length > 0) {
      const acc = teams.get(posteam) ?? blank();
      acc.games.add(gameId);
      acc.offPlays += 1;
      acc.offEpa += epa;
      if (playType === "pass") {
        acc.offPassPlays += 1;
        acc.offPassEpa += epa;
        acc.dropbacks += 1;
        if (sack > 0) acc.sacksAllowed += 1;
      } else if (playType === "run") {
        acc.offRushPlays += 1;
        acc.offRushEpa += epa;
      }
      teams.set(posteam, acc);
    }

    if (defteam !== undefined && defteam.length > 0) {
      const acc = teams.get(defteam) ?? blank();
      acc.defPlays += 1;
      acc.defEpa += epa;
      teams.set(defteam, acc);
    }
  }

  const weekList = [...weeks].sort((a, b) => a - b);
  const first = weekList[0];
  const last = weekList[weekList.length - 1];
  if (first === undefined || last === undefined) {
    process.stderr.write("no weeks found in the play-by-play\n");
    return 1;
  }

  const outTeams: Record<string, Record<string, number>> = {};
  for (const [team, acc] of [...teams.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    outTeams[team] = {
      games_played: acc.games.size,
      off_epa_per_play: acc.offPlays > 0 ? round(acc.offEpa / acc.offPlays) : 0,
      def_epa_per_play: acc.defPlays > 0 ? round(acc.defEpa / acc.defPlays) : 0,
      off_pass_epa: acc.offPassPlays > 0 ? round(acc.offPassEpa / acc.offPassPlays) : 0,
      off_rush_epa: acc.offRushPlays > 0 ? round(acc.offRushEpa / acc.offRushPlays) : 0,
      sack_rate_allowed_pct:
        acc.dropbacks > 0 ? round((acc.sacksAllowed / acc.dropbacks) * 100) : 0,
    };
  }

  const payload = {
    generated_at: new Date().toISOString(),
    season: 2026,
    weeks_covered: weekList,
    source: "nflverse pbp (slim clean checkout)",
    pbp_rows: rows,
    games: games.size,
    teams: outTeams,
    coverage_note:
      `Weeks ${first}-${last} present in the play-by-play. ` +
      `Week ${last} may be partial; check plays-per-week before treating it as complete.`,
  };

  const abs = resolve(process.cwd(), args.out);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, JSON.stringify(payload, null, 2), "utf8");

  process.stdout.write(`rows ${rows}  games ${games.size}  weeks ${weekList.join(",")}\n`);
  process.stdout.write(`teams ${Object.keys(outTeams).length}\n`);
  process.stdout.write(`wrote ${abs}\n`);
  return 0;
}

function round(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}

main()
  .then((c) => process.exit(c))
  .catch((e: unknown) => {
    process.stderr.write(`build_team_form failed: ${(e as Error).message}\n`);
    process.exit(1);
  });
