import { NextResponse } from "next/server";
import { listProofSurfaceFreshness } from "@/lib/proof-freshness";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({
    surfaces: listProofSurfaceFreshness(),
  });
}
