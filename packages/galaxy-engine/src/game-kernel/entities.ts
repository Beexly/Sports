import type { CampusCoordinate } from "./types.js";

export type EntityKind =
  | "player"
  | "npc"
  | "ghost"
  | "crew-member"
  | "rival"
  | "item"
  | "card"
  | "district-door"
  | "quest-marker"
  | "mission-marker"
  | "boss-marker"
  | "broadcast-marker"
  | "transit-marker";

export interface EntityDef {
  readonly id: string;
  readonly kind: EntityKind;
  readonly label: string;
  readonly coordinate: CampusCoordinate;
  readonly interactRadius: number;
  readonly routeNodeId: string;
}

export const ENTITY_REGISTRY: readonly EntityDef[] = [
  { id: "player-avatar", kind: "player", label: "Rookie", coordinate: { x: 0, y: 0, z: 1 }, interactRadius: 1.4, routeNodeId: "rookie-plaza" },
  { id: "coach-signal", kind: "npc", label: "Coach Signal", coordinate: { x: -1, y: 0, z: -2 }, interactRadius: 1.6, routeNodeId: "rookie-plaza" },
  { id: "ghost-rival", kind: "ghost", label: "Ghost Rival", coordinate: { x: 3, y: 0, z: 1 }, interactRadius: 1.3, routeNodeId: "rookie-plaza" },
  { id: "crew-recruit", kind: "crew-member", label: "Crew Recruit", coordinate: { x: -4, y: 0, z: 3 }, interactRadius: 1.2, routeNodeId: "crew-hall-door" },
  { id: "rookie-signal-card", kind: "card", label: "Rookie Signal Card", coordinate: { x: 1, y: 0, z: -1 }, interactRadius: 1.2, routeNodeId: "vault-door" },
  { id: "proof-kiosk-marker", kind: "quest-marker", label: "Proof Kiosk Marker", coordinate: { x: -2, y: 0, z: -5 }, interactRadius: 1.2, routeNodeId: "proof-kiosk" },
  { id: "first-signal-marker", kind: "mission-marker", label: "First Signal Marker", coordinate: { x: -1, y: 0, z: -2.5 }, interactRadius: 1.2, routeNodeId: "rookie-plaza" },
  { id: "public-trap-marker", kind: "boss-marker", label: "Public Trap Marker", coordinate: { x: 0, y: 0, z: 7 }, interactRadius: 1.2, routeNodeId: "depths-gate" },
  { id: "beat-wall-marker", kind: "broadcast-marker", label: "Beat Wall Marker", coordinate: { x: 2, y: 0, z: -5 }, interactRadius: 1.2, routeNodeId: "beat-broadcast-wall" },
  { id: "campus-shuttle-marker", kind: "transit-marker", label: "Campus Shuttle Marker", coordinate: { x: 7, y: 0, z: 6 }, interactRadius: 1.2, routeNodeId: "stadium-tunnel" },
];
