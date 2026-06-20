/**
 * Galaxy Dynasty — UI theme + Campus map.
 *
 * Palette sits inside the Galaxy visual law: black / gold / deep-blue plus the
 * GSE cosmic accents. Districts mirror the bible §3 Campus. Pure constants, safe
 * to import from server or client components.
 */

export const GALAXY = {
  void: "#05070D",
  panel: "#0B0E1A",
  panelRaised: "#11152400",
  border: "#23304D",
  gold: "#F4C95D",
  deepBlue: "#2B5FE3",
  cyan: "#00E5FF",
  magenta: "#FF2DD6",
  violet: "#7A5CFF",
  text: "#E9EDF7",
  textMuted: "#9AA6C2",
} as const;

export interface District {
  readonly id: string;
  readonly name: string;
  readonly tagline: string;
  readonly href: string;
  readonly accent: string;
  readonly status: "live" | "preview";
  readonly order: number;
}

export const DISTRICTS: readonly District[] = [
  {
    id: "academy",
    name: "The Academy",
    tagline: "Learn to read the number. Your first Signal Check.",
    href: "/galaxy/war-room?academy=1",
    accent: GALAXY.cyan,
    status: "live",
    order: 1,
  },
  {
    id: "war-room",
    name: "The War Room",
    tagline: "Make a confidence-scored read. The engine grades it.",
    href: "/galaxy/war-room",
    accent: GALAXY.deepBlue,
    status: "live",
    order: 2,
  },
  {
    id: "proving-grounds",
    name: "The Proving Grounds",
    tagline: "Signal Duels — ranked PvP. Climb the ladder.",
    href: "/galaxy/duel",
    accent: GALAXY.gold,
    status: "live",
    order: 3,
  },
  {
    id: "blacktop",
    name: "The Blacktop",
    tagline: "Quick stat Signal Checks. Pure reps.",
    href: "/galaxy/blacktop",
    accent: GALAXY.gold,
    status: "live",
    order: 4,
  },
  {
    id: "depths",
    name: "The Depths",
    tagline: "Five bad-logic bosses. Beat the bias.",
    href: "/galaxy/depths",
    accent: GALAXY.magenta,
    status: "live",
    order: 5,
  },
  {
    id: "season",
    name: "Signal Cup",
    tagline: "The Season Program — climb the tiers.",
    href: "/galaxy/season",
    accent: GALAXY.cyan,
    status: "live",
    order: 6,
  },
  {
    id: "vault",
    name: "The Vault",
    tagline: "Your card collection and companion data.",
    href: "/galaxy/vault",
    accent: GALAXY.gold,
    status: "live",
    order: 7,
  },
  {
    id: "market",
    name: "The Vault Market",
    tagline: "Watch cards and trade (prototype).",
    href: "/galaxy/market",
    accent: GALAXY.deepBlue,
    status: "live",
    order: 8,
  },
  {
    id: "crew",
    name: "Crews",
    tagline: "Form a Crew, run a Crew Clash.",
    href: "/galaxy/crew",
    accent: GALAXY.violet,
    status: "live",
    order: 9,
  },
  {
    id: "factions",
    name: "Faction War",
    tagline: "Every read feeds your faction. See the standings.",
    href: "/galaxy/factions",
    accent: GALAXY.violet,
    status: "live",
    order: 13,
  },
  {
    id: "creators",
    name: "Creator Gauntlet",
    tagline: "Curated challenge boards from the community.",
    href: "/galaxy/creators",
    accent: GALAXY.violet,
    status: "live",
    order: 14,
  },
  {
    id: "wardrobe",
    name: "The Locker (Wardrobe)",
    tagline: "Kicks, fits, emotes, anthems, titles — wear your identity.",
    href: "/galaxy/wardrobe",
    accent: GALAXY.gold,
    status: "live",
    order: 9.5,
  },
  {
    id: "foundry",
    name: "The Merch Foundry",
    tagline: "Achievement-gated unlocks and cosmetics.",
    href: "/galaxy/store",
    accent: GALAXY.gold,
    status: "live",
    order: 10,
  },
  {
    id: "ladder",
    name: "Ranked Ladder",
    tagline: "Signal Cup standings, skill-tiered.",
    href: "/galaxy/leaderboard",
    accent: GALAXY.cyan,
    status: "live",
    order: 11,
  },
  {
    id: "score",
    name: "Galaxy Score",
    tagline: "One number for your whole sports identity.",
    href: "/galaxy/score",
    accent: GALAXY.gold,
    status: "live",
    order: 15,
  },
  {
    id: "friends",
    name: "Friends",
    tagline: "Follow players, visit cribs, play together.",
    href: "/galaxy/friends",
    accent: GALAXY.violet,
    status: "live",
    order: 16,
  },
  {
    id: "dynasty",
    name: "My Dynasty",
    tagline: "Your record, rating, badges, and status.",
    href: "/galaxy/dynasty",
    accent: GALAXY.cyan,
    status: "live",
    order: 12,
  },
] as const;
