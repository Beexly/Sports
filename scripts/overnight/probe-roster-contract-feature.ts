/**
 * Can the contract feature be made APPLICABLE to the week-3 game?
 *
 * The on-field version measured well (holdout r=0.151, slope 0.0342 > se
 * 0.0133, f1=0, STORED on a missing week-3 row). But it cannot ever produce a
 * week-3 value: 2026_03_LAC_BUF has not been played, so there is no
 * participation row for it and "APY of the players actually on the field" is
 * undefined for the future.
 *
 * A roster-level feature has the same economic story and IS computable for an
 * unplayed game from the 2026 roster. The test is whether it still clears both
 * honesty bars out of sample. If it does, the family can finish the journey to
 * LIVE. If it does not, the on-field STORED result stands and nothing is faked.
 *
 * This only measures. It writes a verdict, not a registry row.
 */

import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";

const DATA = "data/gse-dataset";
const HOLDOUT_SEASON = 2025;
const TRAIN_SEASONS = [2018, 2019, 2020, 2021, 2022, 2023, 2024];

async function* jsonl<T>(file: string): AsyncGenerator<T> {
  const rl = createInterface({ input: createReadStream(file, { encoding: "utf8" }), crlfDelay: Infinity });
  for await (const line of rl) if (line.trim()) yield JSON.parse(line) as T;
}

function ols(points: { x: number; y: number }[]) {
  const n = points.length;
  if (n < 3) return null;
  let sx = 0, sy = 0;
  for (const p of points) { sx += p.x; sy += p.y; }
  const xbar = sx / n, ybar = sy / n;
  let sxx = 0, sxy = 0, syy = 0;
  for (const p of points) { const dx = p.x - xbar, dy = p.y - ybar; sxx += dx * dx; sxy += dx * dy; syy += dy * dy; }
  if (sxx <= 0 || syy <= 0) return null;
  const slope = sxy / sxx;
  const intercept = ybar - slope * xbar;
  let sse = 0;
  for (const p of points) { const r = p.y - (intercept + slope * p.x); sse += r * r; }
  return { n, r: sxy / Math.sqrt(sxx * syy), slope, se: Math.sqrt(sse / (n - 2) / sxx) };
}

async function main(): Promise<void> {
  // Contracts signed strictly before the holdout, so 2025 is never informed.
  const apy = new Map<string, number>();
  for await (const c of jsonl<{ gsis_id: string; apy: number | null; year_signed: number | null }>(`${DATA}/contracts.jsonl`)) {
    if (typeof c.year_signed !== "number" || c.year_signed >= HOLDOUT_SEASON) continue;
    if (typeof c.apy !== "number" || !Number.isFinite(c.apy)) continue;
    const prev = apy.get(c.gsis_id);
    if (prev === undefined || c.apy > prev) apy.set(c.gsis_id, c.apy);
  }

  const games = new Map<string, { season: number; home_team: string; away_team: string; home_win: boolean }>();
  for await (const g of jsonl<any>(`${DATA}/games.jsonl`)) {
    if (g.season > HOLDOUT_SEASON) continue;
    if (g.settled !== true || typeof g.home_win !== "boolean") continue;
    games.set(g.game_id, { season: g.season, home_team: g.home_team, away_team: g.away_team, home_win: g.home_win });
  }

  const trainPoints: { x: number; y: number }[] = [];
  const holdoutPoints: { x: number; y: number }[] = [];
  let playersWithApy = 0;
  let playersTotal = 0;

  for (const season of [...TRAIN_SEASONS, HOLDOUT_SEASON]) {
    // Roster-level: mean contract APY of the season roster, per side.
    const side = new Map<string, { homeSum: number; homeN: number; awaySum: number; awayN: number }>();
    for await (const r of jsonl<any>(`${DATA}/rosters-${season}.jsonl`)) {
      if (r.roster_level !== "season") continue;
      if (!r.team || !r.gsis_id) continue;
      const g = games.get(`${season}_${String(r.week ?? 1).padStart(2, "0")}_${r.team}_${r.team}`);
      void g; // team membership is resolved per game below
      playersTotal += 1;
      const a = apy.get(r.gsis_id);
      if (a === undefined) continue;
      playersWithApy += 1;
      const key = r.team as string;
      const acc = side.get(key) ?? { homeSum: 0, homeN: 0, awaySum: 0, awayN: 0 };
      acc.homeSum += a; acc.homeN += 1;              // provisional; split by game below
      side.set(key, acc);
    }
    void side;
  }

  // Per game, using that game's own home/away split.
  for (const g of games.values()) {
    void g;
  }

  // Second pass keyed properly by game.
  const byGame = new Map<string, { h: { s: number; n: number }; a: { s: number; n: number } }>();
  for (const season of [...TRAIN_SEASONS, HOLDOUT_SEASON]) {
    const rosterByTeam = new Map<string, { sum: number; n: number }>();
    for await (const r of jsonl<any>(`${DATA}/rosters-${season}.jsonl`)) {
      if (r.roster_level !== "season" || !r.team || !r.gsis_id) continue;
      const a = apy.get(r.gsis_id);
      if (a === undefined) continue;
      const acc = rosterByTeam.get(r.team) ?? { sum: 0, n: 0 };
      acc.sum += a; acc.n += 1;
      rosterByTeam.set(r.team, acc);
    }
    for (const [gid, g] of games) {
      if (g.season !== season) continue;
      const h = rosterByTeam.get(g.home_team);
      const aw = rosterByTeam.get(g.away_team);
      if (!h || !aw || h.n === 0 || aw.n === 0) continue;
      byGame.set(gid, { h, a: aw });
      const point = { x: h.sum / h.n - aw.sum / aw.n, y: g.home_win ? 1 : 0 };
      if (season === HOLDOUT_SEASON) holdoutPoints.push(point);
      else trainPoints.push(point);
    }
  }

  const trainFit = ols(trainPoints);
  const holdoutFit = ols(holdoutPoints);
  const rClears = holdoutFit ? Math.abs(holdoutFit.r) >= 0.08 : false;
  const slopeClears = holdoutFit ? Math.abs(holdoutFit.slope) > holdoutFit.se : false;

  console.log(JSON.stringify({
    feature: "roster-level mean contract APY, home minus away",
    why: "computable for an UNPLAYED game from a season roster, unlike the on-field version",
    train_games: trainPoints.length,
    holdout_games: holdoutPoints.length,
    players_with_apy_share: playersTotal === 0 ? null : playersWithApy / playersTotal,
    fit_train: trainFit,
    fit_holdout: holdoutFit,
    r_clears: rClears,
    slope_clears: slopeClears,
    would_reach: rClears && slopeClears ? "eligible for a week-3 row" : "still DARK on honesty",
  }, null, 2));
}

main().catch((e: unknown) => { process.stderr.write(`${e instanceof Error ? e.stack : String(e)}\n`); process.exitCode = 1; });
