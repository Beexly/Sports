import {
  foldForecastSkillPick,
  initForecastSkillFold,
  summarizeForecastSkillFold,
  type ForecastSkillFoldState,
} from "./forecast-skill-eprocess.js";

export const SHADOW_EPROCESS_ENABLED = false as const;
export const SHADOW_PUBLISHABLE_M = 20 as const;
export const SHADOW_CLAIM_ELIGIBLE_M = 100 as const;
export const SHADOW_MIN_PICKS = 30 as const;

const LOG_PUBLISHABLE_M = Math.log(SHADOW_PUBLISHABLE_M);
const LOG_CLAIM_ELIGIBLE_M = Math.log(SHADOW_CLAIM_ELIGIBLE_M);

export type ShadowPublicationState = "published" | "suppressed" | "not-would-have-published";

export interface ShadowGroup {
  readonly sport: string;
  readonly market: string;
}

export interface ShadowObservation {
  readonly sequence: number;
  readonly eventId: string;
  readonly sport: string;
  readonly market: string;
  readonly modelProbability: number;
  readonly closeProbability: number;
  readonly outcome: 0 | 1;
  readonly publicationState: ShadowPublicationState;
}

export interface ShadowEProcessOptions {
  readonly groups: readonly ShadowGroup[];
}

export type ShadowVerdict =
  | "no-observations"
  | "insufficient"
  | "collecting"
  | "publishable-shadow"
  | "claim-eligible-shadow";

export interface ShadowGroupResult {
  readonly key: string;
  readonly sport: string;
  readonly market: string;
  readonly weight: number;
  readonly n: number;
  readonly logM: number;
  readonly m: number;
  readonly maxLogM: number;
  readonly maxM: number;
  readonly anytimeValidPValue: number;
  readonly publishableShadow: boolean;
  readonly claimEligibleShadow: boolean;
  readonly firstPublishableAtSequence: number | null;
  readonly firstClaimEligibleAtSequence: number | null;
}

export interface ShadowMixtureResult {
  readonly logM: number;
  readonly m: number;
  readonly maxLogM: number;
  readonly maxM: number;
  readonly anytimeValidPValue: number;
  readonly publishableShadow: boolean;
  readonly claimEligibleShadow: boolean;
  readonly firstPublishableAtSequence: number | null;
  readonly firstClaimEligibleAtSequence: number | null;
}

export interface ShadowEProcessResult {
  readonly enabled: false;
  readonly mode: "shadow-only";
  readonly gateAction: "none";
  readonly minPicks: number;
  readonly publishableThreshold: number;
  readonly claimEligibleThreshold: number;
  readonly totalObservations: number;
  readonly wouldHavePublishedCount: number;
  readonly publishedCount: number;
  readonly suppressedCount: number;
  readonly excludedCount: number;
  readonly n: number;
  readonly registeredGroupCount: number;
  readonly groups: readonly ShadowGroupResult[];
  readonly mixture: ShadowMixtureResult;
  readonly shadowVerdict: ShadowVerdict;
}

interface GroupAccumulator {
  readonly key: string;
  readonly sport: string;
  readonly market: string;
  fold: ForecastSkillFoldState;
  firstPublishableAtSequence: number | null;
  firstClaimEligibleAtSequence: number | null;
}

export function groupKeyFor(sport: string, market: string): string {
  return JSON.stringify([sport, market]);
}

function isValidProbability(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= 1;
}

function isPublicationState(value: string): value is ShadowPublicationState {
  return value === "published" || value === "suppressed" || value === "not-would-have-published";
}

function logMeanExp(values: readonly number[]): number {
  let max = Number.NEGATIVE_INFINITY;
  for (const value of values) {
    if (value > max) max = value;
  }
  let sum = 0;
  for (const value of values) sum += Math.exp(value - max);
  return max + Math.log(sum / values.length);
}

