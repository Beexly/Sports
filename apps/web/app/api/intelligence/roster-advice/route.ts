import { NextResponse } from "next/server";
import { loadPlayerModel } from "@/lib/intelligence/player-model";
import { addTargets, dropCandidates, classifyRoster } from "@/lib/intelligence/roster-advice";
import { requirePremiumApi } from "@/lib/api-entitlement";
import { clientIp, consumeRateLimit } from "@/lib/api/rate-limit";

export const dynamic = "force-dynamic";

const MAX_ROSTER = 60;

export async function POST(request: Request): Promise<NextResponse> {
  const denied = await requirePremiumApi();
  if (denied) return denied;
  // Shared clientIp(): a hand-rolled leftmost x-forwarded-for read is forgeable,
  // so the per-IP ceiling behind the premium gate would never bind.
  const limit = consumeRateLimit("roster-advice", clientIp(request), 30, 5 * 60 * 1000);
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
  const roster = Array.isArray(raw) ? raw.filter((s): s is string => typeof s === "string").slice(0, MAX_ROSTER) : [];

  const model = await loadPlayerModel();
  if (model.status === "source-error") {
    return NextResponse.json({ success: false, data: { status: "source-error", error: model.error } });
  }

  return NextResponse.json({
    success: true,
    data: {
      status: "ok",
      season: model.season,
      throughWeek: model.throughWeek,
      adds: addTargets(model.profiles, { rostered: roster, limit: 12 }),
      drops: dropCandidates(model.profiles, roster, { limit: 6 }),
      reads: classifyRoster(model.profiles, roster),
    },
  });
}
