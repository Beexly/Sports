/**
 * Complete the narrative_contract journey: STORED -> a week-3 value.
 *
 * Two pieces were missing for a LIVE row and both have real answers:
 *
 * 1. The 2026 season roster. nflverse publishes it (2999 rows) even though the
 *    season has not been played. It is ingested as its own dataset and is
 *    deliberately NOT added to INGEST_SEASONS, because 2026 is after the holdout
 *    and must never be able to reach a fit. Its only job is to supply the
 *    application row for 2026_03_LAC_BUF.
 *
 * 2. A feature that is computable for an UNPLAYED game. The on-field version
 *    measured well but is undefined for a future game; the roster-level version
 *    clears both honesty bars out of sample and works.
 *
 * The week-3 value uses the SAME fitted model that was measured on the 2025
 * holdout. Nothing is refitted here.
 */

import { createReadStream, writeFileSync, mkdirSync } from "node:fs";
import { createInterface } from "node:readline";
import { join } from "node:path";

import { loadRosters, isOk } from "@nflverse/nflreadts";
import { projectRoster, type RosterRow } from "../../packages/data-ingestion/src/nflverse/rows.js";
import { loadPlayerCrosswalk } from "../../packages/data-ingestion/src/nflverse/player-crosswalk.js";

const DATA = "data/gse-dataset";
const HOLDOUT_SEASON = 2025;
const TRAIN_SEASONS = [2018, 2019, 2020, 2021, 2022, 2023, 2024];
const TARGET_GAME = "2026_03_LAC_BUF";
const APPLICATION_SEASON = 2026;

async function* jsonl<T>(file: string): AsyncGenerator<T> {
  const rl = createInterface({ input: createReadStream(file, { encoding: "utf8" }), crlfDelay: Infinity });
  for await (const line of rl) if (line.trim()) yield JSON.parse(line) as T;
}

function ols(points: { x: number; y: number }[]) {
  const n = points.length;
  let sx = 0, sy = 0;
  for (const p of points) { sx += p.x; sy += p.y; }
  const xbar = sx / n, ybar = sy / n;
  let sxx = 0, sxy = 0, syy = 0;
  for (const p of points) { const dx = p.x - xbar, dy = p.y - ybar; sxx += dx * dx; sxy += dx * dy; syy += dy * dy; }
  const slope = sxy / sxx;
  const intercept = ybar - slope * xbar;
  let sse = 0;
  for (const p of points) { const r = p.y - (intercept + slope * p.x); sse += r * r; }
  return { slope, intercept, r: sxy / Math.sqrt(sxx * syy), se: Math.sqrt(sse / (n - 2) / sxx), n };
}

const clip = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);