function expForDisplay(logValue: number): number {
  if (logValue >= Math.log(Number.MAX_VALUE)) return Number.MAX_VALUE;
  if (logValue <= Math.log(Number.MIN_VALUE)) return Number.MIN_VALUE;
  return Math.exp(logValue);
}

function pValueForMax(maxLogM: number): number {
  return Math.max(Math.min(1, Math.exp(-maxLogM)), Number.MIN_VALUE);
}

function createGroupStates(groups: readonly ShadowGroup[]): Map<string, GroupAccumulator> | null {
  if (groups.length === 0) return null;
  const states = new Map<string, GroupAccumulator>();
  for (const group of groups) {
    if (
      typeof group.sport !== "string" ||
      typeof group.market !== "string" ||
      group.sport.length === 0 ||
      group.market.length === 0
    ) {
      return null;
    }
    const key = groupKeyFor(group.sport, group.market);
    if (states.has(key)) return null;
    const fold = initForecastSkillFold({
      evidenceThreshold: SHADOW_PUBLISHABLE_M,
      minPicks: SHADOW_MIN_PICKS,
    });
    if (fold === null) return null;
    states.set(key, {
      key,
      sport: group.sport,
      market: group.market,
      fold,
      firstPublishableAtSequence: null,
      firstClaimEligibleAtSequence: null,
    });
  }
  return states;
}

