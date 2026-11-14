import { NextResponse } from "next/server";
import { getStealthSkeletonMcpManifest } from "@sports/stealth-skeleton-provider";

/**
 * Live MCP Server Manifest Endpoint (`GET /api/openrouter-provider/mcp/manifest`)
 * for `@galaxysportsedge/stealth-skeleton-mcp` (`sst/opencode`, `Cline`, `Roo Code`, `OpenDots`).
 */
function verifyApiKey(request: Request): boolean {
  const configuredKey = process.env["OPENROUTER_PROVIDER_API_KEY"]?.trim();
  if (!configuredKey) return true;
  const auth = request.headers.get("authorization") ?? "";
  return auth === `Bearer ${configuredKey}`;
}

export async function GET(request: Request) {
  const requestId = request.headers.get("x-request-id") ?? `req_gse_${Date.now()}`;
  if (!verifyApiKey(request)) {
    return NextResponse.json(
      { error: { message: "Invalid OpenRouter provider API key", code: 401 } },
      { status: 401, headers: { "x-request-id": requestId } }
    );
  }

  return NextResponse.json(getStealthSkeletonMcpManifest(), {
    status: 200,
    headers: { "x-request-id": requestId },
  });
}
