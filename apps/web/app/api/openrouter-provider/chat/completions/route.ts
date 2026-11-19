import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { handleStealthSkeletonRequest } from "@sports/stealth-skeleton-provider";

/**
 * Live OpenRouter Provider Integration v2.4 Chat Completions Endpoint
 * (`POST /api/openrouter-provider/chat/completions`).
 *
 * Fail-closed Bearer verification via `OPENROUTER_PROVIDER_API_KEY` and
 * env-only provider key resolution (never reads workstation `~/.hermes/.env`).
 */
function verifyApiKey(request: Request): boolean {
  const configuredKey = process.env["OPENROUTER_PROVIDER_API_KEY"]?.trim();
  if (!configuredKey) return false;
  const auth = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${configuredKey}`;
  const a = createHash("sha256").update(auth, "utf8").digest();
  const b = createHash("sha256").update(expected, "utf8").digest();
  return timingSafeEqual(a, b);
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
    OPENROUTER_API_KEY: process.env["OPENROUTER_API_KEY"]?.trim(),
    DEEPINFRA_API_KEY: process.env["DEEPINFRA_API_KEY"]?.trim(),
    STEALTH_SKELETON_PHASE: "dual",
  });
}
