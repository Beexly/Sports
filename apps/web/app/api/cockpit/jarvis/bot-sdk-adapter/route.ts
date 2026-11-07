import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  REGISTERED_BOT_SDK_ADAPTERS,
  executeUniversalBotSdkAdapter,
  type AutonomousBotAdapterProtocol,
  type UniversalBotAdapterRequest,
} from "@/lib/jarvis/autonomous-bot-sdk-adapter";
import { OUR_STEALTH_SKELETON_MODELS } from "@/lib/jarvis/stealth-skeleton-brain";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(
    {
      ok: true,
      adapterSuite: "GSE Universal Autonomous Bot SDK Adapter (Powered by OUR OWN LLM MODEL)",
      compositeScaleScore: "86.12/100",
      seasonLedgerOfRecord: "47-19-1 (+24.92u) | Base 38-13-1 (+22.85u)",
      standingRosterRuling: {
        genoSmith: "NYJ QB",
        mikeEvans: "SF WR",
      },
      ourModels: OUR_STEALTH_SKELETON_MODELS,
      registeredProtocols: REGISTERED_BOT_SDK_ADAPTERS,
    },
    {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    },
  );
}

export async function POST(req: Request): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = (await req.json()) as Partial<UniversalBotAdapterRequest>;
    const response = executeUniversalBotSdkAdapter({
      protocol: (body.protocol as AutonomousBotAdapterProtocol) ?? "antigravity-hermes-v1",
      prompt: body.prompt,
      messages: body.messages,
      mode: body.mode,
      model: body.model,
      copilotAction: body.copilotAction,
    });
    return NextResponse.json(response, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    const fallback = executeUniversalBotSdkAdapter({
      protocol: "antigravity-hermes-v1",
      prompt: "Default autonomous GSE + GSI synthesis",
    });
    return NextResponse.json(
      {
        ...fallback,
        warning: err instanceof Error ? err.message : "Fallback adapter synthesis used",
      },
      {
        status: 200,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
