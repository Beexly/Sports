import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@sports/db";
import { revalidateJournalDistribution } from "@/lib/journal/revalidate";

export const dynamic = "force-dynamic";

interface RetractBody {
  readonly reason?: unknown;
}

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
  req: Request,
  context: { readonly params: { readonly id: string } | Promise<{ readonly id: string }> }
): Promise<NextResponse> {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  const params = await Promise.resolve(context.params);
  const body = (await req.json().catch(() => ({}))) as RetractBody;
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";

  if (reason.length < 12) {
    return NextResponse.json(
      { success: false, error: "retraction-reason-required" },
      { status: 400 }
    );
  }

  const entry = await db.modelJournalEntry
    .findUnique({
      where: { id: params.id },
      select: { id: true, slug: true, status: true },
    })
    .catch(() => null);

  if (!entry) {
    return NextResponse.json(
      { success: false, error: "not-found" },
      { status: 404 }
    );
  }

  if (entry.status !== "PUBLISHED") {
    return NextResponse.json(
      {
        success: false,
        error: "journal-entry-not-published",
        message: "Only published Journal entries can be retracted.",
      },
      { status: 409 }
    );
  }

  const updated = await db.modelJournalEntry.update({
    where: { id: params.id },
    data: {
      status: "RETRACTED",
      retractedAt: new Date(),
      retractionReason: reason,
    },
    select: {
      id: true,
      status: true,
      retractedAt: true,
      retractionReason: true,
      updatedAt: true,
    },
  });

  const revalidatedPaths = revalidateJournalDistribution(entry.slug);

  return NextResponse.json({
    success: true,
    data: {
      ...updated,
      retractedAt: updated.retractedAt?.toISOString() ?? null,
      updatedAt: updated.updatedAt.toISOString(),
    },
    policy: {
      externalDistribution: false,
      note: "Retraction removes the entry from public Journal loaders. It does not send outbound notices.",
    },
    distribution: {
      revalidatedPaths,
    },
  });
}
