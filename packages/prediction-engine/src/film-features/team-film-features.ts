/**
 * Team film features: PlayRecord[] → per-team tendency feature vectors.
 *
 * Answers: "What does THIS team do on film, by situation?" — the full
 * down×distance run/pass matrix (reusing Stream D's tendency math),
 * formation frequency, yards-per-play by formation (an EPA-less success
 * proxy until EPA is plumbed), play-action/screen rates, hurry-up rate.
 *
 * Sparse cells return null, not noise — same minimum-sample guards as
 * the tendency layer.
 *
 * Original implementation for GSE.
 */

import {
  distanceBucket,
  downDistanceMatrix,
  type DownTendencyRow,
} from "../perception/cv-tendencies.js";
import type { FilmPlayInput } from "./film-types.js";
import { situationKey } from "./film-types.js";
import { filmProvenance, type FilmProvenance } from "./film-provenance.js";

export interface TeamFilmFeatures {
  readonly team: string;
  readonly nPlays: number;
  /** Full down × distance run/pass matrix (sparse cells omitted). */
  readonly downDistance: readonly DownTendencyRow[];
  /** "personnel|distribution" → share of the team's plays. */
  readonly formationFreq: Readonly<Record<string, number>>;
  /** "personnel|distribution" → mean result yards (null when unobserved). */
  readonly yardsPerPlayByFormation: Readonly<Record<string, number | null>>;
  readonly playActionRate: number | null;
  readonly screenRate: number | null;
  /** Share of snaps from a hurry-up (no clean pre-snap set). */
  readonly hurryUpRate: number | null;
  readonly provenance: FilmProvenance;
}

function formationKey(play: FilmPlayInput): string {
  return `${play.personnel ?? "??"}|${play.distribution ?? "unknown"}`;
}

function rate(n: number, d: number): number | null {
  if (d === 0) return null;
  return Math.round((n / d) * 1000) / 1000;
}

export function extractTeamFilmFeatures(
  plays: readonly FilmPlayInput[],
  team: string,
  minN = 5,
): TeamFilmFeatures | null {
  const rows = plays.filter((p) => p.possession === team);
  if (rows.length === 0) return null;

  const formCounts = new Map<string, number>();
  const formYards = new Map<string, number[]>();
  let playAction = 0;
  let screens = 0;
  let hurryUp = 0;
  let snapKnown = 0;
  let classifiable = 0;
  const confidences: number[] = [];

  for (const p of rows) {
    const key = formationKey(p);
    formCounts.set(key, (formCounts.get(key) ?? 0) + 1);
    if (p.resultYards != null) {
      const arr = formYards.get(key) ?? [];
      arr.push(p.resultYards);
      formYards.set(key, arr);
    }
    if (p.playType === "play-action") playAction += 1;
    if (p.playType === "screen") screens += 1;
    if (
      p.playType === "run" ||
      p.playType === "pass" ||
      p.playType === "play-action" ||
      p.playType === "screen"
    ) {
      classifiable += 1;
    }
    if (p.snapKind) {
      snapKnown += 1;
      if (p.snapKind === "hurry-up") hurryUp += 1;
    }
    if (p.playConfidence != null) confidences.push(p.playConfidence);
  }

  const total = rows.length;
  const formationFreq: Record<string, number> = {};
  for (const [k, n] of formCounts) {
    formationFreq[k] = Math.round((n / total) * 1000) / 1000;
  }
  const yardsPerPlayByFormation: Record<string, number | null> = {};
  for (const [k] of formCounts) {
    const ys = formYards.get(k) ?? [];
    yardsPerPlayByFormation[k] =
      ys.length > 0
        ? Math.round((ys.reduce((a, b) => a + b, 0) / ys.length) * 100) / 100
        : null;
  }

  // Situation-keyed pass lean for the pick lane: P(pass | situation).
  const downDistance = downDistanceMatrix(rows, team, minN);

  return {
    team,
    nPlays: total,
    downDistance,
    formationFreq,
    yardsPerPlayByFormation,
    playActionRate: rate(playAction, classifiable),
    screenRate: rate(screens, classifiable),
    hurryUpRate: rate(hurryUp, snapKnown),
    provenance: filmProvenance(
      total,
      confidences.length > 0
        ? confidences.reduce((a, b) => a + b, 0) / confidences.length
        : 0.5,
    ),
  };
}

/** Pass lean P(pass|situation) keyed by situation, sparse cells null. */
export function passLeanBySituation(
  features: TeamFilmFeatures,
): Readonly<Record<string, number | null>> {
  const out: Record<string, number | null> = {};
  for (const row of features.downDistance) {
    const key = `${row.down}${
      row.down === 1 ? "st" : row.down === 2 ? "nd" : row.down === 3 ? "rd" : "th"
    }-${row.bucket}`;
    out[key] = row.passRate;
  }
  return out;
}

export { distanceBucket, situationKey };
