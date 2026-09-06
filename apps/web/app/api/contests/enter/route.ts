import { NextRequest, NextResponse } from "next/server";
import { ContestEntrySchema } from "@/lib/contests/types";
import { enterContest } from "@/lib/contests/store";
import { consumePublicFormRateLimit } from "@/lib/api/public-form-rate-limit";
import { isContestsPublic } from "@/lib/launch/public-surface-gate";
import { clientIp } from "@/lib/api/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!isContestsPublic()) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  const rl = await consumePublicFormRateLimit("contest-enter", clientIp(req), 8, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: "Too many entries — try again shortly." },
      { status: rl.status, headers: { "retry-after": String(rl.retryAfterSec) } },
    );
  }

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
