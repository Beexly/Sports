/**
 * Galaxy Dynasty — Crew roles & weekly missions (Stage 2 retention lock).
 *
 * A casual user retains if they feel USEFUL. Not everyone is elite; everyone gets
 * a role. Each role has a weekly mission tied to a real surface, so a crew always
 * has jobs to fill. Pure constants; the app assigns lanes + tracks contribution.
 */

export type CrewLane =
  | "CAPTAIN"
  | "SHARP"
  | "SCOUT"
  | "COLLECTOR"
  | "TRADER"
  | "BUILDER"
  | "CREATOR"
  | "GRINDER";

export interface CrewRoleDef {
  readonly id: CrewLane;
  readonly name: string;
  readonly blurb: string;
  readonly weeklyMission: string;
  readonly href: string;
}

export const CREW_ROLES: readonly CrewRoleDef[] = [
  { id: "CAPTAIN", name: "Captain", blurb: "Set the tone and rally the crew.", weeklyMission: "Set the week's crew focus and welcome a new member.", href: "/galaxy/crew" },
  { id: "SHARP", name: "Sharp", blurb: "The crew's edge in PvP.", weeklyMission: "Win two Signal Duels this week.", href: "/galaxy/duel" },
  { id: "SCOUT", name: "Scout", blurb: "Reads matchups and biases early.", weeklyMission: "Clear a Depths boss to scout a new bias.", href: "/galaxy/depths" },
  { id: "COLLECTOR", name: "Collector", blurb: "Tracks card value for the crew.", weeklyMission: "Add a card to your watchlist.", href: "/galaxy/market" },
  { id: "TRADER", name: "Trader", blurb: "Works the Vault Market.", weeklyMission: "Post a card-for-card trade offer.", href: "/galaxy/market" },
  { id: "BUILDER", name: "Builder", blurb: "Grows the crew's clash power.", weeklyMission: "Run five Signal Checks in the War Room.", href: "/galaxy/war-room" },
  { id: "CREATOR", name: "Creator", blurb: "Brings challenges to the crew.", weeklyMission: "Complete a Creator Gauntlet.", href: "/galaxy/creators" },
  { id: "GRINDER", name: "Grinder", blurb: "Never misses a day.", weeklyMission: "Keep your daily streak alive all week.", href: "/galaxy" },
] as const;

const ROLE_INDEX: ReadonlyMap<string, CrewRoleDef> = new Map(CREW_ROLES.map((r) => [r.id, r]));

export function getCrewRole(id: string): CrewRoleDef | null {
  return ROLE_INDEX.get(id) ?? null;
}

export function isCrewLane(value: string): value is CrewLane {
  return ROLE_INDEX.has(value);
}
