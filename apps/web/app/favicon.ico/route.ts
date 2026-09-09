/**
 * Browsers still request /favicon.ico by default — serve the brand mark
 * instead of a silent 404 (under-leveraged polish that hurts trust chrome).
 *
 * The redirect target is built from the canonical SITE_URL module, NOT
 * `request.url`: under `export const dynamic = "force-static"` the runtime
 * request URL is not the deployed host (in production it resolved to
 * `http://localhost:3000`), which would poison the 308 Location for any
 * client that follows it across hosts. Same class as the /ai.txt fix.
 */
import { NextResponse } from "next/server";

import { absoluteUrl } from "@/lib/seo/site-url";

export const dynamic = "force-static";

export function GET(): NextResponse {
  return NextResponse.redirect(absoluteUrl("/brand/gse-emblem-64.png"), 308);
}
