/**
 * Cockpit — Source Mesh health monitor.
 * GET /api/cockpit/sources — list all data sources with health status.
 * POST /api/cockpit/sources — register or update a data source.
 * Admin only.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getSourceHealth,
  registerSource,
  approveLicense,
  resetCircuit,
  type SourceRegistration,
} from "@/lib/source-mesh";
import { db } from "@sports/db";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin role required." }, { status: 403 });
  }

  const sources = await db.dataSource.findMany({
    orderBy: [{ tier: "asc" }, { slug: "asc" }],
  });

  // Attach recent health events for each source
  const sourcesWithHealth = await Promise.all(
    sources.map(async (source) => {
      const recentEvents = await getSourceHealth(source.id, 10);
      return { ...source, recentEvents };
    }),
  );

  return NextResponse.json({ success: true, sources: sourcesWithHealth });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin role required." }, { status: 403 });
  }

  let body: {
    action?: string;
    slug?: string;
    registration?: SourceRegistration;
  };

  try {
    body = await req.json() as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { action, slug } = body;

  if (action === "approve" && slug) {
    const source = await approveLicense(slug);
    return NextResponse.json({ success: true, source });
  }

  if (action === "reset_circuit" && slug) {
    const source = await resetCircuit(slug);
    return NextResponse.json({ success: true, source });
  }

  if (action === "register" && body.registration) {
    const source = await registerSource(body.registration);
    return NextResponse.json({ success: true, source });
  }

  return NextResponse.json(
    { error: "Invalid action. Supported: approve, reset_circuit, register." },
    { status: 400 },
  );
}
