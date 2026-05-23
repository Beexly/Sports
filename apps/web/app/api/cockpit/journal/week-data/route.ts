import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { loadModelJournalWeekData } from "@/lib/journal/week-data";

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

function parseInteger(value: string | null): number | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  return Number.parseInt(trimmed, 10);
}

export async function GET(req: Request): Promise<NextResponse> {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  const url = new URL(req.url);
  const isoWeek = parseInteger(url.searchParams.get("isoWeek"));
  const isoYear = parseInteger(url.searchParams.get("isoYear"));

  if (isoWeek === null || isoYear === null) {
    return NextResponse.json(
      { success: false, error: "week-and-year-required" },
      { status: 400 }
    );
  }

  if (isoWeek < 1 || isoWeek > 53 || isoYear < 2024 || isoYear > 2100) {
    return NextResponse.json(
      { success: false, error: "invalid-journal-week" },
      { status: 400 }
    );
  }

  const data = await loadModelJournalWeekData(isoYear, isoWeek);

  return NextResponse.json({
    success: true,
    data,
    policy: {
      externalDistribution: false,
      note: "Read-only evidence preview. No draft row or public output is created.",
    },
  });
}
