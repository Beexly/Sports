import { NextResponse } from "next/server";
import { buildHealthReport } from "@/lib/health";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(buildHealthReport());
}
