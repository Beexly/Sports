import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentProfileId } from "@/lib/galaxy/session";
import { toggleFollow } from "@/lib/galaxy/social";

export const dynamic = "force-dynamic";

const Body = z.object({ action: z.literal("follow"), handle: z.string() });

export async function POST(req: Request): Promise<NextResponse> {
  const profileId = await getCurrentProfileId();
  if (!profileId) {
    return NextResponse.json({ error: "Create your Galaxy Profile to follow players." }, { status: 401 });
  }
  let parsed: z.infer<typeof Body>;
  try {
    parsed = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }
  const res = await toggleFollow(profileId, parsed.handle);
  if (res.error) return NextResponse.json({ error: res.error }, { status: 400 });
  return NextResponse.json({ ok: true, following: res.following });
}
