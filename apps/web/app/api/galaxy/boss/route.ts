import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentProfileId } from "@/lib/galaxy/session";
import { runBossEncounter } from "@/lib/galaxy/loop";

export const dynamic = "force-dynamic";

const Body = z.object({
  bossKey: z.string().default("public_trap"),
  answers: z
    .array(
      z.object({
        scenarioId: z.string(),
        // Accept TRAP/VALUE (generic) and PUBLIC (legacy Public Trap alias).
        chosen: z.enum(["TRAP", "VALUE", "PUBLIC"]),
        confidence: z.number().min(1).max(99),
      }),
    )
    .min(1)
    .max(10),
});

/** Resolve a Depths boss encounter (any of the 5 PvM bosses). */
export async function POST(req: Request): Promise<NextResponse> {
  let parsed: z.infer<typeof Body>;
  try {
    parsed = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid boss payload." }, { status: 400 });
  }

  const profileId = (await getCurrentProfileId()) ?? "stub";
  const answers = parsed.answers.map((a) => ({
    scenarioId: a.scenarioId,
    chosen: (a.chosen === "PUBLIC" ? "TRAP" : a.chosen) as "TRAP" | "VALUE",
    confidence: a.confidence,
  }));

  try {
    const res = await runBossEncounter(profileId, parsed.bossKey, answers);
    return NextResponse.json({ ok: true, ...res });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Boss encounter failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
