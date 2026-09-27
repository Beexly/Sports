/**
 * Slice 6 driver. Walks every participation play, snap and contract across the
 * ingested seasons and writes data/gse-dataset/join-report.json.
 *
 * The match rates below come from a FULL pass, not a sample, so the numbers can
 * be trusted and the pass can be re-run and diffed. No exploded personnel file
 * is written: it would be ~8 million rows of duplicate text whose only value is
 * the count, and the count is what this report is for.
 *
 * This output is lineage. It is not a LIVE part and it does not touch the edge.
 */

import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { writeFile, mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";

import {
  indexRosters,
  joinContractsToRosters,
  joinSnapsToRosters,
  personnelForPlay,
  seasonOfGameId,
  summarize,
  type RosterIndex,
} from "./joins.js";
import { INGEST_SEASONS } from "./rows.js";
import type { ContractRow, RosterRow, SnapRow } from "./rows.js";

const ROOT = resolve(__dirname, "..", "..", "..", "..");
const DATA = join(ROOT, "data", "gse-dataset");

async function* readJsonl<T>(path: string): AsyncGenerator<T> {
  const rl = createInterface({ input: createReadStream(path, { encoding: "utf8" }), crlfDelay: Infinity });
  for await (const line of rl) if (line.trim()) yield JSON.parse(line) as T;
}

async function main(): Promise<void> {
  const seasons = [...INGEST_SEASONS];

  // ---- rosters -----------------------------------------------------------
  const rosterRows: RosterRow[] = [];
  for (const season of seasons) {
    const path = join(DATA, `rosters-${season}.jsonl`);
    for await (const row of readJsonl<RosterRow>(path)) rosterRows.push(row);
  }
  const index: RosterIndex = indexRosters(rosterRows);

  // ---- snaps -------------------------------------------------------------
  let snapTotal = 0;
  let snapMatched = 0;
  let snapUnmatched = 0;
  let snapAmbiguous = 0;
  const snapUnmatchedSamples: string[] = [];
  for (const season of seasons) {
    for await (const snap of readJsonl<SnapRow>(join(DATA, `snap-counts-${season}.jsonl`))) {
      snapTotal += 1;
      const entries = index.byPfr.get(`${snap.season}|${snap.pfr_player_id}`);
      if (entries === undefined || entries.length === 0) {
        snapUnmatched += 1;
        if (snapUnmatchedSamples.length < 20) {
          snapUnmatchedSamples.push(`${snap.game_id} ${snap.pfr_player_id} season=${snap.season}`);
        }
        continue;
      }
      snapMatched += 1;
      if (entries.some((e) => e.ambiguous)) snapAmbiguous += 1;
    }
  }

  // ---- contracts ---------------------------------------------------------
  const contracts: ContractRow[] = [];
  for await (const row of readJsonl<ContractRow>(join(DATA, "contracts.jsonl"))) contracts.push(row);
  const contractJoin = joinContractsToRosters(contracts, index);

  // ---- participation -----------------------------------------------------
  // nflverse changed the participation player identifier mid-range: 2023+ carries
  // GSIS ids (`00-0032933`), earlier seasons carry a bare numeric id (`44987`).
  // Those two spaces have no key between them, so an earlier season's personnel
  // CANNOT be joined to a roster. That is measured here and reported, never
  // papered over with a guessed crosswalk.
  const GSIS = /^00-\d{7}$/;
  let plays = 0;
  let playsWithNullPersonnel = 0;
  let playerSlots = 0;
  let playersMatched = 0;
  let playersUnmatched = 0;
  let playersAmbiguous = 0;
  let slotsGsisFormat = 0;
  let slotsNonGsis = 0;
  const unmatchedExamples: string[] = [];
  const perSeason: Record<string, { slots: number; matched: number; gsisFormatSlots: number }> = {};
  const sample: unknown[] = [];

  for (const season of seasons) {
    const bucket = (perSeason[season] ??= { slots: 0, matched: 0, gsisFormatSlots: 0 });
    for await (const play of readJsonl<{ nflverse_game_id: string; play_id: number; players_on_field: string[] | null }>(
      join(DATA, `participation-${season}.jsonl`),
    )) {
      plays += 1;
      const playSeason = seasonOfGameId(play.nflverse_game_id) ?? season;
      const result = personnelForPlay(play.players_on_field, index, playSeason);
      if (result === null) {
        playsWithNullPersonnel += 1;
        continue;
      }
      playerSlots += play.players_on_field!.length;
      bucket.slots += play.players_on_field!.length;
      for (const id of play.players_on_field!) {
        if (GSIS.test(id)) {
          slotsGsisFormat += 1;
          bucket.gsisFormatSlots += 1;
        } else slotsNonGsis += 1;
      }
      playersMatched += result.matched.length;
      bucket.matched += result.matched.length;
      playersUnmatched += result.unmatched.length;
      playersAmbiguous += result.ambiguous.length;
      for (const id of result.unmatched) {
        if (unmatchedExamples.length < 20) unmatchedExamples.push(`${id} (${play.nflverse_game_id})`);
      }
      if (sample.length < 20) {
        sample.push({
          nflverse_game_id: play.nflverse_game_id,
          play_id: play.play_id,
          players_on_field_count: play.players_on_field!.length,
          matched: result.matched.length,
          unmatched: result.unmatched,
          sample_matched_roster: result.matched[0]
            ? {
                gsis_id: result.matched[0].gsis_id,
                full_name: result.matched[0].roster[0]?.row.full_name ?? null,
                team: result.matched[0].roster[0]?.row.team ?? null,
                position: result.matched[0].roster[0]?.row.position ?? null,
                ambiguous: result.matched[0].ambiguous,
              }
            : null,
        });
      }
    }
  }

  const nonGsisSeasons = Object.entries(perSeason)
    .filter(([, b]) => b.slots > 0 && b.gsisFormatSlots === 0)
    .map(([s]) => Number(s));
  const gsisSeasons = Object.entries(perSeason)
    .filter(([, b]) => b.gsisFormatSlots > 0)
    .map(([s]) => Number(s));

  const report = {
    generated_at: new Date().toISOString(),
    note: "Lineage only. Not a LIVE part. Match rates come from a full pass over every ingested row.",
    seasons,
    season_range: [seasons[0], seasons[seasons.length - 1]],
    roster: {
      rows: rosterRows.length,
      gsis_keys: index.gsisKeys,
      pfr_keys: index.pfrKeys,
      ambiguous_gsis_keys: index.ambiguousGsisKeys,
      ambiguous_pfr_keys: index.ambiguousPfrKeys,
      rows_without_pfr_id: index.noPfrId,
    },
    snaps: {
      ...summarize(snapTotal, snapMatched, snapUnmatched, snapAmbiguous),
      join_key: "pfr_player_id + season",
      unmatched_examples: snapUnmatchedSamples,
    },
    contracts: {
      ...summarize(contracts.length, contractJoin.matched.length, contractJoin.unmatched.length, contractJoin.ambiguous.length),
      join_key: "gsis_id (no season on a contract, so multi-season players are ambiguous)",
    },
    participation: {
      plays,
      plays_with_null_personnel: playsWithNullPersonnel,
      player_slots: playerSlots,
      ...summarize(playerSlots, playersMatched, playersUnmatched, playersAmbiguous),
      join_key: "gsis_id + season derived from the play game id",
      identifier_compatibility: {
        finding:
          "nflverse changed the participation player identifier mid-range. 2023+ carries GSIS ids; earlier seasons carry a bare numeric id. The two spaces share no key, so earlier-season personnel CANNOT be joined to a roster at all.",
        gsis_format_slots: slotsGsisFormat,
        non_gsis_format_slots: slotsNonGsis,
        seasons_with_gsis_ids: gsisSeasons,
        seasons_with_non_gsis_ids: nonGsisSeasons,
        consequence:
          "A roster-dependent measurement may only use the GSIS seasons. Building a crosswalk would mean inventing a join key, which is forbidden; the mapping is NOT on disk tonight.",
        per_season: perSeason,
      },
      unmatched_examples: unmatchedExamples,
    },
    joined_play_sample: sample,
  };

  await mkdir(DATA, { recursive: true });
  const out = join(DATA, "join-report.json");
  await writeFile(out, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
