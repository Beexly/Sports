import { NextResponse } from "next/server";

const MCP_HEADERS: Record<string, string> = {
  "Content-Type": "application/json; charset=utf-8",
  "X-Content-Type-Options": "nosniff",
  "Cache-Control": "public, max-age=3600",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Mcp-Session-Id",
};

export function buildGseMcpManifest() {
  return {
    mcp_version: "2025-11-25",
    provider: "Galaxy Sports Network LLC",
    documentation_url: "https://www.galaxysportsedge.com/llms.txt",
    server_card_url: "https://www.galaxysportsedge.com/.well-known/mcp/server-card.json",
    endpoints: [
      {
        url: "https://www.galaxysportsedge.com/api/mcp",
        transport: "streamable-http",
        capabilities: ["tools", "resources"],
        auth: {
          type: "none",
          note: "Read-only public discovery and ledger verification endpoints require no credentials.",
        },
      },
    ],
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: MCP_HEADERS });
}

export async function GET() {
  return new NextResponse(JSON.stringify(buildGseMcpManifest(), null, 2), {
    status: 200,
    headers: MCP_HEADERS,
  });
}
