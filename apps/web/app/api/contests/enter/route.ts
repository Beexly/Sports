import { NextResponse } from "next/server";
import { ContestEntrySchema } from "@/lib/contests/types";
import { enterContest } from "@/lib/contests/store";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = ContestEntrySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid entry" },
      { status: 400 },
    );
  }

  // Honeypot
  if (parsed.data.honeypot) {
    return NextResponse.json({ ok: true, entry: { id: "dropped" } });
  }

  const result = await enterContest(parsed.data);
  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    entry: {
      id: result.entry.id,
      weekId: result.entry.weekId,
      displayName: result.entry.displayName,
      createdAt: result.entry.createdAt,
    },
  });
}
