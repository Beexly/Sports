import type { DialogueLine } from "./types.js";

export const DIALOGUE: readonly DialogueLine[] = [
  { id: "coach-signal-first", npcId: "coach-signal", text: "First lesson: read the number, state your confidence, and let the engine teach you.", weatherVariants: { rookie_heat: "Rookie Heat is active. Scout the context before you chase the story." }, questId: "first-signal" },
  { id: "coach-signal-weather", npcId: "coach-signal", text: "Sports weather changes the route. Your job is to notice what changed.", weatherVariants: { injury_fog: "Injury Fog means uncertainty is part of the read. Respect it." } },
  { id: "board-scout-first", npcId: "board-scout", text: "The board is not a scoreboard. It is a map of pressure, context, and discipline.", weatherVariants: { market_whiplash: "Market Whiplash is loud today. Track the reason before the move." } },
  { id: "vault-keeper-first", npcId: "vault-keeper", text: "Cards here are identity objects and lessons. No cash price. No official marks. Just your Dynasty record.", weatherVariants: { card_heat: "Card Heat is active. Inspect the trend, not the hype." } },
  { id: "crew-captain-first", npcId: "crew-captain", text: "Crews turn solo reads into weekly contribution. Pick a lane and show proof.", weatherVariants: { playoff_pressure: "Playoff Pressure makes every crew task count." } },
  { id: "blacktop-runner-first", npcId: "blacktop-runner", text: "Quick reps build discipline. Move fast, but explain why.", weatherVariants: { fantasy_waiver_surge: "Waiver Surge means short drills are open." } },
  { id: "depths-guard-first", npcId: "depths-guard", text: "The Depths are where bad habits become bosses. Beat the bias before it beats your read.", weatherVariants: { public_collapse: "Public Collapse is active. The first boss is waiting." } },
  { id: "season-agent-first", npcId: "season-agent", text: "The Season route rewards repeatable work across the Campus.", weatherVariants: { championship_gravity: "Championship Gravity is active. Finish the route clean." } },
  { id: "weather-analyst-first", npcId: "weather-analyst", text: "When the sports ecosystem shifts, the Campus shifts with it.", weatherVariants: { trade_shock: "Trade Shock is active. Re-read every affected route." } },
  { id: "ghost-rival-first", npcId: "ghost-rival", text: "I am a ghost route, not a human. Catch me after your first Signal Check.", weatherVariants: { rivalry_surge: "Rivalry Surge makes every ghost duel sharper." } },
  { id: "market-mapper-first", npcId: "market-mapper", text: "Movement is a clue, not a command. Map the why.", weatherVariants: { deadline_shock: "Deadline Shock means context can flip fast." } },
  { id: "card-scout-first", npcId: "card-scout", text: "Scout fictional card states through usage, role, and context. No likeness shortcuts.", weatherVariants: { breakout_signal: "Breakout Signal is active. Watch the role change first." } },
  { id: "proof-clerk-first", npcId: "proof-clerk", text: "If there is no proof trail, there is no lesson to carry forward.", weatherVariants: { slump_watch: "Slump Watch asks for patience and proof." } },
  { id: "broadcast-host-first", npcId: "broadcast-host", text: "The Beat turns the live sports pulse into Campus signals.", weatherVariants: { upset_storm: "Upset Storm leads the broadcast. Check the War Room." } },
  { id: "transit-operator-first", npcId: "transit-operator", text: "Routes are part of progression. Where you go next should change your account.", weatherVariants: { rivalry_surge: "Rivalry Surge opens the Stadium Tunnel route." } },
];

export function dialogueForNpc(npcId: string): readonly DialogueLine[] {
  return DIALOGUE.filter((line) => line.npcId === npcId);
}
