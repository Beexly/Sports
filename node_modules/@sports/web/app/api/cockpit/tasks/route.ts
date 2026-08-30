import { NextRequest, NextResponse } from "next/server";
import { db } from "@sports/db";
import { auth } from "@/lib/auth";
import { consumeRateLimit } from "@/lib/api/rate-limit";

// VALID_ENUM sets — the source of truth for which strings are accepted as
// Prisma enum inputs. These are the exact values the schema.prisma enums
// (OperatorAgent, CockpitTaskStatus, CockpitRiskLevel, CockpitComplianceStatus)
// permit. Keeping them here as const literals means the compiler rejects a
// typo'd member AND we reject untrusted user input before it reaches Prisma.
const VALID_OPERATOR_AGENT = ["JARVIS", "SARAH", "TAL", "SCOUT", "AVA", "BOBBY"] as const;
const VALID_COCKPIT_STATUS = [
  "NEW", "ROUTED", "DRAFTED", "NEEDS_REVIEW", "APPROVED",
  "REJECTED", "BLOCKED", "ARCHIVED",
] as const;
const VALID_RISK_LEVEL = ["LOW", "MODERATE", "HIGH", "COMPLIANCE_HOLD"] as const;
const VALID_COMPLIANCE_STATUS = ["NOT_APPLICABLE", "CLEAR", "REVIEW_REQUIRED", "HOLD", "REJECTED"] as const;

type OperatorAgent = (typeof VALID_OPERATOR_AGENT)[number];
type CockpitTaskStatus = (typeof VALID_COCKPIT_STATUS)[number];
type CockpitRiskLevel = (typeof VALID_RISK_LEVEL)[number];
type CockpitComplianceStatus = (typeof VALID_COMPLIANCE_STATUS)[number];

/** Narrow a raw string to a known enum value, or null if not a valid member. */
function narrowEnum(raw: unknown, set: readonly string[]): string | null {
  if (typeof raw !== "string") return null;
  return set.includes(raw) ? raw : null;
}

/** Build a human-readable 400 body listing accepted values for an enum. */
function enumError(field: string, set: readonly string[]): NextResponse {
  return NextResponse.json(
    { error: `Invalid ${field}. Accepted: ${set.join(", ")}` },
    { status: 400 },
  );
}

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

export async function GET(req: Request): Promise<NextResponse> {
  const denied = await requireAdmin();
  if (denied instanceof NextResponse) return denied;

  const { searchParams } = new URL(req.url);
  const statusParam = searchParams.get("status");
  const agentParam = searchParams.get("agent");

  // Validate enum params from the query string — reject invalid values
  // with a 400 instead of passing them raw to Prisma.
  const status = statusParam
    ? narrowEnum(statusParam, VALID_COCKPIT_STATUS)
    : null;
  if (statusParam && status === null) return enumError("status", VALID_COCKPIT_STATUS);

  const agent = agentParam
    ? narrowEnum(agentParam, VALID_OPERATOR_AGENT)
    : null;
  if (agentParam && agent === null) return enumError("agent", VALID_OPERATOR_AGENT);

  const tasks = await db.cockpitTask.findMany({
    where: {
      ...(status ? { status: status as CockpitTaskStatus } : {}),
      ...(agent ? { assignedAgent: agent as OperatorAgent } : {}),
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
  const assignedAgent = narrowEnum(body.assignedAgent, VALID_OPERATOR_AGENT);
  if (!assignedAgent) {
    return enumError("assignedAgent", VALID_OPERATOR_AGENT);
  }
  if (typeof body.source !== "string") {
    return NextResponse.json({ error: "source is required" }, { status: 400 });
  }

  const riskLevel = narrowEnum(body.riskLevel ?? "LOW", VALID_RISK_LEVEL) ?? "LOW";
  if (body.riskLevel !== undefined && riskLevel !== body.riskLevel) {
    return enumError("riskLevel", VALID_RISK_LEVEL);
  }

  const complianceStatus =
    narrowEnum(body.complianceStatus ?? "NOT_APPLICABLE", VALID_COMPLIANCE_STATUS) ?? "NOT_APPLICABLE";
  if (body.complianceStatus !== undefined && complianceStatus !== body.complianceStatus) {
    return enumError("complianceStatus", VALID_COMPLIANCE_STATUS);
  }

  const created = await db.cockpitTask.create({
    data: {
      title: body.title,
      description: body.description,
      assignedAgent: assignedAgent as OperatorAgent,
      source: body.source,
      priority: typeof body.priority === "number" ? body.priority : 50,
      riskLevel: riskLevel as CockpitRiskLevel,
      complianceStatus: complianceStatus as CockpitComplianceStatus,
    },
  });

  return NextResponse.json({ success: true, data: created }, { status: 201 });
}
