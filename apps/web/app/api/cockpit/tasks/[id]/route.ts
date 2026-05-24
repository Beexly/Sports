import { NextRequest, NextResponse } from "next/server";
import { db } from "@sports/db";
import { auth } from "@/lib/auth";
import {
  transitionTask,
  CockpitTransitionRefused,
} from "@/lib/cockpit/transitions";
import type { CockpitTaskStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const VALID_TASK_STATUSES = [
  "NEW", "ROUTED", "DRAFTED", "NEEDS_REVIEW", "APPROVED", "REJECTED", "BLOCKED", "ARCHIVED",
] as const;

function isValidTaskStatus(value: unknown): value is CockpitTaskStatus {
  return typeof value === "string" && (VALID_TASK_STATUSES as readonly string[]).includes(value);
}

async function requireAdmin(): Promise<{ ok: true; email: string } | NextResponse> {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Admin role required for cockpit endpoints" },
      { status: 403 }
    );
  }
  return { ok: true, email: session.user.email ?? "unknown" };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  const task = await db.cockpitTask.findUnique({
    where: { id: params.id },
    include: { decisions: { orderBy: { createdAt: "asc" } } },
  });
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true, data: task });
}

interface PatchBody {
  toStatus?: unknown;
  reviewer?: unknown;
  note?: unknown;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  const body = (await req.json().catch(() => ({}))) as PatchBody;
  if (typeof body.toStatus !== "string") {
    return NextResponse.json(
      { error: "toStatus is required (CockpitTaskStatus)" },
      { status: 400 }
    );
  }
  if (!isValidTaskStatus(body.toStatus)) {
    return NextResponse.json(
      { error: `Invalid toStatus. Valid values: ${VALID_TASK_STATUSES.join(", ")}` },
      { status: 400 }
    );
  }

  const reviewer =
    typeof body.reviewer === "string" && body.reviewer.length > 0
      ? body.reviewer
      : `manual:${guard.email}`;

  try {
    const result = await transitionTask(db, {
      taskId: params.id,
      toStatus: body.toStatus,
      reviewer,
      note: typeof body.note === "string" ? body.note : undefined,
    });
    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    if (err instanceof CockpitTransitionRefused) {
      return NextResponse.json(
        {
          error: err.message,
          refusedTransition: true,
          from: err.from,
          to: err.to,
        },
        { status: 409 }
      );
    }
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
