import { NextResponse } from "next/server";
import { loadPlayerModel } from "@/lib/intelligence/player-model";
import { addTargets, dropCandidates, classifyRoster } from "@/lib/intelligence/roster-advice";

export const dynamic = "force-dynamic";

const MAX_ROSTER = 60;

export async function POST(request: Request): Promise<NextResponse> {
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
