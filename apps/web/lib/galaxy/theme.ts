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
    id: "blacktop",
    name: "The Blacktop",
    tagline: "Quick stat Signal Checks. Pure reps.",
    href: "/galaxy/blacktop",
    accent: GALAXY.gold,
    status: "live",
    order: 3,
  },
  {
    id: "depths",
    name: "The Depths",
    tagline: "Face The Public Trap — beat crowd bias.",
    href: "/galaxy/depths",
    accent: GALAXY.magenta,
    status: "live",
    order: 4,
  },
  {
    id: "vault",
    name: "The Vault",
    tagline: "Your card collection and companion data.",
    href: "/galaxy/vault",
    accent: GALAXY.gold,
    status: "live",
    order: 5,
  },
  {
    id: "crew",
    name: "Crews",
    tagline: "Form or join a Crew. Build a Legacy together.",
    href: "/galaxy/crew",
    accent: GALAXY.violet,
    status: "live",
    order: 6,
  },
  {
    id: "foundry",
    name: "The Merch Foundry",
    tagline: "Achievement-gated unlocks and cosmetics.",
    href: "/galaxy/store",
    accent: GALAXY.gold,
    status: "live",
    order: 7,
  },
  {
    id: "dynasty",
    name: "My Dynasty",
    tagline: "Your record, badges, skills, and status.",
    href: "/galaxy/dynasty",
    accent: GALAXY.cyan,
    status: "live",
    order: 8,
  },
] as const;
