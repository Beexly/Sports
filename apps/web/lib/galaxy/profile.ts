/**
 * Galaxy Dynasty — profile + progression server lib.
 *
 * The seam between the pure @sports/galaxy-engine and persistence. All state
 * mutation (credits, XP, levels) happens here, server-side only (DECISION D-012);
 * the client never asserts a reward. Crash-safe in DB-stub mode: when no DB is
 * connected, reads return empty and writes no-op, so the loop still computes and
 * displays real engine outcomes (persisted=false).
 */

import { db, isStubMode } from "@sports/db";
import {
  ARCHETYPES,
  FACTIONS,
  getArchetype,
  getFaction,
  SPORTS_IQ_SKILLS,
  getSkillDef,
  awardCredits,
  skillLevelFromXp,
  characterLevelFromXp,
  ONBOARDING_CREDIT_GRANT,
  skillXpToNextLevel,
  ratingTier,
  ratingTierProgress,
  seasonProgress,
  seasonPointsForXp,
  type GalaxyArchetypeId,
  type GalaxyFactionId,
  type CreditEarnReason,
} from "@sports/galaxy-engine";
import { STARTER_CARDS, STARTER_QUESTS } from "./content.js";
import type { ProfileView, RewardSummary, SkillView } from "./types.js";

const PROFILE_INCLUDE = {
  skills: true,
  cards: { include: { card: true } },
  merch: true,
  bossProgress: true,
  crewMemberships: { include: { crew: { include: { _count: { select: { members: true } } } } } },
} as const;

type ProfileRow = NonNullable<
  Awaited<ReturnType<typeof getProfileRowByUserId>>
>;

export async function getProfileRowByUserId(userId: string) {
  try {
    return await db.galaxyProfile.findUnique({
      where: { userId },
      include: PROFILE_INCLUDE,
    });
  } catch {
    return null;
  }
}

export async function getProfileRowById(profileId: string) {
  try {
    return await db.galaxyProfile.findUnique({
      where: { id: profileId },
      include: PROFILE_INCLUDE,
    });
  } catch {
    return null;
  }
}

function buildSkillView(sportKey: string, row?: { level: number; xp: number; gradedCount: number; brierSum: number }): SkillView {
  const def = getSkillDef(sportKey);
  const xp = row?.xp ?? 0;
  const level = row?.level ?? 1;
  const state = skillLevelFromXp(xp, level);
  const gradedCount = row?.gradedCount ?? 0;
  const brierSum = row?.brierSum ?? 0;
  return {
    sportKey,
    label: def?.label ?? sportKey,
    shortLabel: def?.shortLabel ?? sportKey,
    level: state.level,
    xp,
    xpIntoLevel: state.xpIntoLevel,
    xpToNext: state.xpToNext || skillXpToNextLevel(state.level),
    progress: state.progress,
    gradedCount,
    avgBrier: gradedCount > 0 ? Math.round((brierSum / gradedCount) * 10000) / 10000 : null,
  };
}

