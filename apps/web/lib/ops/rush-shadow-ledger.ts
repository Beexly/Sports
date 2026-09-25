/**
 * Durable, shadow-only bridge from persisted PlayerRushProfile rows to the
 * universal Signal ledger. This is a use path, not an ingestion path: it reads
 * an already-captured, nflverse-rights-stamped PBP aggregate and never fetches,
 * publishes, prices, or passes a signal to the public scoring surface.
 *
 * The current season's two rush keys are replaced atomically. That prevents a
 * player who falls below the sample floor, loses rights clearance, or leaves
 * the bounded profile set from retaining a stale shadow row forever.
 */
import { db, isStubMode, type Prisma } from "@sports/db";
import {
  composeLedger,
  rushProfileToLedgerSignals,
} from "@sports/prediction-engine";

export const RUSH_SHADOW_CATEGORY = "RATINGS" as const;
export const RUSH_SHADOW_SOURCE = "nflverse" as const;
export const RUSH_SHADOW_MAX_PROFILES = 2_000;
export const RUSH_SHADOW_KEYS = [
  "rush.epa_per_run",
  "rush.scheme_lean",
] as const;

export type RushShadowLedgerStatus = "ok" | "no-data" | "stub" | "error";

export interface RushProfileLedgerRow {
  readonly gsisId: string;
  readonly season: number;
  readonly sourceId: string;
  readonly rightsSnapshot: Prisma.JsonValue;
  readonly fetchedAt: Date | string;
  readonly runs: number;
  readonly guardRuns: number;
  readonly tackleRuns: number;
  readonly endRuns: number;
  readonly leftRuns: number;
  readonly middleRuns: number;
  readonly rightRuns: number;
  readonly epaPerRun: number;
}

type SignalWrite = {
  readonly entityType: "player";
  readonly entityId: string;
  readonly key: string;
  readonly category: typeof RUSH_SHADOW_CATEGORY;
  readonly valueRaw: number | null;
  readonly value: number;
  readonly weight: number;
  readonly confidence: number;
  readonly capturedAt: Date;
  readonly season: number;
  readonly week: 0;
  readonly sourceId: typeof RUSH_SHADOW_SOURCE;
  readonly rightsSnapshot: Prisma.InputJsonValue;
  readonly fetchedAt: Date;
};

interface SignalUpsertArgs {
  readonly where: {
    readonly entityType_entityId_key_season_week: {
      readonly entityType: "player";
      readonly entityId: string;
      readonly key: string;
      readonly season: number;
      readonly week: 0;
    };
  };
  readonly create: SignalWrite;
  readonly update: Pick<
    SignalWrite,
    "valueRaw" | "value" | "weight" | "confidence" | "capturedAt" | "sourceId" | "rightsSnapshot" | "fetchedAt"
  >;
}

interface SignalDeleteManyArgs {
  readonly where: {
    readonly entityType: "player";
    readonly key: { readonly in: readonly string[] };
    readonly season: number;
    readonly week: 0;
  };
}

interface RushShadowSignalDb {
  deleteMany(args: SignalDeleteManyArgs): Promise<{ count: number }>;
  upsert(args: SignalUpsertArgs): Promise<unknown>;
}

/** Minimal DB seam so the writer can be tested without Prisma or a database. */
export interface RushShadowLedgerDb {
  readonly playerRushProfile: {
    findMany(args: {
      readonly where: { readonly season: number };
      readonly select: Record<string, true>;
      readonly orderBy: { readonly runs: "desc" };
      readonly take: number;
    }): Promise<readonly RushProfileLedgerRow[] | null>;
  };
  readonly signal: RushShadowSignalDb;
  $transaction(
    run: (tx: { signal: RushShadowSignalDb }) => Promise<unknown>,
    options?: { maxWait?: number; timeout?: number },
  ): Promise<unknown>;
}

export interface RushShadowLedgerResult {
  readonly status: RushShadowLedgerStatus;
  readonly mode: "shadow";
  readonly priced: false;
  readonly season: number;
  readonly profilesRead: number;
  readonly playersWithSignals: number;
  readonly composedSignals: number;
  readonly signalsWritten: number;
  readonly signalsSkipped: number;
  readonly errors: readonly string[];
}

function initialResult(season: number, status: RushShadowLedgerStatus): RushShadowLedgerResult {
  return {
    status,
    mode: "shadow",
    priced: false,
    season,
    profilesRead: 0,
    playersWithSignals: 0,
    composedSignals: 0,
    signalsWritten: 0,
    signalsSkipped: 0,
    errors: [],
  };
}

