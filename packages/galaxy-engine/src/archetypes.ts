/**
 * Galaxy Dynasty — Archetypes, Factions, Classes.
 *
 * Identity is the first pillar (bible §3). Every user has a lane. These IDs are
 * the single source of truth and MUST stay in sync with the Prisma enums
 * `GalaxyArchetype` and `GalaxyFaction`.
 *
 * Brand law: every label/blurb here passes the Galaxy Standard and the Language
 * Law (§5/§6). No casino/wager/lock/guarantee language anywhere.
 */

export type GalaxyArchetypeId =
  | "SHARP"
  | "SCOUT"
  | "COLLECTOR"
  | "GM"
  | "CAPTAIN"
  | "SHOWMAN"
  | "STREET_LEGEND";

export type GalaxyFactionId =
  | "SHARPS"
  | "SCOUTS"
  | "BUILDERS"
  | "COLLECTORS"
  | "MAVERICKS"
  | "CAPTAINS"
  | "SHOWMEN"
  | "GRINDERS";

export interface ArchetypeDef {
  readonly id: GalaxyArchetypeId;
  readonly name: string;
  readonly tagline: string;
  /** What this lane is for — the identity it builds. */
  readonly blurb: string;
  /** Skill-tiered perk this lane unlocks first (never raw power — bible §4.1). */
  readonly signaturePerk: string;
  /** Default faction affinity (the user may still pick any faction). */
  readonly defaultFaction: GalaxyFactionId;
  /** Brand accent hex (within the Galaxy visual law palette). */
  readonly accent: string;
}

export interface FactionDef {
  readonly id: GalaxyFactionId;
  readonly name: string;
  readonly creed: string;
  readonly blurb: string;
  readonly accent: string;
}

// Galaxy visual-law palette: black / gold / deep blue + the GSE cosmic accents.
const GOLD = "#F4C95D";
const DEEP_BLUE = "#2B5FE3";
const CYAN = "#00E5FF";
const MAGENTA = "#FF2DD6";
const VIOLET = "#7A5CFF";

export const ARCHETYPES: readonly ArchetypeDef[] = [
  {
    id: "SHARP",
    name: "Sharp",
    tagline: "Read the number before the market does.",
    blurb:
      "You hunt mispriced lines and trust the math over the noise. Your Signal " +
      "Checks reward calibration — knowing exactly how sure you are.",
    signaturePerk: "Edge Trail — see the factor breakdown behind every line.",
    defaultFaction: "SHARPS",
    accent: CYAN,
  },
  {
    id: "SCOUT",
    name: "Scout",
    tagline: "Talent and form, spotted early.",
    blurb:
      "You build Sports IQ by reading matchups, rest, and form. Breakouts are " +
      "yours to call before the crowd catches up.",
    signaturePerk: "Form Lens — early access to matchup context in the War Room.",
    defaultFaction: "SCOUTS",
    accent: DEEP_BLUE,
  },
  {
    id: "COLLECTOR",
    name: "Collector",
    tagline: "Every card tells a story you already knew.",
    blurb:
      "You grow a Vault of digital companion cards and track value over time. " +
      "Sets and form trends are your edge.",
    signaturePerk: "Vault Insight — value-trend signals on owned cards.",
    defaultFaction: "COLLECTORS",
    accent: GOLD,
  },
  {
    id: "GM",
    name: "GM",
    tagline: "Build the program. Run the room.",
    blurb:
      "You think in seasons, not slates. Strategy, depth, and the long game " +
      "are how you climb the Rank.",
    signaturePerk: "War Room Depth — multi-game context and Season Program view.",
    defaultFaction: "BUILDERS",
    accent: VIOLET,
  },
  {
    id: "CAPTAIN",
    name: "Captain",
    tagline: "Lead a Crew. Carry the Legacy.",
    blurb:
      "You rally a Crew and set the tone. Shared boards and Crew progress rise " +
      "with your calls.",
    signaturePerk: "Crew Board — create and lead a Crew clubhouse.",
    defaultFaction: "CAPTAINS",
    accent: MAGENTA,
  },
  {
    id: "SHOWMAN",
    name: "Showman",
    tagline: "Make the call. Make it loud.",
    blurb:
      "You play for the highlight and the Heat. Streaks, Momentum, and public " +
      "moments are your currency of status.",
    signaturePerk: "Heat Meter — Momentum tracking on your public profile.",
    defaultFaction: "SHOWMEN",
    accent: MAGENTA,
  },
  {
    id: "STREET_LEGEND",
    name: "Street Legend",
    tagline: "Earned on the Blacktop, proven everywhere.",
    blurb:
      "You grind from the ground up — Blacktop runs, daily quests, pure reps. " +
      "Legacy is built one Signal Check at a time.",
    signaturePerk: "Blacktop Mastery — bonus Grind XP on casual Signal Checks.",
    defaultFaction: "GRINDERS",
    accent: GOLD,
  },
] as const;

export const FACTIONS: readonly FactionDef[] = [
  {
    id: "SHARPS",
    name: "The Sharps",
    creed: "The number is the truth.",
    blurb: "Disciplined readers of price, timing, and value.",
    accent: CYAN,
  },
  {
    id: "SCOUTS",
    name: "The Scouts",
    creed: "See it first.",
    blurb: "Matchup, form, and talent — read before the crowd.",
    accent: DEEP_BLUE,
  },
  {
    id: "BUILDERS",
    name: "The Builders",
    creed: "Think in seasons.",
    blurb: "Programs, depth, and the long game.",
    accent: VIOLET,
  },
  {
    id: "COLLECTORS",
    name: "The Collectors",
    creed: "The Vault remembers.",
    blurb: "Cards, sets, and value over time.",
    accent: GOLD,
  },
  {
    id: "MAVERICKS",
    name: "The Mavericks",
    creed: "Fade the obvious.",
    blurb: "Contrarian reads against crowd bias.",
    accent: MAGENTA,
  },
  {
    id: "CAPTAINS",
    name: "The Captains",
    creed: "Lead the room.",
    blurb: "Crews, clubhouses, and shared Legacy.",
    accent: MAGENTA,
  },
  {
    id: "SHOWMEN",
    name: "The Showmen",
    creed: "Make it loud.",
    blurb: "Heat, Momentum, and public moments.",
    accent: GOLD,
  },
  {
    id: "GRINDERS",
    name: "The Grinders",
    creed: "Reps over hype.",
    blurb: "Daily quests, Blacktop runs, pure work.",
    accent: DEEP_BLUE,
  },
] as const;

const ARCHETYPE_INDEX: ReadonlyMap<GalaxyArchetypeId, ArchetypeDef> = new Map(
  ARCHETYPES.map((a) => [a.id, a]),
);
const FACTION_INDEX: ReadonlyMap<GalaxyFactionId, FactionDef> = new Map(
  FACTIONS.map((f) => [f.id, f]),
);

export function getArchetype(id: GalaxyArchetypeId): ArchetypeDef {
  const def = ARCHETYPE_INDEX.get(id);
  if (!def) throw new Error(`Unknown Galaxy archetype: ${id}`);
  return def;
}

export function getFaction(id: GalaxyFactionId): FactionDef {
  const def = FACTION_INDEX.get(id);
  if (!def) throw new Error(`Unknown Galaxy faction: ${id}`);
  return def;
}

export function isArchetypeId(value: string): value is GalaxyArchetypeId {
  return ARCHETYPE_INDEX.has(value as GalaxyArchetypeId);
}

export function isFactionId(value: string): value is GalaxyFactionId {
  return FACTION_INDEX.has(value as GalaxyFactionId);
}
