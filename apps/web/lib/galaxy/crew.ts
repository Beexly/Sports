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
