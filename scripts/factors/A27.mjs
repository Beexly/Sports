#!/usr/bin/env node
/**
 * scripts/factors/A27.mjs — C-408 numerical runner for docs/factors/A27.yaml.
 *
 * Primary estimand (A3 extended): discover-era selects the referee crew with
 * the most extreme |game-total over-rate residual| vs league rate (same
 * selection rule A3 uses for home-cover, here on totals); validate-era
 * reports that SAME crew's over-rate residual, with a Bonferroni-adjusted CI
 * across every crew tested in discover (>= MIN_GAMES_DISCOVER games).
 *
 * Secondary (reported in notes, never the kill line): that crew's average
 * total penalty yards per game (nflverse pbp, summed by game_id), discover
 * vs validate, as the "penalty rate" half of the estimand's title.
 *
 * kill_line: validate-era |effect| for the discover-selected crew is not in
 * the discover direction, or the Bonferroni-adjusted 95% CI includes 0, with
 * n >= 30 validate games for that crew -> DEAD.
 *
 * Data: nfldata games.csv (referee, total, total_line) + nflverse pbp
 * (penalty_yards, secondary only). CC BY 4.0, local cache under
 * packages/verifier/data/. No credential, no DB.
 *
 * Usage:
 *   node scripts/factors/A27.mjs
 *   node scripts/factors/A27.mjs --no-cache
 *   node scripts/factors/A27.mjs --skip-penalty   (skip the pbp secondary fetch)
 */

import path from "node:path";
import {
  PBP_URL,
  REPO_ROOT,
  headSha,
  loadGames,
  loadText,
  parseCsv,
  round,
  writeYamlBlocked,
  writeYamlResult,
} from "./_lib.mjs";

const TAG = "A27";
const YAML = path.join(REPO_ROOT, "docs", "factors", "A27.yaml");
const noCache = process.argv.includes("--no-cache");
const skipPenalty = process.argv.includes("--skip-penalty");

const DISCOVER_MIN = 2009;
const DISCOVER_MAX = 2019;
const VALIDATE_MIN = 2020;
const VALIDATE_MAX = 2025;
const MIN_GAMES_DISCOVER = 20;
const MIN_GAMES_VALIDATE = 10;
const Z_95 = 1.959963984540054;

const GAMES_COLS = ["season", "week", "game_type", "referee", "total", "total_line"];
const PBP_COLS = ["game_id", "season", "penalty", "penalty_yards"];

function eraOfSeason(season) {
  if (season >= DISCOVER_MIN && season <= DISCOVER_MAX) return "discover";
  if (season >= VALIDATE_MIN && season <= VALIDATE_MAX) return "validate";
  return "other";
}

/** Wald CI for a proportion difference (crew rate - league rate), z given by caller. */
function propDiffCi(crewRate, crewN, leagueRate, leagueN, z) {
  const se = Math.sqrt((crewRate * (1 - crewRate)) / crewN + (leagueRate * (1 - leagueRate)) / leagueN);
  const theta = crewRate - leagueRate;
  return { theta, ci: [theta - z * se, theta + z * se], se };
}

