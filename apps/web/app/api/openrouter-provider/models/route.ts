import { NextResponse } from "next/server";
import {
  STEALTH_SKELETON_MODELS,
  STEALTH_SKELETON_MODELS_V2_4,
} from "../../../../../../workers/stealth-skeleton-provider/src/index";

/**
 * Live OpenRouter Provider Integration v2.4 Models Endpoint (`GET /api/openrouter-provider/models`).
 *
 * Serves `ModelDocumentV2` (`schema_version: "2.4"`, `additionalProperties: false`) for:
 *   - `gse/stealth-skeleton-alpha` (`is_free: true`, `is_ready: true`)
 *   - `gse/skeleton-v1` (`is_free: false`, `$1.50/M` prompt, `$6.00/M` completion, `$0.30/M` cached_prompt)
 *   - `gse/skeleton-v1-fast` (Option 1 priority service tier)
 *   - `gse/skeleton-v1` (`variant: "batch"`, 50% batch discount)
 *
 * Also supports `?format=legacy` for OpenAI flat `/v1/models` clients (`sst/opencode`, `Cline`, `Roo Code`).
 * Guarded by optional `OPENROUTER_PROVIDER_API_KEY` verification when configured.
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

  const url = new URL(request.url);
  if (url.searchParams.get("format") === "legacy") {
    return NextResponse.json(
      { object: "list", data: STEALTH_SKELETON_MODELS },
      { status: 200, headers: { "x-request-id": requestId } }
    );
  }

  return NextResponse.json(
    { data: STEALTH_SKELETON_MODELS_V2_4 },
    { status: 200, headers: { "x-request-id": requestId } }
  );
}
