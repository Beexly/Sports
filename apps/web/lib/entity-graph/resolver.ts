/**
 * Entity Graph Resolver — Pillar A, v9 Provenance Fusion
 *
 * Canonical player/team entity resolution with bitemporal correctness.
 *
 * Key guarantees:
 *   - resolvePlayer is idempotent: same external ID looked up twice returns
 *     the same canonical entity id and bumps lastVerifiedAt.
 *   - resolveTeamAsOf respects historical franchise identity: "St. Louis Rams"
 *     on 2015-01-01 and "Los Angeles Rams" on 2016-01-01 resolve to the same
 *     Team row via formerNames JSON.
 *   - whoPlayedFor enforces both validity window AND knownAt to prevent
 *     look-ahead in historical audit queries.
 */

import { db } from "@sports/db";
import type { PlayerEntity, Team } from "@prisma/client";

// ─── Input types ──────────────────────────────────────────────────────────────

export interface ResolvePlayerInput {
  nflId?: string;
  pfrId?: string;
  gsisId?: string;
  espnId?: string;
  name?: string;
  birthYear?: number;
  position?: string;
  /** The data source creating or verifying this player. e.g. "nflverse" | "the-odds-api" | "espn" */
  source?: string;
}

// ─── Former-names JSON shape ──────────────────────────────────────────────────

interface FormerNameEntry {
  name: string;
  fromSeason: number;
  toSeason: number;
}

function isFormerNameEntry(v: unknown): v is FormerNameEntry {
  if (typeof v !== "object" || v === null) return false;
  const obj = v as Record<string, unknown>;
  return (
    typeof obj["name"] === "string" &&
    typeof obj["fromSeason"] === "number" &&
    typeof obj["toSeason"] === "number"
  );
}

function parseFormerNames(raw: unknown): FormerNameEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(isFormerNameEntry);
}

// ─── resolvePlayer ────────────────────────────────────────────────────────────

/**
 * Idempotent upsert for a canonical player entity.
 *
 * Lookup priority: nflId → pfrId → gsisId → espnId → name+birthYear
 *
 * On match:
 *   - bumps lastVerifiedAt
 *   - creates any new (alias/source) pair
 *
 * On miss:
 *   - creates PlayerEntity + EntityAlias
 *
 * Returns the canonical PlayerEntity regardless of create/update path.
 */
export async function resolvePlayer(input: ResolvePlayerInput): Promise<PlayerEntity> {
  const now = new Date();

  // 1. Find an existing entity by the first non-null external ID, then fall
  //    back to name+birthYear.
  let existing: PlayerEntity | null = null;

  if (input.nflId) {
    existing = await db.playerEntity.findUnique({ where: { nflId: input.nflId } });
  }
  if (!existing && input.pfrId) {
    existing = await db.playerEntity.findUnique({ where: { pfrId: input.pfrId } });
  }
  if (!existing && input.gsisId) {
    existing = await db.playerEntity.findUnique({ where: { gsisId: input.gsisId } });
  }
  if (!existing && input.espnId) {
    existing = await db.playerEntity.findUnique({ where: { espnId: input.espnId } });
  }
  if (!existing && input.name && input.birthYear !== undefined) {
    existing = await db.playerEntity.findFirst({
      where: { displayName: input.name, birthYear: input.birthYear },
    });
  }

  const displayName = input.name ?? "";

  if (existing) {
    // 2a. Update lastVerifiedAt and any newly provided external IDs.
    const updatedEntity = await db.playerEntity.update({
      where: { id: existing.id },
      data: {
        lastVerifiedAt: now,
        // Only set external IDs if we have a value and the field is currently null —
        // Prisma will ignore undefined. We intentionally never overwrite an existing ID
        // with a different value here (that would require a conflict-resolution policy).
        ...(input.nflId && !existing.nflId ? { nflId: input.nflId } : {}),
        ...(input.pfrId && !existing.pfrId ? { pfrId: input.pfrId } : {}),
        ...(input.gsisId && !existing.gsisId ? { gsisId: input.gsisId } : {}),
        ...(input.espnId && !existing.espnId ? { espnId: input.espnId } : {}),
      },
    });

    // 2b. Create EntityAlias for any new (alias/source) pair (upsert is safe here).
    if (input.name && input.source) {
      await db.entityAlias.upsert({
        where: {
          playerId_alias_source: {
            playerId: existing.id,
            alias: input.name,
            source: input.source,
          },
        },
        create: {
          playerId: existing.id,
          alias: input.name,
          source: input.source,
        },
        update: {},
      });
    }

    return updatedEntity;
  }

  // 3. Create a new canonical entity + alias in a transaction.
  return await db.$transaction(async (tx) => {
    const created = await tx.playerEntity.create({
      data: {
        displayName,
        position: input.position ?? null,
        nflId: input.nflId ?? null,
        pfrId: input.pfrId ?? null,
        gsisId: input.gsisId ?? null,
        espnId: input.espnId ?? null,
        birthYear: input.birthYear ?? null,
        lastVerifiedAt: now,
      },
    });

    if (input.name && input.source) {
      await tx.entityAlias.create({
        data: {
          playerId: created.id,
          alias: input.name,
          source: input.source,
        },
      });
    }

    return created;
  });
}

