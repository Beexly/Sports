/**
 * FANTASY DISCOVERY LAYER — Fantasy Absorption Half-Life (Invention F3).
 *
 * The fantasy version of stale-book detection: how long does it take each surface (props, DFS
 * salary, ownership, analyst ranks, platform projections, roster %, start %, add/drop velocity,
 * ADP, trade value, waivers) to absorb a role-truth change? Betting markets help detect truth;
 * fantasy markets reveal how SLOWLY humans and platforms absorb it — and the slow absorbers are
 * where the decision edge lives. Pure + deterministic.
 */

export type FantasySurface =
  | "sportsbook_prop" | "dfs_salary" | "dfs_ownership" | "analyst_rank" | "platform_projection"
  | "roster_pct" | "start_pct" | "add_drop_velocity" | "adp" | "trade_value" | "waiver_market";

const ms = (iso: string): number => Date.parse(iso);

export interface SurfaceReaction {
  readonly surface: FantasySurface;
  /** When this surface first reflected the new role truth. */
  readonly reactionTime: string;
  /** First time the role truth was validly knowable. */
  readonly truthTime: string;
}

export interface SurfaceLag {
  readonly surface: FantasySurface;
  readonly lagMinutes: number | null;
  readonly note: string;
}

/** Absorption lag for one surface (minutes between knowable truth and surface reaction). */
export function absorptionLag(r: SurfaceReaction): SurfaceLag {
  const react = ms(r.reactionTime), truth = ms(r.truthTime);
  if (!Number.isFinite(react) || !Number.isFinite(truth)) return { surface: r.surface, lagMinutes: null, note: "Unparseable timestamps." };
  const lag = (react - truth) / 60_000;
  return {
    surface: r.surface,
    lagMinutes: Number(lag.toFixed(1)),
    note: lag <= 0 ? "Reacted at/before truth became knowable (fast/leading surface)." : `Lagged ~${Math.round(lag)} min behind knowable truth.`,
  };
}

/** Rank surfaces slowest-first — the slow absorbers are the exploitable decision windows. */
export function rankSurfacesBySlowness(reactions: readonly SurfaceReaction[]): SurfaceLag[] {
  return reactions.map(absorptionLag).filter((l) => l.lagMinutes != null).sort((a, b) => (b.lagMinutes ?? 0) - (a.lagMinutes ?? 0));
}

export interface GapSample {
  readonly minutesSinceTruth: number;
  readonly valueGapRemaining: number; // 0..1
}

/**
 * Estimate the half-life: minutes until 50% of the initial value gap has closed. Linear
 * interpolation between the bracketing samples; null if it never reaches 50% in the window.
 */
export function absorptionHalfLife(samples: readonly GapSample[]): { halfLifeMinutes: number | null; note: string } {
  if (samples.length < 2) return { halfLifeMinutes: null, note: "Need ≥2 samples." };
  const sorted = samples.slice().sort((a, b) => a.minutesSinceTruth - b.minutesSinceTruth);
  const g0 = sorted[0]!.valueGapRemaining;
  if (g0 <= 0) return { halfLifeMinutes: 0, note: "Gap already closed at first sample." };
  const target = g0 / 2;
  for (let i = 1; i < sorted.length; i++) {
    const a = sorted[i - 1]!, b = sorted[i]!;
    if (b.valueGapRemaining <= target) {
      const frac = (a.valueGapRemaining - target) / Math.max(1e-9, a.valueGapRemaining - b.valueGapRemaining);
      const hl = a.minutesSinceTruth + frac * (b.minutesSinceTruth - a.minutesSinceTruth);
      return { halfLifeMinutes: Number(hl.toFixed(1)), note: `~${Math.round(hl)} min to close half the value gap.` };
    }
  }
  return { halfLifeMinutes: null, note: "Gap never halved within the observed window — slow/sticky surface." };
}
