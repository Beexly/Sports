import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentProfileId } from "@/lib/galaxy/session";
import { acquireConsumable, activateConsumable } from "@/lib/galaxy/consumables";

export const dynamic = "force-dynamic";

const Body = z.object({
  action: z.enum(["acquire", "activate"]),
  consumableId: z.string(),
});

export async function POST(req: Request): Promise<NextResponse> {
  const profileId = await getCurrentProfileId();
  if (!profileId) {
    return NextResponse.json({ error: "Create your Galaxy Profile to use boosts." }, { status: 401 });
  }
  let parsed: z.infer<typeof Body>;
  try {
    parsed = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  if (parsed.action === "acquire") {
    const res = await acquireConsumable(profileId, parsed.consumableId);
    return NextResponse.json(res.ok ? { ok: true, testMode: res.testMode ?? false } : { error: res.error }, { status: res.ok ? 200 : 400 });
  }
  const res = await activateConsumable(profileId, parsed.consumableId);
  return NextResponse.json(res.ok ? { ok: true, message: res.message } : { error: res.error }, { status: res.ok ? 200 : 400 });
}
