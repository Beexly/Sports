import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { scanModelJournalMarkdown } from "@/lib/journal/compliance";
import { db } from "@sports/db";

export const dynamic = "force-dynamic";

async function requireAdmin(): Promise<{ readonly ok: true } | NextResponse> {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json(
      { success: false, error: "Admin role required for cockpit endpoints" },
      { status: 403 }
    );
  }
  return { ok: true };
}

export async function POST(
  _req: Request,
  context: { readonly params: { readonly id: string } | Promise<{ readonly id: string }> }
): Promise<NextResponse> {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  const params = await Promise.resolve(context.params);
  const entry = await db.modelJournalEntry
    .findUnique({
      where: { id: params.id },
      select: { id: true, status: true, bodyMarkdown: true },
    })
    .catch(() => null);

  if (!entry) {
    return NextResponse.json(
      { success: false, error: "not-found" },
      { status: 404 }
    );
  }

  if (entry.status !== "DRAFT" && entry.status !== "REVIEW_PENDING") {
    return NextResponse.json(
      { success: false, error: "journal-entry-immutable" },
      { status: 409 }
    );
  }

  const compliance = scanModelJournalMarkdown(entry.bodyMarkdown);
  if (!compliance.publishAllowed) {
    return NextResponse.json(
      {
        success: false,
        error: "compliance-red",
        compliance,
      },
      { status: 409 }
    );
  }

  const updated = await db.modelJournalEntry.update({
    where: { id: params.id },
    data: {
      status: "REVIEW_PENDING",
    },
    select: {
      id: true,
      status: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({
    success: true,
    data: {
      ...updated,
      updatedAt: updated.updatedAt.toISOString(),
      compliance,
    },
    policy: {
      externalDistribution: false,
      note: "Review transition only. No RSS, email, or teaser action is triggered.",
    },
  });
}
