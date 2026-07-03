import { NextResponse } from "next/server";
import { getRookiePlazaSnapshot } from "@/lib/galaxy-dynasty/rookie-plaza-room";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(getRookiePlazaSnapshot());
}
