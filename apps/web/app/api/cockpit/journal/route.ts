import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateModelJournalDraftMarkdown } from "@/lib/journal/claude";
import { composeJournalDraftMarkdown } from "@/lib/journal/compose";
import { loadModelJournalWeekData } from "@/lib/journal/week-data";
import { generateSlug } from "@/lib/utils";
import { db } from "@sports/db";
import { MODEL_VERSION } from "@sports/prediction-engine";

export const dynamic = "force-dynamic";

interface CreateJournalBody {
  readonly title?: unknown;
  readonly isoWeek?: unknown;
  readonly isoYear?: unknown;
  readonly bodyMarkdown?: unknown;
  readonly draftWithClaude?: unknown;
}

async function requireAdmin(): Promise<
  | { readonly ok: true; readonly email: string }
  | NextResponse
> {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json(
      { success: false, error: "Admin role required for cockpit endpoints" },
      { status: 403 }
    );
  }

  return {
    ok: true,
    email: session.user.email ?? "admin@galaxysportsedge.local",
  };
}

function parseInteger(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value)) return value;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  return Number.parseInt(trimmed, 10);
}

export async function POST(req: Request): Promise<NextResponse> {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  const body = (await req.json().catch(() => ({}))) as CreateJournalBody;
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const isoWeek = parseInteger(body.isoWeek);
  const isoYear = parseInteger(body.isoYear);
  const submittedMarkdown = typeof body.bodyMarkdown === "string" ? body.bodyMarkdown.trim() : "";
  const draftWithClaude = body.draftWithClaude === true;

  if (title.length === 0 || isoWeek === null || isoYear === null) {
    return NextResponse.json(
      { success: false, error: "title-week-year-required" },
      { status: 400 }
    );
  }

  if (isoWeek < 1 || isoWeek > 53 || isoYear < 2024 || isoYear > 2100) {
    return NextResponse.json(
      { success: false, error: "invalid-journal-week" },
      { status: 400 }
    );
  }

  const slug = `${generateSlug(title)}-${isoYear}-w${isoWeek}`;
  const existing = await db.modelJournalEntry
    .findFirst({
      where: {
        OR: [
          { isoWeek, isoYear },
          { slug },
        ],
      },
      select: { id: true },
    })
    .catch(() => null);

  if (existing) {
    return NextResponse.json(
      {
        success: false,
        error: "journal-entry-exists",
        editorUrl: `/cockpit/journal/${existing.id}`,
      },
      { status: 409 }
    );
  }

  const weekData = await loadModelJournalWeekData(isoYear, isoWeek);
  let bodyMarkdown = submittedMarkdown;
  if (!bodyMarkdown && draftWithClaude) {
    const apiKey = process.env["ANTHROPIC_API_KEY"];
    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: "anthropic-key-missing",
          message: "ANTHROPIC_API_KEY is not configured. Model Journal draft generation is paused.",
        },
        { status: 503 }
      );
    }
    try {
      bodyMarkdown = await generateModelJournalDraftMarkdown(weekData, {
        apiKey,
        recordUsage: true,
        userId: guard.email,
      });
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: "journal-claude-draft-failed",
          message: error instanceof Error ? error.message : "Model Journal draft failed.",
        },
        { status: 503 }
      );
    }
  }
  if (!bodyMarkdown) {
    bodyMarkdown = composeJournalDraftMarkdown(title, weekData);
  }
  const referencedPickIds = weekData.picks.map((pick) => pick.id);
  const referencedAutopsyIds = weekData.lossAutopsies.map((autopsy) => autopsy.id);

  const created = await db.modelJournalEntry.create({
    data: {
      title,
      slug,
      isoWeek,
      isoYear,
      status: "DRAFT",
      body: bodyMarkdown,
      bodyMarkdown,
      modelVersion: MODEL_VERSION,
      referencedPickIds,
      referencedAutopsyIds,
      authorEmail: guard.email,
    },
    select: {
      id: true,
      title: true,
      status: true,
      slug: true,
      isoWeek: true,
      isoYear: true,
      updatedAt: true,
    },
  });

  return NextResponse.json(
    {
      success: true,
      data: {
        ...created,
        updatedAt: created.updatedAt.toISOString(),
        editorUrl: `/cockpit/journal/${created.id}`,
      },
      policy: {
        externalDistribution: false,
        note: "Draft creation only. Review and distribution are separate gated steps.",
      },
    },
    { status: 201 }
  );
}
