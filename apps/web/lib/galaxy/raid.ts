/**
 * Galaxy Dynasty — Crew co-op raids (Stage 3). The week's boss, tackled together.
 *
 * Members each fight the featured boss; their resisted-step counts fill a shared
 * crew raid bar. Clearing unlocks a crew-wide entitlement. Async (no realtime) —
 * the structure extends straight into the future 3D client. Crash-safe in stub.
 */

import { db } from "@sports/db";
import { BOSSES, getBoss } from "@sports/galaxy-engine";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function currentWeekKey(): string {
  return `w-${Math.floor(Date.now() / WEEK_MS)}`;
}

/** The week's featured raid boss (rotates through the registry). */
export function featuredBossKey(weekKey = currentWeekKey()): string {
  const idx = Math.abs(parseInt(weekKey.replace("w-", ""), 10) || 0) % BOSSES.length;
  return BOSSES[idx]!.key;
}

function raidGoalFor(bossKey: string): number {
  const boss = getBoss(bossKey);
  return (boss?.scenarios.length ?? 3) * 3;
}

export interface RaidView {
  readonly bossKey: string;
  readonly bossName: string;
  readonly goal: number;
  readonly progress: number;
  readonly pct: number;
  readonly cleared: boolean;
  readonly contributors: readonly { handle: string; resists: number }[];
}

async function findOrCreateRaid(crewId: string) {
  const weekKey = currentWeekKey();
  const bossKey = featuredBossKey(weekKey);
  const goal = raidGoalFor(bossKey);
  const existing = await db.crewRaid.findUnique({
    where: { crewId_bossKey_weekKey: { crewId, bossKey, weekKey } },
  });
  if (existing) return existing;
  return db.crewRaid.create({ data: { crewId, bossKey, weekKey, goal } });
}

export async function getRaidView(crewId: string): Promise<RaidView | null> {
  try {
    const raid = await findOrCreateRaid(crewId);
    const bossName = getBoss(raid.bossKey)?.name ?? raid.bossKey;
    const contribs = await db.crewRaidContribution.findMany({
      where: { raidId: raid.id },
      orderBy: { resists: "desc" },
      take: 12,
    });
    // Resolve contributor handles.
    const ids = contribs.map((c) => c.profileId);
    const profiles = ids.length
      ? await db.galaxyProfile.findMany({ where: { id: { in: ids } }, select: { id: true, handle: true } })
      : [];
    const handleById = new Map(profiles.map((p) => [p.id, p.handle]));
    return {
      bossKey: raid.bossKey,
      bossName,
      goal: raid.goal,
      progress: raid.progress,
      pct: raid.goal > 0 ? Math.min(100, Math.round((raid.progress / raid.goal) * 100)) : 0,
      cleared: raid.cleared,
      contributors: contribs.map((c) => ({ handle: handleById.get(c.profileId) ?? "Player", resists: c.resists })),
    };
  } catch {
    return null;
  }
}

/** Add a member's boss-run resists to their crew's active raid (if featured). */
export async function contributeToRaid(profileId: string, bossKey: string, resists: number): Promise<void> {
  if (profileId === "stub" || resists <= 0) return;
  if (bossKey !== featuredBossKey()) return; // only the week's featured boss counts
  try {
    const membership = await db.crewMembership.findFirst({ where: { profileId }, select: { crewId: true } });
    if (!membership) return;
    const raid = await findOrCreateRaid(membership.crewId);
    if (raid.cleared) return;

    await db.crewRaidContribution.upsert({
      where: { raidId_profileId: { raidId: raid.id, profileId } },
      update: { resists: { increment: resists } },
      create: { raidId: raid.id, profileId, resists },
    });

    const newProgress = raid.progress + resists;
    const nowCleared = newProgress >= raid.goal;
    await db.crewRaid.update({
      where: { id: raid.id },
      data: { progress: newProgress, cleared: nowCleared, clearedAt: nowCleared ? new Date() : null },
    });

    if (nowCleared) {
      // Crew-wide entitlement on a raid clear (best-effort).
      const members = await db.crewMembership.findMany({ where: { crewId: membership.crewId }, select: { profileId: true } });
      const sku = `raid-${raid.bossKey}-banner`;
      const name = `${getBoss(raid.bossKey)?.name ?? "Raid"} Raid Banner`;
      for (const m of members) {
        await db.merchEntitlement.upsert({
          where: { profileId_sku: { profileId: m.profileId, sku } },
          update: {},
          create: { profileId: m.profileId, sku, name, unlockedVia: "Crew Raid clear" },
        });
      }
    }
  } catch {
    /* no DB */
  }
}
