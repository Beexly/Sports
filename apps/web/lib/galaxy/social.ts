/**
 * Galaxy Dynasty — social graph (Stage 2). Friends-play-with-friends spine:
 * follow players, see who you follow on the ladder, visit their cribs, and
 * challenge them. Crash-safe in DB-stub mode.
 */

import { db } from "@sports/db";
import { ratingTier } from "@sports/galaxy-engine";

export interface FollowView {
  readonly handle: string;
  readonly archetype: string;
  readonly faction: string;
  readonly rating: number;
  readonly tier: string;
}

export async function isFollowing(followerId: string, handle: string): Promise<boolean> {
  if (followerId === "stub") return false;
  try {
    const target = await db.galaxyProfile.findUnique({ where: { handle }, select: { id: true } });
    if (!target) return false;
    const f = await db.galaxyFollow.findUnique({
      where: { followerProfileId_followingProfileId: { followerProfileId: followerId, followingProfileId: target.id } },
    });
    return f != null;
  } catch {
    return false;
  }
}

export async function toggleFollow(followerId: string, handle: string): Promise<{ following: boolean; error?: string }> {
  if (followerId === "stub") return { following: false, error: "Create your Galaxy Profile to follow players." };
  try {
    const target = await db.galaxyProfile.findUnique({ where: { handle }, select: { id: true } });
    if (!target) return { following: false, error: "Player not found." };
    if (target.id === followerId) return { following: false, error: "You can't follow yourself." };
    const existing = await db.galaxyFollow.findUnique({
      where: { followerProfileId_followingProfileId: { followerProfileId: followerId, followingProfileId: target.id } },
    });
    if (existing) {
      await db.galaxyFollow.delete({ where: { id: existing.id } });
      return { following: false };
    }
    await db.galaxyFollow.create({ data: { followerProfileId: followerId, followingProfileId: target.id } });
    return { following: true };
  } catch {
    return { following: false, error: "Could not update follow." };
  }
}

export async function listFollowing(profileId: string): Promise<FollowView[]> {
  if (profileId === "stub") return [];
  try {
    const rows = await db.galaxyFollow.findMany({
      where: { followerProfileId: profileId },
      include: { following: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return rows
      .map((r) => r.following)
      .filter((p): p is NonNullable<typeof p> => p != null)
      .map((p) => ({
        handle: p.handle,
        archetype: p.archetype,
        faction: p.faction,
        rating: p.rating,
        tier: ratingTier(p.rating).name,
      }))
      .sort((a, b) => b.rating - a.rating);
  } catch {
    return [];
  }
}

export async function followCounts(profileId: string): Promise<{ following: number; followers: number }> {
  if (profileId === "stub") return { following: 0, followers: 0 };
  try {
    const [following, followers] = await Promise.all([
      db.galaxyFollow.count({ where: { followerProfileId: profileId } }),
      db.galaxyFollow.count({ where: { followingProfileId: profileId } }),
    ]);
    return { following, followers };
  } catch {
    return { following: 0, followers: 0 };
  }
}
