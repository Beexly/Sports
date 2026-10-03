import { clamp } from "./scoring.js";

export type AvailabilityStatus = "healthy" | "questionable" | "doubtful" | "out" | "ir" | "returning";
export type PracticeStatus = "full" | "limited" | "dnp" | "unknown";

export interface ReturnSpellObservation {
  readonly durationWeeks: number;
  readonly returned: boolean;
}

export interface KaplanMeierReturnPoint {
  readonly week: number;
  readonly atRisk: number;
  readonly returns: number;
  readonly survivalInactive: number;
  readonly cumulativeReturnProbability: number;
}

export interface RoleTenureObservation {
  readonly weekIndex: number;
  readonly roleState: string;
  readonly snapShare: number;
}

export interface AvailabilityCoxCoefficients {
  readonly fullPractice: number;
  readonly limitedPractice: number;
  readonly didNotPractice: number;
  readonly weeksSinceActive: number;
  readonly priorSnapShare: number;
  readonly ageOver30: number;
}

export interface AvailabilityRoleInput {
  readonly playerId: string;
  readonly status: AvailabilityStatus;
  readonly practiceStatus?: PracticeStatus;
  readonly weeksSinceActive: number;
  readonly age?: number;
  readonly recentSnapShares?: readonly number[];
  readonly returnSpells?: readonly ReturnSpellObservation[];
  readonly roleHistory?: readonly RoleTenureObservation[];
  readonly coefficients?: Partial<AvailabilityCoxCoefficients>;
}

export interface RoleTenureProjection {
  readonly currentRole: string | null;
  readonly consecutiveWeeks: number;
  readonly retentionProbability: number;
  readonly halfLifeWeeks: number;
}

export interface AvailabilityRoleProjection {
  readonly playerId: string;
  readonly activeProbability: number;
  readonly returnHazard: number;
  readonly expectedSnapShareIfActive: number;
  readonly expectedSnapShare: number;
  readonly kaplanMeier: readonly KaplanMeierReturnPoint[];
  readonly roleTenure: RoleTenureProjection;
  readonly priced: false;
  readonly status: "shadow";
}

export const DEFAULT_AVAILABILITY_COX_COEFFICIENTS: AvailabilityCoxCoefficients = {
  fullPractice: 0.85,
  limitedPractice: 0.25,
  didNotPractice: -0.85,
  weeksSinceActive: 0.08,
  priorSnapShare: 0.45,
  ageOver30: -0.18,
};

const STATUS_PRIOR: Record<AvailabilityStatus, number> = {
  healthy: 0.985,
  returning: 0.78,
  questionable: 0.62,
  doubtful: 0.22,
  out: 0.02,
  ir: 0.005,
};

const STATUS_CEILING: Record<AvailabilityStatus, number> = {
  healthy: 1,
  returning: 0.95,
  questionable: 0.9,
  doubtful: 0.55,
  out: 0.12,
  ir: 0.05,
};

function round(value: number, digits = 3): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function mergeCoefficients(coefficients?: Partial<AvailabilityCoxCoefficients>): AvailabilityCoxCoefficients {
  return {
    fullPractice: coefficients?.fullPractice ?? DEFAULT_AVAILABILITY_COX_COEFFICIENTS.fullPractice,
    limitedPractice: coefficients?.limitedPractice ?? DEFAULT_AVAILABILITY_COX_COEFFICIENTS.limitedPractice,
    didNotPractice: coefficients?.didNotPractice ?? DEFAULT_AVAILABILITY_COX_COEFFICIENTS.didNotPractice,
    weeksSinceActive: coefficients?.weeksSinceActive ?? DEFAULT_AVAILABILITY_COX_COEFFICIENTS.weeksSinceActive,
    priorSnapShare: coefficients?.priorSnapShare ?? DEFAULT_AVAILABILITY_COX_COEFFICIENTS.priorSnapShare,
    ageOver30: coefficients?.ageOver30 ?? DEFAULT_AVAILABILITY_COX_COEFFICIENTS.ageOver30,
  };
}

export function buildKaplanMeierReturnCurve(
  spells: readonly ReturnSpellObservation[],
): readonly KaplanMeierReturnPoint[] {
  const usable = spells
    .filter((spell) => Number.isFinite(spell.durationWeeks) && spell.durationWeeks >= 0)
    .map((spell) => ({ durationWeeks: Math.floor(spell.durationWeeks), returned: spell.returned }));
  const maxWeek = Math.max(1, ...usable.map((spell) => spell.durationWeeks));
  let survivalInactive = 1;
  const curve: KaplanMeierReturnPoint[] = [];

  for (let week = 1; week <= maxWeek; week += 1) {
    const atRisk = usable.filter((spell) => spell.durationWeeks >= week).length;
    const returns = usable.filter((spell) => spell.returned && spell.durationWeeks === week).length;
    if (atRisk > 0) survivalInactive *= 1 - returns / atRisk;
    curve.push({
      week,
      atRisk,
      returns,
      survivalInactive: round(survivalInactive, 4),
      cumulativeReturnProbability: round(1 - survivalInactive, 4),
    });
  }

  return curve;
}

