import { NextResponse } from "next/server";
import { buildProofOpenApiSpec } from "@/lib/proof/openapi-spec";

/**
 * GET /api/proof/openapi.json — the OpenAPI 3.1 contract for the read-only
 * Proof API. Lets any OpenAPI-aware agent/client auto-discover and call
 * /api/proof/ledger, /api/proof/receipts, and /api/verify without bespoke
 * glue. Static-shaped (no request input, no DB), always 200.
 */

export const dynamic = "force-dynamic";

export function GET(): NextResponse {
  return NextResponse.json(buildProofOpenApiSpec(), {
    status: 200,
    headers: { "cache-control": "public, max-age=3600, s-maxage=3600" },
  });
}
