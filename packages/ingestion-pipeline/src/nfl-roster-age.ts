/**
 * Age at kickoff from the official active roster.
 *
 * The published rest kernel asks for a snap-weighted age. These rows have no
 * snap counts, so the mean is equal-weight across status ACT. A caller that
 * hides that is claiming a measurement this file does not have.
 */
import { NFL_ACT_ROSTER } from "./priors/nfl-2026-act-roster.js";

const YEAR_MS = 365.25 * 24 * 60 * 60 * 1000;
const OL = new Set(["OT", "G", "C"]);

export interface RosterAgeReading {
  readonly observedAt: string;
  readonly equalWeightAge: number;
  readonly olEqualWeightAge: number;
  readonly olCount: number;
  readonly actCount: number;
  /** Most experienced active quarterback. The roster does not name a starter. */
  readonly mostExperiencedQbAge: number;
  readonly mostExperiencedQbExp: number;
}

function ageYears(birth: string, at: Date): number | null {
  const born = Date.parse(`${birth}T00:00:00Z`);
  if (!Number.isFinite(born)) return null;
  const years = (at.getTime() - born) / YEAR_MS;
  if (years < 18 || years > 50) return null;
  return years;
}

function mean(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, n) => sum + n, 0) / values.length;
}

export function rosterAgeAt(abbr: string, at: Date): RosterAgeReading | null {
  const roster = NFL_ACT_ROSTER[abbr];
  if (roster == null) return null;
  const observed = Date.parse(roster.observedAt);
  if (!Number.isFinite(observed) || at.getTime() <= observed) return null;
  const ages: number[] = [];
  const ol: number[] = [];
  let qb: { age: number; exp: number } | null = null;
  for (const player of roster.players) {
    const age = ageYears(player.birth, at);
    if (age == null) continue;
    ages.push(age);
    if (OL.has(player.pos)) ol.push(age);
    if (player.pos === "QB" && (qb == null || player.exp > qb.exp)) {
      qb = { age, exp: player.exp };
    }
  }
  const equal = mean(ages);
  const olMean = mean(ol);
  if (equal == null || olMean == null || ol.length < 3 || qb == null) return null;
  if (ages.length < 40) return null;
  return {
    observedAt: roster.observedAt,
    equalWeightAge: equal,
    olEqualWeightAge: olMean,
    olCount: ol.length,
    actCount: ages.length,
    mostExperiencedQbAge: qb.age,
    mostExperiencedQbExp: qb.exp,
  };
}