function priorSnapShare(recentSnapShares: readonly number[] | undefined): number {
  const usable = (recentSnapShares ?? []).filter((share) => Number.isFinite(share) && share >= 0);
  if (usable.length === 0) return 0.55;
  return clamp(usable.reduce((sum, share) => sum + share, 0) / usable.length, 0, 1);
}

export function coxAvailabilityMultiplier(
  input: Pick<AvailabilityRoleInput, "practiceStatus" | "weeksSinceActive" | "age" | "recentSnapShares">,
  coefficients?: Partial<AvailabilityCoxCoefficients>,
): number {
  const coef = mergeCoefficients(coefficients);
  const practice = input.practiceStatus ?? "unknown";
  const logHazard =
    (practice === "full" ? coef.fullPractice : 0) +
    (practice === "limited" ? coef.limitedPractice : 0) +
    (practice === "dnp" ? coef.didNotPractice : 0) +
    Math.max(0, input.weeksSinceActive) * coef.weeksSinceActive +
    priorSnapShare(input.recentSnapShares) * coef.priorSnapShare +
    (input.age != null && input.age >= 30 ? coef.ageOver30 : 0);

  return round(clamp(Math.exp(logHazard), 0.2, 4), 4);
}

function nextReturnHazard(curve: readonly KaplanMeierReturnPoint[], weeksSinceActive: number): number {
  if (curve.length === 0) return 0.35;
  const nextWeek = Math.max(1, Math.floor(weeksSinceActive) + 1);
  const fallback = curve[curve.length - 1];
  if (!fallback) return 0.35;
  const next = curve.find((point) => point.week === nextWeek) ?? fallback;
  const previousSurvival =
    next.week === 1 ? 1 : (curve.find((point) => point.week === next.week - 1)?.survivalInactive ?? 1);
  if (previousSurvival <= 0) return 0;
  return clamp(next.returns / Math.max(1, next.atRisk), 0.02, 0.95);
}

function proportionalDiscreteHazard(baseHazard: number, multiplier: number): number {
  return clamp(1 - (1 - clamp(baseHazard, 0, 0.99)) ** multiplier, 0, 0.99);
}

function projectRoleTenure(roleHistory: readonly RoleTenureObservation[] | undefined): RoleTenureProjection {
  const ordered = (roleHistory ?? [])
    .filter((row) => row.roleState.trim().length > 0)
    .slice()
    .sort((a, b) => a.weekIndex - b.weekIndex);
  if (ordered.length === 0) {
    return { currentRole: null, consecutiveWeeks: 0, retentionProbability: 0.72, halfLifeWeeks: 2.1 };
  }

  const last = ordered[ordered.length - 1];
  if (!last) {
    return { currentRole: null, consecutiveWeeks: 0, retentionProbability: 0.72, halfLifeWeeks: 2.1 };
  }
  const currentRole = last.roleState;
  let consecutiveWeeks = 0;
  for (let index = ordered.length - 1; index >= 0; index -= 1) {
    const row = ordered[index];
    if (!row || row.roleState !== currentRole) break;
    consecutiveWeeks += 1;
  }

  let transitions = 0;
  let sameRole = 0;
  for (let index = 1; index < ordered.length; index += 1) {
    transitions += 1;
    const previous = ordered[index - 1];
    const current = ordered[index];
    if (previous && current && previous.roleState === current.roleState) sameRole += 1;
  }
  const priorStrength = 3;
  const priorRetention = 0.72;
  const retention = (sameRole + priorStrength * priorRetention) / Math.max(1, transitions + priorStrength);
  const halfLife = retention >= 0.995 ? 26 : Math.log(0.5) / Math.log(clamp(retention, 0.05, 0.995));

  return {
    currentRole,
    consecutiveWeeks,
    retentionProbability: round(retention, 4),
    halfLifeWeeks: round(clamp(halfLife, 0.2, 26), 2),
  };
}

export function projectAvailabilityRole(input: AvailabilityRoleInput): AvailabilityRoleProjection {
  const km = buildKaplanMeierReturnCurve(input.returnSpells ?? []);
  const baseHazard = nextReturnHazard(km, input.weeksSinceActive);
  const multiplier = coxAvailabilityMultiplier(input, input.coefficients);
  const returnHazard = proportionalDiscreteHazard(baseHazard, multiplier);
  const statusPrior = STATUS_PRIOR[input.status];
  const activeProbability =
    input.status === "healthy"
      ? statusPrior
      : clamp(0.65 * statusPrior + 0.35 * returnHazard, 0, STATUS_CEILING[input.status]);
  const roleTenure = projectRoleTenure(input.roleHistory);
  const ifActiveSnapShare = clamp(
    priorSnapShare(input.recentSnapShares) * (0.78 + 0.22 * roleTenure.retentionProbability),
    0,
    1,
  );

  return {
    playerId: input.playerId,
    activeProbability: round(activeProbability, 4),
    returnHazard: round(returnHazard, 4),
    expectedSnapShareIfActive: round(ifActiveSnapShare, 4),
    expectedSnapShare: round(ifActiveSnapShare * activeProbability, 4),
    kaplanMeier: km,
    roleTenure,
    priced: false,
    status: "shadow",
  };
}
