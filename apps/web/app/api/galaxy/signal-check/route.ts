import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentProfileId } from "@/lib/galaxy/session";
import { runWarRoomCheck, runBlacktopCheck, runAcademyCheck } from "@/lib/galaxy/loop";

export const dynamic = "force-dynamic";

const Body = z.object({
  surface: z.enum(["WAR_ROOM", "BLACKTOP", "ACADEMY"]),
  scenarioId: z.string().optional(),
  questionId: z.string().optional(),
  option: z.enum(["A", "B"]),
  confidence: z.number().min(1).max(99),
});

/**
 * Run a Signal Check. The profile is resolved server-side from the session; the
 * client never supplies a profile id (DECISION D-012). Unauthenticated callers
 * fall through to the "stub" demo profile — the grade is real, nothing persists.
 */
export async function POST(req: Request): Promise<NextResponse> {
  let parsed: z.infer<typeof Body>;
  try {
    parsed = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid Signal Check payload." }, { status: 400 });
  }

  const profileId = (await getCurrentProfileId()) ?? "stub";

  try {
    if (parsed.surface === "WAR_ROOM") {
      if (!parsed.scenarioId) {
        return NextResponse.json({ error: "Missing scenarioId." }, { status: 400 });
      }
      const res = await runWarRoomCheck(profileId, parsed.scenarioId, parsed.option, parsed.confidence);
      return NextResponse.json({ ok: true, ...res });
    }
    if (parsed.surface === "BLACKTOP") {
      if (!parsed.questionId) {
        return NextResponse.json({ error: "Missing questionId." }, { status: 400 });
      }
      const res = await runBlacktopCheck(profileId, parsed.questionId, parsed.option, parsed.confidence);
      return NextResponse.json({ ok: true, ...res });
    }
    const res = await runAcademyCheck(profileId, parsed.option, parsed.confidence);
    return NextResponse.json({ ok: true, ...res });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Signal Check failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
