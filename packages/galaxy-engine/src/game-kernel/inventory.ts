import type { InventoryItemDef } from "./types.js";

export const INVENTORY_ITEMS: readonly InventoryItemDef[] = [
  { id: "rookie-signal-card", name: "Rookie Signal Card", kind: "card", source: "First Signal", use: "Displays first Signal Check mastery.", linkedDistrictId: "vault", progressionEffect: "Starts Card Scouting.", tradeableForCash: false, realWorldSubject: false },
  { id: "war-room-pass", name: "War Room Pass", kind: "pass", source: "Coach Signal", use: "Routes the player to the War Room.", linkedDistrictId: "war-room", progressionEffect: "Opens Signal Check practice.", tradeableForCash: false, realWorldSubject: false },
  { id: "crew-patch", name: "Crew Patch", kind: "badge", source: "Crew Captain", use: "Marks crew onboarding.", linkedDistrictId: "crew-hall", progressionEffect: "Starts Crew Leadership.", tradeableForCash: false, realWorldSubject: false },
  { id: "vault-tag", name: "Vault Tag", kind: "item", source: "Vault Keeper", use: "Flags a collection inspection route.", linkedDistrictId: "vault", progressionEffect: "Adds Vault progress.", tradeableForCash: false, realWorldSubject: false },
  { id: "blacktop-token", name: "Blacktop Token", kind: "item", source: "Blacktop Runner", use: "Starts a quick sports-IQ rep.", linkedDistrictId: "blacktop", progressionEffect: "Adds Signal Discipline XP.", tradeableForCash: false, realWorldSubject: false },
  { id: "depths-marker", name: "Depths Marker", kind: "item", source: "Depths Guard", use: "Tracks first boss route.", linkedDistrictId: "depths", progressionEffect: "Starts Risk Control.", tradeableForCash: false, realWorldSubject: false },
  { id: "season-stub", name: "Season Stub", kind: "item", source: "Season Agent", use: "Shows active Season route.", linkedDistrictId: "season-gate", progressionEffect: "Adds Season progress.", tradeableForCash: false, realWorldSubject: false },
  { id: "signal-badge", name: "Signal Badge", kind: "badge", source: "Proof Clerk", use: "Shows proof habit progress.", linkedDistrictId: "war-room", progressionEffect: "Adds Calibration XP.", tradeableForCash: false, realWorldSubject: false },
  { id: "scout-lens", name: "Scout Lens", kind: "tool", source: "Board Scout", use: "Highlights context clues.", linkedDistrictId: "academy", progressionEffect: "Adds Player Evaluation XP.", tradeableForCash: false, realWorldSubject: false },
  { id: "proof-stamp", name: "Proof Stamp", kind: "tool", source: "Proof Clerk", use: "Marks a completed evidence check.", linkedDistrictId: "war-room", progressionEffect: "Adds Signal Discipline XP.", tradeableForCash: false, realWorldSubject: false },
  { id: "market-compass", name: "Market Compass", kind: "tool", source: "Market Mapper", use: "Routes to market-movement lessons.", linkedDistrictId: "vault", progressionEffect: "Adds Market Reading XP.", tradeableForCash: false, realWorldSubject: false },
  { id: "weather-chip", name: "Weather Chip", kind: "item", source: "Weather Analyst", use: "Shows active sports weather.", linkedDistrictId: "stadium-gates", progressionEffect: "Adds route priority.", tradeableForCash: false, realWorldSubject: false },
  { id: "dynasty-notebook", name: "Dynasty Notebook", kind: "tool", source: "Coach Signal", use: "Records mission lessons.", linkedDistrictId: "my-dynasty", progressionEffect: "Adds profile history.", tradeableForCash: false, realWorldSubject: false },
  { id: "broadcast-pin", name: "Broadcast Pin", kind: "badge", source: "Broadcast Host", use: "Marks Beat wall visits.", linkedDistrictId: "war-room", progressionEffect: "Adds GSE prompt history.", tradeableForCash: false, realWorldSubject: false },
  { id: "transit-band", name: "Transit Band", kind: "pass", source: "Transit Operator", use: "Routes across Campus gates.", linkedDistrictId: "stadium-gates", progressionEffect: "Adds route exits.", tradeableForCash: false, realWorldSubject: false },
  { id: "rival-note", name: "Rival Note", kind: "item", source: "Ghost Rival", use: "Starts a ghost challenge.", linkedDistrictId: "proving-grounds", progressionEffect: "Adds duel readiness.", tradeableForCash: false, realWorldSubject: false },
  { id: "calibration-chip", name: "Calibration Chip", kind: "tool", source: "Coach Signal", use: "Shows confidence feedback.", linkedDistrictId: "academy", progressionEffect: "Adds Calibration XP.", tradeableForCash: false, realWorldSubject: false },
  { id: "risk-band", name: "Risk Band", kind: "badge", source: "Depths Guard", use: "Marks bias-resistance reps.", linkedDistrictId: "depths", progressionEffect: "Adds Risk Control XP.", tradeableForCash: false, realWorldSubject: false },
  { id: "card-frame-alpha", name: "Card Frame Alpha", kind: "card", source: "Vault Keeper", use: "Frames fictional collection cards.", linkedDistrictId: "vault", progressionEffect: "Adds Card Scouting XP.", tradeableForCash: false, realWorldSubject: false },
  { id: "route-map", name: "Route Map", kind: "tool", source: "Transit Operator", use: "Shows district shortcuts.", linkedDistrictId: "stadium-gates", progressionEffect: "Adds daily route progress.", tradeableForCash: false, realWorldSubject: false },
  { id: "crew-signal-pin", name: "Crew Signal Pin", kind: "badge", source: "Crew Captain", use: "Marks crew contribution.", linkedDistrictId: "crew-hall", progressionEffect: "Adds Crew Leadership XP.", tradeableForCash: false, realWorldSubject: false },
  { id: "blacktop-score-tag", name: "Blacktop Score Tag", kind: "badge", source: "Blacktop Runner", use: "Shows arcade rep progress.", linkedDistrictId: "blacktop", progressionEffect: "Adds Basketball IQ XP.", tradeableForCash: false, realWorldSubject: false },
  { id: "football-read-card", name: "Football Read Card", kind: "card", source: "War Room", use: "Stores a generic football lesson.", linkedDistrictId: "war-room", progressionEffect: "Adds Football IQ XP.", tradeableForCash: false, realWorldSubject: false },
  { id: "basketball-read-card", name: "Basketball Read Card", kind: "card", source: "Blacktop", use: "Stores a generic basketball lesson.", linkedDistrictId: "blacktop", progressionEffect: "Adds Basketball IQ XP.", tradeableForCash: false, realWorldSubject: false },
  { id: "baseball-read-card", name: "Baseball Read Card", kind: "card", source: "Season Gate", use: "Stores a generic baseball lesson.", linkedDistrictId: "season-gate", progressionEffect: "Adds Baseball IQ XP.", tradeableForCash: false, realWorldSubject: false },
];

export function getInventoryItem(id: string): InventoryItemDef | null {
  return INVENTORY_ITEMS.find((item) => item.id === id) ?? null;
}
