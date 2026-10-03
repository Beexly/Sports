/**
 * GSE weekly fantasy-point projection (v1) — composed only from already-cleared signals.
 *
 * This is the keystone the in-season suite (start/sit, waivers, trade) needs: a forward
 * weekly point projection that is OURS — derived from open data, transparent, and scored
 * in public. It does NOT invent numbers. It anchors on the cleared weekly **expected
 * points** (xFP) signal and applies small, bounded, fully-documented adjustments built
 * from other cleared building blocks:
 *
 *   point = xfpPerGame
 *         × processMult    (regression toward player-model process grade)
 *         × opponentMult   (opponent-adjusted EPA of the defense faced — "our DVOA")
 *         × environmentMult (Vegas implied total, home/away, rest)
 *
 * Availability only **widens the band**, never shifts the mean (mirrors the conservative
 * `human-performance/availability` doctrine); an official "Out" zeroes the projection.
 *
 * Output is a `derived_signal` (per `data-rules.ts`) we own. It ships **GATED**
 * (`canPublishProjections: false`) — flipping it on requires a live backtest
 * (MAE/Brier via `lib/calibration/compute.ts`) + a `model-freeze` calibration proposal.
 * Pure + deterministic (now-injectable). The network loaders that assemble the inputs
 * live elsewhere; this module is just the math, so it is unit-testable without I/O.
 */

import type { StatProvenance } from "../metrics/opponent-adjusted-epa";

export type ModelPosition = "QB" | "RB" | "WR" | "TE";

/**
 * Per-player season anchors — outputs of the already-built cleared building blocks
 * (`expected-points`, `player-model`, `human-performance/availability`).
 */
export interface PlayerWeeklyAnchors {
  readonly playerId: string;
  readonly name: string;
  readonly team: string;
  readonly position: ModelPosition;
  /** Weekly expected fantasy points (PPR) — the central anchor (ExpectedPointsRow.xfpPerGame). */
  readonly xfpPerGame: number;
  /** 0–100 process grade (PlayerProfile.processGrade); 50 = neutral. Regression signal. */
  readonly processGrade: number;
  /** Availability band-widen fraction 0..~0.6 (HumanAvailabilityModifier.bandWidenPct). */
  readonly availabilityBandWiden?: number | null;
  /** Official "Out" designation — zeroes the projection (no fabricated production). */
  readonly isOut?: boolean | null;
}

/**
 * Game-environment context for one player's matchup, from cleared providers (the Odds API
 * we license, ESPN public, nflverse). All optional — a missing feature is simply neutral.
 */
export interface MatchupEnvironment {
  /** Vegas implied team total (points) for THIS player's team. League-average ≈ 22.5. */
  readonly impliedTeamTotal?: number | null;
  readonly home?: boolean | null;
  /** Days of rest since last game (<6 = short week, >7 = bye/extra). */
  readonly daysRest?: number | null;
  /**
   * Opponent's opponent-adjusted defensive EPA/play allowed for the RELEVANT phase
   * (pass D for QB/WR/TE, rush D for RB), from `opponentAdjustedEpa().ratings[].defAdj`.
   * Caller resolves the phase. Units: EPA/play (≈ −0.2..+0.2). Higher = softer defense.
   */
  readonly opponentDefAdj?: number | null;
}

export interface WeeklyProjection {
  readonly playerId: string;
  readonly name: string;
  readonly team: string;
  readonly position: ModelPosition;
  /** Central weekly PPR projection. */
  readonly point: number;
  readonly floor: number;
  readonly ceiling: number;
  /** Human-readable adjustment trail (auditability). */
  readonly drivers: readonly string[];
}

export interface WeeklyModelResult {
  readonly generatedAt: string;
  readonly projections: readonly WeeklyProjection[];
  /** GATED until a live backtest proves calibration; flip is a [DATA] handoff, not code. */
  readonly canPublishProjections: false;
  /** This output is a signal we generate from cleared facts — we own it. */
  readonly classification: "derived_signal";
  readonly provenance: StatProvenance;
}

const clamp = (n: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, n));
const round2 = (n: number): number => Math.round(n * 100) / 100;

// Adjustment caps — deliberately small so the projection stays anchored to the cleared
// xFP signal and never drifts into invention. Each is a documented modelling choice.
const PROCESS_MAX = 0.06; // ±6% pull toward process grade
const OPPONENT_MAX = 0.12; // ±12% for the defense faced
const OPPONENT_EPA_SCALE = 0.1; // defAdj of ±0.10 EPA/play ⇒ full ±OPPONENT_MAX
const TOTAL_MAX = 0.15; // ±15% for Vegas implied total
const LEAGUE_AVG_TOTAL = 22.5;
const HOME_BONUS = 0.015; // +1.5% at home
const SHORT_WEEK_PENALTY = 0.03; // −3% on a short week (<6 days rest)

/** Position baseline volatility (band half-width as a fraction of the point estimate). */
const POSITION_VOLATILITY: Record<ModelPosition, number> = {
  QB: 0.18,
  RB: 0.28,
  WR: 0.32,
  TE: 0.34,
};

