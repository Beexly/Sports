/**
 * DFS Optimizer — server-side data layer.
 *
 * All writes are idempotent where stated.  No auth is checked here;
 * callers (API routes) are responsible for any auth/authz they need.
 */

import { db } from "@sports/db";
import type { DfsProjectionSourceType } from "@sports/db";
import type { ParsedDkRow } from "./parsers/dk-csv";
import type { ParsedProjectionRow } from "./parsers/projection-csv";
import type { ParsedOwnershipRow } from "./parsers/ownership-csv";

// DfsSite is an enum value used as a literal constant below
type DfsSite = "DRAFTKINGS" | "FANDUEL" | "YAHOO";

// ── Re-exported Prisma result types ────────────────────────────────────────
// We return raw Prisma objects and let callers cast as needed.

export type DfsSlate = Awaited<ReturnType<typeof db.dfsSlate.findFirst>>;
export type DfsSalaryRow = Awaited<ReturnType<typeof db.dfsSalaryRow.findFirst>>;
export type DfsProjectionSet = Awaited<
  ReturnType<typeof db.dfsProjectionSet.findFirst>
>;
export type DfsPlayerProjection = Awaited<
  ReturnType<typeof db.dfsPlayerProjection.findFirst>
>;

// ── Slate queries ───────────────────────────────────────────────────────────

export async function listSlates(opts?: {
  site?: DfsSite;
  active?: boolean;
}): Promise<NonNullable<DfsSlate>[]> {
  return db.dfsSlate.findMany({
    where: {
      ...(opts?.site != null ? { site: opts.site } : {}),
      ...(opts?.active != null ? { isActive: opts.active } : {}),
    },
    orderBy: [{ slateDate: "desc" }, { createdAt: "desc" }],
  }) as Promise<NonNullable<DfsSlate>[]>;
}

export async function getSlate(id: string): Promise<NonNullable<DfsSlate> | null> {
  return db.dfsSlate.findUnique({ where: { id } }) as Promise<
    NonNullable<DfsSlate> | null
  >;
}

// ── Salary row queries ──────────────────────────────────────────────────────

export async function getPlayerPool(
  slateId: string
): Promise<NonNullable<DfsSalaryRow>[]> {
  return db.dfsSalaryRow.findMany({
    where: { slateId },
    orderBy: [{ salary: "desc" }, { name: "asc" }],
  }) as Promise<NonNullable<DfsSalaryRow>[]>;
}

// ── Projection set queries ──────────────────────────────────────────────────

export async function getProjectionSets(
  slateId: string
): Promise<NonNullable<DfsProjectionSet>[]> {
  return db.dfsProjectionSet.findMany({
    where: { slateId },
    orderBy: [{ isDefault: "desc" }, { generatedAt: "desc" }],
  }) as Promise<NonNullable<DfsProjectionSet>[]>;
}

export async function getProjections(
  projectionSetId: string
): Promise<NonNullable<DfsPlayerProjection>[]> {
  return db.dfsPlayerProjection.findMany({
    where: { projectionSetId },
    orderBy: [{ meanProjection: "desc" }],
  }) as Promise<NonNullable<DfsPlayerProjection>[]>;
}

/** Returns projections from the default set for a slate. */
export async function getSlateProjections(
  slateId: string
): Promise<NonNullable<DfsPlayerProjection>[]> {
  const defaultSet = await db.dfsProjectionSet.findFirst({
    where: { slateId, isDefault: true },
    orderBy: { generatedAt: "desc" },
  });
  if (!defaultSet) return [];
  return getProjections(defaultSet.id);
}

// ── Write operations ────────────────────────────────────────────────────────

/**
 * Import a DraftKings salary CSV into a new DfsSlate + DfsSalaryRow records.
 * DfsSalaryRow upserts are unique on (slateId, name, position, team) so
 * re-imports are idempotent.
 */
export async function createSlateFromDkCsv(
  rows: ParsedDkRow[],
  opts: {
    name: string;
    season?: number;
    week?: number;
    slateDate: Date;
    lockTime?: Date;
    importedBy?: string;
  }
): Promise<{ slateId: string; rowCount: number }> {
  const slate = await db.dfsSlate.create({
    data: {
      name: opts.name,
      site: "DRAFTKINGS" as DfsSite,
      slateType: "CLASSIC",
      sport: "NFL",
      season: opts.season ?? null,
      week: opts.week ?? null,
      slateDate: opts.slateDate,
      lockTime: opts.lockTime ?? null,
      importedAt: new Date(),
      importedBy: opts.importedBy ?? null,
      isActive: true,
      isLive: false,
    },
  });

  let rowCount = 0;
  for (const row of rows) {
    await db.dfsSalaryRow.upsert({
      where: {
        slateId_name_position_team: {
          slateId: slate.id,
          name: row.name,
          position: row.position,
          team: row.team,
        },
      },
      create: {
        slateId: slate.id,
        site: "DRAFTKINGS" as DfsSite,
        name: row.name,
        position: row.position,
        team: row.team,
        opponent: row.opponent || null,
        gameInfo: row.gameInfo || null,
        salary: row.salary,
        avgPoints: row.avgPoints ?? null,
        sitePlayerId: row.sitePlayerId || null,
        rosterSlot: row.rosterSlot || null,
        isLocked: false,
        isExcluded: false,
      },
      update: {
        opponent: row.opponent || null,
        gameInfo: row.gameInfo || null,
        salary: row.salary,
        avgPoints: row.avgPoints ?? null,
        sitePlayerId: row.sitePlayerId || null,
        rosterSlot: row.rosterSlot || null,
      },
    });
    rowCount++;
  }

  return { slateId: slate.id, rowCount };
}

