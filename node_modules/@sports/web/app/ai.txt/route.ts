/**
 * /ai.txt → canonical AI agent manifest is /llms.txt (llmstxt.org).
 */
import { NextResponse } from "next/server";

export const dynamic = "force-static";

export function GET(request: Request): NextResponse {
  const url = new URL("/llms.txt", request.url);
  return NextResponse.redirect(url, 308);
}
