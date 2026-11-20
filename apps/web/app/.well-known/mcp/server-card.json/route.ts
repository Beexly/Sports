import { NextResponse } from "next/server";
import { HELPLINE } from "@/lib/brand";
import { PUBLIC_RECORD_LINE } from "@/lib/ledger/public-record";

const MCP_HEADERS: Record<string, string> = {
  "Content-Type": "application/json; charset=utf-8",
  "X-Content-Type-Options": "nosniff",
  "Cache-Control": "public, max-age=3600",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Mcp-Session-Id",
};

export function buildGseMcpServerCard() {
  return {
    $schema: "https://modelcontextprotocol.io/schemas/server-card/v1.0",
    version: "1.0",
    protocolVersion: "2025-11-25",
    serverInfo: {
      name: "Galaxy Sports Edge Global Intelligence MCP",
      version: "4.0.0",
      description:
        `Global quantitative sports analytics (NFL live; NBA, MLB, NHL, NCAA, MLS, and global soccer expanding), DFS builder docs, and tamper-evident settlement verification from Galaxy Sports Network LLC. Settled ledger: ${PUBLIC_RECORD_LINE}. ${HELPLINE.number}.`,
      homepage: "https://www.galaxysportsedge.com",
    },
    transport: {
      type: "streamable-http",
      url: "https://www.galaxysportsedge.com/api/mcp",
    },
    capabilities: {
      tools: true,
      resources: true,
      prompts: false,
    },
    resources: [
      {
        uri: "https://www.galaxysportsedge.com/llms.txt",
        name: "Galaxy Sports Edge Global LLM Directory (llms.txt)",
        mimeType: "text/markdown",
      },
      {
        uri: "https://www.galaxysportsedge.com/llms-full.txt",
        name: "Galaxy Sports Edge Full Methodology and Multi-Sport Reference",
        mimeType: "text/markdown",
      },
      {
        uri: "https://www.galaxysportsedge.com/accountability",
        name: "Accountability, Loss Room, and Proof of Record",
        mimeType: "text/html",
      },
      {
        uri: "https://www.galaxysportsedge.com/pricing",
        name: "Global Digital Slate and RedZone DFS Storefront Packs",
        mimeType: "text/html",
      },
    ],
    tools: [
      {
        name: "get_public_ledger_status",
        description:
          "Return the canonical public settled record line, 200-bet CLV calibration gate status, and accountability verification URLs.",
        annotations: { readOnlyHint: true, openWorldHint: false },
      },
      {
        name: "list_active_digital_packs",
        description:
          "List active instant-access digital slate, player prop, SGP correlation, and RedZone DFS packs available globally at https://www.galaxysportsedge.com/pricing.",
        annotations: { readOnlyHint: true, openWorldHint: false },
      },
    ],
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: MCP_HEADERS });
}

export async function GET() {
  return new NextResponse(JSON.stringify(buildGseMcpServerCard(), null, 2), {
    status: 200,
    headers: MCP_HEADERS,
  });
}
