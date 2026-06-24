import { DISTRICTS, type DistrictId } from "../world/districts.js";
import type { CampusCoordinate, RouteTarget } from "./types.js";

export interface CampusNode {
  readonly id: string;
  readonly label: string;
  readonly kind: "plaza" | "district-door" | "kiosk" | "broadcast" | "transit" | "future-slot";
  readonly coordinate: CampusCoordinate;
  readonly routeTarget: RouteTarget | null;
  readonly connectedTo: readonly string[];
}

const districtRoute = (districtId: DistrictId): RouteTarget => {
  const district = DISTRICTS.find((d) => d.id === districtId);
  if (!district) throw new Error(`Unknown district ${districtId}`);
  return { districtId, href: district.href, label: district.name };
};

export const GALAXY_CAMPUS_NODES: readonly CampusNode[] = [
  {
    id: "rookie-plaza",
    label: "Rookie Plaza",
    kind: "plaza",
    coordinate: { x: 0, y: 0, z: 0 },
    routeTarget: null,
    connectedTo: ["war-room-door", "vault-door", "crew-hall-door", "blacktop-door"],
  },
  {
    id: "war-room-door",
    label: "War Room Entrance",
    kind: "district-door",
    coordinate: { x: -5, y: 0, z: -2 },
    routeTarget: districtRoute("war-room"),
    connectedTo: ["rookie-plaza", "proof-kiosk"],
  },
  {
    id: "vault-door",
    label: "Vault Entrance",
    kind: "district-door",
    coordinate: { x: 5, y: 0, z: -2 },
    routeTarget: districtRoute("vault"),
    connectedTo: ["rookie-plaza", "market-gravity-slot"],
  },
  {
    id: "crew-hall-door",
    label: "Crew Hall Entrance",
    kind: "district-door",
    coordinate: { x: -4, y: 0, z: 4 },
    routeTarget: districtRoute("crew-hall"),
    connectedTo: ["rookie-plaza", "blacktop-door"],
  },
  {
    id: "blacktop-door",
    label: "Blacktop Entrance",
    kind: "district-door",
    coordinate: { x: 4, y: 0, z: 4 },
    routeTarget: districtRoute("blacktop"),
    connectedTo: ["rookie-plaza", "crew-hall-door"],
  },
  {
    id: "depths-gate",
    label: "Depths Gate",
    kind: "district-door",
    coordinate: { x: 0, y: 0, z: 7 },
    routeTarget: districtRoute("depths"),
    connectedTo: ["rookie-plaza", "season-gate"],
  },
  {
    id: "season-gate",
    label: "Season Gate",
    kind: "district-door",
    coordinate: { x: -7, y: 0, z: 6 },
    routeTarget: districtRoute("season-gate"),
    connectedTo: ["depths-gate", "stadium-tunnel"],
  },
  {
    id: "stadium-tunnel",
    label: "Stadium Tunnel",
    kind: "transit",
    coordinate: { x: 7, y: 0, z: 6 },
    routeTarget: districtRoute("stadium-gates"),
    connectedTo: ["rookie-plaza", "season-gate"],
  },
  {
    id: "proof-kiosk",
    label: "Proof Kiosk",
    kind: "kiosk",
    coordinate: { x: -2, y: 0, z: -5 },
    routeTarget: districtRoute("war-room"),
    connectedTo: ["rookie-plaza", "war-room-door"],
  },
  {
    id: "beat-broadcast-wall",
    label: "The Beat Broadcast Wall",
    kind: "broadcast",
    coordinate: { x: 2, y: 0, z: -5 },
    routeTarget: districtRoute("war-room"),
    connectedTo: ["rookie-plaza", "proof-kiosk"],
  },
  {
    id: "my-dynasty-exit",
    label: "My Dynasty Exit",
    kind: "district-door",
    coordinate: { x: 0, y: 0, z: -8 },
    routeTarget: districtRoute("my-dynasty"),
    connectedTo: ["rookie-plaza"],
  },
  {
    id: "market-gravity-slot",
    label: "Market Gravity Expansion Slot",
    kind: "future-slot",
    coordinate: { x: 8, y: 0, z: -5 },
    routeTarget: districtRoute("vault"),
    connectedTo: ["vault-door"],
  },
];

export const FUTURE_CITY_EXPANSION_SLOTS = [
  "broadcast-district",
  "transit-loop",
  "card-market-arcade",
  "crew-territory-ring",
] as const;

export function routeForDistrict(districtId: DistrictId): RouteTarget {
  return districtRoute(districtId);
}

export function campusNode(id: string): CampusNode | null {
  return GALAXY_CAMPUS_NODES.find((node) => node.id === id) ?? null;
}
