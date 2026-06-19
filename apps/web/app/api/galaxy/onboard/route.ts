import { NextResponse } from "next/server";
import { z } from "zod";
import { isArchetypeId, isFactionId } from "@sports/galaxy-engine";
import { getSessionUser } from "@/lib/galaxy/session";
import { onboardProfile } from "@/lib/galaxy/profile";

export const dynamic = "force-dynamic";

const Body = z.object({
  handle: z.string().trim().min(2).max(24),
  archetype: z.string(),
  faction: z.string(),
});

export async function POST(req: Request): Promise<NextResponse> {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json(
      { error: "Sign in to enter the Campus and create your Galaxy Profile." },
      { status: 401 },
    );
  }

  let parsed: z.infer<typeof Body>;
  try {
    parsed = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid onboarding payload." }, { status: 400 });
  }

  if (!isArchetypeId(parsed.archetype) || !isFactionId(parsed.faction)) {
    return NextResponse.json({ error: "Unknown archetype or faction." }, { status: 400 });
  }

  const result = await onboardProfile({
    userId: user.id,
    handle: parsed.handle,
    archetype: parsed.archetype,
    faction: parsed.faction,
  });

  return NextResponse.json({
    ok: true,
    profileId: result.profileId,
    persisted: result.persisted,
    view: result.view,
  });
}
