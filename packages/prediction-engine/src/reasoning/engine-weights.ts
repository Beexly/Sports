/**
 * Standing rule, from the start: the edge is the sum of prior × signal
 * across the whole table. A missing signal adds zero. Live signals are
 * not rescaled to fill that hole. Meters score the edge later. They are
 * not the edge.
 */

export const ENGINE_FAMILIES = [
  { id: "on_field_efficiency", prior: 0.14, role: "premise", why: "Prior-week passing EPA is on the week-3 row." },
  { id: "scheme_play_design", prior: 0.12, role: "premise", why: "Motion, play-action, RPO, and shotgun rates are charted." },
  { id: "availability", prior: 0.12, role: "premise", why: "Quarterback and the out list are on the injury report." },
  { id: "schedule_and_body", prior: 0.08, role: "premise", why: "Rest is on the game file. 2024-2025 fit: +0.41 margin points per extra rest day (n=544, se=0.25)." },
  { id: "historical_strength", prior: 0.08, role: "premise", why: "Elo is one strength premise, not the product." },
  { id: "weather_physics", prior: 0.07, role: "dark", why: "Wind and temperature were fit on 349 outdoor games. Both slopes sat inside one standard error, so they add zero until the coefficient clears." },
  { id: "coaching", prior: 0.06, role: "dark", why: "Fourth-down go rate was measured. 2025 walk-forward r was -0.014, so it does not move the tilt." },
  { id: "trench_personnel", prior: 0.05, role: "premise", why: "qb_hit per dropback. 2025 walk-forward correlation with home wins was 0.241 on 250 games." },
  { id: "market_context", prior: 0.05, role: "context_not_objective", why: "The devigged price is context. The engine does not chase it." },
  { id: "officials", prior: 0.04, role: "premise", why: "Referee home-margin residuals from 2024-2025, used only when |mean| > se and the game has a name." },
  { id: "chemistry", prior: 0.04, role: "premise", why: "QB this week versus the snap leader of weeks 1-2. A change is a disruption." },
  { id: "bio_nutrition", prior: 0.04, role: "dark", why: "No nutrition rows exist. Injury names are availability, not nutrition." },
  { id: "narrative_contract", prior: 0.03, role: "dark", why: "Contract and cohort modules exist. No week-3 row was joined." },
  { id: "social", prior: 0.0, role: "dark", why: "Folded into airwave. Instagram has no API row." },
  { id: "calibration_meters", prior: 0.03, role: "meter", why: "Brier, ECE, Kelly, and Bradley-Terry score the engine. They are not a signal about this game." },
  { id: "airwave", prior: 0.05, role: "premise", why: "Week-3 wire: AP injury statuses plus beat corroboration. Questionable and doubtful skill players only, so known outs are not counted twice." },
] as const;

export type EngineFamilyId = (typeof ENGINE_FAMILIES)[number]["id"];
export type EngineFamilyRole = (typeof ENGINE_FAMILIES)[number]["role"];

export interface EngineEdgePart {
  readonly id: EngineFamilyId;
  readonly prior: number;
  readonly signed: number;
  /** This family's share of the edge. The parts sum to the edge. */
  readonly points: number;
}

export interface EngineEdge {
  readonly definition: "The edge is the sum of prior times signal across the whole table. Missing signals add zero.";
  readonly value: number | null;
  readonly parts: readonly EngineEdgePart[];
}

export interface EngineReading {
  readonly gameId: string;
  readonly engineEdge: EngineEdge;
  readonly tilt: number | null;
  readonly tiltIsProbability: false;
  readonly publishesPick: false;
  readonly coverage: number;
  readonly darkShare: number;
  readonly withheldShare: number;
  readonly meterShare: number;
  readonly used: readonly EngineFamilyId[];
  readonly dark: readonly EngineFamilyId[];
  readonly notes: readonly string[];
}

const PRIOR_SUM = ENGINE_FAMILIES.reduce((sum, family) => sum + family.prior, 0);

export function assertPriorsSumToOne(): number {
  if (Math.abs(PRIOR_SUM - 1) > 1e-9) {
    throw new Error(`engine weights sum to ${PRIOR_SUM}, not 1`);
  }
  return PRIOR_SUM;
}

function clip(value: number): number {
  if (value > 1) return 1;
  if (value < -1) return -1;
  return value;
}

/**
 * `signed` is a home-positive number already on [-1, 1] for families that
 * measured something. Missing keys stay dark. Market and meters never enter
 * the tilt.
 */
export function composeEngineReading(
  gameId: string,
  signed: Partial<Record<EngineFamilyId, number | null>>,
): EngineReading {
  assertPriorsSumToOne();
  let weight = 0;
  let mass = 0;
  const used: EngineFamilyId[] = [];
  const dark: EngineFamilyId[] = [];
  let darkShare = 0;
  let withheldShare = 0;
  let meterShare = 0;
  const raw: { id: EngineFamilyId; prior: number; signed: number }[] = [];
  const notes: string[] = [];

  for (const family of ENGINE_FAMILIES) {
    if (family.role === "context_not_objective") {
      withheldShare += family.prior;
      notes.push(`${family.id}: withheld from the tilt. ${family.why}`);
      continue;
    }
    if (family.role === "meter") {
      meterShare += family.prior;
      notes.push(`${family.id}: meter only. ${family.why}`);
      continue;
    }
    const value = signed[family.id];
    if (typeof value !== "number" || !Number.isFinite(value)) {
      dark.push(family.id);
      darkShare += family.prior;
      continue;
    }
    const bounded = clip(value);
    weight += family.prior;
    mass += family.prior * bounded;
    used.push(family.id);
    raw.push({ id: family.id, prior: family.prior, signed: bounded });
  }

  const edge = weight > 0 ? mass : null;
  const parts: EngineEdgePart[] = raw.map((part) => ({
    ...part,
    points: part.prior * part.signed,
  }));

  return {
    gameId,
    engineEdge: {
      definition: "The edge is the sum of prior times signal across the whole table. Missing signals add zero.",
      value: edge,
      parts,
    },
    tilt: edge,
    tiltIsProbability: false,
    publishesPick: false,
    coverage: weight,
    darkShare,
    withheldShare,
    meterShare,
    used,
    dark,
    notes,
  };
}
