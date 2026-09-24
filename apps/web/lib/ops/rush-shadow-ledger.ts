/**
 * Durable, shadow-only bridge from persisted PlayerRushProfile rows to the
 * universal Signal ledger. This is a use path, not an ingestion path: it reads
 * an already-captured, nflverse-rights-stamped PBP aggregate and never fetches,
 * publishes, prices, or passes a signal to the public scoring surface.
 *
 * Signal is a latest-value table. Each profile is a season-level current fact,
 * so the stable key uses week=0 and the same profile upsert is idempotent on a
 * later calibration cycle. The row keeps the source rights snapshot and the
 * original capture time; it does not claim a trust field that the table does
 * not have. The conservative policy lives in weight/confidence.
 */
import { db, isStubMode, type Prisma } from "@sports/db";
import {
  composeLedger,
  rushProfileToLedgerSignals,
} from "@sports/prediction-engine";

export const RUSH_SHADOW_CATEGORY = "RATINGS" as const;
export const RUSH_SHADOW_SOURCE = "nflverse" as const;
export const RUSH_SHADOW_MAX_PROFILES = 2_000;

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
  readonly signal: {
    upsert(args: SignalUpsertArgs): Promise<unknown>;
  };
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

/**
 * Persist the current season's eligible rush profiles as low-weight Signal rows.
 * The writer is intentionally best-effort per row and never throws into a cron
 * or another operational caller; a partial failure is returned as `error` with
 * the exact count so the caller can report an incomplete cycle honestly.
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
  if (rows.length === 0) return initialResult(season, "no-data");

  let playersWithSignals = 0;
  let composedSignals = 0;
  let signalsWritten = 0;
  let signalsSkipped = 0;
  const errors: string[] = [];

  for (const profile of rows) {
    if (profile.sourceId !== RUSH_SHADOW_SOURCE || profile.rightsSnapshot == null) {
      signalsSkipped += 1;
      continue;
    }
    const capturedAt = capturedIso(profile.fetchedAt);
    const rightsSnapshot = inputJson(profile.rightsSnapshot);
    if (capturedAt === null || rightsSnapshot === null) {
      signalsSkipped += 1;
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
      signalsSkipped += 1;
      continue;
    }

    // Exercise the existing composer as a shadow diagnostic. This result is
    // deliberately not persisted as a score and is not consumed by picks.
    const composed = composeLedger(signals, { now: capturedAt, halfLifeDays: 0 });
    if (composed.signalsUsed === 0) {
      signalsSkipped += 1;
      continue;
    }
    playersWithSignals += 1;
    composedSignals += composed.signalsUsed;

    for (const signal of signals) {
      const valueRaw = signal.key === "rush.epa_per_run" ? profile.epaPerRun : null;
      const write: SignalWrite = {
        entityType: "player",
        entityId: profile.gsisId,
        key: signal.key,
        category: RUSH_SHADOW_CATEGORY,
        valueRaw,
        value: signal.value,
        weight: signal.weight,
        confidence: signal.confidence ?? 1,
        capturedAt: new Date(capturedAt),
        season,
        week: 0,
        sourceId: RUSH_SHADOW_SOURCE,
        rightsSnapshot,
        fetchedAt: new Date(capturedAt),
      };
      try {
        await client.signal.upsert({
          where: {
            entityType_entityId_key_season_week: {
              entityType: "player",
              entityId: profile.gsisId,
              key: signal.key,
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
      } catch (error) {
        errors.push(
          `${profile.gsisId}/${signal.key}: ${error instanceof Error ? error.message : "upsert failed"}`,
        );
      }
    }
  }

  return {
    status: errors.length > 0 ? "error" : "ok",
    mode: "shadow",
    priced: false,
    season,
    profilesRead: rows.length,
    playersWithSignals,
    composedSignals,
    signalsWritten,
    signalsSkipped,
    errors,
  };
}
