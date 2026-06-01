import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@sports/db";
import { requireAdminApi, writeOperatorAudit } from "@/lib/admin/guard";

export const dynamic = "force-dynamic";

const Body = z.object({ role: z.enum(["USER", "ADMIN"]) });

export async function POST(
  req: NextRequest,
  ctx: { params: { id: string } }
): Promise<NextResponse> {
  const guard = await requireAdminApi();
  if (!guard.ok) return guard.response;

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid-request" }, { status: 400 });
  }

  const userId = ctx.params.id;
  // Guard against self-lockout: an admin can't demote (or change) their own role.
  if (userId === guard.actor.id) {
    return NextResponse.json({ error: "cannot-change-own-role" }, { status: 400 });
  }

  const target = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, role: true },
  });
  if (!target) {
    return NextResponse.json({ error: "user-not-found" }, { status: 404 });
  }

  const { role } = parsed.data;
  if (target.role === role) {
    return NextResponse.json({ success: true, unchanged: true });
  }

  await db.user.update({ where: { id: userId }, data: { role } });

  await writeOperatorAudit({
    actorEmail: guard.actor.email,
    action: "USER_ROLE_SET",
    targetType: "user",
    targetId: userId,
    summary: `Set ${target.email} role ${target.role} → ${role}`,
    detail: { from: target.role, to: role },
  });

  return NextResponse.json({ success: true });
}