export function serializeProfile(row: ProfileRow): ProfileView {
  const archetype = row.archetype as GalaxyArchetypeId;
  const faction = row.faction as GalaxyFactionId;
  const charState = characterLevelFromXp(row.characterXp, row.characterLevel);

  // Merge persisted skills with the canon skill list so the UI always shows all.
  const skillByKey = new Map(row.skills.map((s) => [s.sportKey, s]));
  const skills: SkillView[] = SPORTS_IQ_SKILLS.map((def) =>
    buildSkillView(def.key, skillByKey.get(def.key)),
  );

  const crewMembership = row.crewMemberships[0] ?? null;
  const tierP = ratingTierProgress(row.rating);
  const season = seasonProgress(row.seasonPoints);

  return {
    id: row.id,
    handle: row.handle,
    archetype,
    archetypeName: getArchetype(archetype).name,
    faction,
    factionName: getFaction(faction).name,
    characterLevel: charState.level,
    characterXp: row.characterXp,
    characterXpIntoLevel: charState.xpIntoLevel,
    characterXpToNext: charState.xpToNext,
    characterProgress: charState.progress,
    prestige: row.prestige,
    creditsBalance: row.creditsBalance,
    rating: row.rating,
    ratingTier: ratingTier(row.rating).name,
    ratingTierProgress: tierP.progress,
    seasonPoints: row.seasonPoints,
    seasonTier: season.tier.tier,
    seasonTierName: season.tier.name,
    seasonProgress: season.progress,
    avatarSeed: row.avatarSeed ?? row.id,
    dailyStreak: row.dailyStreak,
    onboarded: row.onboardedAt != null,
    skills,
    cards: row.cards.map((o) => ({
      slug: o.card.slug,
      name: o.card.name,
      subjectType: o.card.subjectType,
      rarity: o.card.rarity,
      gseRating: o.card.gseRating,
      formTrend: o.card.formTrend,
      valueTrend: o.card.valueTrend,
      assetSeed: o.card.assetSeed ?? o.card.slug,
    })),
    merch: row.merch.map((m) => ({
      sku: m.sku,
      name: m.name,
      unlockedVia: m.unlockedVia,
      redeemed: m.redeemed,
    })),
    bossCleared: row.bossProgress.filter((b) => b.cleared).map((b) => b.bossKey),
    crew: crewMembership
      ? {
          id: crewMembership.crew.id,
          name: crewMembership.crew.name,
          tag: crewMembership.crew.tag,
          motto: crewMembership.crew.motto,
          faction: crewMembership.crew.faction as GalaxyFactionId | null,
          memberCount: crewMembership.crew._count.members,
          role: crewMembership.role as "CAPTAIN" | "MEMBER",
        }
      : null,
  };
}

export async function getProfileViewByUserId(userId: string): Promise<ProfileView | null> {
  const row = await getProfileRowByUserId(userId);
  if (!row) return null;
  return serializeProfile(row);
}

/** Idempotently seed global catalog rows (cards, quests). Safe to call often. */
export async function ensureGlobalSeed(): Promise<void> {
  try {
    for (const c of STARTER_CARDS) {
      await db.galaxyCard.upsert({
        where: { slug: c.slug },
        update: {},
        create: {
          slug: c.slug,
          name: c.name,
          subjectType: c.subjectType,
          rarity: c.rarity,
          gseRating: c.gseRating,
          formTrend: c.formTrend,
          valueTrend: c.valueTrend,
          statLine: c.statLine,
          assetSeed: c.slug,
        },
      });
    }
    for (const q of STARTER_QUESTS) {
      await db.galaxyQuest.upsert({
        where: { key: q.key },
        update: {},
        create: {
          key: q.key,
          title: q.title,
          description: q.description,
          surface: q.surface,
          sportKey: q.sportKey ?? null,
          rewardCredits: q.rewardCredits,
          rewardXp: q.rewardXp,
        },
      });
    }
  } catch {
    /* stub mode / no DB — no-op */
  }
}

export interface OnboardInput {
  readonly userId: string;
  readonly handle: string;
  readonly archetype: GalaxyArchetypeId;
  readonly faction: GalaxyFactionId;
}

export interface OnboardResult {
  readonly profileId: string;
  readonly view: ProfileView | null;
  readonly persisted: boolean;
}

/** Create a Galaxy Profile, seed skills + starter cards, grant onboarding credits. */
export async function onboardProfile(input: OnboardInput): Promise<OnboardResult> {
  await ensureGlobalSeed();

  // Onboarding credit grant flows through the Credit Constitution (earn-only).
  const grant = awardCredits(0, ONBOARDING_CREDIT_GRANT, "ONBOARDING_GRANT");

  try {
    const created = await db.galaxyProfile.create({
      data: {
        userId: input.userId,
        handle: input.handle,
        archetype: input.archetype,
        faction: input.faction,
        avatarSeed: `${input.archetype}:${input.handle}`,
        creditsBalance: grant.balanceAfter,
        onboardedAt: new Date(),
        skills: {
          create: SPORTS_IQ_SKILLS.map((s) => ({ sportKey: s.key })),
        },
        ledger: {
          create: {
            amount: grant.amount,
            reason: "ONBOARDING_GRANT",
            balanceAfter: grant.balanceAfter,
          },
        },
      },
    });

    const profileId = created.id;
    const persisted = !isStubMode() && profileId !== "stub";

    if (persisted) {
      // Grant the starter card pack.
      for (const c of STARTER_CARDS) {
        const card = await db.galaxyCard.findUnique({ where: { slug: c.slug } });
        if (card) {
          await db.galaxyCardOwnership.upsert({
            where: { profileId_cardId: { profileId, cardId: card.id } },
            update: {},
            create: { profileId, cardId: card.id, acquiredVia: "STARTER_PACK" },
          });
        }
      }
    }

    const view = persisted ? await getProfileViewByUserId(input.userId) : null;
    return { profileId, view, persisted };
  } catch {
    return { profileId: "stub", view: null, persisted: false };
  }
}

