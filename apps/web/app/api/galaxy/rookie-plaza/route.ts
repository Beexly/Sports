import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentProfileId, getCurrentProfileView } from "@/lib/galaxy/session";
import {
  claimRookiePlazaReward,
  completeRookiePlazaQuest,
  completeRookiePlazaSignalCheck,
  getRookiePlazaState,
  recordRookiePlazaPresence,
  recordRookiePlazaNpcInteraction,
  recordRookiePlazaRouteExit,
  updateRookiePlazaPosition,
} from "@/lib/galaxy/rookie-plaza";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const profile = await getCurrentProfileView();
  return NextResponse.json({ ok: true, state: getRookiePlazaState(profile) });
}

const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("quest"), questId: z.string() }),
  z.object({ action: z.literal("signal_check"), answer: z.enum(["A", "B"]), confidence: z.number().min(1).max(99) }),
  z.object({ action: z.literal("claim_reward"), itemId: z.string() }),
  z.object({ action: z.literal("npc"), npcId: z.string() }),
  z.object({ action: z.literal("route_exit"), routeId: z.string() }),
  z.object({ action: z.literal("position"), position: z.object({ x: z.number(), y: z.number(), z: z.number() }) }),
  z.object({ action: z.literal("presence"), kind: z.enum(["load", "fallback", "ghost_seen", "heartbeat"]) }),
]);

export async function POST(req: Request): Promise<NextResponse> {
  let parsed: z.infer<typeof Body>;
  try {
    parsed = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid Rookie Plaza payload." }, { status: 400 });
  }

  const profileId = (await getCurrentProfileId()) ?? "stub";

  try {
    if (parsed.action === "quest") {
      return NextResponse.json(await completeRookiePlazaQuest(profileId, parsed.questId));
    }
    if (parsed.action === "signal_check") {
      return NextResponse.json(await completeRookiePlazaSignalCheck(profileId, parsed.answer, parsed.confidence));
    }
    if (parsed.action === "claim_reward") {
      return NextResponse.json(await claimRookiePlazaReward(profileId, parsed.itemId));
    }
    if (parsed.action === "npc") {
      return NextResponse.json(recordRookiePlazaNpcInteraction(parsed.npcId));
    }
    if (parsed.action === "position") {
      return NextResponse.json(updateRookiePlazaPosition(profileId, parsed.position));
    }
    if (parsed.action === "presence") {
      return NextResponse.json(recordRookiePlazaPresence(profileId, parsed.kind));
    }
    return NextResponse.json(recordRookiePlazaRouteExit(parsed.routeId));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Rookie Plaza action failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
