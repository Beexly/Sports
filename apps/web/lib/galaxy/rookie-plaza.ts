import {
  DIALOGUE,
  GAME_KERNEL_SKILLS,
  BLACKTOP_GAMES,
  DISTRICT_REPUTATION,
  GAME_KERNEL_BOSSES,
  GHOST_PRESENCE,
  INVENTORY_ITEMS,
  NPCS,
  QUEST_EVENT_RULES,
  QUESTS,
  WEATHER_GAMEPLAY_EFFECTS,
  GALAXY_CAMPUS_NODES,
  ENTITY_REGISTRY,
  type InventoryItemDef,
  type QuestDef,
} from "@sports/galaxy-engine";
import { isStubMode } from "@sports/db";
import { applyReward } from "./profile.js";
import { getGalaxyWorldState, getRecommendedRoute } from "./world-state.js";
import { runAcademyCheck } from "./loop.js";
import type { ProfileView, RewardSummary, SignalCheckResponse } from "./types.js";
import {
  getRookiePlazaPresenceSnapshot,
  joinRookiePlazaPresence,
  signalRookiePlazaPresence,
  syncRookiePlazaPresencePosition,
  type RookiePlazaPresenceSnapshot,
} from "./rookie-plaza-presence.js";

export interface RookiePlazaState {
  readonly profileSummary: {
    readonly handle: string;
    readonly sportsIqLabel: string;
    readonly sportsIqLevel: number;
    readonly galaxyScore: number;
  } | null;
  readonly activeWeather: ReturnType<typeof getGalaxyWorldState>;
  readonly quests: readonly QuestDef[];
  readonly inventory: readonly InventoryItemDef[];
  readonly npcStates: readonly {
    readonly id: string;
    readonly name: string;
    readonly role: string;
    readonly line: string;
    readonly position: { readonly x: number; readonly y: number; readonly z: number };
    readonly interactionRadius: number;
    readonly animationState: string;
  }[];
  readonly ghostPresence: typeof GHOST_PRESENCE;
  readonly recommendedRoute: ReturnType<typeof getRecommendedRoute>;
  readonly districtDoors: readonly { id: string; label: string; href: string | null }[];
  readonly skills: readonly { id: string; label: string; districtId: string }[];
  readonly blacktopGames: typeof BLACKTOP_GAMES;
  readonly bosses: typeof GAME_KERNEL_BOSSES;
  readonly reputation: typeof DISTRICT_REPUTATION;
  readonly questRules: typeof QUEST_EVENT_RULES;
  readonly sceneEntities: typeof ENTITY_REGISTRY;
  readonly presenceRoom: RookiePlazaPresenceSnapshot;
}

export interface RookiePlazaActionResult {
  readonly ok: true;
  readonly persisted: boolean;
  readonly event: string;
  readonly reward?: RewardSummary;
  readonly signalCheck?: SignalCheckResponse;
  readonly item?: InventoryItemDef | null;
  readonly presenceRoom?: RookiePlazaPresenceSnapshot;
}

export function getRookiePlazaState(profile: ProfileView | null): RookiePlazaState {
  const activeWeather = getGalaxyWorldState();
  const route = getRecommendedRoute(activeWeather, profile);
  const weatherEffect = WEATHER_GAMEPLAY_EFFECTS.find((effect) => effect.weatherId === activeWeather.weatherId);
  const firstSkill = profile?.skills[0] ?? null;
  return {
    profileSummary: profile
      ? {
          handle: profile.handle,
          sportsIqLabel: firstSkill?.label ?? "Sports IQ",
          sportsIqLevel: firstSkill?.level ?? 1,
          galaxyScore: profile.characterLevel * 10 + profile.prestige,
        }
      : null,
    activeWeather,
    quests: QUESTS,
    inventory: INVENTORY_ITEMS,
    npcStates: NPCS.map((npc) => ({
      id: npc.id,
      name: npc.name,
      role: npc.role,
      line:
        DIALOGUE.find((dialogue) => dialogue.npcId === npc.id)?.weatherVariants[
          activeWeather.weatherId as keyof (typeof DIALOGUE)[number]["weatherVariants"]
        ] ??
        DIALOGUE.find((dialogue) => dialogue.npcId === npc.id)?.text ??
        weatherEffect?.npcDialogueTone ??
        "Follow the route and make the account more permanent.",
      position: npc.position ?? { x: 0, y: 0, z: 0 },
      interactionRadius: npc.interactionRadius ?? 1.2,
      animationState: npc.animationState ?? "idle",
    })),
    ghostPresence: GHOST_PRESENCE,
    recommendedRoute: route,
    districtDoors: GALAXY_CAMPUS_NODES.filter((node) => node.routeTarget).map((node) => ({
      id: node.id,
      label: node.label,
      href: node.routeTarget?.href ?? null,
    })),
    skills: GAME_KERNEL_SKILLS.map((skill) => ({
      id: skill.id,
      label: skill.label,
      districtId: skill.districtId,
    })),
    blacktopGames: BLACKTOP_GAMES,
    bosses: GAME_KERNEL_BOSSES,
    reputation: DISTRICT_REPUTATION,
    questRules: QUEST_EVENT_RULES,
    sceneEntities: ENTITY_REGISTRY,
    presenceRoom: getRookiePlazaPresenceSnapshot(),
  };
}