// ─── resolveTeamAsOf ─────────────────────────────────────────────────────────

/**
 * Temporal team lookup by name as of a given date.
 *
 * Resolution order:
 *   1. Exact match on Team.name (current display name)
 *   2. Match in Team.formerNames JSON array:
 *      [{ name, fromSeason, toSeason }] where the name matches
 *      and fromSeason ≤ year ≤ toSeason.
 *
 * Returns the canonical Team row regardless of which name matched.
 * This ensures "St. Louis Rams" in 2015 and "Los Angeles Rams" in 2016
 * both resolve to the same franchise id.
 */
export async function resolveTeamAsOf(name: string, asOf: Date): Promise<Team | null> {
  // 1. Exact current-name match.
  const byCurrentName = await db.team.findFirst({ where: { name } });
  if (byCurrentName) return byCurrentName;

  // 2. Check formerNames on all teams. Prisma doesn't support JSON array
  //    element filtering in a WHERE clause portably, so we fetch all teams
  //    that have a non-null formerNames and filter in application code.
  //    Teams are small (<1000 rows) so this is acceptable.
  const year = asOf.getFullYear();
  const teamsWithHistory = await db.team.findMany({
    where: { formerNames: { not: null } },
  });

  for (const team of teamsWithHistory) {
    const entries = parseFormerNames(team.formerNames);
    const matched = entries.some(
      (e) => e.name === name && e.fromSeason <= year && year <= e.toSeason,
    );
    if (matched) return team;
  }

  return null;
}

// ─── whoPlayedFor ─────────────────────────────────────────────────────────────

/**
 * Roster as of a given date, with strict bitemporal filtering.
 *
 * Includes a player only when ALL of the following hold:
 *   - tenure.teamId === teamId
 *   - tenure.validAt  <= asOf              (player was on this team by asOf)
 *   - tenure.validUntil is null OR > asOf  (player hadn't yet left)
 *   - tenure.knownAt  <= asOf              (we knew about this tenure by asOf)
 *
 * The knownAt filter is critical: it prevents look-ahead in historical audit
 * queries where the analysis date is in the past.
 */
export async function whoPlayedFor(teamId: string, asOf: Date): Promise<PlayerEntity[]> {
  const tenures = await db.playerTenure.findMany({
    where: {
      teamId,
      validAt: { lte: asOf },
      knownAt: { lte: asOf },
      OR: [{ validUntil: null }, { validUntil: { gt: asOf } }],
    },
    include: { player: true },
  });

  return tenures.map((t) => t.player);
}
