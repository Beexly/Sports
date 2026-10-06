/**
 * /ai.txt → canonical AI agent manifest is /llms.txt (llmstxt.org).
 *
 * The redirect target MUST be built from the canonical SITE_URL module,
 * NOT `request.url`: under `export const dynamic = "force-static"` the
 * runtime request URL is not the deployed host — in production this
 * resolved to `http://localhost:3000/llms.txt`, breaking every agent
 * that followed the redirect (P0-1, launch audit 2026-09-08).
 * `absoluteUrl()` guarantees a canonical https Location every environment.
 */
import { NextResponse } from "next/server";

import { absoluteUrl } from "@/lib/seo/site-url";

export const dynamic = "force-static";

export function GET(): NextResponse {
  return NextResponse.redirect(absoluteUrl("/llms.txt"), 308);
}
