import type { AntiAbuseRule, ProgressionAction } from "./types.js";

export const ANTI_ABUSE_RULES: readonly AntiAbuseRule[] = [
  { id: "quest-spam", blocks: "Repeated quest-completion grants with the same profile and quest key.", enforcement: "Use idempotency keys before reward mutation.", adminEvent: "abuse_quest_spam_blocked" },
  { id: "reward-farming", blocks: "Fast repeat reward loops that do not add a new lesson or route.", enforcement: "Daily and weekly cadence gates plus per-reward keys.", adminEvent: "abuse_reward_farm_blocked" },
  { id: "duplicate-grants", blocks: "Duplicate item, card, badge, or pass grants.", enforcement: "Unique profile plus item key before inventory mutation.", adminEvent: "abuse_duplicate_grant_blocked" },
  { id: "paid-score-manipulation", blocks: "Any paid object changing skill, rating, outcome, or Galaxy Score directly.", enforcement: "Only earned progression actions can target score or XP.", adminEvent: "abuse_paid_score_blocked" },
  { id: "payout-path", blocks: "Any route from Galaxy credits or cards to external money.", enforcement: "Credit Constitution has only positive earn entries and no payout function.", adminEvent: "abuse_payout_path_blocked" },
  { id: "stake-path", blocks: "Any route from credits to staking behavior.", enforcement: "Game actions teach decisions and never stake value.", adminEvent: "abuse_stake_path_blocked" },
];

export function actionIsProgressionSafe(action: ProgressionAction): boolean {
  const paidScore = action.writeback.targets.includes("galaxy_score") && action.writeback.reason !== "QUEST_REWARD" && action.writeback.reason !== "SIGNAL_CHECK_REWARD" && action.writeback.reason !== "BOSS_REWARD" && action.writeback.reason !== "BLACKTOP_REWARD";
  const invalidCreditGrant = action.writeback.credits < 0 || action.writeback.xp < 0;
  return !paidScore && !invalidCreditGrant;
}
