/**
 * Shared fixtures for film-features tests.
 * NOT a test file itself — vitest only picks up *.test.ts.
 */

import type { FilmPlayInput } from "./film-types.js";
import type { Route } from "../perception/cv-route-extract.js";
import type { SeparationMetrics } from "../perception/cv-separation-metrics.js";

let seq = 0;

export function makeRoute(
  trackletId: string,
  route: Route["route"],
  depthYards = 10,
): Route {
  return {
    trackletId,
    route,
    confidence: 0.85,
    breakPoint: null,
    depthYards,
    releaseT: 0,
  };
}

export function makeSeparation(
  trackletId: string,
  route: string,
  sepAtBreakYd: number | null = 3,
  sepAtCatchYd: number | null = 4,
  breakAngleDeg: number | null = 90,
): SeparationMetrics {
  return {
    trackletId,
    route,
    breakAngleDeg,
    sepAtBreakYd,
    sepAtCatchYd,
    nearestDefenderAtBreak: "def-1",
  };
}

export interface PlaySpec {
  readonly possession?: string;
  readonly down?: number | null;
  readonly distanceYd?: number | null;
  readonly yardLineOwn?: number | null;
  readonly qtr?: number | null;
  readonly clockSec?: number | null;
  readonly scoreDiff?: number | null;
  readonly personnel?: string | null;
  readonly distribution?: string | null;
  readonly playType?: FilmPlayInput["playType"];
  readonly resultYards?: number | null;
  readonly snapKind?: "set" | "hurry-up";
  /** [trackletId, playerId, route, depth][] */
  readonly receivers?: ReadonlyArray<
    readonly [string, string, Route["route"], number]
  >;
  readonly gameId?: string;
}

export function makePlay(spec: PlaySpec = {}): FilmPlayInput {
  seq += 1;
  const gameId = spec.gameId ?? "test-game";
  // Explicit nulls are meaningful (missing data); only undefined → default.
  const pick = <T>(v: T | undefined, d: T): T => (v === undefined ? d : v);
  const playerMap: Record<string, string> = {};
  const routes: Route[] = [];
  const separations: SeparationMetrics[] = [];
  for (const [tid, pid, route, depth] of spec.receivers ?? []) {
    playerMap[tid] = pid;
    routes.push(makeRoute(tid, route, depth));
    separations.push(makeSeparation(tid, route));
  }
  const routeCombo =
    routes.length > 0
      ? [...routes].map((r) => r.route).sort().join("+")
      : null;
  return {
    playId: `play_${gameId}_${seq}`,
    gameId,
    qtr: pick(spec.qtr, 2),
    clockSec: pick(spec.clockSec, 600),
    down: pick(spec.down, 1),
    distanceYd: pick(spec.distanceYd, 10),
    yardLineOwn: pick(spec.yardLineOwn, 25),
    scoreDiff: pick(spec.scoreDiff, 0),
    possession: spec.possession ?? "KC",
    personnel: pick(spec.personnel, "11"),
    backfield: "shotgun",
    distribution: pick(spec.distribution, "trips-right"),
    routeCombo,
    playType: spec.playType ?? "pass",
    resultYards: spec.resultYards ?? null,
    epa: null,
    routes,
    separations,
    playerMap,
    snapKind: spec.snapKind ?? "set",
    playConfidence: 0.8,
  };
}

/** A small deterministic corpus: 12 KC pass plays, known structure. */
export function makeCorpus(): FilmPlayInput[] {
  const plays: FilmPlayInput[] = [];
  const routes: Array<Route["route"]> = ["go", "slant", "out", "dig"];
  for (let i = 0; i < 12; i++) {
    plays.push(
      makePlay({
        possession: "KC",
        down: (i % 3) + 1,
        distanceYd: 5 + (i % 3) * 3,
        yardLineOwn: 20 + i * 5,
        distribution: i % 2 === 0 ? "trips-right" : "2x2",
        playType: i % 4 === 3 ? "run" : "pass",
        resultYards: 4 + i,
        receivers: [
          [`kc-t${i}-a`, "KC-WR1", routes[i % 4]!, 8 + i],
          [`kc-t${i}-b`, "KC-WR2", routes[(i + 1) % 4]!, 6 + i],
        ],
      }),
    );
  }
  return plays;
}
