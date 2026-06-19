import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentProfileId } from "@/lib/galaxy/session";
import { runPublicTrap } from "@/lib/galaxy/loop";

export const dynamic = "force-dynamic";

const Body = z.object({
  answers: z
    .array(
      z.object({
        scenarioId: z.string(),
        chosen: z.enum(["PUBLIC", "VALUE"]),
        confidence: z.number().min(1).max(99),
      }),
    )
    .min(1)
    .max(10),
});

/** Resolve a Public Trap encounter (PvM boss). */
export async function POST(req: Request): Promise<NextResponse> {
  let parsed: z.infer<typeof Body>;
  try {
    parsed = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid boss payload." }, { status: 400 });
  }

  const profileId = (await getCurrentProfileId()) ?? "stub";

  try {
    const res = await runPublicTrap(profileId, parsed.answers);
    return NextResponse.json({ ok: true, ...res });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Boss encounter failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
