import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentProfileId } from "@/lib/galaxy/session";
import { runGhostDuel, createOpenDuel, joinDuel, listOpenDuels } from "@/lib/galaxy/duel";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const profileId = (await getCurrentProfileId()) ?? undefined;
  return NextResponse.json({ ok: true, openDuels: await listOpenDuels(profileId) });
}

const Body = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("ghost"),
    scenarioId: z.string(),
    option: z.enum(["A", "B"]),
    confidence: z.number().min(1).max(99),
  }),
  z.object({
    action: z.literal("create"),
    scenarioId: z.string(),
    option: z.enum(["A", "B"]),
    confidence: z.number().min(1).max(99),
  }),
  z.object({
    action: z.literal("join"),
    duelId: z.string(),
    option: z.enum(["A", "B"]),
    confidence: z.number().min(1).max(99),
  }),
]);

export async function POST(req: Request): Promise<NextResponse> {
  let parsed: z.infer<typeof Body>;
  try {
    parsed = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid duel payload." }, { status: 400 });
  }

  const profileId = (await getCurrentProfileId()) ?? "stub";

  try {
    if (parsed.action === "ghost") {
      return NextResponse.json({ ok: true, duel: await runGhostDuel(profileId, parsed.scenarioId, parsed.option, parsed.confidence) });
    }
    if (parsed.action === "create") {
      // Open duels need a real profile so an opponent can challenge it.
      if (profileId === "stub") {
        return NextResponse.json({ error: "Create your Galaxy Profile to post an open duel." }, { status: 401 });
      }
      return NextResponse.json({ ok: true, created: await createOpenDuel(profileId, parsed.scenarioId, parsed.option, parsed.confidence) });
    }
    if (profileId === "stub") {
      return NextResponse.json({ error: "Create your Galaxy Profile to challenge a duel." }, { status: 401 });
    }
    return NextResponse.json({ ok: true, duel: await joinDuel(profileId, parsed.duelId, parsed.option, parsed.confidence) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Duel failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
