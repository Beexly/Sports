import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { loadStudioDashboard } from "@/lib/studio/load";
import { generateStudioAssetDraft, StudioGenerationError } from "@/lib/studio/claude";
import { getStudioTemplate } from "@/lib/studio/build-assets";
import type { CreatorAssetKind } from "@/lib/studio/templates";

export const dynamic = "force-dynamic";

interface StudioGenerateBody {
  readonly gameId?: unknown;
  readonly templateKind?: unknown;
}

function isCreatorAssetKind(value: unknown): value is CreatorAssetKind {
  if (typeof value !== "string") return false;
  try {
    getStudioTemplate(value as CreatorAssetKind);
    return true;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ success: false, error: "unauthorized" }, { status: 401 });
  }

  let body: StudioGenerateBody;
  try {
    body = (await request.json()) as StudioGenerateBody;
  } catch {
    return NextResponse.json({ success: false, error: "invalid-json" }, { status: 400 });
  }

  if (typeof body.gameId !== "string" || !isCreatorAssetKind(body.templateKind)) {
    return NextResponse.json(
      { success: false, error: "invalid-request", message: "gameId and templateKind are required." },
      { status: 400 }
    );
  }

  const apiKey = process.env["ANTHROPIC_API_KEY"];
  if (!apiKey) {
    return NextResponse.json(
      {
        success: false,
        error: "claude-not-configured",
        message: "ANTHROPIC_API_KEY is not configured. Studio generation is paused.",
      },
      { status: 503 }
    );
  }

  const data = await loadStudioDashboard(body.gameId);
  if (!data.selectedNode || data.selectedNode.id !== body.gameId) {
    return NextResponse.json({ success: false, error: "game-not-found" }, { status: 404 });
  }

  try {
    const draft = await generateStudioAssetDraft(
      {
        node: data.selectedNode,
        templateKind: body.templateKind,
        context: {
          gameId: data.selectedNode.id,
          modelVersion: "current",
          brandConfig: {
            publicUrl: "https://galaxysportsedge.com",
            voiceReferences: ["docs/positioning.md", "docs/product/galaxy-studio-spec.md"],
          },
        },
      },
      { apiKey }
    );

    return NextResponse.json({
      success: true,
      draft,
      policy: {
        autoPostEnabled: false,
        exportOnly: true,
      },
    });
  } catch (error) {
    if (error instanceof StudioGenerationError) {
      return NextResponse.json(
        { success: false, error: "generation-failed", message: error.message },
        { status: 422 }
      );
    }
    throw error;
  }
}
