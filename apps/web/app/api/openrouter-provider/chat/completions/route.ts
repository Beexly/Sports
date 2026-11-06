import { NextResponse } from "next/server";
import { handleStealthSkeletonRequest } from "../../../../../../../workers/stealth-skeleton-provider/src/index";

/**
 * Live OpenRouter Provider Integration v2.4 Chat Completions Endpoint
 * (`POST /api/openrouter-provider/chat/completions`).
 *
 * Supports:
 *   - Non-streaming JSON (`stream: false`) and SSE Streaming (`stream: true`) with
 *     `: OPENROUTER PROCESSING\n\n` keep-alives (Section 11).
 *   - Auto Exacto tool-calling (`tools`, `tool_choice`) with `healToolCallGrammar` (Section 12).
 *   - Service tier echoing (`service_tier`, Section 7 Option 2).
 *   - 3-Class Crown IP Firewall (`PUBLIC` / `INTERNAL` / `CROWN`) + `CROWD_RLHF_QUEUE` DPO/GRPO compiler.
 */
function verifyApiKey(request: Request): boolean {
  const configuredKey = process.env["OPENROUTER_PROVIDER_API_KEY"]?.trim();
  if (!configuredKey) return true;
  const auth = request.headers.get("authorization") ?? "";
  return auth === `Bearer ${configuredKey}`;
}

export async function POST(request: Request) {
  const requestId = request.headers.get("x-request-id") ?? `req_gse_${Date.now()}`;
  if (!verifyApiKey(request)) {
    return NextResponse.json(
      { error: { message: "Invalid OpenRouter provider API key", code: 401 } },
      { status: 401, headers: { "x-request-id": requestId } }
    );
  }

  return handleStealthSkeletonRequest(request, {
    OPENROUTER_PROVIDER_SECRET: process.env["OPENROUTER_PROVIDER_API_KEY"],
    OPENROUTER_API_KEY: process.env["OPENROUTER_API_KEY"],
    DEEPINFRA_API_KEY: process.env["DEEPINFRA_API_KEY"],
    STEALTH_SKELETON_PHASE: "dual",
  });
}
