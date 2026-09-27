/**
 * Prior weights for the prediction engine.
 *
 * Brier, Kelly, Bradley-Terry, and the closing number are meters or context.
 * They are not the objective. A family with no measured row stays dark at its
 * prior so the missing share is visible. Priors sum to 1. They are not
 * probabilities and they do not publish a pick.
 */

export const ENGINE_FAMILIES = [
  { id: "on_field_efficiency", prior: 0.14, role: "premise", why: "Prior-week passing EPA is on the week-3 row." },
  { id: "scheme_play_design", prior: 0.12, role: "premise", why: "Motion, play-action, RPO, and shotgun rates are charted." },
  { id: "availability", prior: 0.12, role: "premise", why: "Quarterback and the out list are on the injury report." },
  { id: "schedule_and_body", prior: 0.08, role: "premise", why: "Rest, roof, and surface are on the game file." },
  { id: "historical_strength", prior: 0.08, role: "premise", why: "Elo is one strength premise, not the product." },
  { id: "weather_physics", prior: 0.07, role: "dark", why: "Wind and temperature modules exist. Those numbers are not on the game file." },
  { id: "coaching", prior: 0.06, role: "dark", why: "The coach is named. A tendency stat is not." },
  { id: "trench_personnel", prior: 0.05, role: "dark", why: "Line-continuity code exists. No week-3 continuity number was joined." },
  { id: "market_context", prior: 0.05, role: "context_not_objective", why: "The devigged price is context. The engine does not chase it." },
  { id: "officials", prior: 0.04, role: "dark", why: "A referee name is sometimes present. No crew rate is joined." },
  { id: "chemistry", prior: 0.04, role: "dark", why: "QB-receiver continuity code exists. No week-3 number was joined." },
  { id: "bio_nutrition", prior: 0.04, role: "dark", why: "No nutrition rows exist. Injury names are availability, not nutrition." },
  { id: "narrative_contract", prior: 0.03, role: "dark", why: "Contract and cohort modules exist. No week-3 row was joined." },
  { id: "social", prior: 0.03, role: "dark", why: "No social feed is ingested." },
  { id: "calibration_meters", prior: 0.03, role: "meter", why: "Brier, ECE, Kelly, and Bradley-Terry score the engine. They are not a signal about this game." },
  { id: "airwave", prior: 0.02, role: "dark", why: "Podcast files in the tree are fixtures. No real note is joined." },
] as const;

export type EngineFamilyId = (typeof ENGINE_FAMILIES)[number]["id"];
export type EngineFamilyRole = (typeof ENGINE_FAMILIES)[number]["role"];

export interface EngineReading {
  readonly gameId: string;
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
  }

  return {
    gameId,
    tilt: weight > 0 ? mass / weight : null,
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