export interface RewardInput {
  readonly xp: number;
  readonly credits: number;
  readonly reason: CreditEarnReason;
  readonly sportKey?: string;
  readonly ref?: { type: string; id: string };
}

/**
 * The single server-side reward mutation. Awards credits via the engine
 * (earn-only), advances the relevant Sports IQ skill + the character level, and
 * grants prestige on a character level-up. Returns a summary for the UI.
 */
export async function applyReward(profileId: string, input: RewardInput): Promise<RewardSummary> {
  const row = await getProfileRowById(profileId);

  // No DB / stub: compute a synthetic summary from inputs alone.
  if (!row || profileId === "stub") {
    const charState = characterLevelFromXp(input.xp, 1);
    const skillState = input.sportKey ? skillLevelFromXp(input.xp, 1) : null;
    return {
      xp: input.xp,
      credits: input.credits,
      newBalance: input.credits,
      skillKey: input.sportKey ?? null,
      skillLevel: skillState?.level ?? null,
      skillLeveledUp: false,
      characterLevel: charState.level,
      characterLeveledUp: false,
      prestigeGained: 0,
    };
  }

  // Credits — only path that changes the balance.
  let newBalance = row.creditsBalance;
  if (input.credits > 0) {
    const entry = awardCredits(row.creditsBalance, input.credits, input.reason, input.ref);
    newBalance = entry.balanceAfter;
    await db.galaxyCreditLedgerEntry.create({
      data: {
        profileId,
        amount: entry.amount,
        reason: input.reason,
        balanceAfter: entry.balanceAfter,
        refType: input.ref?.type ?? null,
        refId: input.ref?.id ?? null,
      },
    });
  }

  // Skill XP.
  let skillLevel: number | null = null;
  let skillLeveledUp = false;
  if (input.sportKey && input.xp > 0) {
    const skill = row.skills.find((s) => s.sportKey === input.sportKey);
    const prevXp = skill?.xp ?? 0;
    const prevLevel = skill?.level ?? 1;
    const newXp = prevXp + input.xp;
    const state = skillLevelFromXp(newXp, prevLevel);
    skillLevel = state.level;
    skillLeveledUp = state.leveledUp;
    if (skill) {
      await db.sportsIqSkill.update({
        where: { id: skill.id },
        data: { xp: newXp, level: state.level },
      });
    } else {
      await db.sportsIqSkill.create({
        data: { profileId, sportKey: input.sportKey, xp: newXp, level: state.level },
      });
    }
  }

  // Character XP + prestige on level-up.
  const newCharXp = row.characterXp + input.xp;
  const charState = characterLevelFromXp(newCharXp, row.characterLevel);
  const prestigeGained = charState.leveledUp ? charState.levelsGained : 0;

  // Season Cup points accrue from every graded check (capped per check).
  const seasonGain = seasonPointsForXp(input.xp);

  await db.galaxyProfile.update({
    where: { id: profileId },
    data: {
      creditsBalance: newBalance,
      characterXp: newCharXp,
      characterLevel: charState.level,
      prestige: row.prestige + prestigeGained,
      seasonPoints: row.seasonPoints + seasonGain,
    },
  });

  return {
    xp: input.xp,
    credits: input.credits,
    newBalance,
    skillKey: input.sportKey ?? null,
    skillLevel,
    skillLeveledUp,
    characterLevel: charState.level,
    characterLeveledUp: charState.leveledUp,
    prestigeGained,
  };
}

export const ARCHETYPE_LIST = ARCHETYPES;
export const FACTION_LIST = FACTIONS;
