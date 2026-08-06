/**
 * Browsers still request /favicon.ico by default — serve the brand mark
 * instead of a silent 404 (under-leveraged polish that hurts trust chrome).
 */
import { NextResponse } from "next/server";

export const dynamic = "force-static";

export function GET(request: Request): NextResponse {
  const url = new URL("/brand/gse-emblem-64.png", request.url);
  return NextResponse.redirect(url, 308);
}
