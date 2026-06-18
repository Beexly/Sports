import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@sports/db";
import { auth } from "@/lib/auth";
import { transitionTask, CockpitTransitionRefused } from "@/lib/cockpit/transitions";
import {
  DECISION_ACTION_SPECS,
  actionRequiresNote,
  isDecisionAction,
  targetStatusFor,
} from "@/lib/cockpit/daily-command/decision-mapping";

export const dynamic = "force-dynamic";

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

interface DecideBody {
  action?: unknown;
  note?: unknown;
  evidence?: unknown;
}

/**
 * POST /api/cockpit/tasks/[id]/decide
 *
 * The single human entry point for moving a cockpit task through review.
 *   APPROVE  → APPROVED  (only legal from NEEDS_REVIEW)
 *   EDIT     → DRAFTED   (send back for revision)
 *   REJECT   → REJECTED  (note required)
 *   ESCALATE → BLOCKED   (note required)
 *
 * APPROVED is reachable ONLY through this endpoint's APPROVE action — agents
 * never reach it autonomously. Every decision writes an immutable
 * CockpitDecision via transitionTask(); a refused move returns 409.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  const body = (await req.json().catch(() => ({}))) as DecideBody;

  if (!isDecisionAction(body.action)) {
    return NextResponse.json(
      { error: "action is required: APPROVE | EDIT | REJECT | ESCALATE" },
      { status: 400 }
    );
  }
  const action = body.action;
  const note = typeof body.note === "string" && body.note.trim().length > 0 ? body.note.trim() : undefined;

  if (actionRequiresNote(action) && !note) {
    return NextResponse.json(
      { error: `${DECISION_ACTION_SPECS[action].label} requires a note.` },
      { status: 400 }
    );
  }

  const toStatus = targetStatusFor(action);
  const reviewer = `manual:${guard.email}`;
  const evidence =
    body.evidence !== undefined && body.evidence !== null
      ? (body.evidence as Prisma.InputJsonValue)
      : undefined;

  try {
    const result = await transitionTask(db, {
      taskId: params.id,
      toStatus,
      reviewer,
      note,
      evidence,
    });
    return NextResponse.json({ success: true, action, data: result });
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
    const status = msg.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
