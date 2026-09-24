/**
 * Buzz to Broadcast: Predicting Sports Viewership Using Social Media Engagement
 *
 * arXiv:2412.10298v1 · lane:nlp · verdict:ADAPT · owner:Hermes · doctrine:PROPRIETARY_EDGE
 *
 * Improvement (record): Provide a disabled-by-default hierarchical viewership scaffold with sport and team effects, social-buzz features, team-mean comparison, forward MAE, and held-sport-out R² evaluation. The module does not fit or train a model.
 *
 * ACCEPTANCE GATE:
 * Adopt the feature recipe only if the fixed pipeline beats the team-mean baseline by ≥15% MAE on the 2024 forward test AND held-sport-out R² > 0.5; reject if the signal disappears once the sport one-hot and random split are removed.
 *
 * ADDITIVE utility. Not wired into any live ingestion path (wiring changes production data flow and is a NEEDS HUMAN CALL).
 * Pure module: no I/O, no network, no credentials. Model fitting remains an offline harness responsibility.
 */

export const ARXIV_ID = "2412.10298v1" as const;
export const LANE = "nlp" as const;
export const VERDICT = "ADAPT" as const;
export const ENABLED = false;

export const ACCEPTANCE_GATE = `Adopt the feature recipe only if the fixed pipeline beats the team-mean baseline by ≥15% MAE on the 2024 forward test AND held-sport-out R² > 0.5; reject if the signal disappears once the sport one-hot and random split are removed.`;

export interface ViewershipObservation {
  readonly sport: string;
  readonly team: string;
  readonly views: number;
  readonly socialBuzz: number;
}

export interface ViewershipModelParameters {
  readonly intercept: number;
  readonly socialBuzzCoefficient: number;
  readonly sportEffects: Readonly<Record<string, number>>;
  readonly teamEffects: Readonly<Record<string, number>>;
}

export interface ViewershipEvaluation {
  readonly n: number;
  readonly modelMae: number;
  readonly baselineMae: number;
  readonly relativeMaeImprovement: number;
  readonly heldSportOutR2: number | null;
  readonly gatePassed: boolean;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function validObservation(observation: ViewershipObservation): boolean {
  return observation.sport.length > 0
    && observation.team.length > 0
    && isFiniteNumber(observation.views)
    && observation.views >= 0
    && isFiniteNumber(observation.socialBuzz)
    && observation.socialBuzz >= 0;
}

function mean(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function forecastViewership(
  observation: ViewershipObservation,
  parameters: ViewershipModelParameters,
): number | null {
  if (!validObservation(observation)) return null;
  if (!isFiniteNumber(parameters.intercept) || !isFiniteNumber(parameters.socialBuzzCoefficient)) return null;
  if (![parameters.sportEffects, parameters.teamEffects].every((effects) => Object.values(effects).every(isFiniteNumber))) return null;
  const sportEffect = parameters.sportEffects[observation.sport] ?? 0;
  const teamEffect = parameters.teamEffects[observation.team] ?? 0;
  if (!isFiniteNumber(sportEffect) || !isFiniteNumber(teamEffect)) return null;
  return Math.max(0, parameters.intercept + sportEffect + teamEffect + parameters.socialBuzzCoefficient * observation.socialBuzz);
}

function baselinePredictionForTeam(
  training: readonly ViewershipObservation[],
  row: ViewershipObservation,
): number {
  const values = training.filter((candidate) => candidate.team === row.team).map((candidate) => candidate.views);
  return values.length > 0 ? mean(values) : mean(training.map((candidate) => candidate.views));
}

function teamMeanBaseline(
  training: readonly ViewershipObservation[],
  test: readonly ViewershipObservation[],
): number | null {
  if (training.length === 0 || test.length === 0 || !training.every(validObservation) || !test.every(validObservation)) return null;
  return mean(test.map((row) => baselinePredictionForTeam(training, row)));
}

export function evaluateViewershipForecast(
  training: readonly ViewershipObservation[],
  test: readonly ViewershipObservation[],
  parameters: ViewershipModelParameters,
): ViewershipEvaluation | null {
  if (training.length === 0 || test.length === 0) return null;
  if (!training.every(validObservation) || !test.every(validObservation)) return null;
  const predictions = test.map((row) => forecastViewership(row, parameters));
  if (predictions.some((prediction) => prediction === null)) return null;
  const actual = test.map((row) => row.views);
  const predicted = predictions as number[];
  const baseline = teamMeanBaseline(training, test);
  if (baseline === null) return null;
  const baselineResiduals = test.map((row) => Math.abs(baselinePredictionForTeam(training, row) - row.views));
  const modelResiduals = predicted.map((value, index) => Math.abs(value - (actual[index] as number)));
  const modelMae = mean(modelResiduals);
  const baselineMae = mean(baselineResiduals);
  const relativeMaeImprovement = baselineMae === 0 ? 0 : (baselineMae - modelMae) / baselineMae;
  const trainingSports = new Set(training.map((row) => row.sport));
  const heldOutIndices = test.reduce<number[]>((indices, row, index) => {
    if (!trainingSports.has(row.sport)) indices.push(index);
    return indices;
  }, []);
  if (heldOutIndices.length === 0) return null;
  const heldOutActual = heldOutIndices.map((index) => actual[index] as number);
  const heldOutPredicted = heldOutIndices.map((index) => predicted[index] as number);
  const actualMean = mean(heldOutActual);
  const totalSumSquares = heldOutActual.reduce((sum, value) => sum + (value - actualMean) ** 2, 0);
  const residualSumSquares = heldOutActual.reduce((sum, value, index) => sum + (value - (heldOutPredicted[index] as number)) ** 2, 0);
  const heldSportOutR2 = totalSumSquares === 0 ? null : 1 - residualSumSquares / totalSumSquares;
  return {
    n: test.length,
    modelMae,
    baselineMae,
    relativeMaeImprovement,
    heldSportOutR2,
    gatePassed: relativeMaeImprovement >= 0.15 && heldSportOutR2 !== null && heldSportOutR2 > 0.5,
  };
}