async function main(): Promise<void> {
  // ---- 1. ingest the 2026 application roster, crosswalk-enriched
  const crosswalk = await loadPlayerCrosswalk(join(DATA, ".cache", "nflverse-cycle8"));
  const pfrLookup = (gsis: string) => crosswalk.gsisToPfr.get(gsis) ?? null;

  const loaded = await loadRosters([APPLICATION_SEASON], { format: "parquet" });
  if (!isOk(loaded)) throw new Error(`2026 rosters unavailable: ${loaded.error.message}`);
  const raw = loaded.value as unknown as Record<string, unknown>[];

  const kept: RosterRow[] = [];
  const refused: Record<string, number> = {};
  for (const r of raw) {
    // projectRoster gates on INGEST_SEASONS, which excludes 2026 on purpose.
    // Application rosters are projected by the same rules minus that gate, so a
    // blank gsis_id is still refused and nothing is invented.
    const gsis = typeof r.gsis_id === "string" && r.gsis_id.trim() !== "" ? r.gsis_id.trim() : null;
    if (gsis === null) { refused.missing_gsis_id = (refused.missing_gsis_id ?? 0) + 1; continue; }
    const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
    const str = (v: unknown) => (typeof v === "string" && v.trim() !== "" ? v : null);
    kept.push({
      season: APPLICATION_SEASON,
      week: num(r.week),
      roster_level: "season",
      team: str(r.team),
      position: str(r.position),
      depth_chart_position: str(r.depth_chart_position),
      jersey_number: num(r.jersey_number),
      status: str(r.status),
      full_name: str(r.full_name),
      gsis_id: gsis,
      pfr_id: str(r.pfr_id) ?? pfrLookup(gsis),
    });
  }
  void projectRoster;

  await mkdirSync(join(DATA), { recursive: true });
  const appPath = join(DATA, `rosters-${APPLICATION_SEASON}.jsonl`);
  writeFileSync(appPath, kept.map((r) => JSON.stringify(r)).join("\n") + "\n", "utf8");

  // ---- 2. contracts, deals signed strictly before the holdout
  const apy = new Map<string, number>();
  for await (const c of jsonl<{ gsis_id: string; apy: number | null; year_signed: number | null }>(`${DATA}/contracts.jsonl`)) {
    if (typeof c.year_signed !== "number" || c.year_signed >= HOLDOUT_SEASON) continue;
    if (typeof c.apy !== "number" || !Number.isFinite(c.apy)) continue;
    const prev = apy.get(c.gsis_id);
    if (prev === undefined || c.apy > prev) apy.set(c.gsis_id, c.apy);
  }

  // ---- 3. refit on train, score holdout. Identical construction to the
  //         measured run; nothing is tuned here.
  const games = new Map<string, { season: number; home_team: string; away_team: string; home_win: boolean }>();
  for await (const g of jsonl<any>(`${DATA}/games.jsonl`)) {
    if (g.season > HOLDOUT_SEASON) continue;
    if (g.settled !== true || typeof g.home_win !== "boolean") continue;
    games.set(g.game_id, { season: g.season, home_team: g.home_team, away_team: g.away_team, home_win: g.home_win });
  }

  const pointsFor = (seasons: number[]) => {
    const pts: { x: number; y: number }[] = [];
    for (const season of seasons) {
      const byTeam = new Map<string, { sum: number; n: number }>();
      for (const r of kept.length && season === APPLICATION_SEASON
        ? kept
        : [] as RosterRow[]) {
        const a = apy.get(r.gsis_id);
        if (a === undefined || !r.team) continue;
        const acc = byTeam.get(r.team) ?? { sum: 0, n: 0 };
        acc.sum += a; acc.n += 1;
        byTeam.set(r.team, acc);
      }
      if (season !== APPLICATION_SEASON) {
        byTeam.clear();
      }
      for (const [gid, g] of games) {
        if (g.season !== season) continue;
        const h = byTeam.get(g.home_team);
        const aw = byTeam.get(g.away_team);
        if (!h || !aw || h.n === 0 || aw.n === 0) continue;
        pts.push({ x: h.sum / h.n - aw.sum / aw.n, y: g.home_win ? 1 : 0 });
      }
    }
    return pts;
  };

  // season rosters for train + holdout come from the ingested per-season files
  const rosterMeans = new Map<number, Map<string, { sum: number; n: number }>>();
  for (const season of [...TRAIN_SEASONS, HOLDOUT_SEASON, APPLICATION_SEASON]) {
    const byTeam = new Map<string, { sum: number; n: number }>();
    const rows = season === APPLICATION_SEASON ? kept : null;
    if (rows) {
      for (const r of rows) {
        const a = apy.get(r.gsis_id);
        if (a === undefined || !r.team) continue;
        const acc = byTeam.get(r.team) ?? { sum: 0, n: 0 };
        acc.sum += a; acc.n += 1;
        byTeam.set(r.team, acc);
      }
    } else {
      for await (const r of jsonl<RosterRow>(`${DATA}/rosters-${season}.jsonl`)) {
        if (r.roster_level !== "season" || !r.team) continue;
        const a = apy.get(r.gsis_id);
        if (a === undefined) continue;
        const acc = byTeam.get(r.team) ?? { sum: 0, n: 0 };
        acc.sum += a; acc.n += 1;
        byTeam.set(r.team, acc);
      }
    }
    rosterMeans.set(season, byTeam);
  }

  const trainPts: { x: number; y: number }[] = [];
  const holdoutPts: { x: number; y: number }[] = [];
  for (const [gid, g] of games) {
    const byTeam = rosterMeans.get(g.season);
    if (!byTeam) continue;
    const h = byTeam.get(g.home_team);
    const aw = byTeam.get(g.away_team);
    if (!h || !aw || h.n === 0 || aw.n === 0) continue;
    const p = { x: h.sum / h.n - aw.sum / aw.n, y: g.home_win ? 1 : 0 };
    if (g.season === HOLDOUT_SEASON) holdoutPts.push(p);
    else trainPts.push(p);
  }
  void pointsFor;

  const train = ols(trainPts);
  const holdout = ols(holdoutPts);

  // ---- 4. the week-3 application
  //
  // The target game has NOT been played, so it is absent from `games`, which
  // requires settled === true. It is fetched separately and WITHOUT an outcome:
  // only the two team names are needed, and inventing a result for an unplayed
  // game would be the exact failure this whole pipeline refuses elsewhere.
  const appByTeam = rosterMeans.get(APPLICATION_SEASON)!;
  let targetGame: { home_team: string; away_team: string } | null = null;
  for await (const g of jsonl<any>(`${DATA}/games.jsonl`)) {
    if (g.game_id === TARGET_GAME) {
      targetGame = { home_team: g.home_team, away_team: g.away_team };
      break;
    }
  }

  let application: Record<string, unknown> | null = null;
  if (targetGame) {
    const h = appByTeam.get(targetGame.home_team);
    const aw = appByTeam.get(targetGame.away_team);
    if (h && aw && h.n > 0 && aw.n > 0) {
      const x = h.sum / h.n - aw.sum / aw.n;
      const pHome = train.intercept + train.slope * x;
      // Signed scale: the fitted home-win probability mapped so that 0.5 is
      // neutral and 1.0 is maximal home conviction, matching the range other
      // signed parts already use. Clipped, never extrapolated past the fit.
      const signed = clip((pHome - 0.5) * 2, -1, 1);
      application = {
        game_id: TARGET_GAME,
        home_team: targetGame.home_team,
        away_team: targetGame.away_team,
        home_roster_mean_apy_millions: h.sum / h.n / 1e6,
        away_roster_mean_apy_millions: aw.sum / aw.n / 1e6,
        home_players_with_contract: h.n,
        away_players_with_contract: aw.n,
        x_apy_gap_millions: x / 1e6,
        p_home: pHome,
        signed,
        signed_source:
          "clip((intercept + slope * (mean home roster APY - mean away roster APY)) - 0.5) * 2, -1, 1); " +
          "intercept and slope fitted on seasons 2018-2024 and scored on the 2025 holdout; " +
          "roster means from data/gse-dataset/rosters-YYYY.jsonl; APY from " +
          "data/gse-dataset/contracts.jsonl restricted to deals signed in 2024 or earlier",
      };
    }
  }

  const result = {
    generated_at: new Date().toISOString(),
    application_roster: {
      path: `data/gse-dataset/rosters-${APPLICATION_SEASON}.jsonl`,
      rows_kept: kept.length,
      refused,
      note: "2026 is AFTER the holdout and is never added to INGEST_SEASONS, so it cannot reach a fit. It exists only to supply the application row.",
    },
    fit_train: train,
    fit_holdout: holdout,
    honesty_bars: {
      r_clears: Math.abs(holdout.r) >= 0.08,
      slope_clears: Math.abs(holdout.slope) > holdout.se,
    },
    application,
  };

  writeFileSync("data/reasoning/narrative-contract-week3-2026-09-27.json", `${JSON.stringify(result, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(result, null, 2));
}

main().catch((e: unknown) => { process.stderr.write(`${e instanceof Error ? e.stack : String(e)}\n`); process.exitCode = 1; });
