import { describe, expect, it } from "vitest";
import {
  ANTI_ABUSE_RULES,
  BLACKTOP_GAMES,
  CINEMATIC_SHOT_RULES,
  DIALOGUE,
  DISTRICT_REPUTATION,
  ENTITY_REGISTRY,
  GAME_KERNEL_BOSSES,
  GAME_KERNEL_SKILLS,
  GALAXY_CAMPUS_NODES,
  GHOST_PRESENCE,
  GTA_SHAPED_SYSTEMS,
  INVENTORY_ITEMS,
  LAUNCH_TEASER_BEATS,
  MISSIONS,
  NPCS,
  PROGRESSION_ACTIONS,
  QUEST_EVENT_RULES,
  QUESTS,
  WEATHER_GAMEPLAY_EFFECTS,
  actionIsProgressionSafe,
  campusNode,
  isBrandSafe,
  isDistrictId,
  SPORTS_WEATHER,
} from "../index.js";

const publicText = (value: unknown): string => {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(publicText).join(" ");
  if (value && typeof value === "object") return Object.values(value).map(publicText).join(" ");
  return "";
};

describe("Galaxy Game Kernel", () => {
  it("maps every district door to a real route and keeps the plaza connected", () => {
    expect(campusNode("rookie-plaza")).not.toBeNull();
    const routedNodes = GALAXY_CAMPUS_NODES.filter((node) => node.routeTarget);
    expect(routedNodes.length).toBeGreaterThanOrEqual(8);
    for (const node of routedNodes) {
      expect(isDistrictId(node.routeTarget!.districtId), node.id).toBe(true);
      expect(node.routeTarget!.href.startsWith("/galaxy"), node.id).toBe(true);
    }
    for (const entity of ENTITY_REGISTRY) {
      expect(campusNode(entity.routeNodeId), entity.id).not.toBeNull();
      expect(entity.interactRadius).toBeGreaterThan(0);
    }
  });

  it("ships the RuneScape-floor content counts for Rookie Plaza v1", () => {
    expect(QUESTS.length).toBeGreaterThanOrEqual(20);
    expect(NPCS.length).toBeGreaterThanOrEqual(12);
    expect(INVENTORY_ITEMS.length).toBeGreaterThanOrEqual(25);
    expect(GAME_KERNEL_SKILLS.length).toBe(10);
    expect(GAME_KERNEL_BOSSES.length).toBeGreaterThanOrEqual(5);
    expect(BLACKTOP_GAMES.length).toBeGreaterThanOrEqual(3);
    expect(GHOST_PRESENCE.length).toBeGreaterThanOrEqual(7);
  });

  it("every quest writes back to the account and routes somewhere", () => {
    for (const quest of QUESTS) {
      expect(quest.objectives.length, quest.id).toBeGreaterThan(0);
      expect(quest.rewards.targets.length, quest.id).toBeGreaterThan(0);
      expect(quest.rewards.targets, quest.id).toContain("profile");
      expect(quest.rewards.targets, quest.id).toContain("admin_event");
      expect(quest.routeTargets.length, quest.id).toBeGreaterThan(0);
      expect(quest.rewards.xp + quest.rewards.credits, quest.id).toBeGreaterThan(0);
    }
  });

  it("every mission has a reward or a route", () => {
    for (const mission of MISSIONS) {
      expect(mission.questIds.length, mission.id).toBeGreaterThan(0);
      expect(Boolean(mission.rewards) || Boolean(mission.routeTarget), mission.id).toBe(true);
    }
  });

  it("every NPC has dialogue and every item is rights-safe", () => {
    const dialogueNpcIds = new Set(DIALOGUE.map((line) => line.npcId));
    for (const npc of NPCS) {
      expect(dialogueNpcIds.has(npc.id), npc.id).toBe(true);
      expect(npc.position, npc.id).toBeTruthy();
      expect(npc.interactionRadius, npc.id).toBeGreaterThan(0);
    }
    for (const item of INVENTORY_ITEMS) {
      expect(item.tradeableForCash, item.id).toBe(false);
      expect(item.realWorldSubject, item.id).toBe(false);
    }
  });

  it("every weather state changes gameplay", () => {
    expect(WEATHER_GAMEPLAY_EFFECTS.length).toBe(SPORTS_WEATHER.length);
    for (const effect of WEATHER_GAMEPLAY_EFFECTS) {
      expect(effect.questAvailability.length, effect.weatherId).toBeGreaterThan(0);
      expect(effect.bossRotation.length, effect.weatherId).toBeGreaterThan(0);
      expect(effect.districtPriority.length, effect.weatherId).toBeGreaterThan(0);
      expect(effect.broadcastEvent.length, effect.weatherId).toBeGreaterThan(0);
    }
  });

  it("keeps progression earned-only and blocks payout or wagering bridges", () => {
    for (const action of PROGRESSION_ACTIONS) {
      expect(actionIsProgressionSafe(action), action.id).toBe(true);
      expect(action.writeback.credits, action.id).toBeGreaterThanOrEqual(0);
      expect(action.writeback.xp, action.id).toBeGreaterThanOrEqual(0);
    }
    expect(ANTI_ABUSE_RULES.map((rule) => rule.id)).toEqual(
      expect.arrayContaining(["paid-score-manipulation", "payout-path", "stake-path"]),
    );
    expect(GTA_SHAPED_SYSTEMS.length).toBeGreaterThanOrEqual(7);
    expect(DISTRICT_REPUTATION.length).toBeGreaterThanOrEqual(7);
  });

  it("turns content into playable rules instead of registry-only entries", () => {
    expect(QUEST_EVENT_RULES.length).toBe(QUESTS.length);
    expect(QUEST_EVENT_RULES.slice(0, 6).every((rule) => rule.writeback.includes("profile"))).toBe(true);
    expect(BLACKTOP_GAMES.some((game) => game.id === "signal-sprint" && game.mode === "playable")).toBe(true);
    expect(GAME_KERNEL_BOSSES.map((boss) => boss.id)).toEqual(
      expect.arrayContaining(["public-trap", "recency-wraith", "injury-fog", "line-move-mimic", "parlay-hydra"]),
    );
    expect(GHOST_PRESENCE.every((ghost) => ghost.path.length > 1 && ghost.disclosedAs)).toBe(true);
  });

  it("turns GTA-shaped video direction into IP-safe Galaxy cinematic rules", () => {
    expect(CINEMATIC_SHOT_RULES.length).toBeGreaterThanOrEqual(6);
    expect(CINEMATIC_SHOT_RULES.map((rule) => rule.camera)).toEqual(expect.arrayContaining(["slow-push", "rack-focus", "aerial-pullback"]));
    expect(CINEMATIC_SHOT_RULES.every((rule) => rule.ipSafeConstraint.length > 20)).toBe(true);
    expect(LAUNCH_TEASER_BEATS.reduce((sum, beat) => sum + beat.durationSeconds, 0)).toBeGreaterThanOrEqual(25);
    expect(LAUNCH_TEASER_BEATS.every((beat) => beat.shotRuleIds.length > 0)).toBe(true);
  });

  it("contains no banned public language or real-league IP strings", () => {
    const allPublicText = [
      publicText(QUESTS),
      publicText(MISSIONS),
      publicText(NPCS),
      publicText(DIALOGUE),
      publicText(INVENTORY_ITEMS),
      publicText(GAME_KERNEL_SKILLS),
      publicText(GTA_SHAPED_SYSTEMS),
      publicText(CINEMATIC_SHOT_RULES),
      publicText(LAUNCH_TEASER_BEATS),
    ].join(" ");
    expect(isBrandSafe(allPublicText)).toBe(true);
    expect(allPublicText).not.toMatch(/\b(NFL|NBA|MLB|NHL|NCAA|Chiefs|Raiders|Bills|Dolphins|Packers|Lions)\b/);
  });
});
