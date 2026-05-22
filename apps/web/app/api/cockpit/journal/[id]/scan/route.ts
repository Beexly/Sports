import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { scanModelJournalMarkdown } from "@/lib/journal/compliance";

export const dynamic = "force-dynamic";

interface ScanBody {
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

export async function POST(
  req: Request,
  _context: { readonly params: { readonly id: string } | Promise<{ readonly id: string }> }
): Promise<NextResponse> {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  const body = (await req.json().catch(() => ({}))) as ScanBody;
  const bodyMarkdown = typeof body.bodyMarkdown === "string" ? body.bodyMarkdown : "";

  if (bodyMarkdown.trim().length === 0) {
    return NextResponse.json(
      { success: false, error: "bodyMarkdown-required" },
      { status: 400 }
    );
  }

  return NextResponse.json({
    success: true,
    data: scanModelJournalMarkdown(bodyMarkdown),
    policy: {
      externalDistribution: false,
      note: "Scan only. No publish, send, or teaser action is triggered.",
    },
  });
}
