/**
 * Film backtest scaffold: 2024-season replay through the full bridge.
 *
 * Replays a season of film through extractors → adapter → shadow
 * harness → ledger rows, proving the plumbing end-to-end. The season is
 * SYNTHETIC (deterministic seeded PRNG): the real 2024 nflverse
 * backfill payloads live outside the repo, and no real film exists yet.
 * When Stream B delivers real game captures, this scaffold's
 * `synthesizeSeasonFilm` is replaced by the real play stream and the
 * assertions stay the same.
 *
 * What it proves: control/treatment arms both run on the REAL engine
 * function (anytimeTdProbability), every row lands with weight 0 and
 * UNCALIBRATED, blended == control, and graded actuals flow through.
 *
 * Original implementation for GSE.
 */

import { anytimeTdProbability } from "../../props/anytime-td-mit.js";
import type { RollingRoleFeatures } from "../../props/anytime-td-mit.js";
import type { PlayRecord } from "../../perception/cv-play.js";
import type { RouteName } from "../../perception/cv-route-extract.js";
import type { FilmPlayInput } from "../film-types.js";
import {
  extractAllPlayerFilmFeatures,
} from "../player-film-features.js";
import { toPropsInputs } from "../film-feature-adapter.js";
import { runShadowSlate, type ShadowSlateRow } from "../shadow/film-shadow-harness.js";

/** Deterministic PRNG (mulberry32) — same seed, same season, every run. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ROUTES: RouteName[] = [
  "go", "slant", "out", "dig", "post", "corner",
  "curl", "comeback", "flat", "wheel", "screen", "drag", "seam", "hitch",
];
const DISTRIBUTIONS = ["trips-right", "2x2", "trips-left", "bunch-right", "empty-5wide"];
const PERSONNEL = ["11", "12", "10", "21"];

export interface SyntheticSeason {
  readonly season: number;
  readonly plays: FilmPlayInput[];
  /** playerId → realized receiving yards (the graded actuals). */
  readonly actualReceivingYards: Readonly<Record<string, number>>;
  /** playerId → realized TDs. */
  readonly actualTds: Readonly<Record<string, number>>;
}

/**
 * Synthesize one season of film plays. Distributions are plausible but
 * NOT fitted — this is plumbing validation, not a model of football.
 */
