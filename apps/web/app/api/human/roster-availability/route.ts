import { NextResponse } from "next/server";
import { loadRosterAvailability } from "@/lib/human-performance/availability";
import { consumeRateLimit } from "@/lib/api/rate-limit";

export const dynamic = "force-dynamic";

const MAX_PLAYERS = 40;

export async function POST(request: Request): Promise<NextResponse> {
  const fwd = request.headers.get("x-forwarded-for");
  const ip = fwd ? fwd.split(",")[0]!.trim() : (request.headers.get("x-real-ip") ?? "anon");
  const limit = consumeRateLimit("human-roster-availability", ip, 20, 5 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json(
      { success: false, error: "Too many requests. Please wait a moment." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
    );
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "invalid JSON body" }, { status: 400 });
  }
  const raw = (body as { players?: unknown })?.players;
  if (!Array.isArray(raw)) {
    return NextResponse.json({ success: false, error: "players[] is required" }, { status: 400 });
  }
  const players = raw
    .filter((p): p is { name: string; team?: string | null } => Boolean(p) && typeof (p as { name?: unknown }).name === "string")
    .slice(0, MAX_PLAYERS)
    .map((p) => ({ name: String(p.name), team: p.team ?? null }));

  const data = await loadRosterAvailability({ players });
  return NextResponse.json({ success: data.status !== "source-error", data });
}