function projectOne(anchor: PlayerWeeklyAnchors, env: MatchupEnvironment): WeeklyProjection {
  const drivers: string[] = [];

  if (anchor.isOut) {
    return {
      playerId: anchor.playerId,
      name: anchor.name,
      team: anchor.team,
      position: anchor.position,
      point: 0,
      floor: 0,
      ceiling: 0,
      drivers: ["Ruled OUT: projected to 0 (no fabricated production)."],
    };
  }

  const base = Math.max(0, anchor.xfpPerGame);

  // 1) Process regression: nudge toward the player-model process grade (50 = neutral).
  const processMult = 1 + clamp((anchor.processGrade - 50) / 50, -1, 1) * PROCESS_MAX;
  if (Math.abs(processMult - 1) > 1e-9) {
    drivers.push(`Process grade ${Math.round(anchor.processGrade)} → ${pct(processMult)}.`);
  }

  // 2) Opponent adjustment from opponent-adjusted EPA ("our DVOA"). Higher defAdj = softer D.
  let opponentMult = 1;
  if (env.opponentDefAdj != null) {
    opponentMult = 1 + clamp(env.opponentDefAdj / OPPONENT_EPA_SCALE, -1, 1) * OPPONENT_MAX;
    drivers.push(`Opponent-adj EPA ${signed(env.opponentDefAdj)} → ${pct(opponentMult)}.`);
  }

  // 3) Game environment: Vegas implied total, home/away, rest.
  let environmentMult = 1;
  if (env.impliedTeamTotal != null) {
    const totalMult =
      1 + clamp((env.impliedTeamTotal - LEAGUE_AVG_TOTAL) / LEAGUE_AVG_TOTAL, -1, 1) * TOTAL_MAX;
    environmentMult *= totalMult;
    drivers.push(`Implied total ${anchor.team} ${round2(env.impliedTeamTotal)} → ${pct(totalMult)}.`);
  }
  if (env.home === true) environmentMult *= 1 + HOME_BONUS;
  if (env.daysRest != null && env.daysRest < 6) {
    environmentMult *= 1 - SHORT_WEEK_PENALTY;
    drivers.push(`Short week (${env.daysRest}d rest) → −${(SHORT_WEEK_PENALTY * 100).toFixed(0)}%.`);
  }

  const point = base * processMult * opponentMult * environmentMult;

  // 4) Band: position baseline volatility, widened (never shifted) by availability risk.
  const widen = clamp(anchor.availabilityBandWiden ?? 0, 0, 0.6);
  const vol = clamp(POSITION_VOLATILITY[anchor.position] + widen, 0, 0.9);
  if (widen > 0) drivers.push(`Availability risk widens band +${(widen * 100).toFixed(0)}%.`);

  return {
    playerId: anchor.playerId,
    name: anchor.name,
    team: anchor.team,
    position: anchor.position,
    point: round2(point),
    floor: round2(point * (1 - vol)),
    ceiling: round2(point * (1 + vol)),
    drivers,
  };
}

const pct = (mult: number): string => `${mult >= 1 ? "+" : ""}${((mult - 1) * 100).toFixed(1)}%`;
const signed = (n: number): string => `${n >= 0 ? "+" : ""}${round2(n)}`;

function provenance(computedAt: string): StatProvenance {
  return {
    source: "nflverse (CC-BY-4.0) weekly xFP + player-model + opponent-adjusted EPA; Vegas total via licensed odds",
    definition:
      "GSE weekly PPR projection v1: anchors on cleared weekly expected points (xFP) and applies bounded, " +
      "documented multipliers for process grade, opponent-adjusted defense faced, and game environment " +
      "(implied total, home/away, rest). Availability only widens the band; an official Out zeroes it.",
    weakness:
      "v1 is a transparent composition, NOT yet backtested. Ships gated (canPublishProjections:false). " +
      "Adjustment caps are modelling choices; no player-vs-player matchup interaction; the opponent term " +
      "needs phase-correct (pass/rush) defAdj from the caller. Calibration (MAE/Brier) gates go-live.",
    computedAt,
  };
}

/**
 * Project a slate of players for the week. Pure + deterministic. Ships GATED.
 *
 * @param anchors per-player cleared season anchors (xFP + process grade + availability)
 * @param envOf   resolves the matchup environment for a player (Vegas/opponent/rest)
 */
export function projectWeekly(
  anchors: readonly PlayerWeeklyAnchors[],
  envOf: (a: PlayerWeeklyAnchors) => MatchupEnvironment = () => ({}),
  { now = new Date() }: { now?: Date } = {},
): WeeklyModelResult {
  const projections = anchors
    .map((a) => projectOne(a, envOf(a)))
    .sort((x, y) => y.point - x.point);

  return {
    generatedAt: now.toISOString(),
    projections,
    canPublishProjections: false,
    classification: "derived_signal",
    provenance: provenance(now.toISOString()),
  };
}
