/**
 * Galaxy Dynasty — Room Registry (world-graph rooms).
 *
 * Districts are nodes; rooms are how a node is *experienced*. This registry is the
 * blueprint for each room's current vs. future implementation, recommended stack,
 * persistence contract, API callbacks, multiplayer need, risk, and quality gate.
 * It is documentation-as-data: the build path for every room, in one typed place.
 *
 * Hard rule (post-Galaxy-City): a room ships publicly only after it passes its
 * `qualityGate`. No hand-coded gray-box rooms.
 */

import type { DistrictId, RoomType } from "./districts.js";

export interface RoomDef {
  readonly id: string;
  readonly district: DistrictId;
  readonly title: string;
  readonly currentImpl: RoomType;
  readonly futureImpl: RoomType;
  readonly recommendedStack: string;
  /** What state this room reads/writes on the one account. */
  readonly persistenceContract: string;
  /** Server callbacks the room uses to write progression back. */
  readonly apiCallbacks: readonly string[];
  readonly requiredAssets: readonly string[];
  readonly multiplayerNeed: "none" | "presence" | "authoritative";
  readonly riskLevel: "low" | "medium" | "high";
  /** What must be true before this room ships publicly. */
  readonly qualityGate: string;
  readonly testStrategy: string;
}

export const ROOM_REGISTRY: readonly RoomDef[] = [
  {
    id: "war-room-web",
    district: "war-room",
    title: "War Room (Signal Check)",
    currentImpl: "web-native",
    futureImpl: "premium-3d-room",
    recommendedStack: "Next.js RSC + client SignalCheckCard; later PlayCanvas/Babylon room",
    persistenceContract: "reads profile + tier; writes attempt, XP, Credits, Sports IQ, Season Points",
    apiCallbacks: ["/api/galaxy/signal-check"],
    requiredAssets: ["scenario fixtures", "Pro intel copy"],
    multiplayerNeed: "none",
    riskLevel: "low",
    qualityGate: "transparent glass-box grading; brand-safe copy; tests green",
    testStrategy: "engine grading + first-session integration",
  },
  {
    id: "proving-grounds-duel",
    district: "proving-grounds",
    title: "Signal Duel",
    currentImpl: "async-pvp",
    futureImpl: "colyseus-room",
    recommendedStack: "Async now (DB-backed); Colyseus authoritative room for live 1v1/2v2/3v3",
    persistenceContract: "reads ratings; writes duel rows, ratings, XP, Credits",
    apiCallbacks: ["/api/galaxy/duel"],
    requiredAssets: ["scenario set", "ghost roster"],
    multiplayerNeed: "authoritative",
    riskLevel: "medium",
    qualityGate: "fair resolution + transparent score breakdown; anti-cheat for live",
    testStrategy: "duel scoring + ladder + stub-safe integration",
  },
  {
    id: "blacktop-signal-sprint",
    district: "blacktop",
    title: "Signal Sprint",
    currentImpl: "web-native",
    futureImpl: "phaser-minigame",
    recommendedStack: "React first; migrate to Phaser only if motion/feel demands it",
    persistenceContract: "writes XP, Credits, signal tags, Season Points",
    apiCallbacks: ["/api/galaxy/signal-check (BLACKTOP)"],
    requiredAssets: ["question bank", "signal tag set"],
    multiplayerNeed: "none",
    riskLevel: "low",
    qualityGate: "fast, juicy, brand-safe; 60fps; no gambling framing",
    testStrategy: "engine binary grading + brand-law scan",
  },
  {
    id: "depths-boss",
    district: "depths",
    title: "Bad-Logic Boss",
    currentImpl: "pvm-encounter",
    futureImpl: "colyseus-room",
    recommendedStack: "Async now; Colyseus co-op raid room later",
    persistenceContract: "writes boss progress, XP, Credits, merch, crew raid bar",
    apiCallbacks: ["/api/galaxy/boss"],
    requiredAssets: ["boss scenario sets", "boss art briefs"],
    multiplayerNeed: "authoritative",
    riskLevel: "medium",
    qualityGate: "each boss teaches a real bias; clear is earned; tests green",
    testStrategy: "boss encounter + raid contribution",
  },
  {
    id: "vault-gallery",
    district: "vault",
    title: "The Vault — Premium Card Gallery",
    currentImpl: "web-native",
    futureImpl: "premium-3d-room",
    recommendedStack: "PlayCanvas or Babylon.js (premium 3D); generated card/frame assets",
    persistenceContract: "reads owned cards + watchlist; writes watch, equip, display",
    apiCallbacks: ["/api/galaxy/market", "/api/galaxy/cosmetics"],
    requiredAssets: ["card hero art (Higgsfield)", "frame meshes", "gallery scene"],
    multiplayerNeed: "none",
    riskLevel: "high",
    qualityGate: "FIRST premium room — must pass the Galaxy quality gate (real assets, art direction, captured + reviewed) before any public link",
    testStrategy: "card analytics + watchlist + visual review",
  },
  {
    id: "crew-hall-web",
    district: "crew-hall",
    title: "Crew Hall",
    currentImpl: "web-native",
    futureImpl: "colyseus-room",
    recommendedStack: "Web now; Colyseus presence room (8–16) for live clubhouse",
    persistenceContract: "reads crew + lanes; writes lane, contribution, raid",
    apiCallbacks: ["/api/galaxy/crew"],
    requiredAssets: ["clubhouse scene (later)"],
    multiplayerNeed: "presence",
    riskLevel: "medium",
    qualityGate: "everyone has a useful job; brand-safe; tests green",
    testStrategy: "crew roles + clash + raid",
  },
  {
    id: "stadium-gates-web",
    district: "stadium-gates",
    title: "Stadium Gates",
    currentImpl: "web-native",
    futureImpl: "event-room",
    recommendedStack: "Web now; live event portals later",
    persistenceContract: "reads world state; routes to sport-specific quests",
    apiCallbacks: ["(routing only)"],
    requiredAssets: ["sport gate art briefs"],
    multiplayerNeed: "none",
    riskLevel: "low",
    qualityGate: "every gate has a quest/boss/card/GSE hook; brand-safe",
    testStrategy: "gate completeness test",
  },
];

const INDEX: ReadonlyMap<string, RoomDef> = new Map(ROOM_REGISTRY.map((r) => [r.id, r]));
export function getRoom(id: string): RoomDef | null {
  return INDEX.get(id) ?? null;
}
export function roomsForDistrict(district: DistrictId): readonly RoomDef[] {
  return ROOM_REGISTRY.filter((r) => r.district === district);
}
