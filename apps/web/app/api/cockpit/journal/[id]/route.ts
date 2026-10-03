import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@sports/db";

export const dynamic = "force-dynamic";

const EDITABLE_STATUSES = new Set(["DRAFT", "REVIEW_PENDING"]);

interface PatchBody {
  readonly title?: unknown;
  readonly bodyMarkdown?: unknown;
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

export async function PATCH(
  req: Request,
  context: { readonly params: { readonly id: string } | Promise<{ readonly id: string }> }
): Promise<NextResponse> {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  const params = await Promise.resolve(context.params);
  const body = (await req.json().catch(() => ({}))) as PatchBody;
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const bodyMarkdown = typeof body.bodyMarkdown === "string" ? body.bodyMarkdown : "";

  if (title.length === 0 || bodyMarkdown.trim().length === 0) {
    return NextResponse.json(
      { success: false, error: "title-and-body-required" },
      { status: 400 }
    );
  }

  const existing = await db.modelJournalEntry
    .findUnique({
      where: { id: params.id },
      select: { id: true, status: true },
    })
    .catch(() => null);

  if (!existing) {
    return NextResponse.json(
      { success: false, error: "not-found" },
      { status: 404 }
    );
  }

  if (!EDITABLE_STATUSES.has(existing.status)) {
    return NextResponse.json(
      {
        success: false,
        error: "journal-entry-immutable",
        message: "This Journal entry is preserved. Retract and create a corrected entry if the body needs to change.",
      },
      { status: 409 }
    );
  }

  const updated = await db.modelJournalEntry.update({
    where: { id: params.id },
    data: {
      title,
      body: bodyMarkdown,
      bodyMarkdown,
    },
    select: {
      id: true,
      title: true,
      bodyMarkdown: true,
      status: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({
    success: true,
    data: {
      ...updated,
      updatedAt: updated.updatedAt.toISOString(),
    },
    policy: {
      externalDistribution: false,
      note: "Draft save only. No RSS, email, or teaser action is triggered.",
    },
  });
}
