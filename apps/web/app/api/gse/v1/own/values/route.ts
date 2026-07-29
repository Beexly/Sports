/**
 * POST /api/gse/v1/own/values — PIT own-feed value. asOf required.
 * Refuse-default on missing/future asOf.
 */
import { NextRequest, NextResponse } from "next/server";
import {
  createDemoOwnStore,
  handleOwnValues,
} from "@sports/stats-api";

export const dynamic = "force-dynamic";

/** Process-local demo store — durable Prisma SoR is a follow-on. */
const store = createDemoOwnStore();

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: { metricId?: string; entityId?: string; asOf?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid JSON", code: "bad_json" }, { status: 400 });
  }
  const result = handleOwnValues(store, {
    metricId: body.metricId ?? "",
    entityId: body.entityId ?? "",
    asOf: body.asOf ?? "",
  });
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, code: result.code, oddsApiRequired: false },
      { status: result.status },
    );
  }
  return NextResponse.json(
    { ...result.data, oddsApiRequired: false },
    {
      headers: { "X-GSE-API": "stats.v1.own", "X-GSE-PIT": "required" },
    },
  );
}
