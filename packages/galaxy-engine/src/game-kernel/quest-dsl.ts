import type { QuestRuleDef } from "./types.js";
import { QUESTS } from "./quests.js";

export const QUEST_EVENT_RULES: readonly QuestRuleDef[] = QUESTS.map((quest) => ({
  id: `${quest.id}-rule`,
  trigger:
    quest.objectives[0]?.kind === "boss"
      ? "boss_clear"
      : quest.objectives[0]?.kind === "signal_check"
        ? "signal_check"
        : quest.objectives[0]?.kind === "route"
          ? "route"
          : quest.objectives[0]?.kind === "inspect"
            ? "inspect"
            : "talk",
  condition: quest.prerequisites.length > 0 ? `requires:${quest.prerequisites.join(",")}` : "available",
  action: `complete:${quest.id}`,
  reward: quest.rewards,
  writeback: quest.rewards.targets,
  route: quest.routeTargets[0]!,
  repeatable: quest.repeatable,
  antiAbuse: quest.repeatable === "never" ? ["duplicate-grants"] : ["quest-spam", "reward-farming"],
}));

export function completableQuestIds(limit = 6): readonly string[] {
  return QUESTS.slice(0, limit).map((quest) => quest.id);
}
