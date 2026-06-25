/**
 * GENESIS LAYER — Cognitive Bias Differential (Invention 60).
 *
 * Measures the gap between how the crowd behaves and how a rational actor would — per specific human
 * bias: recency, name value, rookie fever, injury panic, favorite-team, box-score chasing, analyst
 * anchoring, public chalk comfort, loss aversion, desperation. The differential, not the bias name,
 * is the exploitable quantity: fade the crowd where it over-biases, join it where it under-reacts.
 * Pure + deterministic.
 */

export type BiasKind =
  | "recency" | "name_value" | "rookie_fever" | "injury_panic" | "favorite_team"
  | "box_score_chasing" | "analyst_anchoring" | "public_chalk_comfort" | "loss_aversion" | "desperation";

export interface BiasReading {
  readonly kind: BiasKind;
  readonly crowdLevel: number;    // 0..1 how strongly the crowd expresses the bias
  readonly rationalLevel: number; // 0..1 the rational baseline
}

export type ExploitDirection = "fade_crowd" | "join_crowd" | "neutral";

export interface BiasDifferential {
  readonly kind: BiasKind;
  readonly differential: number; // crowdLevel − rationalLevel
  readonly exploitDirection: ExploitDirection;
  readonly note: string;
}

/** Compute one bias differential and its exploit direction. */
export function computeBiasDifferential(r: BiasReading, threshold = 0.15): BiasDifferential {
  const differential = Number((r.crowdLevel - r.rationalLevel).toFixed(4));
  const exploitDirection: ExploitDirection = differential >= threshold ? "fade_crowd" : differential <= -threshold ? "join_crowd" : "neutral";
  return {
    kind: r.kind,
    differential,
    exploitDirection,
    note: exploitDirection === "fade_crowd"
      ? `Crowd over-expresses ${r.kind} by ${differential.toFixed(2)} — fade it.`
      : exploitDirection === "join_crowd"
        ? `Crowd under-reacts relative to ${r.kind} by ${(-differential).toFixed(2)} — act before it corrects.`
        : `${r.kind} roughly rational — no edge.`,
  };
}

/** Rank bias readings by the magnitude of the exploitable differential, biggest first. */
export function rankBiasOpportunities(readings: readonly BiasReading[], threshold = 0.15): BiasDifferential[] {
  return readings.map((r) => computeBiasDifferential(r, threshold)).filter((d) => d.exploitDirection !== "neutral").sort((a, b) => Math.abs(b.differential) - Math.abs(a.differential));
}
