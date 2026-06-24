import { computeCalibration, type CalibrationPickInput } from "@/lib/calibration/compute";

export type CommunityTournamentStatus = "DRAFT_ONLY";

export interface CommunityForecastSubmission {
  readonly id: string;
  readonly participantId: string;
  readonly participantName: string;
  readonly eventId: string;
  readonly probability: number;
  readonly outcome: 0 | 1 | null;
  readonly submittedAt: string;
  readonly lockAt: string;
  readonly settledAt?: string | null;
  readonly segment?: string | null;
}

export interface CommunityTournamentOptions {
  readonly flagKey?: string;
  readonly minEligibleSubmissions?: number;
  readonly maxRows?: number;
}

export interface CommunityTournamentRow {
  readonly rank: number;
  readonly participantId: string;
  readonly participantName: string;
  readonly sampleSize: number;
  readonly brierScore: number;
  readonly logLoss: number;
  readonly calibrationError: number;
  readonly meanForecast: number;
  readonly observedRate: number;
  readonly eligibleForRecognition: false;
  readonly priced: false;
}

export interface CommunityTournamentBoard {
  readonly status: CommunityTournamentStatus;
  readonly flagKey: string;
  readonly enabled: false;
  readonly draftOnly: true;
  readonly priced: false;
  readonly generatedAt: string;
  readonly leaderboard: readonly CommunityTournamentRow[];
  readonly harnessCalibration: ReturnType<typeof computeCalibration>;
  readonly acceptedSubmissions: number;
  readonly rejectedSubmissions: number;
  readonly note: string;
}

interface ScoredSubmission {
  readonly submission: CommunityForecastSubmission;
  readonly brierScore: number;
  readonly logLoss: number;
}

const DEFAULT_FLAG_KEY = "COMMUNITY_CALIBRATION_TOURNAMENT";
const DEFAULT_MIN_ELIGIBLE_SUBMISSIONS = 25;
const DEFAULT_MAX_ROWS = 50;
const EPSILON = 1e-6;

function isFiniteProbability(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= 1;
}

function isBeforeLock(submittedAt: string, lockAt: string): boolean {
  const submitted = Date.parse(submittedAt);
  const locked = Date.parse(lockAt);
  return Number.isFinite(submitted) && Number.isFinite(locked) && submitted < locked;
}

function boundedProbability(probability: number): number {
  return Math.min(1 - EPSILON, Math.max(EPSILON, probability));
}

function round(value: number, digits = 4): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function mean(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function scoreSubmission(submission: CommunityForecastSubmission): ScoredSubmission | null {
  if (submission.outcome === null) return null;
  if (!isFiniteProbability(submission.probability)) return null;
  if (!isBeforeLock(submission.submittedAt, submission.lockAt)) return null;

  const probability = boundedProbability(submission.probability);
  const error = probability - submission.outcome;
  return {
    brierScore: error * error,
    logLoss:
      submission.outcome === 1
        ? -Math.log(probability)
        : -Math.log(1 - probability),
    submission,
  };
}

function toHarnessInput(scored: ScoredSubmission): CalibrationPickInput {
  const predictsYes = scored.submission.probability >= 0.5;
  const predictedOutcome = predictsYes ? 1 : 0;
  const confidence = Math.round(Math.max(scored.submission.probability, 1 - scored.submission.probability) * 100);
  return {
    id: scored.submission.id,
    confidence,
    pickType: scored.submission.segment ?? "community-forecast",
    result: predictedOutcome === scored.submission.outcome ? "WIN" : "LOSS",
    sport: "COMMUNITY",
  };
}

function buildRow(
  participantId: string,
  participantName: string,
  scored: readonly ScoredSubmission[]
): Omit<CommunityTournamentRow, "rank"> {
  const briers = scored.map((entry) => entry.brierScore);
  const logLosses = scored.map((entry) => entry.logLoss);
  const forecasts = scored.map((entry) => entry.submission.probability);
  const outcomes = scored.map((entry) => entry.submission.outcome ?? 0);
  const meanForecast = mean(forecasts);
  const observedRate = mean(outcomes);

  return {
    brierScore: round(mean(briers)),
    calibrationError: round(Math.abs(meanForecast - observedRate)),
    eligibleForRecognition: false,
    logLoss: round(mean(logLosses)),
    meanForecast: round(meanForecast),
    observedRate: round(observedRate),
    participantId,
    participantName,
    priced: false,
    sampleSize: scored.length,
  };
}

export function buildCommunityCalibrationTournament(
  submissions: readonly CommunityForecastSubmission[],
  now = new Date(),
  options: CommunityTournamentOptions = {}
): CommunityTournamentBoard {
  const minEligibleSubmissions = options.minEligibleSubmissions ?? DEFAULT_MIN_ELIGIBLE_SUBMISSIONS;
  const maxRows = options.maxRows ?? DEFAULT_MAX_ROWS;
  const scored = submissions.flatMap((submission) => {
    const row = scoreSubmission(submission);
    return row === null ? [] : [row];
  });
  const byParticipant = new Map<string, ScoredSubmission[]>();
  const names = new Map<string, string>();

  for (const row of scored) {
    const existing = byParticipant.get(row.submission.participantId) ?? [];
    existing.push(row);
    byParticipant.set(row.submission.participantId, existing);
    names.set(row.submission.participantId, row.submission.participantName);
  }

  const ranked = [...byParticipant.entries()]
    .map(([participantId, rows]) =>
      buildRow(participantId, names.get(participantId) ?? participantId, rows)
    )
    .filter((row) => row.sampleSize >= Math.min(1, minEligibleSubmissions))
    .sort(
      (a, b) =>
        a.brierScore - b.brierScore ||
        a.logLoss - b.logLoss ||
        b.sampleSize - a.sampleSize ||
        a.participantName.localeCompare(b.participantName)
    )
    .slice(0, maxRows)
    .map((row, index) => ({ ...row, rank: index + 1 }));

  return {
    acceptedSubmissions: scored.length,
    draftOnly: true,
    enabled: false,
    flagKey: options.flagKey ?? DEFAULT_FLAG_KEY,
    generatedAt: now.toISOString(),
    harnessCalibration: computeCalibration(scored.map(toHarnessInput)),
    leaderboard: ranked,
    note:
      "Community calibration tournament scoring is scaffolded for review only; recognition and public display remain disabled.",
    priced: false,
    rejectedSubmissions: submissions.length - scored.length,
    status: "DRAFT_ONLY",
  };
}
