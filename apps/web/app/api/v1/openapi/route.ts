/**
 * Experimental B2B OpenAPI — machine-readable contract for signals + probabilities.
 * claimPosture always experimental_research_grade_not_verified_roi while RED.
 */

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SPEC = {
  openapi: "3.1.0",
  info: {
    title: "Galaxy Sports Edge B2B Experimental API",
    version: "v1-experimental",
    description:
      "Research-grade signals and probabilities. rankingP is a model sort key when present. Not a verified ROI product. Eligibility may be RED. Auth: x-api-key header (GSE_B2B_API_KEYS).",
  },
  servers: [{ url: "https://www.galaxysportsedge.com" }],
  paths: {
    "/api/v1/signals": {
      get: {
        summary: "Experimental model signals",
        operationId: "getB2bSignals",
        security: [{ ApiKeyAuth: [] }],
        responses: {
          "200": {
            description:
              "Signals sorted by rankingP when present. claimPosture=experimental_research_grade_not_verified_roi.",
          },
          "401": { description: "Missing or invalid API key" },
          "429": { description: "Rate limited" },
        },
      },
    },
    "/api/v1/probabilities": {
      get: {
        summary: "Experimental model probabilities",
        operationId: "getB2bProbabilities",
        security: [{ ApiKeyAuth: [] }],
        responses: {
          "200": {
            description:
              "pModel + rankingP/marketFairProb when present. Not verified edge.",
          },
          "401": { description: "Missing or invalid API key" },
          "429": { description: "Rate limited" },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      ApiKeyAuth: {
        type: "apiKey",
        in: "header",
        name: "x-api-key",
      },
    },
  },
  "x-gse-claim-posture": "experimental_research_grade_not_verified_roi",
  "x-gse-eligibility": "may_be_RED",
  "x-gse-ranking-polarity-law": "positive_separation_required",
} as const;

export async function GET(): Promise<NextResponse> {
  return NextResponse.json(SPEC, {
    headers: {
      "Cache-Control": "public, max-age=300",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
