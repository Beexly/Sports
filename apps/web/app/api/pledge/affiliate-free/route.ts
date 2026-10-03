import { NextResponse } from "next/server";
import { AFFILIATE_FREE_PLEDGE } from "@/lib/pledge/affiliate-free";

export const dynamic = "force-static";

export async function GET(): Promise<NextResponse> {
  return NextResponse.json(AFFILIATE_FREE_PLEDGE);
}
