export type RepoMentor = "Babylon.js" | "Phaser" | "Colyseus" | "RuneScape floor" | "GTA north star";

export interface SpatialAssetBlueprint {
  readonly id: string;
  readonly label: string;
  readonly room: "rookie-plaza" | "beat-wall" | "blacktop" | "depths";
  readonly mentor: RepoMentor;
  readonly implementation: "procedural-babylon" | "phaser-scene" | "colyseus-schema" | "authored-asset-needed";
  readonly shipped: boolean;
}

export const ROOKIE_PLAZA_ASSET_KIT: readonly SpatialAssetBlueprint[] = [
  { id: "rookie-avatar-capsule", label: "Rookie avatar capsule with glow base", room: "rookie-plaza", mentor: "Babylon.js", implementation: "procedural-babylon", shipped: true },
  { id: "npc-signal-totems", label: "Multi-part NPC signal totems", room: "rookie-plaza", mentor: "RuneScape floor", implementation: "procedural-babylon", shipped: true },
  { id: "district-gate-lintels", label: "District gates with lintels and beacon caps", room: "rookie-plaza", mentor: "GTA north star", implementation: "procedural-babylon", shipped: true },
  { id: "quest-boss-rings", label: "Quest and boss interaction rings", room: "rookie-plaza", mentor: "RuneScape floor", implementation: "procedural-babylon", shipped: true },
  { id: "beat-ledger-instrument", label: "Broadcast wall, rings, towers, source ticks, route trails", room: "beat-wall", mentor: "Babylon.js", implementation: "procedural-babylon", shipped: true },
  { id: "signal-sprint-court", label: "Signal Sprint arcade court", room: "blacktop", mentor: "Phaser", implementation: "phaser-scene", shipped: true },
  { id: "presence-room-schema", label: "Rookie Plaza 16-player presence schema", room: "rookie-plaza", mentor: "Colyseus", implementation: "colyseus-schema", shipped: true },
  { id: "authored-character-set", label: "Final authored character and prop set", room: "rookie-plaza", mentor: "Babylon.js", implementation: "authored-asset-needed", shipped: false },
];
