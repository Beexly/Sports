import { NextResponse } from "next/server";
import { loadHealthChecks } from "@/lib/health/checks";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const payload = await loadHealthChecks();

  return NextResponse.json(
    {
      ...payload,
      endpoint: "ready",
      semantics: "dependency_readiness",
    },
    { status: payload.ok ? 200 : 503 }
  );
}
