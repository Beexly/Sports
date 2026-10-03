import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  listCockpitOperators,
  summarizeRegistry,
} from "@/lib/cockpit/operator-registry";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(
    {
      operators: listCockpitOperators(),
      summary: summarizeRegistry(),
    },
    { status: 200, headers: { "Cache-Control": "no-store" } }
  );
}
