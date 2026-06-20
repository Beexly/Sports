import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentProfileId } from "@/lib/galaxy/session";
import { runSignalSprint } from "@/lib/galaxy/sprint";

export const dynamic = "force-dynamic";

const Body = z.object({
  answers: z
    .array(z.object({ id: z.string(), choice: z.enum(["A", "B"]) }))
    .min(1)
    .max(10),
});

export async function POST(req: Request): Promise<NextResponse> {
  let parsed: z.infer<typeof Body>;
  try {
    parsed = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid sprint payload." }, { status: 400 });
  }
  const profileId = (await getCurrentProfileId()) ?? "stub";
  const res = await runSignalSprint(profileId, parsed.answers);
  return NextResponse.json({ ok: true, ...res });
}
