import { NextResponse } from "next/server";
import {
  STEALTH_SKELETON_MODELS,
  STEALTH_SKELETON_MODELS_V2_4,
} from "../../../../../../../workers/stealth-skeleton-provider/src/index";

export const dynamic = "force-dynamic";

const OPENROUTER_PROVIDER_API_KEY_HEADER = "x-openrouter-provider-api-key";

function verifyApiKey(req: Request): boolean {
  const configuredKey = process.env["OPENROUTER_PROVIDER_API_KEY"]?.trim();
  if (!configuredKey) return true;
  const authHeader = req.headers.get("authorization") ?? "";
  const customHeader = req.headers.get(OPENROUTER_PROVIDER_API_KEY_HEADER) ?? "";
  return authHeader === `Bearer ${configuredKey}` || customHeader === configuredKey;
}

/**
 * Canonical V2.4 OpenRouter Model Catalog unified with `workers/stealth-skeleton-provider/src/index.ts`.
 * Both endpoints (`GET /api/openrouter/v1/models` and the worker `GET /v1/models`) serve the exact
 * same 9-entry `STEALTH_SKELETON_MODELS_V2_4` (`ModelDocumentV2`, `schema_version: "2.4"`) feed
 * with zero ID-set divergence.
 */
export const STEALTH_SKELETON_OPENROUTER_MODELS = STEALTH_SKELETON_MODELS_V2_4;

export async function GET(req: Request): Promise<NextResponse> {
  const requestId = req.headers.get("x-request-id") ?? `req_gse_${Date.now()}`;
  if (!verifyApiKey(req)) {
    return NextResponse.json(
      { error: { message: "Invalid OpenRouter provider API key", code: 401 } },
      { status: 401, headers: { "x-request-id": requestId } },
    );
  }
  const url = new URL(req.url);
  if (url.searchParams.get("format") === "legacy") {
    return NextResponse.json(
      {
        object: "list",
        data: STEALTH_SKELETON_MODELS,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, max-age=60, s-maxage=60",
          "Access-Control-Allow-Origin": "*",
          "X-GSE-Provider-Version": "2.4.0",
          "X-GSE-Zero-Data-Retention": "enforced",
          "x-request-id": requestId,
        },
      },
    );
  }
  return NextResponse.json(
    {
      data: STEALTH_SKELETON_OPENROUTER_MODELS,
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "public, max-age=60, s-maxage=60",
        "Access-Control-Allow-Origin": "*",
        "X-GSE-Provider-Version": "2.4.0",
        "X-GSE-Zero-Data-Retention": "enforced",
        "x-request-id": requestId,
      },
    },
  );
}
