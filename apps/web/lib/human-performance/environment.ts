/**
 * Performance Environment Score (PES) — team-context quality from PUBLIC facts.
 *
 * What ships today is built only from public-record inputs we can state
 * honestly: each NFL home venue's playing surface (grass vs. synthetic) and
 * roof type (controlled/dome vs. open-air). Surface scoring follows published
 * NFL/NFLPA field-safety research (synthetic turf has shown higher lower-limb
 * injury rates than natural grass); roof maps to environmental control. These
 * are `modeled` scores derived from `official` facts — never invented numbers.
 *
 * The NFLPA report-card factors (training staff/room, weight room, nutrition,
 * strength coaches, facility, travel, coaching/staff continuity) are PRIOR-
 * MANUAL: they require a manually-curated, attributed public snapshot entered
 * behind the founder gate. Until then they are simply ABSENT — the score
 * re-normalizes over present factors so a thin score is honest, not fabricated.
 */

import type { EnvironmentFactor, PerformanceEnvironmentScore, ProvenanceTier } from "./types";

export type Surface = "grass" | "synthetic";

export interface VenueEnvironment {
  readonly team: string;
  readonly venue: string;
  readonly surface: Surface;
  /** Controlled environment: fixed dome OR retractable roof (climate-controllable). */
  readonly controlledRoof: boolean;
}

/**
 * Public-record home-venue facts (2025 season). Surface + roof are publicly
 * documented for every stadium; this is reference data, not a claim.
 */
export const NFL_VENUE_ENV: Readonly<Record<string, VenueEnvironment>> = {
  ARI: { team: "ARI", venue: "State Farm Stadium", surface: "grass", controlledRoof: true },
  ATL: { team: "ATL", venue: "Mercedes-Benz Stadium", surface: "synthetic", controlledRoof: true },
  BAL: { team: "BAL", venue: "M&T Bank Stadium", surface: "grass", controlledRoof: false },
  BUF: { team: "BUF", venue: "Highmark Stadium", surface: "synthetic", controlledRoof: false },
  CAR: { team: "CAR", venue: "Bank of America Stadium", surface: "synthetic", controlledRoof: false },
  CHI: { team: "CHI", venue: "Soldier Field", surface: "grass", controlledRoof: false },
  CIN: { team: "CIN", venue: "Paycor Stadium", surface: "synthetic", controlledRoof: false },
  CLE: { team: "CLE", venue: "Huntington Bank Field", surface: "grass", controlledRoof: false },
  DAL: { team: "DAL", venue: "AT&T Stadium", surface: "synthetic", controlledRoof: true },
  DEN: { team: "DEN", venue: "Empower Field at Mile High", surface: "grass", controlledRoof: false },
  DET: { team: "DET", venue: "Ford Field", surface: "synthetic", controlledRoof: true },
  GB: { team: "GB", venue: "Lambeau Field", surface: "grass", controlledRoof: false },
  HOU: { team: "HOU", venue: "NRG Stadium", surface: "synthetic", controlledRoof: true },
  IND: { team: "IND", venue: "Lucas Oil Stadium", surface: "synthetic", controlledRoof: true },
  JAX: { team: "JAX", venue: "EverBank Stadium", surface: "grass", controlledRoof: false },
  KC: { team: "KC", venue: "Arrowhead Stadium", surface: "grass", controlledRoof: false },
  LV: { team: "LV", venue: "Allegiant Stadium", surface: "grass", controlledRoof: true },
  LAC: { team: "LAC", venue: "SoFi Stadium", surface: "synthetic", controlledRoof: true },
  LAR: { team: "LAR", venue: "SoFi Stadium", surface: "synthetic", controlledRoof: true },
  MIA: { team: "MIA", venue: "Hard Rock Stadium", surface: "grass", controlledRoof: false },
  MIN: { team: "MIN", venue: "U.S. Bank Stadium", surface: "synthetic", controlledRoof: true },
  NE: { team: "NE", venue: "Gillette Stadium", surface: "synthetic", controlledRoof: false },
  NO: { team: "NO", venue: "Caesars Superdome", surface: "synthetic", controlledRoof: true },
  NYG: { team: "NYG", venue: "MetLife Stadium", surface: "synthetic", controlledRoof: false },
  NYJ: { team: "NYJ", venue: "MetLife Stadium", surface: "synthetic", controlledRoof: false },
  PHI: { team: "PHI", venue: "Lincoln Financial Field", surface: "grass", controlledRoof: false },
  PIT: { team: "PIT", venue: "Acrisure Stadium", surface: "grass", controlledRoof: false },
  SF: { team: "SF", venue: "Levi's Stadium", surface: "grass", controlledRoof: false },
  SEA: { team: "SEA", venue: "Lumen Field", surface: "synthetic", controlledRoof: false },
  TB: { team: "TB", venue: "Raymond James Stadium", surface: "grass", controlledRoof: false },
  TEN: { team: "TEN", venue: "Nissan Stadium", surface: "grass", controlledRoof: false },
  WAS: { team: "WAS", venue: "Northwest Stadium", surface: "grass", controlledRoof: false },
};

