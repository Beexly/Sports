import type { BlacktopGameDef, ProfileWriteback } from "./types.js";
import { routeForDistrict } from "./world-map.js";

const reward = (adminEvent: string, xp: number, credits: number): ProfileWriteback => ({
  targets: ["profile", "sports_iq_xp", "galaxy_score", "quest_state", "reward_wallet", "admin_event"],
  reason: "BLACKTOP_REWARD",
  xp,
  credits,
  adminEvent,
});

export const BLACKTOP_GAMES: readonly BlacktopGameDef[] = [
  {
    id: "signal-sprint",
    title: "Signal Sprint",
    mode: "playable",
    rules: ["Answer five short reads", "Move quickly", "Review the lesson trail"],
    prompts: ["Read context before crowd pressure", "Mark uncertainty", "Separate role from noise", "Respect sample size", "Route the lesson back"],
    reward: reward("blacktop_signal_sprint_completed", 35, 18),
    xpSkillIds: ["basketball-iq", "signal-discipline"],
    route: routeForDistrict("blacktop"),
  },
  {
    id: "stat-race",
    title: "Stat Race",
    mode: "preview",
    rules: ["Sort useful context from noisy numbers", "Finish before the clock empties"],
    prompts: ["Pace clue", "Usage clue", "Variance clue"],
    reward: reward("blacktop_stat_race_previewed", 12, 4),
    xpSkillIds: ["football-iq", "baseball-iq"],
    route: routeForDistrict("blacktop"),
  },
  {
    id: "card-heat-guess",
    title: "Card Heat Guess",
    mode: "preview",
    rules: ["Inspect fictional card-state signals", "Avoid hype-only reads"],
    prompts: ["Role change", "Proof trail", "Heat cooldown"],
    reward: reward("blacktop_card_heat_previewed", 12, 4),
    xpSkillIds: ["card-scouting", "market-reading"],
    route: routeForDistrict("blacktop"),
  },
];
