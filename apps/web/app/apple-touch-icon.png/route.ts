/**
 * iOS home-screen default path — redirect to official 180px emblem.
 */
import { NextResponse } from "next/server";

export const dynamic = "force-static";

export function GET(request: Request): NextResponse {
  const url = new URL("/brand/gse-emblem-180.png", request.url);
  return NextResponse.redirect(url, 308);
}
