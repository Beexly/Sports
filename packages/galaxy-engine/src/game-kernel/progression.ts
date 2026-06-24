import type { ProgressionAction } from "./types.js";

export const PROGRESSION_ACTIONS: readonly ProgressionAction[] = [
  {
    id: "rookie_plaza_visit",
    label: "Rookie Plaza visit",
    writeback: { targets: ["profile", "admin_event"], reason: "QUEST_REWARD", xp: 0, credits: 0, adminEvent: "rookie_plaza_visit" },
    idempotencyKeyParts: ["profileId", "dayKey", "rookie_plaza_visit"],
  },
  {
    id: "rookie_plaza_npc_interaction",
    label: "NPC interaction",
    writeback: { targets: ["profile", "gse_prompt_history", "admin_event"], reason: "QUEST_REWARD", xp: 5, credits: 0, adminEvent: "rookie_plaza_npc_interaction" },
    idempotencyKeyParts: ["profileId", "npcId", "dayKey"],
  },
  {
    id: "rookie_plaza_route_exit",
    label: "Route exit",
    writeback: { targets: ["profile", "quest_state", "admin_event"], reason: "QUEST_REWARD", xp: 5, credits: 0, adminEvent: "rookie_plaza_route_exit" },
    idempotencyKeyParts: ["profileId", "routeId", "dayKey"],
  },
  {
    id: "first_signal_complete",
    label: "First Signal complete",
    writeback: { targets: ["profile", "sports_iq_xp", "inventory", "card_state", "season_progress", "galaxy_score", "reward_wallet", "admin_event"], reason: "SIGNAL_CHECK_REWARD", xp: 30, credits: 15, adminEvent: "first_signal_complete" },
    idempotencyKeyParts: ["profileId", "questId"],
  },
  {
    id: "rookie_reward_claim",
    label: "Rookie reward claim",
    writeback: { targets: ["profile", "inventory", "quest_state", "admin_event"], reason: "QUEST_REWARD", xp: 10, credits: 5, adminEvent: "rookie_reward_claim" },
    idempotencyKeyParts: ["profileId", "rewardId"],
  },
];

export function progressionAction(id: string): ProgressionAction | null {
  return PROGRESSION_ACTIONS.find((action) => action.id === id) ?? null;
}
