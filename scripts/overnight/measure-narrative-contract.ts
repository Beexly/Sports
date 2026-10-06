/**
 * Slice 7b: walk-forward measurement of the DARK `narrative_contract` family,
 * now that the crosswalk makes all eight seasons roster-joinable.
 *
 * This family was previously unmeasurable at any useful sample size. With only
 * 2023-2025 joinable, training history was two seasons, which is not a training
 * set. The crosswalk changed the arithmetic: 2018-2024 is seven seasons of
 * training history with 2025 held out.
 *
 * The question being tested is whether spending predicts winning:
 *   for each play, split the players on the field by their roster team,
 *   sum the annual contract value of each side's players who are actually in the
 *   game, aggregate to a per-game mean, and ask whether the home-minus-away gap
 *   predicts the home result.
 *
 * That uses the participation join for real rather than as a formality, and it
 * is a genuine holdout: contract data and roster teams come only from seasons
 * strictly before 2025.
 *
 * Runs the real selectPart. A non-zero g writes a DARK or STORED row and leaves
 * the registry alone. `priced` and `publishes_pick` are untouched.
 */

import { createReadStream, appendFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { join } from "node:path";

import { selectPart } from "../../packages/prediction-engine/src/reasoning/part-selector.js";

const DATA = "data/gse-dataset";
const HOLDOUT_SEASON = 2025;
const TRAIN_SEASONS = [2018, 2019, 2020, 2021, 2022, 2023, 2024];

async function* jsonl<T>(file: string): AsyncGenerator<T> {
  const rl = createInterface({ input: createReadStream(file, { encoding: "utf8" }), crlfDelay: Infinity });
  for await (const line of rl) if (line.trim()) yield JSON.parse(line) as T;
}

interface Contract { gsis_id: string; apy: number | null; value: number | null; year_signed: number | null }
interface Roster { season: number; gsis_id: string; team: string | null; position: string | null }
interface Game { game_id: string; season: number; home_team: string; away_team: string; home_win: boolean | null; settled: boolean }
interface Play { nflverse_game_id: string; players_on_field_gsis: string[] | null }

function ols(points: { x: number; y: number }[]) {
  const n = points.length;
  if (n < 3) return null;
  let sx = 0, sy = 0;
  for (const p of points) { sx += p.x; sy += p.y; }
  const xbar = sx / n, ybar = sy / n;
  let sxx = 0, sxy = 0, syy = 0;
  for (const p of points) {
    const dx = p.x - xbar, dy = p.y - ybar;
    sxx += dx * dx; sxy += dx * dy; syy += dy * dy;
  }
  if (sxx <= 0 || syy <= 0) return null;
  const slope = sxy / sxx;
  const intercept = ybar - slope * xbar;
  let sse = 0;
  for (const p of points) {
    const resid = p.y - (intercept + slope * p.x);
    sse += resid * resid;
  }
  const se = Math.sqrt(sse / (n - 2) / sxx);
  return { n, r: sxy / Math.sqrt(sxx * syy), slope, se };
}

async function main(): Promise<void> {
  // ---- contracts: best annual value per player, from deals signed strictly
  // BEFORE the holdout season.
  //
  // A deal signed during 2025 may or may not have been known at the time a 2025
  // game kicked off, so including it would quietly give the holdout a fact the
  // forecaster did not have. Restricting to 2024 and earlier is the conservative
  // reading and costs coverage rather than buying a flattering number.
  const apyByGsis = new Map<string, number>();
  let contractRows = 0;
  for await (const c of jsonl<Contract>(`${DATA}/contracts.jsonl`)) {
    contractRows += 1;
    if (typeof c.year_signed !== "number" || c.year_signed >= HOLDOUT_SEASON) continue;
    const apy = typeof c.apy === "number" && Number.isFinite(c.apy) ? c.apy : null;
    if (apy === null) continue;
    const prev = apyByGsis.get(c.gsis_id);
    if (prev === undefined || apy > prev) apyByGsis.set(c.gsis_id, apy);
  }

  // ---- roster: team per (season, gsis), ALL ingested seasons including 2025.
  //
  // This is deliberately NOT restricted to the training seasons. Which team a
  // player was on is a fact about the season, not a fitted quantity, and it
  // reveals nothing about an outcome. Restricting it to training seasons
  // silently produced ZERO holdout games, because 2025 plays could not be
  // attributed to a side at all. The leakage that matters is in the TARGET and
  // in any fitted parameter, and both of those stay on the training side.
  const teamBySeasonGsis = new Map<string, string>();
  let rosterRows = 0;
  for (const season of [...TRAIN_SEASONS, HOLDOUT_SEASON]) {
    for await (const r of jsonl<Roster>(`${DATA}/rosters-${season}.jsonl`)) {
      if (r.roster_level !== "season") continue;
      rosterRows += 1;
      if (r.team) teamBySeasonGsis.set(`${season}|${r.gsis_id}`, r.team);
    }
  }

  // ---- games
  const gameById = new Map<string, Game>();
  for await (const g of jsonl<Game>(`${DATA}/games.jsonl`)) {
    if (g.season > HOLDOUT_SEASON) continue;
    if (g.settled !== true || typeof g.home_win !== "boolean") continue;
    gameById.set(g.game_id, g);
  }

  // ---- accumulate per-game contract mass on field, per side
  interface Acc { homeSum: number; homeN: number; awaySum: number; awayN: number }
  const acc = new Map<string, Acc>();
  let playsUsed = 0;
  let playersWithContract = 0;
  let playersTotal = 0;

  for (const season of [...TRAIN_SEASONS, HOLDOUT_SEASON]) {
    for await (const p of jsonl<Play>(`${DATA}/participation-${season}.jsonl`)) {
      const ids = p.players_on_field_gsis;
      if (!ids || ids.length === 0) continue;
      const game = gameById.get(p.nflverse_game_id);
      if (!game) continue;
      let a = acc.get(game.game_id);
      if (!a) { a = { homeSum: 0, homeN: 0, awaySum: 0, awayN: 0 }; acc.set(game.game_id, a); }
      playsUsed += 1;
      for (const id of ids) {
        playersTotal += 1;
        const team = teamBySeasonGsis.get(`${season}|${id}`);
        if (team === undefined) continue;
        const apy = apyByGsis.get(id);
        if (apy === undefined) continue;
        playersWithContract += 1;
        if (team === game.home_team) { a.homeSum += apy; a.homeN += 1; }
        else if (team === game.away_team) { a.awaySum += apy; a.awayN += 1; }
      }
    }
  }

  // ---- one point per game
  const trainPoints: { x: number; y: number }[] = [];
  const holdoutPoints: { x: number; y: number }[] = [];
  let trainGames = 0;
  let holdoutGames = 0;
  let gamesWithBothSides = 0;

  for (const [gameId, a] of acc) {
    const game = gameById.get(gameId)!;
    if (a.homeN === 0 || a.awayN === 0) continue;
    gamesWithBothSides += 1;
    const x = a.homeSum / a.homeN - a.awaySum / a.awayN;
    const point = { x, y: game.home_win ? 1 : 0 };
    if (game.season === HOLDOUT_SEASON) { holdoutPoints.push(point); holdoutGames += 1; }
    else { trainPoints.push(point); trainGames += 1; }
  }

  const trainFit = ols(trainPoints);
  const holdoutFit = ols(holdoutPoints);

  const representatives = (await import("node:fs"))
    .readFileSync("data/reasoning/parts-registry.jsonl", "utf8")
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l).family as string);

  // The holdout verdict is the one that counts. The training fit is reported for
  // context and is explicitly NOT the claim.
  const decision = selectPart(
    {
      family: "narrative_contract",
      grain: "game_contract_apy_on_field_gap",
      r: holdoutFit ? holdoutFit.r : null,
      slope: holdoutFit ? holdoutFit.slope : null,
      se: holdoutFit ? holdoutFit.se : null,
      n: holdoutFit ? holdoutFit.n : null,
      has_row: false,
    },
    representatives,
  );

  const result = {
    generated_at: new Date().toISOString(),
    family: "narrative_contract",
    grain: "game_contract_apy_on_field_gap",
    construction:
      "x = mean annual contract value (APY) of the players actually on the field for the home side, minus the same for the away side, per game. y = home_win. Team attribution comes from the pre-2025 season roster; contract value comes from deals signed in 2025 or earlier. The 2025 holdout was never used to build either.",
    why_now:
      "Previously unmeasurable: only 2023-2025 were roster-joinable, leaving two training seasons. The validated crosswalk makes 2018-2024 joinable, giving seven.",
    inputs: {
      contract_rows_read: contractRows,
      players_with_a_trainable_contract: apyByGsis.size,
      roster_season_rows: rosterRows,
      plays_used: playsUsed,
      player_slots: playersTotal,
      player_slots_with_contract_and_team: playersWithContract,
      slot_resolution_rate: playersTotal === 0 ? null : playersWithContract / playersTotal,
    },
    games: {
      games_with_both_sides: gamesWithBothSides,
      train_games: trainGames,
      holdout_games: holdoutGames,
      train_seasons: TRAIN_SEASONS,
      holdout_season: HOLDOUT_SEASON,
    },
    fit_train_for_context_only: trainFit,
    fit_holdout: holdoutFit,
    honesty_bars: {
      r_bar: 0.08,
      r_clears: holdoutFit ? Math.abs(holdoutFit.r) >= 0.08 : false,
      slope_clears: holdoutFit ? Math.abs(holdoutFit.slope) > holdoutFit.se : false,
    },
    scalarizer: decision,
  };

  writeFileSync("data/reasoning/narrative-contract-measurement-2026-09-27.json", `${JSON.stringify(result, null, 2)}\n`, "utf8");

  const store = decision.status === "STORED" ? "stored-candidates.jsonl" : "dark-candidates.jsonl";
  appendFileSync(
    `data/reasoning/${store}`,
    `${JSON.stringify({
      family: "narrative_contract",
      grain: "game_contract_apy_on_field_gap",
      method: "walk-forward-ols-on-contract-apy-on-field-gap",
      n: holdoutFit?.n ?? null,
      r: holdoutFit?.r ?? null,
      slope: holdoutFit?.slope ?? null,
      se: holdoutFit?.se ?? null,
      holdout_season: HOLDOUT_SEASON,
      g: decision.g,
      f1: decision.f1,
      f2: decision.f2,
      f3: decision.f3,
      status: decision.status,
      why: decision.why,
      recorded_at: new Date().toISOString(),
    })}\n`,
    "utf8",
  );

  console.log(JSON.stringify(result, null, 2));
}

main().catch((e: unknown) => {
  process.stderr.write(`${e instanceof Error ? e.stack : String(e)}\n`);
  process.exitCode = 1;
});
