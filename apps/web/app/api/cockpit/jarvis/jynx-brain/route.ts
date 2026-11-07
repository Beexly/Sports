/**
 * /api/cockpit/jarvis/jynx-brain - Jarvis x Jynx Autonomous Brain API
 *
 * Powers the living, breathing autonomous GSE website across:
 *   - content_making (X, IG carousel, Chalkboard Reel scripts)
 *   - dfs_picking (DraftKings & FanDuel Cash Flagship, GPP Stacks, 14-Player Core)
 *   - bet_predicting (5-Stage Gated Game Calls, Player Props, Correlated SGPs)
 *   - corpus_and_gsi (12,304 canonical / 5,408 module equations, 25 graduate books BK-01..BK-25, 257 PDFs, 81 Motif dossiers, GSI biomechanics)
 *
 * Enforces ADMIN authentication in accordance with cockpit security policy.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  OUR_STEALTH_SKELETON_MODELS,
  runJarvisJynxAutonomousBrainAsync,
  type JarvisJynxBrainMode,
} from "@/lib/jarvis/stealth-skeleton-brain";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const session = await auth().catch(() => null);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const briefing = await runJarvisJynxAutonomousBrainAsync({
    prompt: "Initialize Jarvis x Jynx Autonomous Cockpit Briefing",
    mode: "autonomous_all",
    model: "gse/skeleton-stealth",
  });

  return NextResponse.json(
    {
      status: "ONLINE",
      engine: "jarvis-jynx-autonomous-brain",
      operatorAuthenticated: true,
      defaultModel: "gse/skeleton-stealth",
      models: OUR_STEALTH_SKELETON_MODELS,
      capabilities: [
        "content_making",
        "dfs_picking",
        "bet_predicting",
        "corpus_and_gsi",
      ],
      compositeScaleScore: briefing.compositeScaleScore,
      seasonLedger: briefing.seasonLedger,
      standingRosterRuling: briefing.standingRosterRuling,
      corpusTelemetry: briefing.corpusTelemetry,
      briefing,
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "application/json",
      },
    }
  );
}

export async function POST(req: Request): Promise<NextResponse> {
  const session = await auth().catch(() => null);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    prompt?: string;
    mode?: JarvisJynxBrainMode;
    model?: string;
  } = {};

  try {
    body = (await req.json()) as typeof body;
  } catch {
    body = {};
  }

  const result = await runJarvisJynxAutonomousBrainAsync({
    prompt:
      typeof body.prompt === "string" && body.prompt.trim().length > 0
        ? body.prompt
        : "Synthesize full autonomous content, DFS lineups, 360 bet predictions, and GSI biomechanics",
    mode: body.mode,
    model: body.model,
  });

  return NextResponse.json(result, {
    status: 200,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json",
    },
  });
}
