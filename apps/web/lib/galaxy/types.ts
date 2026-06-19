/**
 * Galaxy Dynasty — serialized view types shared by server lib, API routes, and UI.
 * Plain JSON-safe shapes (no Date objects, no Prisma types leaking to the client).
 */

import type {
  GalaxyArchetypeId,
  GalaxyFactionId,
  SignalCheckOutcome,
} from "@sports/galaxy-engine";

export interface SkillView {
  readonly sportKey: string;
  readonly label: string;
  readonly shortLabel: string;
  readonly level: number;
  readonly xp: number;
  readonly xpIntoLevel: number;
  readonly xpToNext: number;
  readonly progress: number;
  readonly gradedCount: number;
  readonly avgBrier: number | null;
}

export interface CardView {
  readonly slug: string;
  readonly name: string;
  readonly subjectType: string;
  readonly rarity: string;
  readonly gseRating: number | null;
  readonly formTrend: string | null;
  readonly valueTrend: string | null;
  readonly assetSeed: string;
}

export interface MerchView {
  readonly sku: string;
  readonly name: string;
  readonly unlockedVia: string;
  readonly redeemed: boolean;
}

export interface CrewView {
  readonly id: string;
  readonly name: string;
  readonly tag: string;
  readonly motto: string | null;
  readonly faction: GalaxyFactionId | null;
  readonly memberCount: number;
  readonly role: "CAPTAIN" | "MEMBER" | null;
}

export interface ProfileView {
  readonly id: string;
  readonly handle: string;
  readonly archetype: GalaxyArchetypeId;
  readonly archetypeName: string;
  readonly faction: GalaxyFactionId;
  readonly factionName: string;
  readonly characterLevel: number;
  readonly characterXp: number;
  readonly characterXpIntoLevel: number;
  readonly characterXpToNext: number;
  readonly characterProgress: number;
  readonly prestige: number;
  readonly creditsBalance: number;
  readonly avatarSeed: string;
  readonly dailyStreak: number;
  readonly onboarded: boolean;
  readonly skills: readonly SkillView[];
  readonly cards: readonly CardView[];
  readonly merch: readonly MerchView[];
  readonly bossCleared: readonly string[];
  readonly crew: CrewView | null;
}

export interface RewardSummary {
  readonly xp: number;
  readonly credits: number;
  readonly newBalance: number;
  readonly skillKey: string | null;
  readonly skillLevel: number | null;
  readonly skillLeveledUp: boolean;
  readonly characterLevel: number;
  readonly characterLeveledUp: boolean;
  readonly prestigeGained: number;
}

export interface SignalCheckResponse {
  readonly outcome: SignalCheckOutcome;
  readonly reward: RewardSummary;
  readonly persisted: boolean;
  /** Quest keys completed by this action. */
  readonly questsCompleted: readonly string[];
}
