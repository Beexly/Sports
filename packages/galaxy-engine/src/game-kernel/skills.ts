import type { GameSkillDef } from "./types.js";

export const GAME_KERNEL_SKILLS: readonly GameSkillDef[] = [
  { id: "football-iq", label: "Football IQ", description: "Read pace, injuries, matchup structure, and price movement.", districtId: "war-room", actions: ["signal_check", "depth_read"], writebackTarget: "sports_iq_xp" },
  { id: "basketball-iq", label: "Basketball IQ", description: "Read rotations, fatigue, shot profile, and matchup tempo.", districtId: "blacktop", actions: ["blacktop_rep", "route_read"], writebackTarget: "sports_iq_xp" },
  { id: "baseball-iq", label: "Baseball IQ", description: "Read pitching context, weather, bullpen shape, and variance.", districtId: "season-gate", actions: ["season_read", "proof_check"], writebackTarget: "sports_iq_xp" },
  { id: "market-reading", label: "Market Reading", description: "Separate signal movement from noisy crowd movement.", districtId: "war-room", actions: ["market_review", "beat_wall"], writebackTarget: "gse_prompt_history" },
  { id: "player-evaluation", label: "Player Evaluation", description: "Read role, usage, depth, and context without likeness claims.", districtId: "academy", actions: ["scout_prompt", "watch_context"], writebackTarget: "sports_iq_xp" },
  { id: "card-scouting", label: "Card Scouting", description: "Track fictional card-state lessons with no cash price.", districtId: "vault", actions: ["inspect_card", "watchlist_note"], writebackTarget: "card_state" },
  { id: "risk-control", label: "Risk Control", description: "Resist bad-logic bosses and overconfident reads.", districtId: "depths", actions: ["boss_clear", "confidence_review"], writebackTarget: "galaxy_score" },
  { id: "crew-leadership", label: "Crew Leadership", description: "Contribute to crew lanes and weekly objectives.", districtId: "crew-hall", actions: ["crew_task", "route_assist"], writebackTarget: "crew_contribution" },
  { id: "calibration", label: "Calibration", description: "Match confidence to evidence and learn from outcomes.", districtId: "academy", actions: ["signal_check", "proof_stamp"], writebackTarget: "sports_iq_xp" },
  { id: "signal-discipline", label: "Signal Discipline", description: "Prefer proof, route completion, and repeatable reps.", districtId: "war-room", actions: ["proof_kiosk", "daily_route"], writebackTarget: "quest_state" },
];
