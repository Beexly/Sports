import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { db } from "@sports/db";

/**
 * Mission Control server-side guards.
 *
 * Operator actions are ADMIN-only and ALWAYS audited. These helpers keep the
 * two concerns in one place so every control route looks the same.
 */

export interface AdminActor {
  id: string;
  email: string;
}

type GuardResult =
  | { ok: true; actor: AdminActor }
  | { ok: false; response: NextResponse };

/** API-route admin guard. Returns the actor, or a ready-to-return 401/403. */
export async function requireAdminApi(): Promise<GuardResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      ok: false,
      response: NextResponse.json({ error: "unauthorized" }, { status: 401 }),
    };
  }
  if (session.user.role !== "ADMIN") {
    return {
      ok: false,
      response: NextResponse.json({ error: "forbidden" }, { status: 403 }),
    };
  }
  return {
    ok: true,
    actor: { id: session.user.id, email: session.user.email ?? "unknown" },
  };
}

/** Append an entry to the operator audit trail. Never throws into the caller. */
export async function writeOperatorAudit(entry: {
  actorEmail: string;
  action: string;
  targetType: string;
  targetId: string;
  summary: string;
  detail?: Prisma.InputJsonValue;
}): Promise<void> {
  await db.operatorAuditLog.create({
    data: {
      actorEmail: entry.actorEmail,
      action: entry.action,
      targetType: entry.targetType,
      targetId: entry.targetId,
      summary: entry.summary,
      ...(entry.detail === undefined ? {} : { detail: entry.detail }),
    },
  });
}
