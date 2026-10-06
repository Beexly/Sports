/**
 * Admin Founder Picks API — POST /api/admin/founder-picks
 *
 * The owner personally enters a pick. Admin-gated. Never auto-generates.
 * Writes a real Pick row (modelVersion = founder-v1) that settlement grades
 * like any other pick.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createFounderPick } from "@/lib/founder-picks/create";
import { loadFounderPickRecord } from "@/lib/founder-picks/record";
import type { FounderPickInput, FounderPickType } from "@/lib/founder-picks/types";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ success: false, error: "unauthorized" }, { status: 401 });
  }
  const record = await loadFounderPickRecord(100);
  return NextResponse.json({ success: true, data: record });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ success: false, error: "unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as Partial<FounderPickInput> | null;
  if (!body) {
    return NextResponse.json({ success: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const input: FounderPickInput = {
    gameId: String(body.gameId ?? ""),
    pickType: body.pickType as FounderPickType,
    selection: String(body.selection ?? ""),
    line: Number(body.line),
    confidence: Number(body.confidence),
    reasoning: String(body.reasoning ?? ""),
    override: body.override === "engine_pick" ? "engine_pick" : "engine_hold",
    consensusNotes: Array.isArray(body.consensusNotes)
      ? body.consensusNotes
          .filter((n): n is { source: string; lean: string } =>
            Boolean(n) && typeof n.source === "string" && typeof n.lean === "string",
          )
          .slice(0, 8)
      : [],
  };

  const result = await createFounderPick(input);
  if (!result.ok) {
    return NextResponse.json({ success: false, error: result.error }, { status: 400 });
  }
  return NextResponse.json({
    success: true,
    data: { pickId: result.pickId, action: result.action },
  });
}