export async function completeRookiePlazaQuest(
  profileId: string,
  questId: string,
): Promise<RookiePlazaActionResult> {
  const quest = QUESTS.find((entry) => entry.id === questId);
  if (!quest) throw new Error(`Unknown Rookie Plaza quest: ${questId}`);
  const reward = await applyReward(profileId, {
    xp: quest.rewards.xp,
    credits: quest.rewards.credits,
    reason: quest.rewards.reason,
    sportKey: "americanfootball_nfl",
    ref: { type: "rookie_plaza_quest", id: questId },
  });
  return { ok: true, persisted: !isStubMode() && profileId !== "stub", event: quest.rewards.adminEvent, reward };
}

export async function completeRookiePlazaSignalCheck(
  profileId: string,
  answer: "A" | "B",
  confidence: number,
): Promise<RookiePlazaActionResult> {
  const signalCheck = await runAcademyCheck(profileId, answer, confidence);
  return {
    ok: true,
    persisted: signalCheck.persisted,
    event: "rookie_plaza_first_signal_check",
    signalCheck,
    item: INVENTORY_ITEMS.find((item) => item.id === "rookie-signal-card") ?? null,
  };
}

export async function claimRookiePlazaReward(
  profileId: string,
  itemId: string,
): Promise<RookiePlazaActionResult> {
  const item = INVENTORY_ITEMS.find((entry) => entry.id === itemId);
  if (!item) throw new Error(`Unknown Rookie Plaza item: ${itemId}`);
  const reward = await applyReward(profileId, {
    xp: 10,
    credits: 5,
    reason: "QUEST_REWARD",
    sportKey: "americanfootball_nfl",
    ref: { type: "rookie_plaza_item", id: itemId },
  });
  return { ok: true, persisted: !isStubMode() && profileId !== "stub", event: "rookie_plaza_reward_claimed", reward, item };
}

export function recordRookiePlazaNpcInteraction(npcId: string): RookiePlazaActionResult {
  return { ok: true, persisted: false, event: `rookie_plaza_npc_${npcId}` };
}

export function recordRookiePlazaRouteExit(routeId: string): RookiePlazaActionResult {
  return { ok: true, persisted: false, event: `rookie_plaza_route_${routeId}` };
}

export function updateRookiePlazaPosition(profileId: string, position: { x: number; y: number; z: number }): RookiePlazaActionResult {
  const clamped = {
    x: Math.max(-6.5, Math.min(6.5, position.x)),
    y: Math.max(0, Math.min(2, position.y)),
    z: Math.max(-6.5, Math.min(6.5, position.z)),
  };
  const presenceRoom = syncRookiePlazaPresencePosition(profileId, clamped);
  return { ok: true, persisted: false, event: `rookie_plaza_position_${clamped.x.toFixed(1)}_${clamped.z.toFixed(1)}`, presenceRoom };
}

export function recordRookiePlazaPresence(profileId: string, kind: "load" | "fallback" | "ghost_seen" | "heartbeat"): RookiePlazaActionResult {
  const presenceRoom = kind === "load" ? joinRookiePlazaPresence(profileId) : signalRookiePlazaPresence(profileId, kind);
  return { ok: true, persisted: false, event: `rookie_plaza_presence_${kind}`, presenceRoom };
}

export function getRookiePlazaInventory(): readonly InventoryItemDef[] {
  return INVENTORY_ITEMS;
}

export function getRookiePlazaQuestLog(): readonly QuestDef[] {
  return QUESTS;
}

export function getRookiePlazaDailyRoute(profile: ProfileView | null): ReturnType<typeof getRecommendedRoute> {
  return getRecommendedRoute(getGalaxyWorldState(), profile);
}
