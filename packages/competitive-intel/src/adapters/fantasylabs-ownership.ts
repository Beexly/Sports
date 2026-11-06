/**
 * FantasyLabs per-entrant ownership adapter: the leverage map.
 *
 * GET /api/contests/usersummary/{sportId}/{contestId}/{ownerId} returns that entrant's players
 * with salary, their own exposure, the field's exposure and the gap between the two. The gap is
 * the whole point: OwnPerc above FieldPerc is a contrarian bet, below is a chalk bet, and the
 * pair together is a readable statement of how a strong player thinks about a slate.
 *
 * This is not a projection feed. It is what a good player did with a projection feed, which is
 * closer to the model than the numbers are.
 */

import { z } from "zod";
import type { RawArtifact } from "../types.js";
import type { LicenseClass } from "../types.js";
import type { RivalAdapter } from "../adapter.js";

export const userSummaryUrl = (sportId: number, contestId: number, ownerId: number): string =>
  `https://www.fantasylabs.com/api/contests/usersummary/${sportId}/${contestId}/${ownerId}`;

export interface RivalOwnership {
  readonly contestId: number;
  readonly ownerId: number;
  readonly playerId: number;
  readonly playerName: string;
  readonly position: string;
  readonly team: string;
  readonly salary: number;
  /** Share of THIS entrant's lineups that roster the player. */
  readonly ownPercent: number;
  /** Share of the whole field that rosters the player. */
  readonly fieldPercent: number;
  /** ownPercent - fieldPercent, as the source computes it. Positive is contrarian. */
  readonly variance: number;
}

const rawRow = z
  .object({
    ContestId: z.number().int().positive(),
    OwnerId: z.number().int().nonnegative(),
    PlayerId: z.number().int(),
    Position: z.string(),
    PlayerName: z.string(),
    Team: z.string(),
    Salary: z.number().int().nonnegative(),
    OwnPerc: z.number(),
    FieldPerc: z.number(),
    UserVariance: z.number(),
  })
  .passthrough();

export const rivalOwnershipSchema = z
  .object({
    contestId: z.number().int().positive(),
    ownerId: z.number().int().nonnegative(),
    playerId: z.number().int(),
    playerName: z.string(),
    position: z.string(),
    team: z.string(),
    salary: z.number().int().nonnegative(),
    ownPercent: z.number(),
    fieldPercent: z.number(),
    variance: z.number(),
  })
  .strict();

export function parseOwnership(body: string): z.infer<typeof rawRow>[] {
  const trimmed = body.trim();
  if (!trimmed.startsWith("[")) throw new Error("ownership payload is not a JSON array");
  const parsed = z.array(rawRow).safeParse(JSON.parse(trimmed));
  if (!parsed.success) {
    throw new Error(`ownership payload failed shape: ${parsed.error.issues[0]?.message ?? "unknown"}`);
  }
  return parsed.data;
}

export function toOwnership(row: z.infer<typeof rawRow>): RivalOwnership {
  return {
    contestId: row.ContestId,
    ownerId: row.OwnerId,
    playerId: row.PlayerId,
    playerName: row.PlayerName,
    position: row.Position,
    team: row.Team,
    salary: row.Salary,
    ownPercent: row.OwnPerc,
    fieldPercent: row.FieldPerc,
    variance: row.UserVariance,
  };
}

export function ownershipAdapter(sportId: number, contestId: number, ownerId: number): RivalAdapter<RivalOwnership> {
  return {
    orgSlug: "fantasylabs",
    assetType: "projection_file",
    tier: 3,
    sourceId: "fantasylabs-public-api",
    licenseClass: "tos_scraped" satisfies LicenseClass,
    commercialOk: false,
    url: userSummaryUrl(sportId, contestId, ownerId),
    schema: rivalOwnershipSchema,
    normalize(raw: RawArtifact): RivalOwnership[] {
      return parseOwnership(raw.body).map(toOwnership);
    },
  };
}

/** Field-wide exposure across every entrant pulled, the slate's chalk board. */
export interface ChalkRow {
  readonly playerId: number;
  readonly playerName: string;
  readonly position: string;
  readonly fieldPercent: number;
  readonly entrantCount: number;
}

export function chalkBoard(rows: readonly RivalOwnership[]): ChalkRow[] {
  const byPlayer = new Map<number, { name: string; pos: string; field: number; owners: Set<number> }>();
  for (const row of rows) {
    const existing = byPlayer.get(row.playerId);
    if (existing) {
      existing.owners.add(row.ownerId);
      existing.field = Math.max(existing.field, row.fieldPercent);
      continue;
    }
    byPlayer.set(row.playerId, {
      name: row.playerName,
      pos: row.position,
      field: row.fieldPercent,
      owners: new Set([row.ownerId]),
    });
  }
  return [...byPlayer.entries()]
    .map(([playerId, v]) => ({
      playerId,
      playerName: v.name,
      position: v.pos,
      fieldPercent: v.field,
      entrantCount: v.owners.size,
    }))
    .sort((a, b) => b.fieldPercent - a.fieldPercent);
}