function capturedIso(value: Date | string): string | null {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function inputJson(value: Prisma.JsonValue): Prisma.InputJsonValue | null {
  if (value === null || value === undefined) return null;
  return value as Prisma.InputJsonValue;
}

function buildRushSignalWrites(
  season: number,
  rows: readonly RushProfileLedgerRow[],
  counters: { playersWithSignals: number; composedSignals: number; signalsSkipped: number },
): SignalWrite[] {
  const writes: SignalWrite[] = [];
  for (const profile of rows) {
    if (profile.sourceId !== RUSH_SHADOW_SOURCE || profile.rightsSnapshot == null) {
      counters.signalsSkipped += 1;
      continue;
    }
    const capturedAt = capturedIso(profile.fetchedAt);
    const rightsSnapshot = inputJson(profile.rightsSnapshot);
    if (capturedAt === null || rightsSnapshot === null) {
      counters.signalsSkipped += 1;
      continue;
    }

    const signals = rushProfileToLedgerSignals({
      runs: profile.runs,
      guardRuns: profile.guardRuns,
      tackleRuns: profile.tackleRuns,
      endRuns: profile.endRuns,
      leftRuns: profile.leftRuns,
      middleRuns: profile.middleRuns,
      rightRuns: profile.rightRuns,
      epaPerRun: profile.epaPerRun,
      capturedAt,
    });
    if (signals.length === 0) {
      counters.signalsSkipped += 1;
      continue;
    }

    const composed = composeLedger(signals, { now: capturedAt, halfLifeDays: 0 });
    if (composed.signalsUsed === 0) {
      counters.signalsSkipped += 1;
      continue;
    }
    counters.playersWithSignals += 1;
    counters.composedSignals += composed.signalsUsed;

    for (const signal of signals) {
      writes.push({
        entityType: "player",
        entityId: profile.gsisId,
        key: signal.key,
        category: RUSH_SHADOW_CATEGORY,
        valueRaw: signal.key === "rush.epa_per_run" ? profile.epaPerRun : null,
        value: signal.value,
        weight: signal.weight,
        confidence: signal.confidence ?? 1,
        capturedAt: new Date(capturedAt),
        season,
        week: 0,
        sourceId: RUSH_SHADOW_SOURCE,
        rightsSnapshot,
        fetchedAt: new Date(capturedAt),
      });
    }
  }
  return writes;
}

/**
 * Atomically replace the current season's eligible rush shadow rows.
 * The source read happens before the transaction; every delete and upsert then
 * shares one transaction, so a failed upsert cannot leave a partially replaced
 * generation. This remains shadow-only and never enters pick scoring.
 */
export async function persistRushShadowLedger(
  season: number,
  client: RushShadowLedgerDb = db as unknown as RushShadowLedgerDb,
): Promise<RushShadowLedgerResult> {
  if (!Number.isInteger(season) || season < 1999 || season > 2100) {
    return { ...initialResult(season, "error"), errors: ["invalid season"] };
  }
  if (isStubMode()) return initialResult(season, "stub");

  let profiles: readonly RushProfileLedgerRow[] | null;
  try {
    profiles = await client.playerRushProfile.findMany({
      where: { season },
      select: {
        gsisId: true,
        season: true,
        sourceId: true,
        rightsSnapshot: true,
        fetchedAt: true,
        runs: true,
        guardRuns: true,
        tackleRuns: true,
        endRuns: true,
        leftRuns: true,
        middleRuns: true,
        rightRuns: true,
        epaPerRun: true,
      },
      orderBy: { runs: "desc" },
      take: RUSH_SHADOW_MAX_PROFILES,
    });
  } catch (error) {
    return {
      ...initialResult(season, "error"),
      errors: [error instanceof Error ? error.message : "rush profile read failed"],
    };
  }

  const rows = profiles ?? [];
  const counters = { playersWithSignals: 0, composedSignals: 0, signalsSkipped: 0 };
  const writes = buildRushSignalWrites(season, rows, counters);
  let signalsWritten = 0;

  // A failed row must escape this callback so Prisma rolls back the delete
  // and every successful sibling write. The outer catch reports the error
  // without exposing a raw DB exception to the cron response.
  try {
    await client.$transaction(async (tx) => {
      await tx.signal.deleteMany({
        where: {
          entityType: "player",
          key: { in: RUSH_SHADOW_KEYS },
          season,
          week: 0,
        },
      });
      for (const write of writes) {
        await tx.signal.upsert({
          where: {
            entityType_entityId_key_season_week: {
              entityType: "player",
              entityId: write.entityId,
              key: write.key,
              season,
              week: 0,
            },
          },
          create: write,
          update: {
            valueRaw: write.valueRaw,
            value: write.value,
            weight: write.weight,
            confidence: write.confidence,
            capturedAt: write.capturedAt,
            sourceId: write.sourceId,
            rightsSnapshot: write.rightsSnapshot,
            fetchedAt: write.fetchedAt,
          },
        });
        signalsWritten += 1;
      }
    });
  } catch (error) {
    return {
      ...initialResult(season, "error"),
      profilesRead: rows.length,
      errors: [error instanceof Error ? error.message : "rush signal replacement failed"],
    };
  }

  if (writes.length === 0) {
    return {
      ...initialResult(season, rows.length === 0 ? "no-data" : "ok"),
      profilesRead: rows.length,
      signalsSkipped: counters.signalsSkipped,
    };
  }

  return {
    status: "ok",
    mode: "shadow",
    priced: false,
    season,
    profilesRead: rows.length,
    playersWithSignals: counters.playersWithSignals,
    composedSignals: counters.composedSignals,
    signalsWritten,
    signalsSkipped: counters.signalsSkipped,
    errors: [],
  };
}
