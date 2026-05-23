import { NextRequest, NextResponse } from "next/server";
import { db } from "@sports/db";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Admin role required for cockpit endpoints" },
      { status: 403 }
    );
  }
  const { id } = await params;

  const decisions = await db.cockpitDecision.findMany({
    where: { taskId: id },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ success: true, data: decisions });
}
