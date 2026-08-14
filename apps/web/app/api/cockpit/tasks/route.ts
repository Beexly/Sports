import { NextRequest, NextResponse } from "next/server";
import { db } from "@sports/db";
import { auth } from "@/lib/auth";
import { consumeRateLimit } from "@/lib/api/rate-limit";
import type {
  OperatorAgent,
  CockpitTaskStatus,
  CockpitRiskLevel,
  CockpitComplianceStatus,
} from "@prisma/client";

export const dynamic = "force-dynamic";

async function requireAdmin(): Promise<{ userId: string } | NextResponse> {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Admin role required for cockpit endpoints" },
      { status: 403 }
    );
  }
  return { userId: session.user.id };
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const denied = await requireAdmin();
  if (denied instanceof NextResponse) return denied;

  const { searchParams } = new URL(req.url);
  const statusParam = searchParams.get("status");
  const agentParam = searchParams.get("agent");

  const tasks = await db.cockpitTask.findMany({
    where: {
      ...(statusParam ? { status: statusParam as CockpitTaskStatus } : {}),
      ...(agentParam ? { assignedAgent: agentParam as OperatorAgent } : {}),
    },
    orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
    take: 200,
  });

  return NextResponse.json({ success: true, data: tasks, meta: { total: tasks.length } });
}

interface CreateTaskInput {
  title?: unknown;
  description?: unknown;
  assignedAgent?: unknown;
  priority?: unknown;
  riskLevel?: unknown;
  complianceStatus?: unknown;
  source?: unknown;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const denied = await requireAdmin();
  if (denied instanceof NextResponse) return denied;

  // Per-admin throttle on this DB-write task-creation endpoint (defense-in-depth;
  // same bucket pattern as subscriptions/checkout, keyed by admin id at 10/min).
  // Limit copied from subscriptions/checkout.
  const limit = consumeRateLimit("cockpit-tasks", denied.userId, 10, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many requests. Please slow down and try again." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
    );
  }

  const body = (await req.json().catch(() => ({}))) as CreateTaskInput;

  if (typeof body.title !== "string" || body.title.length < 3) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }
  if (typeof body.description !== "string" || body.description.length < 1) {
    return NextResponse.json({ error: "description is required" }, { status: 400 });
  }
  if (typeof body.assignedAgent !== "string") {
    return NextResponse.json(
      { error: "assignedAgent is required" },
      { status: 400 }
    );
  }
  if (typeof body.source !== "string") {
    return NextResponse.json({ error: "source is required" }, { status: 400 });
  }

  const created = await db.cockpitTask.create({
    data: {
      title: body.title,
      description: body.description,
      assignedAgent: body.assignedAgent as OperatorAgent,
      source: body.source,
      priority: typeof body.priority === "number" ? body.priority : 50,
      riskLevel:
        (typeof body.riskLevel === "string"
          ? (body.riskLevel as CockpitRiskLevel)
          : "LOW"),
      complianceStatus:
        (typeof body.complianceStatus === "string"
          ? (body.complianceStatus as CockpitComplianceStatus)
          : "NOT_APPLICABLE"),
    },
  });

  return NextResponse.json({ success: true, data: created }, { status: 201 });
}