export function synthesizeSeasonFilm(
  season: number,
  seed = 2024,
): SyntheticSeason {
  const rand = mulberry32(seed);
  const teams = ["KC", "BUF", "PHI", "SF"];
  const players: string[] = [];
  for (const t of teams) {
    for (let i = 1; i <= 4; i++) players.push(`${t}-WR${i}`);
  }

  const plays: FilmPlayInput[] = [];
  const yards: Record<string, number> = {};
  const tds: Record<string, number> = {};
  for (const p of players) {
    yards[p] = 0;
    tds[p] = 0;
  }

  let n = 0;
  for (const team of teams) {
    const nPlays = 120 + Math.floor(rand() * 40);
    for (let i = 0; i < nPlays; i++) {
      n += 1;
      const gameId = `syn-${season}-${team}-g${1 + Math.floor(rand() * 3)}`;
      const distribution = DISTRIBUTIONS[Math.floor(rand() * DISTRIBUTIONS.length)]!;
      const personnel = PERSONNEL[Math.floor(rand() * PERSONNEL.length)]!;
      const playType = rand() < 0.58 ? "pass" : "run";
      const down = 1 + Math.floor(rand() * 4);
      const distanceYd = 1 + Math.floor(rand() * 12);
      const yardLineOwn = Math.floor(rand() * 100);
      const qtr = 1 + Math.floor(rand() * 4);
      const clockSec = Math.floor(rand() * 900);
      const routeCount = 2 + Math.floor(rand() * 3);

      const playerMap: Record<string, string> = {};
      const routes = [];
      for (let r = 0; r < routeCount; r++) {
        const trackletId = `t${n}-${r}`;
        const pid = players[Math.floor(rand() * players.length)]!;
        playerMap[trackletId] = pid;
        const route = ROUTES[Math.floor(rand() * ROUTES.length)]!;
        routes.push({
          trackletId,
          route,
          confidence: 0.5 + rand() * 0.4,
          breakPoint: null,
          depthYards: Math.round((3 + rand() * 15) * 10) / 10,
          releaseT: 0,
        });
      }
      const separations = routes.map((r) => ({
        trackletId: r.trackletId,
        route: r.route,
        breakAngleDeg: rand() < 0.7 ? Math.round(rand() * 120) : null,
        sepAtBreakYd: Math.round(rand() * 6 * 10) / 10,
        sepAtCatchYd: Math.round(rand() * 8 * 10) / 10,
        nearestDefenderAtBreak: null,
      }));

      const resultYards =
        playType === "pass" ? Math.round((rand() * 24 - 2) * 10) / 10 : Math.round((rand() * 10 - 1) * 10) / 10;
      const routeCombo = [...routes].map((r) => r.route).sort().join("+");

      const record: PlayRecord = {
        playId: `play_${gameId}_${n}`,
        gameId,
        qtr,
        clockSec,
        down,
        distanceYd,
        yardLineOwn,
        scoreDiff: Math.floor(rand() * 21) - 10,
        possession: team,
        personnel,
        backfield: "shotgun",
        distribution,
        routeCombo,
        playType: playType as PlayRecord["playType"],
        resultYards,
        epa: null,
      };
      plays.push({
        ...record,
        routes,
        separations,
        playerMap,
        snapKind: rand() < 0.9 ? "set" : "hurry-up",
        playConfidence: 0.6 + rand() * 0.3,
      });

      // Grade actuals: credit receiving yards/TDs to route runners.
      if (playType === "pass" && resultYards > 0) {
        const catcher = routes[Math.floor(rand() * routes.length)]!;
        const pid = playerMap[catcher.trackletId]!;
        yards[pid] = (yards[pid] ?? 0) + resultYards;
        if (yardLineOwn + resultYards >= 100 && rand() < 0.5) {
          tds[pid] = (tds[pid] ?? 0) + 1;
        }
      }
    }
  }

  return { season, plays, actualReceivingYards: yards, actualTds: tds };
}

export interface FilmBacktestResult {
  readonly season: number;
  readonly nPlays: number;
  readonly nPlayers: number;
  readonly rows: ShadowSlateRow[];
}

/**
 * Run the full bridge on a synthetic season and return the shadow
 * ledger rows. The engine arm uses the REAL anytimeTdProbability —
 * this is the genuine engine running twice, not a stub.
 */
export function runFilmBacktest2024(
  season = 2024,
  seed = 2024,
): FilmBacktestResult {
  const syn = synthesizeSeasonFilm(season, seed);
  const playerFeatures = extractAllPlayerFilmFeatures(syn.plays);

  const baseRolling: RollingRoleFeatures = {
    windowGames: 4,
    snapShare: 0.7,
    redZoneShare: 0.2,
    usageShare: 0.22,
    teamPlaysPerGame: 65,
    oppTdRateAllowed: 0.24,
  };

  const rows = runShadowSlate(
    playerFeatures.flatMap((pf) => {
      const adapted = toPropsInputs(pf, baseRolling);
      const tdPrior = adapted.priors.find((p) => p.market === "anytime_td");
      const actualTd = (syn.actualTds[pf.playerId] ?? 0) > 0 ? 1 : 0;
      return [
        {
          slateId: `${season}-w99-props-synth`,
          lane: "props" as const,
          subjectId: pf.playerId,
          market: "anytime_td",
          line: null,
          controlInputs: adapted.pair.control,
          treatmentInputs: adapted.pair.treatment,
          runEngine: (r: RollingRoleFeatures) =>
            anytimeTdProbability({
              playerId: pf.playerId,
              season,
              week: 99,
              position: "WR",
              isHome: true,
              rolling: r,
              injuryStatus: "HEALTHY",
            }).probability,
          filmPrior: tdPrior?.prior ?? null,
          actual: actualTd,
        },
      ];
    }),
  );

  return {
    season,
    nPlays: syn.plays.length,
    nPlayers: playerFeatures.length,
    rows,
  };
}
