import type { NpcDef } from "./types.js";
import { routeForDistrict } from "./world-map.js";

export const NPCS: readonly NpcDef[] = [
  { id: "coach-signal", name: "Coach Signal", role: "First mission coach", districtId: "academy", routeTarget: routeForDistrict("war-room"), dialogueIds: ["coach-signal-first", "coach-signal-weather"], position: { x: -1, y: 0, z: -2 }, interactionRadius: 1.6, animationState: "idle" },
  { id: "board-scout", name: "Board Scout", role: "Context scout", districtId: "war-room", routeTarget: routeForDistrict("war-room"), dialogueIds: ["board-scout-first"], position: { x: -4.5, y: 0, z: -2.4 }, interactionRadius: 1.4, animationState: "patrol" },
  { id: "vault-keeper", name: "Vault Keeper", role: "Collection guide", districtId: "vault", routeTarget: routeForDistrict("vault"), dialogueIds: ["vault-keeper-first"], position: { x: 4.7, y: 0, z: -2.4 }, interactionRadius: 1.4, animationState: "guard" },
  { id: "crew-captain", name: "Crew Captain", role: "Crew route guide", districtId: "crew-hall", routeTarget: routeForDistrict("crew-hall"), dialogueIds: ["crew-captain-first"], position: { x: -4, y: 0, z: 3.7 }, interactionRadius: 1.4, animationState: "idle" },
  { id: "blacktop-runner", name: "Blacktop Runner", role: "Quick rep guide", districtId: "blacktop", routeTarget: routeForDistrict("blacktop"), dialogueIds: ["blacktop-runner-first"], position: { x: 4, y: 0, z: 3.7 }, interactionRadius: 1.4, animationState: "patrol" },
  { id: "depths-guard", name: "Depths Guard", role: "Boss gate guide", districtId: "depths", routeTarget: routeForDistrict("depths"), dialogueIds: ["depths-guard-first"], position: { x: 0, y: 0, z: 5.5 }, interactionRadius: 1.5, animationState: "guard" },
  { id: "season-agent", name: "Season Agent", role: "Season route guide", districtId: "season-gate", routeTarget: routeForDistrict("season-gate"), dialogueIds: ["season-agent-first"], position: { x: -5.5, y: 0, z: 5.1 }, interactionRadius: 1.3, animationState: "idle" },
  { id: "weather-analyst", name: "Weather Analyst", role: "Sports weather guide", districtId: "stadium-gates", routeTarget: routeForDistrict("stadium-gates"), dialogueIds: ["weather-analyst-first"], position: { x: 5.6, y: 0, z: 5 }, interactionRadius: 1.3, animationState: "broadcast" },
  { id: "ghost-rival", name: "Ghost Rival", role: "Practice rival", districtId: "proving-grounds", routeTarget: routeForDistrict("proving-grounds"), dialogueIds: ["ghost-rival-first"], position: { x: 2.2, y: 0, z: 0.8 }, interactionRadius: 1.3, animationState: "patrol" },
  { id: "market-mapper", name: "Market Mapper", role: "Movement guide", districtId: "vault", routeTarget: routeForDistrict("vault"), dialogueIds: ["market-mapper-first"], position: { x: 2.4, y: 0, z: -4.6 }, interactionRadius: 1.2, animationState: "idle" },
  { id: "card-scout", name: "Card Scout", role: "Card lesson guide", districtId: "vault", routeTarget: routeForDistrict("vault"), dialogueIds: ["card-scout-first"], position: { x: 3.4, y: 0, z: -3.6 }, interactionRadius: 1.2, animationState: "idle" },
  { id: "proof-clerk", name: "Proof Clerk", role: "Evidence guide", districtId: "war-room", routeTarget: routeForDistrict("war-room"), dialogueIds: ["proof-clerk-first"], position: { x: -2.5, y: 0, z: -4.8 }, interactionRadius: 1.2, animationState: "idle" },
  { id: "broadcast-host", name: "Broadcast Host", role: "Beat wall voice", districtId: "war-room", routeTarget: routeForDistrict("war-room"), dialogueIds: ["broadcast-host-first"], position: { x: 1.2, y: 0, z: -5.2 }, interactionRadius: 1.2, animationState: "broadcast" },
  { id: "transit-operator", name: "Transit Operator", role: "Campus route guide", districtId: "stadium-gates", routeTarget: routeForDistrict("stadium-gates"), dialogueIds: ["transit-operator-first"], position: { x: 6, y: 0, z: 4.2 }, interactionRadius: 1.2, animationState: "idle" },
];

export function getNpc(id: string): NpcDef | null {
  return NPCS.find((npc) => npc.id === id) ?? null;
}
