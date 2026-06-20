/**
 * Galaxy Dynasty — world-state service (Phase 5).
 *
 * Composes the live "sports weather" + the District Registry into a serializable
 * world state, and computes a personalized "recommended route" for the Campus.
 * Deterministic fixtures now; the weather interface is designed so a live sports
 * feed can replace the rotation later without changing callers. Pure read — safe
 * with or without a DB.
 */

import {
  activeWeatherForDay,
  currentDayIndex,
  getDistrict,
  getBoss,
  type SportsWeather,
  type DistrictId,
} from "@sports/galaxy-engine";
import { GALAXY } from "./theme.js";
import type { ProfileView } from "./types.js";

export interface WorldStateView {
  readonly weatherId: string;
  readonly weatherName: string;
  readonly summary: string;
  readonly accent: string;
  readonly affectedDistricts: readonly { id: DistrictId; name: string; href: string }[];
  readonly bossName: string | null;
  readonly bossKey: string | null;
  readonly gsePrompt: string;
  readonly questPrompt: string;
  readonly crewPrompt: string;
  readonly factionPrompt: string;
  readonly cardPrompt: string;
}

export interface RouteStep {
  readonly label: string;
  readonly detail: string;
  readonly href: string;
  readonly accent: string;
  readonly done?: boolean;
}

export function getGalaxyWorldState(now: number = Date.now()): WorldStateView {
  const w: SportsWeather = activeWeatherForDay(currentDayIndex(now));
  const affected = w.affectedDistricts
    .map((id) => {
      const d = getDistrict(id);
      return d ? { id, name: d.name, href: d.href } : null;
    })
    .filter((x): x is { id: DistrictId; name: string; href: string } => x !== null);
  const bossKey = w.bossRotation[0] ?? null;
  const boss = bossKey ? getBoss(bossKey) : null;
  return {
    weatherId: w.id,
    weatherName: w.name,
    summary: w.summary,
    accent: w.accent,
    affectedDistricts: affected,
    bossName: boss?.name ?? null,
    bossKey,
    gsePrompt: w.gsePrompt,
    questPrompt: w.questPrompt,
    crewPrompt: w.crewPrompt,
    factionPrompt: w.factionPrompt,
    cardPrompt: w.cardPrompts[0] ?? "Watch a card before it moves",
  };
}

/**
 * A personalized "where should I go next?" route — 3–4 steps blending today's
 * world weather with the player's own progress. Drives the Campus decision helper.
 */
export function getRecommendedRoute(world: WorldStateView, profile: ProfileView | null): RouteStep[] {
  const steps: RouteStep[] = [];

  if (!profile) {
    steps.push({
      label: "Create your Galaxy Profile",
      detail: "Pick an archetype + faction and enter the Campus.",
      href: "/galaxy/onboarding",
      accent: GALAXY.gold,
    });
  }

  // Today's weather-driven read.
  const primary = world.affectedDistricts[0];
  steps.push({
    label: `Today: ${world.weatherName}`,
    detail: world.questPrompt,
    href: primary?.href ?? "/galaxy/war-room",
    accent: world.accent,
  });

  // Boss rotation (if not cleared).
  if (world.bossKey && world.bossName) {
    const cleared = profile?.bossCleared.includes(world.bossKey) ?? false;
    steps.push({
      label: `Depths: ${world.bossName}`,
      detail: cleared ? "Cleared — run it again for reps." : "The week's featured boss.",
      href: "/galaxy/depths",
      accent: GALAXY.magenta,
      done: cleared,
    });
  }

  // Card heat.
  steps.push({
    label: "Vault: card heat",
    detail: world.cardPrompt,
    href: "/galaxy/market",
    accent: GALAXY.gold,
  });

  // Crew need.
  if (profile && !profile.crew) {
    steps.push({
      label: "Join a Crew",
      detail: world.crewPrompt,
      href: "/galaxy/crew",
      accent: GALAXY.violet,
    });
  } else {
    steps.push({
      label: "GSE prep",
      detail: world.gsePrompt,
      href: "/galaxy/war-room",
      accent: GALAXY.cyan,
    });
  }

  return steps.slice(0, 4);
}
