/**
 * Galaxy Dynasty — Crew shell (bible Phase 5).
 *
 * Create/join + a shared board stub. No real-time clubhouse this build. Seeded
 * preview crews keep the surface alive with zero other humans (anti-ghost-town).
 */

import { db } from "@sports/db";
import type { GalaxyFactionId } from "@sports/galaxy-engine";
import type { CrewView } from "./types.js";

export interface PreviewCrew {
  readonly name: string;
  readonly tag: string;
  readonly motto: string;
  readonly faction: GalaxyFactionId;
  readonly memberCount: number;
}

/** Seeded preview crews so the surface is never empty (preview-only). */
export const PREVIEW_CREWS: readonly PreviewCrew[] = [
  { name: "Night Signal", tag: "NSG", motto: "Read the number, not the noise.", faction: "SHARPS", memberCount: 12 },
  { name: "Form Hunters", tag: "FRM", motto: "See it first.", faction: "SCOUTS", memberCount: 9 },
  { name: "Vault Keepers", tag: "VLT", motto: "The Vault remembers.", faction: "COLLECTORS", memberCount: 7 },
] as const;

export async function listCrews(): Promise<CrewView[]> {
  try {
    const crews = await db.crew.findMany({
      include: { _count: { select: { members: true } } },
      orderBy: { createdAt: "desc" },
      take: 25,
    });
    return crews.map((c) => ({
      id: c.id,
      name: c.name,
      tag: c.tag,
      motto: c.motto,
      faction: c.faction as GalaxyFactionId | null,
      memberCount: c._count.members,
      role: null,
    }));
  } catch {
    return [];
  }
}

export interface CreateCrewInput {
  readonly name: string;
  readonly tag: string;
  readonly motto?: string;
  readonly faction?: GalaxyFactionId;
}

export async function createCrew(
  profileId: string,
  input: CreateCrewInput,
): Promise<CrewView | null> {
  if (profileId === "stub") return null;
  try {
    const crew = await db.crew.create({
      data: {
        name: input.name,
        tag: input.tag,
        motto: input.motto ?? null,
        faction: input.faction ?? null,
        ownerProfileId: profileId,
        members: { create: { profileId, role: "CAPTAIN" } },
      },
      include: { _count: { select: { members: true } } },
    });
    return {
      id: crew.id,
      name: crew.name,
      tag: crew.tag,
      motto: crew.motto,
      faction: crew.faction as GalaxyFactionId | null,
      memberCount: crew._count.members,
      role: "CAPTAIN",
    };
  } catch {
    return null;
  }
}

export interface CrewMemberView {
  readonly handle: string;
  readonly role: "CAPTAIN" | "MEMBER";
  readonly lane: string | null;
  readonly seasonPoints: number;
  readonly rating: number;
}

export interface CrewSignalEntry {
  readonly handle: string;
  readonly surface: string;
  readonly result: string;
  readonly at: string;
}

export interface CrewDetail {
  readonly id: string;
  readonly name: string;
  readonly tag: string;
  readonly motto: string | null;
  readonly faction: GalaxyFactionId | null;
  readonly members: readonly CrewMemberView[];
  readonly crewXp: number;
  readonly signalBoard: readonly CrewSignalEntry[];
}

export async function getCrewDetail(crewId: string): Promise<CrewDetail | null> {
  try {
    const crew = await db.crew.findUnique({
      where: { id: crewId },
      include: { members: { include: { profile: true } } },
    });
    if (!crew) return null;
    const members: CrewMemberView[] = crew.members.map((m) => ({
      handle: m.profile.handle,
      role: m.role as "CAPTAIN" | "MEMBER",
      lane: m.lane,
      seasonPoints: m.profile.seasonPoints,
      rating: m.profile.rating,
    }));
    const crewXp = members.reduce((s, m) => s + m.seasonPoints, 0);

    let signalBoard: CrewSignalEntry[] = [];
    const memberIds = crew.members.map((m) => m.profileId);
    if (memberIds.length > 0) {
      const attempts = await db.signalCheckAttempt.findMany({
        where: { profileId: { in: memberIds } },
        include: { profile: { select: { handle: true } } },
        orderBy: { createdAt: "desc" },
        take: 8,
      });
      signalBoard = attempts.map((a) => ({
        handle: a.profile?.handle ?? "Player",
        surface: a.surface,
        result: a.result,
        at: a.createdAt.toISOString(),
      }));
    }

    return {
      id: crew.id,
      name: crew.name,
      tag: crew.tag,
      motto: crew.motto,
      faction: crew.faction as GalaxyFactionId | null,
      members,
      crewXp,
      signalBoard,
    };
  } catch {
    return null;
  }
}

export async function setCrewLane(profileId: string, crewId: string, lane: string): Promise<{ ok: boolean }> {
  if (profileId === "stub") return { ok: false };
  try {
    await db.crewMembership.update({
      where: { crewId_profileId: { crewId, profileId } },
      data: { lane },
    });
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

export interface CrewLeaderboardRow {
  readonly name: string;
  readonly tag: string;
  readonly memberCount: number;
  readonly crewXp: number;
}

export async function crewLeaderboard(): Promise<CrewLeaderboardRow[]> {
  try {
    const crews = await db.crew.findMany({
      include: { members: { include: { profile: { select: { seasonPoints: true } } } } },
      take: 25,
    });
    const rows = crews.map((c) => ({
      name: c.name,
      tag: c.tag,
      memberCount: c.members.length,
      crewXp: c.members.reduce((s, m) => s + (m.profile?.seasonPoints ?? 0), 0),
    }));
    return rows.sort((a, b) => b.crewXp - a.crewXp);
  } catch {
    return [];
  }
}

export async function joinCrew(profileId: string, crewId: string): Promise<CrewView | null> {
  if (profileId === "stub") return null;
  try {
    await db.crewMembership.upsert({
      where: { crewId_profileId: { crewId, profileId } },
      update: {},
      create: { crewId, profileId, role: "MEMBER" },
    });
    const crew = await db.crew.findUnique({
      where: { id: crewId },
      include: { _count: { select: { members: true } } },
    });
    if (!crew) return null;
    return {
      id: crew.id,
      name: crew.name,
      tag: crew.tag,
      motto: crew.motto,
      faction: crew.faction as GalaxyFactionId | null,
      memberCount: crew._count.members,
      role: "MEMBER",
    };
  } catch {
    return null;
  }
}
