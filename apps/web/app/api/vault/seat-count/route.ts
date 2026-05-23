import { NextResponse } from "next/server";
import { getVaultSeatCountFromEnv } from "@/lib/vault/seats";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(getVaultSeatCountFromEnv());
}
