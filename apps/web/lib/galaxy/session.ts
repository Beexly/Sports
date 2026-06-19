/**
 * Galaxy Dynasty — session helpers.
 *
 * Bridges NextAuth to the Galaxy profile layer. All API routes resolve the
 * current user here; none trust a client-supplied profile id (DECISION D-012).
 */

import { auth } from "@/lib/auth";
import { getProfileRowByUserId, getProfileViewByUserId } from "./profile.js";
import type { ProfileView } from "./types.js";

export interface SessionUser {
  readonly id: string;
  readonly email: string | null;
  readonly name: string | null;
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return {
    id: session.user.id,
    email: session.user.email ?? null,
    name: session.user.name ?? null,
  };
}

/** The current user's profile id, or null if unauthenticated / no profile yet. */
export async function getCurrentProfileId(): Promise<string | null> {
  const user = await getSessionUser();
  if (!user) return null;
  const row = await getProfileRowByUserId(user.id);
  return row?.id ?? null;
}

export async function getCurrentProfileView(): Promise<ProfileView | null> {
  const user = await getSessionUser();
  if (!user) return null;
  return getProfileViewByUserId(user.id);
}
