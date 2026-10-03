import { NextRequest, NextResponse } from "next/server";
import { db } from "@sports/db";
import { auth } from "@/lib/auth";
import { listAgents } from "@/lib/cockpit/agents";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Admin role required for cockpit endpoints" },
      { status: 403 }
    );
  }

  const queueDepth = await db.cockpitTask.groupBy({
    by: ["assignedAgent", "status"],
    _count: { _all: true },
  });

  const agents = listAgents().map((a) => {
    const total = queueDepth
      .filter((g) => g.assignedAgent === a.key)
      .reduce((acc, g) => acc + g._count._all, 0);
    const needsReview = queueDepth
      .filter((g) => g.assignedAgent === a.key && g.status === "NEEDS_REVIEW")
      .reduce((acc, g) => acc + g._count._all, 0);
    const blocked = queueDepth
      .filter((g) => g.assignedAgent === a.key && g.status === "BLOCKED")
      .reduce((acc, g) => acc + g._count._all, 0);
    return { ...a, queueDepth: { total, needsReview, blocked } };
  });

  return NextResponse.json({ success: true, data: agents });
}
