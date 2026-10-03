import { NextResponse } from "next/server";
import { buildVerificationSpec } from "@/lib/proof/verification-spec";

/**
 * GET /api/proof/verification-spec.json — the trustless conformance spec.
 *
 * Publishes the pick-commitment algorithm plus synthetic known-answer test
 * vectors so anyone can implement the verifier in any language and confirm it
 * reproduces our hashes — no trust in our server code required. Static-shaped
 * (no request input, no DB), always 200.
 */

export const dynamic = "force-dynamic";

export function GET(): NextResponse {
  return NextResponse.json(buildVerificationSpec(), {
    status: 200,
    headers: { "cache-control": "public, max-age=3600, s-maxage=3600" },
  });
}
