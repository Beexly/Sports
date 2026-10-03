import { NextResponse } from "next/server";
import { allSources, clearedSources, forbiddenSources } from "@sports/data-ingestion";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    success: true,
    data: {
      cleared: clearedSources(),
      blocked: forbiddenSources(),
      all: allSources(),
      counts: {
        cleared: clearedSources().length,
        blocked: forbiddenSources().length,
        total: allSources().length,
      },
    },
  });
}