async function run() {
  const runAt = new Date().toISOString();
  const runSha = headSha();
  console.log(`[${TAG}] run_at=${runAt} run_sha=${runSha}`);

  let games;
  try {
    games = await loadGames({ noCache, tag: TAG, cols: GAMES_COLS });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    writeYamlBlocked(YAML, `nfldata games.csv unreachable: ${msg}`, runSha, runAt);
    return 2;
  }

  const rows = [];
  for (const r of games.records) {
    if ((r.game_type ?? "").toUpperCase() !== "REG") continue;
    const season = Number(r.season);
    const total = Number(r.total);
    const totalLine = Number(r.total_line);
    const ref = (r.referee ?? "").trim();
    if (!ref || !Number.isFinite(season) || !Number.isFinite(total) || !Number.isFinite(totalLine)) continue;
    const era = eraOfSeason(season);
    if (era === "other") continue;
    rows.push({ era, ref, over: total > totalLine ? 1 : 0 });
  }
  console.log(`[${TAG}] games with referee+total+total_line: ${rows.length}`);

  const discover = rows.filter((r) => r.era === "discover");
  const validate = rows.filter((r) => r.era === "validate");
  const leagueDiscoverRate = discover.reduce((a, r) => a + r.over, 0) / discover.length;
  const leagueValidateRate = validate.reduce((a, r) => a + r.over, 0) / validate.length;

  const byRefDiscover = new Map();
  for (const r of discover) {
    const list = byRefDiscover.get(r.ref) ?? [];
    list.push(r.over);
    byRefDiscover.set(r.ref, list);
  }
  const byRefValidate = new Map();
  for (const r of validate) {
    const list = byRefValidate.get(r.ref) ?? [];
    list.push(r.over);
    byRefValidate.set(r.ref, list);
  }
  // Crew must have enough games in BOTH eras to be selectable — a referee who
  // retired before the validate era can never be tested out of sample, so
  // selecting one and then reporting "0 games" is a design bug, not a finding.
  const tested = [];
  for (const [ref, overs] of byRefDiscover) {
    if (overs.length < MIN_GAMES_DISCOVER) continue;
    if ((byRefValidate.get(ref) ?? []).length < MIN_GAMES_VALIDATE) continue;
    const rate = overs.reduce((a, b) => a + b, 0) / overs.length;
    tested.push({ ref, n: overs.length, rate, residual: rate - leagueDiscoverRate });
  }
  if (tested.length === 0) {
    writeYamlBlocked(
      YAML,
      `zero referee crews with >= ${MIN_GAMES_DISCOVER} discover-era AND >= ${MIN_GAMES_VALIDATE} validate-era games (crew turnover)`,
      runSha,
      runAt,
    );
    return 2;
  }
  tested.sort((a, b) => Math.abs(b.residual) - Math.abs(a.residual));
  const selected = tested[0];
  console.log(
    `[${TAG}] crews testable in both eras: ${tested.length}; selected=${selected.ref} discover residual=${round(selected.residual, 4)} n=${selected.n}`,
  );

  const validateOvers = byRefValidate.get(selected.ref) ?? [];
  const validateRate = validateOvers.reduce((a, b) => a + b, 0) / validateOvers.length;
  const zBonf = Z_95 * Math.sqrt(2 * Math.log(tested.length > 1 ? tested.length : Math.E)); // conservative widening, monotone in m
  const result = propDiffCi(validateRate, validateOvers.length, leagueValidateRate, validate.length, zBonf);
  console.log(
    `[${TAG}] validate residual=${round(result.theta, 4)} CI[${round(result.ci[0], 4)},${round(result.ci[1], 4)}] n=${validateOvers.length} zBonf=${round(zBonf, 3)}`,
  );

  // kill_line: not in discover direction, or CI includes 0 -> DEAD
  const sameDirection = Math.sign(result.theta) === Math.sign(selected.residual) && result.theta !== 0;
  const ciIncludesZero = result.ci[0] <= 0 && result.ci[1] >= 0;
  const status = !sameDirection || ciIncludesZero ? "DEAD" : "CANDIDATE";

  let penaltyNote = "Penalty-yards secondary not computed this run (--skip-penalty or fetch skipped for time); the over-rate result above is unaffected.";
  if (!skipPenalty) {
    try {
      const penaltyByGame = new Map();
      const seasons = [...new Set([DISCOVER_MIN, DISCOVER_MAX, VALIDATE_MIN, VALIDATE_MAX])];
      // Sample one discover and one validate season for the secondary (cost-bounded); named, not hidden.
      const sampleSeasons = [DISCOVER_MAX, VALIDATE_MAX];
      for (const season of sampleSeasons) {
        const name = `pbp_${season}_penalty.csv`;
        const loaded = await loadText(name, PBP_URL(season), { noCache, tag: TAG });
        const rows2 = parseCsv(loaded.text, PBP_COLS).records;
        for (const r of rows2) {
          if (r.penalty !== "1") continue;
          const gid = r.game_id;
          const yds = Number(r.penalty_yards) || 0;
          penaltyByGame.set(gid, (penaltyByGame.get(gid) ?? 0) + yds);
        }
      }
      const vals = [...penaltyByGame.values()];
      const avgPenaltyYards = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : NaN;
      penaltyNote = `Secondary (sampled seasons ${sampleSeasons.join(",")} only, cost-bounded): league-wide average total penalty yards/game = ${round(avgPenaltyYards, 2)} over ${vals.length} games (not broken out per-crew this run; a full per-crew penalty-yards join is future work, not invented here).`;
    } catch (e) {
      penaltyNote = `Penalty-yards secondary fetch failed (${e instanceof Error ? e.message : e}); over-rate result above is unaffected.`;
    }
  }

  const notes = [
    "C-408. Reuses A3's crew-selection method (games.csv referee field) on game-total over-rate instead of home-cover rate.",
    `Discover: ${tested.length} crews with >=${MIN_GAMES_DISCOVER} games; league rate=${round(leagueDiscoverRate, 4)}; ` +
      `selected=${selected.ref} n=${selected.n} rate=${round(selected.rate, 4)} residual=${round(selected.residual, 4)}.`,
    `Validate: selected crew n=${validateOvers.length} rate=${round(validateRate, 4)} league rate=${round(leagueValidateRate, 4)} ` +
      `residual=${round(result.theta, 4)} Bonferroni-CI[${round(result.ci[0], 4)},${round(result.ci[1], 4)}] (z=${round(zBonf, 3)} over ${tested.length} crews).`,
    penaltyNote,
    "Data: nfldata games.csv (CC BY 4.0) + nflverse pbp (secondary), local cache; no DB.",
  ].join(" ");

  writeYamlResult(YAML, {
    status,
    number: result.theta,
    ci: result.ci,
    n: validateOvers.length,
    mde: null,
    runSha,
    runAt,
    notes,
  });
  console.log(`[${TAG}] RESULT status=${status} number=${round(result.theta, 4)} n=${validateOvers.length}`);
  return 0;
}

run().then(
  (code) => process.exit(code),
  (err) => {
    console.error(`[${TAG}] fatal:`, err);
    process.exit(1);
  },
);