export function scoreWouldHavePublishedShadowEProcess(
  observations: readonly ShadowObservation[],
  options: ShadowEProcessOptions,
): ShadowEProcessResult | null {
  const groupStates = createGroupStates(options.groups);
  if (groupStates === null) return null;

  let previousSequence = Number.NEGATIVE_INFINITY;
  let wouldHavePublishedCount = 0;
  let publishedCount = 0;
  let suppressedCount = 0;
  let excludedCount = 0;
  const eventIds = new Set<string>();
  const groupLogs: number[] = [];
  let mixtureMaxLogM = 0;
  let firstPublishableAtSequence: number | null = null;
  let firstClaimEligibleAtSequence: number | null = null;

  for (const observation of observations) {
    if (!Number.isInteger(observation.sequence) || observation.sequence <= previousSequence) return null;
    previousSequence = observation.sequence;
    if (typeof observation.eventId !== "string" || observation.eventId.length === 0) return null;
    if (!isPublicationState(observation.publicationState)) return null;
    if (
      !isValidProbability(observation.modelProbability) ||
      !isValidProbability(observation.closeProbability) ||
      (observation.outcome !== 0 && observation.outcome !== 1)
    ) {
      return null;
    }

    const key = groupKeyFor(observation.sport, observation.market);
    const state = groupStates.get(key);
    if (state === undefined) return null;

    if (observation.publicationState === "not-would-have-published") {
      excludedCount += 1;
      continue;
    }

    if (eventIds.has(observation.eventId)) return null;
    eventIds.add(observation.eventId);
    wouldHavePublishedCount += 1;
    if (observation.publicationState === "published") publishedCount += 1;
    if (observation.publicationState === "suppressed") suppressedCount += 1;

    const next = foldForecastSkillPick(state.fold, {
      p: observation.modelProbability,
      m: observation.closeProbability,
      y: observation.outcome,
    });
    if (next === null) return null;
    state.fold = next;

    if (state.firstPublishableAtSequence === null && next.maxLogM >= LOG_PUBLISHABLE_M) {
      state.firstPublishableAtSequence = observation.sequence;
    }
    if (state.firstClaimEligibleAtSequence === null && next.maxLogM >= LOG_CLAIM_ELIGIBLE_M) {
      state.firstClaimEligibleAtSequence = observation.sequence;
    }

    groupLogs.length = 0;
    for (const groupState of groupStates.values()) groupLogs.push(groupState.fold.logM);
    const mixtureLogM = logMeanExp(groupLogs);
    mixtureMaxLogM = Math.max(mixtureMaxLogM, mixtureLogM);
    if (firstPublishableAtSequence === null && mixtureLogM >= LOG_PUBLISHABLE_M) {
      firstPublishableAtSequence = observation.sequence;
    }
    if (firstClaimEligibleAtSequence === null && mixtureLogM >= LOG_CLAIM_ELIGIBLE_M) {
      firstClaimEligibleAtSequence = observation.sequence;
    }
  }

  const groupResults: ShadowGroupResult[] = [];
  const groupWeight = 1 / groupStates.size;
  for (const state of groupStates.values()) {
    const summary = summarizeForecastSkillFold(state.fold);
    const eligibleForThreshold = summary.n >= SHADOW_MIN_PICKS;
    groupResults.push({
      key: state.key,
      sport: state.sport,
      market: state.market,
      weight: groupWeight,
      n: summary.n,
      logM: summary.logM,
      m: summary.m,
      maxLogM: summary.maxLogM,
      maxM: summary.maxM,
      anytimeValidPValue: summary.anytimeValidPValue,
      publishableShadow: eligibleForThreshold && summary.maxLogM >= LOG_PUBLISHABLE_M,
      claimEligibleShadow: eligibleForThreshold && summary.maxLogM >= LOG_CLAIM_ELIGIBLE_M,
      firstPublishableAtSequence: state.firstPublishableAtSequence,
      firstClaimEligibleAtSequence: state.firstClaimEligibleAtSequence,
    });
  }

  groupLogs.length = 0;
  for (const state of groupStates.values()) groupLogs.push(state.fold.logM);
  const mixtureLogM = groupLogs.length === 0 ? 0 : logMeanExp(groupLogs);
  const eligibleForThreshold = wouldHavePublishedCount >= SHADOW_MIN_PICKS;
  const mixturePublishable = eligibleForThreshold && mixtureMaxLogM >= LOG_PUBLISHABLE_M;
  const mixtureClaimEligible = eligibleForThreshold && mixtureMaxLogM >= LOG_CLAIM_ELIGIBLE_M;
  const shadowVerdict: ShadowVerdict =
    wouldHavePublishedCount === 0
      ? "no-observations"
      : !eligibleForThreshold
        ? "insufficient"
        : mixtureClaimEligible
          ? "claim-eligible-shadow"
          : mixturePublishable
            ? "publishable-shadow"
            : "collecting";

  return {
    enabled: SHADOW_EPROCESS_ENABLED,
    mode: "shadow-only",
    gateAction: "none",
    minPicks: SHADOW_MIN_PICKS,
    publishableThreshold: SHADOW_PUBLISHABLE_M,
    claimEligibleThreshold: SHADOW_CLAIM_ELIGIBLE_M,
    totalObservations: observations.length,
    wouldHavePublishedCount,
    publishedCount,
    suppressedCount,
    excludedCount,
    n: wouldHavePublishedCount,
    registeredGroupCount: groupStates.size,
    groups: groupResults,
    mixture: {
      logM: mixtureLogM,
      m: expForDisplay(mixtureLogM),
      maxLogM: mixtureMaxLogM,
      maxM: expForDisplay(mixtureMaxLogM),
      anytimeValidPValue: pValueForMax(mixtureMaxLogM),
      publishableShadow: mixturePublishable,
      claimEligibleShadow: mixtureClaimEligible,
      firstPublishableAtSequence,
      firstClaimEligibleAtSequence,
    },
    shadowVerdict,
  };
}

export class ShadowCalibrationEProcess {
  static readonly ENABLED = SHADOW_EPROCESS_ENABLED;
  static readonly PUBLISHABLE_M = SHADOW_PUBLISHABLE_M;
  static readonly CLAIM_ELIGIBLE_M = SHADOW_CLAIM_ELIGIBLE_M;
  static readonly MIN_PICKS = SHADOW_MIN_PICKS;

  static evaluate(
    observations: readonly ShadowObservation[],
    options: ShadowEProcessOptions,
  ): ShadowEProcessResult | null {
    return scoreWouldHavePublishedShadowEProcess(observations, options);
  }
}
