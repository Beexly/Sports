import { NextResponse, type NextRequest } from "next/server";
import { loadBoardPasses } from "@/lib/board/passes";
import { enforcePublicApiRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<NextResponse> {
  // Inbound throttle — this route consumes no query params (nothing to
  // validate). The helper tolerates an absent request (argless test calls).
  const limited = await enforcePublicApiRateLimit(req, "board-passes");
  if (limited) return limited;

  const payload = await loadBoardPasses();
  return NextResponse.json({ success: true, ...payload });
}
