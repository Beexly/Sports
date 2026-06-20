import { NextResponse } from "next/server";
import { z } from "zod";
import { isFactionId, isCrewLane } from "@sports/galaxy-engine";
import { getCurrentProfileId } from "@/lib/galaxy/session";
import { createCrew, joinCrew, listCrews, setCrewLane } from "@/lib/galaxy/crew";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ ok: true, crews: await listCrews() });
}

const Body = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create"),
    name: z.string().trim().min(2).max(32),
    tag: z.string().trim().min(2).max(5),
    motto: z.string().trim().max(80).optional(),
    faction: z.string().optional(),
  }),
  z.object({ action: z.literal("join"), crewId: z.string() }),
  z.object({ action: z.literal("lane"), crewId: z.string(), lane: z.string() }),
]);

export async function POST(req: Request): Promise<NextResponse> {
  const profileId = await getCurrentProfileId();
  if (!profileId) {
    return NextResponse.json(
      { error: "Create your Galaxy Profile before forming or joining a Crew." },
      { status: 401 },
    );
  }

  let parsed: z.infer<typeof Body>;
  try {
    parsed = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid crew payload." }, { status: 400 });
  }

  if (parsed.action === "create") {
    const faction = parsed.faction && isFactionId(parsed.faction) ? parsed.faction : undefined;
    const crew = await createCrew(profileId, {
      name: parsed.name,
      tag: parsed.tag.toUpperCase(),
      motto: parsed.motto,
      faction,
    });
    return NextResponse.json({ ok: true, crew });
  }

  if (parsed.action === "lane") {
    if (!isCrewLane(parsed.lane)) {
      return NextResponse.json({ error: "Unknown crew lane." }, { status: 400 });
    }
    const res = await setCrewLane(profileId, parsed.crewId, parsed.lane);
    return NextResponse.json({ ok: res.ok });
  }

  const crew = await joinCrew(profileId, parsed.crewId);
  return NextResponse.json({ ok: true, crew });
}