/**
 * Create a DfsProjectionSet + DfsPlayerProjection records for a slate.
 * Marks as default if it's the first set for the slate, or if isDefault is
 * explicitly requested.
 */
export async function createProjectionSet(
  slateId: string,
  projections: ParsedProjectionRow[],
  opts: {
    sourceType: DfsProjectionSourceType;
    sourceName?: string;
    modelVersion?: string;
    isDefault?: boolean;
    isUserUpload?: boolean;
    isModeled?: boolean;
  }
): Promise<{ projectionSetId: string; count: number }> {
  const existingCount = await db.dfsProjectionSet.count({ where: { slateId } });
  const shouldBeDefault = opts.isDefault === true || existingCount === 0;

  // If this is forced default, clear current defaults
  if (shouldBeDefault && existingCount > 0) {
    await db.dfsProjectionSet.updateMany({
      where: { slateId, isDefault: true },
      data: { isDefault: false },
    });
  }

  const setName =
    opts.sourceName ??
    (opts.sourceType === "USER_UPLOAD"
      ? "User Upload"
      : opts.sourceType === "INTERNAL_MODEL"
      ? "GSE Model"
      : opts.sourceType);

  const projSet = await db.dfsProjectionSet.create({
    data: {
      slateId,
      name: setName,
      sourceType: opts.sourceType as DfsProjectionSourceType,
      sourceName: opts.sourceName ?? null,
      modelVersion: opts.modelVersion ?? null,
      isDefault: shouldBeDefault,
      isModeled: opts.isModeled ?? false,
      isUserUpload: opts.isUserUpload ?? false,
      isLicensed: false,
      generatedAt: new Date(),
    },
  });

  let count = 0;
  for (const proj of projections) {
    // Try to resolve salary row for this player
    const salaryRow = await db.dfsSalaryRow.findFirst({
      where: {
        slateId,
        name: proj.name,
        team: proj.team,
      },
    });

    await db.dfsPlayerProjection.create({
      data: {
        projectionSetId: projSet.id,
        salaryRowId: salaryRow?.id ?? null,
        name: proj.name,
        position: proj.position,
        team: proj.team,
        opponent: salaryRow?.opponent ?? null,
        salary: salaryRow?.salary ?? null,
        site: "DRAFTKINGS" as DfsSite,
        meanProjection: proj.meanProjection,
        floorP10: proj.floorP10 ?? null,
        ceilingP90: proj.ceilingP90 ?? null,
        projectedOwnership: proj.projectedOwnership ?? null,
        notes: proj.notes ?? null,
        source: opts.sourceName ?? opts.sourceType,
        modelVersion: opts.modelVersion ?? null,
        isModeled: opts.isModeled ?? false,
        isUserUploaded: opts.isUserUpload ?? false,
        isLicensed: false,
        isManualOverride: false,
      },
    });
    count++;
  }

  return { projectionSetId: projSet.id, count };
}

/**
 * Create or update DfsOwnershipProjection records for a slate.
 */
export async function createOwnershipProjections(
  slateId: string,
  rows: ParsedOwnershipRow[]
): Promise<{ count: number }> {
  let count = 0;
  for (const row of rows) {
    const salaryRow = await db.dfsSalaryRow.findFirst({
      where: { slateId, name: row.name, team: row.team },
    });

    await db.dfsOwnershipProjection.create({
      data: {
        slateId,
        salaryRowId: salaryRow?.id ?? null,
        name: row.name,
        position: row.position,
        team: row.team,
        site: "DRAFTKINGS" as DfsSite,
        projectedOwnership: row.projectedOwnership,
        source: "USER_UPLOAD",
        isModeled: false,
        isUserUpload: true,
      },
    });
    count++;
  }
  return { count };
}

/**
 * Apply a manual override to a single DfsPlayerProjection.
 * Sets isManualOverride = true on the record.
 */
export async function overrideProjection(
  projectionId: string,
  overrides: {
    meanProjection?: number;
    floorP10?: number;
    ceilingP90?: number;
    projectedOwnership?: number;
    notes?: string;
  }
): Promise<NonNullable<DfsPlayerProjection>> {
  return db.dfsPlayerProjection.update({
    where: { id: projectionId },
    data: {
      ...overrides,
      isManualOverride: true,
    },
  }) as Promise<NonNullable<DfsPlayerProjection>>;
}
