import { NextResponse } from "next/server";
import { callProofMcpTool, PROOF_MCP_TOOLS } from "@/lib/proof-mcp/tools";
import { SITE_URL } from "@/lib/seo/site-url";

/**
 * POST /api/mcp — the hosted Galaxy Proof MCP endpoint (streamable-HTTP,
 * stateless JSON responses — permitted by the MCP spec for servers that don't
 * stream). Any MCP-capable agent adds this URL as a connector and gets the
 * 8-tool proof suite: record summary, settled receipts, LOCAL hash
 * re-verification, cross-check, the conformance spec, the OpenAPI contract,
 * the full trustless record audit, and a single decision's Reality Receipt.
 *
 * Deliberately dependency-free: the JSON-RPC 2.0 + MCP handshake subset needed
 * here (initialize / notifications/initialized / ping / tools/list /
 * tools/call) is small, and owning it keeps this endpoint auditable like
 * everything else on the proof surface. Read-only: no sessions, no auth, no
 * state — every method is a pure read over the public record.
 *
 * GET returns a human/agent-readable descriptor (how to connect); the MCP
 * protocol itself runs over POST.
 */

export const dynamic = "force-dynamic";

const PROTOCOL_VERSION = "2025-03-26";

interface JsonRpcRequest {
  jsonrpc?: string;
  id?: number | string | null;
  method?: string;
  params?: Record<string, unknown>;
}

function rpcResult(id: number | string | null, result: unknown): NextResponse {
  return NextResponse.json({ jsonrpc: "2.0", id, result });
}

function rpcError(id: number | string | null, code: number, message: string): NextResponse {
  return NextResponse.json({ jsonrpc: "2.0", id, error: { code, message } });
}

export function GET(): NextResponse {
  return NextResponse.json({
    name: "galaxy-proof",
    description:
      "Hosted MCP endpoint for trustlessly auditing Galaxy Sports Edge's publish-before-kickoff pick record. Connect any MCP client to this URL (streamable HTTP) and call the 7 proof tools — receipts carry their leaf preimages, so every verdict can be your own math.",
    transport: "streamable-http",
    protocolVersion: PROTOCOL_VERSION,
    endpoint: `${SITE_URL}/api/mcp`,
    tools: PROOF_MCP_TOOLS.map((t) => t.name),
    manifest: `${SITE_URL}/llms.txt`,
  });
}

export async function POST(request: Request): Promise<NextResponse | Response> {
  let msg: JsonRpcRequest;
  try {
    msg = (await request.json()) as JsonRpcRequest;
  } catch {
    return rpcError(null, -32700, "Parse error: body must be a JSON-RPC 2.0 message");
  }
  // Batch requests are rare from MCP clients; keep the surface minimal + honest.
  if (Array.isArray(msg)) {
    return rpcError(null, -32600, "Batch requests are not supported by this endpoint");
  }
  const id = msg.id ?? null;
  const method = msg.method ?? "";

  switch (method) {
    case "initialize":
      return rpcResult(id, {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "galaxy-proof", version: "1.0.0" },
        instructions:
          "Read-only proof tools over Galaxy Sports Edge's tamper-evident pick record. " +
          "Use audit_record_trustlessly for the full self-audit; every receipt carries its leaf preimage " +
          "so hashes recompute with your own math. The ledger reports an honest unpublished/empty state " +
          "until a substantiated record exists — no tool here makes a performance claim.",
      });
    case "notifications/initialized":
      // Notification: no id, no body expected back.
      return new Response(null, { status: 202 });
    case "ping":
      return rpcResult(id, {});
    case "tools/list":
      return rpcResult(id, {
        tools: PROOF_MCP_TOOLS.map((t) => ({
          name: t.name,
          title: t.title,
          description: t.description,
          inputSchema: t.inputSchema,
        })),
      });
    case "tools/call": {
      const params = msg.params ?? {};
      const name = typeof params["name"] === "string" ? params["name"] : "";
      const args =
        typeof params["arguments"] === "object" && params["arguments"] !== null
          ? (params["arguments"] as Record<string, unknown>)
          : {};
      if (!PROOF_MCP_TOOLS.some((t) => t.name === name)) {
        return rpcError(id, -32602, `Unknown tool: ${name}`);
      }
      try {
        const result = await callProofMcpTool(name, args);
        return rpcResult(id, result);
      } catch (error) {
        // A tool crash is reported as a tool-level error result, not a protocol error.
        const message = error instanceof Error ? error.message : String(error);
        return rpcResult(id, {
          content: [{ type: "text", text: JSON.stringify({ ok: false, error: message }) }],
          isError: true,
        });
      }
    }
    default:
      return rpcError(id, -32601, `Method not found: ${method}`);
  }
}
