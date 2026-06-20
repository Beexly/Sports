import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentProfileId, getCurrentProfileView } from "@/lib/galaxy/session";
import { acquireCosmetic, equipCosmetic } from "@/lib/galaxy/cosmetics";

export const dynamic = "force-dynamic";

const Body = z.object({
  action: z.enum(["acquire", "equip"]),
  cosmeticId: z.string(),
});

export async function POST(req: Request): Promise<NextResponse> {
  const profileId = await getCurrentProfileId();
  if (!profileId) {
    return NextResponse.json({ error: "Create your Galaxy Profile to use the Wardrobe." }, { status: 401 });
  }

  let parsed: z.infer<typeof Body>;
  try {
    parsed = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid wardrobe payload." }, { status: 400 });
  }

  if (parsed.action === "equip") {
    const res = await equipCosmetic(profileId, parsed.cosmeticId);
    return NextResponse.json(res.ok ? { ok: true } : { error: res.error ?? "Failed." }, { status: res.ok ? 200 : 400 });
  }

  const profile = await getCurrentProfileView();
  if (!profile) {
    return NextResponse.json({ error: "Profile not found." }, { status: 400 });
  }
  const res = await acquireCosmetic(profileId, parsed.cosmeticId, profile);
  return NextResponse.json(
    res.ok ? { ok: true, testMode: res.testMode ?? false } : { error: res.error ?? "Failed." },
    { status: res.ok ? 200 : 400 },
  );
}