/**
 * Default factor weights (mirrors the design's §7 table; absolute values need
 * not sum to 1 — the score re-normalizes over whichever factors are present).
 */
export const DEFAULT_FACTOR_WEIGHTS: Readonly<Record<string, number>> = {
  surfaceQuality: 0.15,
  scheduleFatigue: 0.15,
  travelConditions: 0.12,
  trainingStaff: 0.12,
  climateContext: 0.1,
  trainingRoom: 0.1,
  strengthCoaches: 0.1,
  weightRoom: 0.08,
  nutritionDietician: 0.08,
  coachingStability: 0.06,
  staffContinuity: 0.06,
  facilityQuality: 0.04,
};

const SURFACE_NOTE =
  "Surface score follows published NFL/NFLPA field-safety research (synthetic turf has shown higher lower-limb injury rates than natural grass). Derived from the venue's documented surface — not a claim about any player.";
const CLIMATE_NOTE =
  "Climate score reflects environmental control: a fixed dome or retractable roof is climate-controllable; open-air venues are weather-exposed. Derived from the venue's documented roof type.";

/**
 * PES = Σ(wᵢ·factorᵢ) / Σ(wᵢ over PRESENT factors). Missing factors never
 * fabricate a score; they simply drop out of the weighted mean. Pure.
 */
export function computeEnvironmentScore(
  factors: Readonly<Record<string, EnvironmentFactor>>,
  weights: Readonly<Record<string, number>> = DEFAULT_FACTOR_WEIGHTS,
): { overall: number; presentFactorCount: number } {
  const present = Object.keys(factors);
  let weighted = 0;
  let weightSum = 0;
  for (const key of present) {
    const w = weights[key] ?? 0;
    if (w <= 0) continue;
    weighted += w * Math.max(0, Math.min(100, factors[key]!.value));
    weightSum += w;
  }
  if (weightSum === 0) return { overall: 0, presentFactorCount: 0 };
  return { overall: Math.round(weighted / weightSum), presentFactorCount: present.length };
}

/**
 * Build the Performance Environment Score for a team from the public venue
 * facts we hold today. Pure + synchronous (no external fetch needed for these
 * factors). Unknown team → honest empty score.
 */
export function loadEnvironmentScore({
  team,
  sport = "NFL",
  asOf = new Date().toISOString(),
}: {
  team: string;
  sport?: string;
  asOf?: string;
}): PerformanceEnvironmentScore {
  const code = team.trim().toUpperCase();
  const venue = NFL_VENUE_ENV[code];

  if (!venue) {
    return {
      team: code,
      sport,
      asOf,
      overall: 0,
      factors: {},
      presentFactorCount: 0,
      note: `No public venue facts for "${code}". The environment score renders empty rather than guessing.`,
    };
  }

  const tier: ProvenanceTier = "modeled";
  const factors: Record<string, EnvironmentFactor> = {
    surfaceQuality: {
      value: venue.surface === "grass" ? 85 : 60,
      source: `Public record — ${venue.venue} surface (${venue.surface})`,
      tier,
      asOf,
    },
    climateContext: {
      value: venue.controlledRoof ? 90 : 70,
      source: `Public record — ${venue.venue} roof (${venue.controlledRoof ? "controlled" : "open-air"})`,
      tier,
      asOf,
    },
  };

  const { overall, presentFactorCount } = computeEnvironmentScore(factors);

  return {
    team: code,
    sport,
    asOf,
    overall,
    factors,
    presentFactorCount,
    note:
      `${SURFACE_NOTE} ${CLIMATE_NOTE} ` +
      "Training-staff, weight-room, nutrition, facility, travel, and coaching-continuity factors require a manually-curated NFLPA report-card snapshot (public, attributed) entered behind the founder gate — until then they are absent, and the score reflects only the venue factors above.",
  };
}
