import { NextRequest, NextResponse } from "next/server";
import { db } from "@sports/db";
import { auth } from "@/lib/auth";
import {
  CLAUDE_API_SURFACES,
  DEFAULT_CLAUDE_API_BUDGETS,
  type ClaudeApiSurface,
} from "@/lib/claude-api/cost-monitor";

export const dynamic = "force-dynamic";

interface OverrideBody {
  readonly surface?: unknown;
  readonly overrideActive?: unknown;
  readonly overrideExpiresAt?: unknown;
  readonly reason?: unknown;
}

function isClaudeApiSurface(value: unknown): value is ClaudeApiSurface {
  return typeof value === "string" && CLAUDE_API_SURFACES.includes(value as ClaudeApiSurface);
}

function parseOverrideExpiry(value: unknown): Date | null {
  if (value === null || typeof value === "undefined" || value === "") return null;
  if (typeof value !== "string") throw new Error("overrideExpiresAt must be an ISO string.");
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("overrideExpiresAt must be an ISO string.");
  return date;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ success: false, error: "unauthorized" }, { status: 401 });
  }

  let body: OverrideBody;
  try {
    body = (await request.json()) as OverrideBody;
  } catch {
    return NextResponse.json({ success: false, error: "invalid-json" }, { status: 400 });
  }

  if (!isClaudeApiSurface(body.surface) || typeof body.overrideActive !== "boolean") {
    return NextResponse.json(
      { success: false, error: "invalid-request", message: "surface and overrideActive are required." },
      { status: 400 }
    );
  }

  if (typeof body.reason !== "string" || body.reason.trim().length < 12) {
    return NextResponse.json(
      { success: false, error: "reason-required", message: "A decision-log reason is required." },
      { status: 400 }
    );
  }

  let overrideExpiresAt: Date | null;
  try {
    overrideExpiresAt = body.overrideActive ? parseOverrideExpiry(body.overrideExpiresAt) : null;
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "invalid-expiry", message: error instanceof Error ? error.message : "Invalid expiry." },
      { status: 400 }
    );
  }

  const policy = DEFAULT_CLAUDE_API_BUDGETS[body.surface];
  const updated = await db.claudeApiBudget.upsert({
    where: { surface: body.surface },
    create: {
      surface: body.surface,
      monthlyBudgetUsd: policy.monthlyBudgetUsd,
      alertThresholds: policy.thresholds,
      overrideActive: body.overrideActive,
      overrideExpiresAt,
    },
    update: {
      overrideActive: body.overrideActive,
      overrideExpiresAt,
    },
  });

  return NextResponse.json({
    success: true,
    surface: updated.surface,
    overrideActive: updated.overrideActive,
    overrideExpiresAt: updated.overrideExpiresAt?.toISOString() ?? null,
    decisionLogEntry: {
      decidedBy: session.user.email ?? session.user.id,
      reason: body.reason.trim(),
    },
  });
}
