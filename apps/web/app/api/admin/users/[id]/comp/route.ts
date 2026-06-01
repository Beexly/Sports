import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@sports/db";
import { requireAdminApi, writeOperatorAudit } from "@/lib/admin/guard";

export const dynamic = "force-dynamic";

// A comp GRANTS paid access regardless of billing. `null` clears it (back to
// whatever Stripe says). FREE is not a comp — use null to remove one.
const Body = z.object({
  tier: z.enum(["PRO", "ELITE", "VIP"]).nullable(),
  reason: z.string().trim().max(280).optional(),
});

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
  const target = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true },
  });
  if (!target) {
    return NextResponse.json({ error: "user-not-found" }, { status: 404 });
  }

  const { tier, reason } = parsed.data;

  await db.user.update({
    where: { id: userId },
    data: tier
      ? {
          compedTier: tier,
          compedReason: reason ?? null,
          compedBy: guard.actor.email,
          compedAt: new Date(),
        }
      : { compedTier: null, compedReason: null, compedBy: null, compedAt: null },
  });

  await writeOperatorAudit({
    actorEmail: guard.actor.email,
    action: tier ? "USER_COMP_SET" : "USER_COMP_CLEAR",
    targetType: "user",
    targetId: userId,
    summary: tier
      ? `Comped ${target.email} to ${tier}${reason ? ` — ${reason}` : ""}`
      : `Cleared comp for ${target.email}`,
    detail: { tier, reason: reason ?? null },
  });

  return NextResponse.json({ success: true });
}
