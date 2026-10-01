/**
 * Player film features: PlayRecord[] → per-player feature vectors.
 *
 * Answers: "What does THIS player do on film?" — route mix, target share
 * by formation, separation at break/catch, break angle, route depth,
 * red-zone involvement. Every vector carries FilmProvenance (source film,
 * weight 0, UNCALIBRATED).
 *
 * Identity comes from the tracklet→player map. No map, no player
 * attribution — the extractor returns null rather than guessing which
 * dot is which receiver.
 *
 * Original implementation for GSE.
 */

import type { FilmPlayInput } from "./film-types.js";
import { filmProvenance, type FilmProvenance } from "./film-provenance.js";

export interface PlayerFilmFeatures {
  readonly playerId: string;
  /** Plays where this player was identified on film. */
  readonly nPlays: number;
  /** Classified routes attributed to this player. */
  readonly nRoutes: number;
  /** Route name → share of the player's classified routes. */
  readonly routeMix: Readonly<Record<string, number>>;
  /** Formation distribution → share of the player's routes from it. */
  readonly targetShareByFormation: Readonly<Record<string, number>>;
  readonly avgSepAtBreakYd: number | null;
  readonly avgSepAtCatchYd: number | null;
  readonly avgBreakAngleDeg: number | null;
  readonly avgDepthYards: number | null;
  /**
   * Share of the player's routes run with the ball inside the opponent's
   * 20 (yardLineOwn >= 80). Null when no yard-line data.
   */
  readonly redZoneRouteShare: number | null;
  readonly provenance: FilmProvenance;
}

function mean(xs: readonly number[]): number | null {
  if (xs.length === 0) return null;
  return Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 1000) / 1000;
}

function shareMap(counts: ReadonlyMap<string, number>): Record<string, number> {
  const total = [...counts.values()].reduce((a, b) => a + b, 0);
  const out: Record<string, number> = {};
  if (total === 0) return out;
  for (const [k, n] of counts) out[k] = Math.round((n / total) * 1000) / 1000;
  return out;
}

/**
 * Extract film features for one player. Returns null when the player
 * never appears in the identity map (no attribution, no guessing).
 */
export function extractPlayerFilmFeatures(
  plays: readonly FilmPlayInput[],
  playerId: string,
): PlayerFilmFeatures | null {
  const routeCounts = new Map<string, number>();
  const formationCounts = new Map<string, number>();
  const sepBreak: number[] = [];
  const sepCatch: number[] = [];
  const breakAngles: number[] = [];
  const depths: number[] = [];
  let redZoneRoutes = 0;
  let yardLineRoutes = 0;
  let nPlays = 0;
  const confidences: number[] = [];

  for (const play of plays) {
    const playerMap = play.playerMap;
    if (!playerMap) continue;
    const routes = play.routes ?? [];
    const myRoutes = routes.filter((r) => playerMap[r.trackletId] === playerId);
    if (myRoutes.length === 0) continue;
    nPlays += 1;
    if (play.playConfidence != null) confidences.push(play.playConfidence);

    const seps = new Map(
      (play.separations ?? []).map((s) => [s.trackletId, s]),
    );
    for (const r of myRoutes) {
      routeCounts.set(r.route, (routeCounts.get(r.route) ?? 0) + 1);
      const formation = play.distribution ?? "unknown";
      formationCounts.set(formation, (formationCounts.get(formation) ?? 0) + 1);
      depths.push(r.depthYards);
      const sep = seps.get(r.trackletId);
      if (sep?.sepAtBreakYd != null) sepBreak.push(sep.sepAtBreakYd);
      if (sep?.sepAtCatchYd != null) sepCatch.push(sep.sepAtCatchYd);
      if (sep?.breakAngleDeg != null) breakAngles.push(sep.breakAngleDeg);
      if (play.yardLineOwn != null) {
        yardLineRoutes += 1;
        if (play.yardLineOwn >= 80) redZoneRoutes += 1;
      }
    }
  }

  if (nPlays === 0) return null;

  const nRoutes = [...routeCounts.values()].reduce((a, b) => a + b, 0);
  return {
    playerId,
    nPlays,
    nRoutes,
    routeMix: shareMap(routeCounts),
    targetShareByFormation: shareMap(formationCounts),
    avgSepAtBreakYd: mean(sepBreak),
    avgSepAtCatchYd: mean(sepCatch),
    avgBreakAngleDeg: mean(breakAngles),
    avgDepthYards: mean(depths),
    redZoneRouteShare:
      yardLineRoutes > 0
        ? Math.round((redZoneRoutes / yardLineRoutes) * 1000) / 1000
        : null,
    provenance: filmProvenance(nPlays, mean(confidences) ?? 0.5),
  };
}

/** Extract features for every player present in any play's identity map. */
export function extractAllPlayerFilmFeatures(
  plays: readonly FilmPlayInput[],
): PlayerFilmFeatures[] {
  const ids = new Set<string>();
  for (const play of plays) {
    const playerMap = play.playerMap;
    if (!playerMap) continue;
    for (const pid of Object.values(playerMap)) ids.add(pid);
  }
  const out: PlayerFilmFeatures[] = [];
  for (const pid of ids) {
    const f = extractPlayerFilmFeatures(plays, pid);
    if (f) out.push(f);
  }
  return out.sort((a, b) => b.nPlays - a.nPlays);
}
