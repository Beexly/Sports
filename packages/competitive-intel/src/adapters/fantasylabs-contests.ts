/**
 * FantasyLabs contest entries adapter: the customer base.
 *
 * GET https://www.fantasylabs.com/api/contests/usernames/{sportId}/{contestId} is
 * unauthenticated, per contest, and returns the full field of entrants with how many lineups
 * each one entered. One request yields 17k to 90k handles, which makes the entrant graph the
 * cheapest real asset on this target: it is not a guess at a subscriber list, it is the actual
 * paying population of a contest, ordered by commitment.
 *
 * Id space: contestId is not a sequence. Ids come from the slate listing
 * (`/api/contests/{sport}/slates/?date=YYYY-MM-DD`) and from archived URLs; see
 * scripts/competitive-intel/discover-contests.ts. The entrant payload does not echo the
 * contest id, so the adapter takes it as an explicit argument rather than pretending to read it.
 */

import { z } from "zod";
import type { RawArtifact } from "../types.js";
import type { LicenseClass } from "../types.js";
import type { RivalAdapter } from "../adapter.js";

export const contestsUrl = (sportId: number, contestId: number): string =>
  `https://www.fantasylabs.com/api/contests/usernames/${sportId}/${contestId}`;

export interface RivalEntrant {
  readonly contestId: number;
  readonly ownerId: number;
  readonly username: string;
  readonly lineupCount: number;
  readonly playerCount: number;
  /** Share of the field this entrant's lineups represent, as the source reports it. */
  readonly maxPercent: number;
  readonly favorite: boolean;
}

const rawRow = z
  .object({
    OwnerId: z.number().int().nonnegative(),
    Username: z.string().min(1),
    LineupCt: z.number().int().nonnegative(),
    PlayerCt: z.number().int().nonnegative(),
    MaxPerc: z.number(),
    isFavorite: z.union([z.number().int(), z.boolean()]),
  })
  .passthrough();

export const rivalEntrantSchema = z
  .object({
    contestId: z.number().int().positive(),
    ownerId: z.number().int().nonnegative(),
    username: z.string().min(1),
    lineupCount: z.number().int().nonnegative(),
    playerCount: z.number().int().nonnegative(),
    maxPercent: z.number(),
    favorite: z.boolean(),
  })
  .strict();

export function parseEntrants(body: string): z.infer<typeof rawRow>[] {
  const trimmed = body.trim();
  if (!trimmed.startsWith("[")) throw new Error("entrants payload is not a JSON array");
  const parsed = z.array(rawRow).safeParse(JSON.parse(trimmed));
  if (!parsed.success) {
    throw new Error(`entrants payload failed shape: ${parsed.error.issues[0]?.message ?? "unknown"}`);
  }
  return parsed.data;
}

export function toEntrant(row: z.infer<typeof rawRow>, contestId: number): RivalEntrant {
  return {
    contestId,
    ownerId: row.OwnerId,
    username: row.Username.trim(),
    lineupCount: row.LineupCt,
    playerCount: row.PlayerCt,
    maxPercent: row.MaxPerc,
    favorite: row.isFavorite === true || row.isFavorite === 1,
  };
}

/** Adapter factory: the contest id is part of the URL, so it cannot be a module constant. */
export function entrantsAdapter(contestId: number, sportId = 5): RivalAdapter<RivalEntrant> {
  return {
    orgSlug: "fantasylabs",
    assetType: "pick_archive",
    tier: 3,
    sourceId: "fantasylabs-public-api",
    licenseClass: "tos_scraped" satisfies LicenseClass,
    commercialOk: false,
    url: contestsUrl(sportId, contestId),
    schema: rivalEntrantSchema,
    normalize(raw: RawArtifact): RivalEntrant[] {
      return parseEntrants(raw.body).map((row) => toEntrant(row, contestId));
    },
  };
}

/**
 * Deduplicate entrants across contests into one person per ownerId, summing commitment.
 * The same owner entering six contests is one contact with six contests, not six contacts.
 */
export interface EntrantProfile {
  readonly ownerId: number;
  readonly username: string;
  readonly contests: number;
  readonly lineups: number;
  readonly bestMaxPercent: number;
  readonly favorite: boolean;
}

export function rollUpEntrants(rows: readonly RivalEntrant[]): EntrantProfile[] {
  const byOwner = new Map<number, { username: string; contests: Set<number>; lineups: number; best: number; fav: boolean }>();
  for (const row of rows) {
    const existing = byOwner.get(row.ownerId);
    if (existing) {
      existing.contests.add(row.contestId);
      existing.lineups += row.lineupCount;
      existing.best = Math.max(existing.best, row.maxPercent);
      existing.fav = existing.fav || row.favorite;
      continue;
    }
    byOwner.set(row.ownerId, {
      username: row.username,
      contests: new Set([row.contestId]),
      lineups: row.lineupCount,
      best: row.maxPercent,
      fav: row.favorite,
    });
  }
  return [...byOwner.entries()]
    .map(([ownerId, v]) => ({
      ownerId,
      username: v.username,
      contests: v.contests.size,
      lineups: v.lineups,
      bestMaxPercent: v.best,
      favorite: v.fav,
    }))
    .sort((a, b) => b.lineups - a.lineups);
}

/**
 * Engagement bands for a wedge. "Whale" is not a compliment, it is a behaviour. The bands are
 * ordinal and fixed so two runs agree, and they key on repetition across contests, not on one
 * big entry.
 */
export function engagementBand(profile: EntrantProfile): "whale" | "grinder" | "regular" | "casual" {
  // A single DFS contest caps entries around 20, so one contest can never make a whale on its
  // own. Whales are people who repeat the maximum across contests, which only shows up once
  // several contests are rolled together.
  if (profile.contests >= 2 && profile.lineups >= 40) return "whale";
  if (profile.lineups >= 20) return "grinder";
  if (profile.lineups >= 2) return "regular";
  return "casual";
}
