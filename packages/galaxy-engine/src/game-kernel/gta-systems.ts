import type { FutureCitySystem } from "./types.js";

export const GTA_SHAPED_SYSTEMS: readonly FutureCitySystem[] = [
  { id: "signal-device", label: "Signal Device", purpose: "In-world phone for current quest, daily route, Beat feed, crew task, and card watch.", firstSafeVersion: "Rookie Plaza HUD drawer", blockedDomains: ["real-money stakes", "direct message spam"] },
  { id: "district-reputation", label: "District Reputation", purpose: "Per-district standing earned from routes, quests, and proof habits.", firstSafeVersion: "Profile-only reputation ledger", blockedDomains: ["paid score changes"] },
  { id: "campus-transit", label: "Campus Transit", purpose: "Shuttle, stadium tunnel, and fast-travel gates between safe districts.", firstSafeVersion: "Route exits with admin events", blockedDomains: ["driving crime loop"] },
  { id: "beat-broadcast", label: "The Beat Broadcast", purpose: "In-world radio layer for sports weather, route urgency, and source-pulse summaries.", firstSafeVersion: "Broadcast wall instrument", blockedDomains: ["fake live stats", "official league marks"] },
  { id: "side-activities", label: "Side Activities", purpose: "Blacktop drills, Vault inspections, PvM bosses, and Signal Duels.", firstSafeVersion: "Rookie Route activity list", blockedDomains: ["chance-house framing", "sports-pick shop framing"] },
  { id: "my-dynasty-safehouse", label: "My Dynasty Safehouse", purpose: "Personal room for trophies, items, fictional cards, badges, crew patch, and season status.", firstSafeVersion: "My Dynasty progress module", blockedDomains: ["licensed card custody claims"] },
  { id: "crew-territory", label: "Crew Territory", purpose: "Light district influence map driven by weekly crew objectives.", firstSafeVersion: "Crew contribution by district", blockedDomains: ["deceptive fake humans"] },
];
