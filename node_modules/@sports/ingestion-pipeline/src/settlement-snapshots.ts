export type SettledPickResult = "WIN" | "LOSS" | "PUSH" | "VOID";

export interface SettlementSnapshotPick {
  readonly id: string;
  readonly gameId: string;
  readonly isBootstrap: boolean;
  readonly bookmakerCount: number;
  readonly confidence: number;
  readonly modelVersion: string | null;
  readonly factorBreakdown: unknown;
}

interface SettlementSnapshotOutcomeData {
  readonly settlementResult: SettledPickResult;
  readonly settledAt: Date;
  readonly eligibleForLearning: boolean;
  readonly learningEligibleAt?: Date;
}

interface SettlementSnapshotCreateData extends SettlementSnapshotOutcomeData {
  readonly pickId: string;
  readonly gameId: string;
  readonly hadOddsSignal: boolean;
  readonly bookmakerCount: number;
  readonly dataQualityScore: number;
  readonly confidenceAtPrediction: number;
  readonly isBootstrap: boolean;
  readonly usedDerivedHistory: boolean;
  readonly usedScheduleSignal: boolean;
  readonly modelVersion: string;
}

interface PickSignalSnapshotStore {
  updateMany(args: {
    where: { pickId: string; settlementResult: null };
    data: SettlementSnapshotOutcomeData;
  }): Promise<{ count: number }>;
  findUnique(args: {
    where: { pickId: string };
    select: { settlementResult: true };
  }): Promise<{ settlementResult: string | null } | null>;
  create(args: { data: SettlementSnapshotCreateData }): Promise<unknown>;
}

export interface SettlementSnapshotDb {
  readonly pickSignalSnapshot: PickSignalSnapshotStore;
}

export interface RecordSettlementSnapshotInput {
  readonly db: SettlementSnapshotDb;
  readonly pick: SettlementSnapshotPick;
  readonly result: SettledPickResult;
  readonly settledAt: Date;
  readonly isEligibleForLearning: boolean;
  readonly gameDataQualityScore: number;
  readonly maxAttempts?: number;
  readonly baseDelayMs?: number;
  readonly sleep?: (ms: number) => Promise<void>;
}

export type SettlementSnapshotWriteStatus =
  | "updated-existing"
  | "already-settled"
  | "created-fallback";

function factorDataQualityScore(factorBreakdown: unknown): number | null {
  if (
    factorBreakdown === null ||
    typeof factorBreakdown !== "object" ||
    Array.isArray(factorBreakdown)
  ) {
    return null;
  }

  const value = (factorBreakdown as Record<string, unknown>)["dataQualityScore"];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function outcomeData(
  result: SettledPickResult,
  settledAt: Date,
  isEligibleForLearning: boolean
): SettlementSnapshotOutcomeData {
  return {
    settlementResult: result,
    settledAt,
    eligibleForLearning: isEligibleForLearning,
    ...(isEligibleForLearning ? { learningEligibleAt: settledAt } : {}),
  };
}

function fallbackSnapshotData(input: RecordSettlementSnapshotInput): SettlementSnapshotCreateData {
  return {
    pickId: input.pick.id,
    gameId: input.pick.gameId,
    hadOddsSignal: true,
    bookmakerCount: input.pick.bookmakerCount,
    dataQualityScore: factorDataQualityScore(input.pick.factorBreakdown) ?? input.gameDataQualityScore,
    confidenceAtPrediction: input.pick.confidence,
    isBootstrap: input.pick.isBootstrap,
    usedDerivedHistory: false,
    usedScheduleSignal: false,
    modelVersion: input.pick.modelVersion ?? "",
    ...outcomeData(input.result, input.settledAt, input.isEligibleForLearning),
  };
}

async function defaultSleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function writeSettlementSnapshotOnce(
  input: RecordSettlementSnapshotInput
): Promise<SettlementSnapshotWriteStatus> {
  const update = await input.db.pickSignalSnapshot.updateMany({
    where: { pickId: input.pick.id, settlementResult: null },
    data: outcomeData(input.result, input.settledAt, input.isEligibleForLearning),
  });
  if (update.count > 0) return "updated-existing";

  const existing = await input.db.pickSignalSnapshot.findUnique({
    where: { pickId: input.pick.id },
    select: { settlementResult: true },
  });
  if (existing?.settlementResult) return "already-settled";

  await input.db.pickSignalSnapshot.create({
    data: fallbackSnapshotData(input),
  });
  return "created-fallback";
}

export async function recordPickSettlementSnapshot(
  input: RecordSettlementSnapshotInput
): Promise<SettlementSnapshotWriteStatus> {
  const maxAttempts = input.maxAttempts ?? 3;
  const baseDelayMs = input.baseDelayMs ?? 100;
  const sleep = input.sleep ?? defaultSleep;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await writeSettlementSnapshotOnce(input);
    } catch (err) {
      if (attempt === maxAttempts) throw err;
      await sleep(baseDelayMs * 2 ** (attempt - 1));
    }
  }

  throw new Error("Settlement snapshot write exhausted retry attempts");
}
