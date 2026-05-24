import { NextRequest, NextResponse } from "next/server";
import { db } from "@sports/db";
import { auth } from "@/lib/auth";
import type {
  OperatorAgent,
  CockpitTaskStatus,
  CockpitRiskLevel,
  CockpitComplianceStatus,
} from "@prisma/client";

export const dynamic = "force-dynamic";

function isValidEnumValue<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value);
}

const VALID_TASK_STATUSES = [
  "NEW", "ROUTED", "DRAFTED", "NEEDS_REVIEW", "APPROVED", "REJECTED", "BLOCKED", "ARCHIVED",
] as const;

const VALID_AGENT_NAMES = [
  "JARVIS", "SARAH", "TAL", "SCOUT", "AVA", "BOBBY",
] as const;

const VALID_RISK_LEVELS = [
  "LOW", "MODERATE", "HIGH", "COMPLIANCE_HOLD",
] as const;

const VALID_COMPLIANCE_STATUSES = [
  "NOT_APPLICABLE", "CLEAR", "REVIEW_REQUIRED", "HOLD", "REJECTED",
] as const;

async function requireAdmin(): Promise<NextResponse | null> {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Admin role required for cockpit endpoints" },
      { status: 403 }
    );
  }
  return null;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { searchParams } = new URL(req.url);
  const statusParam = searchParams.get("status");
  const agentParam = searchParams.get("agent");

  if (statusParam !== null && !isValidEnumValue(statusParam, VALID_TASK_STATUSES)) {
    return NextResponse.json(
      { error: `Invalid status. Valid values: ${VALID_TASK_STATUSES.join(", ")}` },
      { status: 400 }
    );
  }
  if (agentParam !== null && !isValidEnumValue(agentParam, VALID_AGENT_NAMES)) {
    return NextResponse.json(
      { error: `Invalid agent. Valid values: ${VALID_AGENT_NAMES.join(", ")}` },
      { status: 400 }
    );
  }

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
  if (denied) return denied;

  const body = (await req.json().catch(() => ({}))) as CreateTaskInput;

  if (typeof body.title !== "string" || body.title.length < 3) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }
  if (typeof body.description !== "string" || body.description.length < 1) {
    return NextResponse.json({ error: "description is required" }, { status: 400 });
  }
  if (!isValidEnumValue(body.assignedAgent, VALID_AGENT_NAMES)) {
    return NextResponse.json(
      { error: `assignedAgent is required and must be one of: ${VALID_AGENT_NAMES.join(", ")}` },
      { status: 400 }
    );
  }
  if (typeof body.source !== "string") {
    return NextResponse.json({ error: "source is required" }, { status: 400 });
  }

  if (body.riskLevel !== undefined && !isValidEnumValue(body.riskLevel, VALID_RISK_LEVELS)) {
    return NextResponse.json(
      { error: `Invalid riskLevel. Valid values: ${VALID_RISK_LEVELS.join(", ")}` },
      { status: 400 }
    );
  }
  if (body.complianceStatus !== undefined && !isValidEnumValue(body.complianceStatus, VALID_COMPLIANCE_STATUSES)) {
    return NextResponse.json(
      { error: `Invalid complianceStatus. Valid values: ${VALID_COMPLIANCE_STATUSES.join(", ")}` },
      { status: 400 }
    );
  }

  const resolvedRiskLevel: CockpitRiskLevel = isValidEnumValue(body.riskLevel, VALID_RISK_LEVELS)
    ? body.riskLevel
    : "LOW";
  const resolvedComplianceStatus: CockpitComplianceStatus = isValidEnumValue(body.complianceStatus, VALID_COMPLIANCE_STATUSES)
    ? body.complianceStatus
    : "NOT_APPLICABLE";

  const created = await db.cockpitTask.create({
    data: {
      title: body.title,
      description: body.description,
      assignedAgent: body.assignedAgent,
      source: body.source,
      priority: typeof body.priority === "number" ? body.priority : 50,
      riskLevel: resolvedRiskLevel,
      complianceStatus: resolvedComplianceStatus,
    },
  });

  return NextResponse.json({ success: true, data: created }, { status: 201 });
}
