import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { assessSourceHealth, type SourceProbe } from "@/lib/cockpit/source-health";
import { checkRateLimit } from "@/lib/rate-limit";

/**
 * Cockpit source-health API — admin-gated, force-dynamic, no-store.
 *
 * Reads recent SourceSnapshot rows when DB is available, falls back
 * to an empty report otherwise. Calls assessSourceHealth() which
 * produces structured entries + alerts + a Claude-narrated summary.
 *
 * Rate-limited like the other Claude routes — assessSourceHealth makes
 * at most one Claude call per request. Fail-closed.
 *
 * Source-level invariants enforced by tests:
 *   - dynamic = "force-dynamic"
 *   - imports auth() and rejects non-admins with 403
 *   - delegates to assessSourceHealth (single source of truth)
 *   - no DB writes; never sets publishedAt
 *   - Cache-Control: no-store (every poll is current)
 */

export const dynamic = "force-dynamic";

// Look back 24h for recent source probes.
const LOOKBACK_MS = 24 * 60 * 60 * 1000;

interface SourceSnapshotRowShape {
  provider: string;
  sourceKind: string;
  fetchedAt: Date;
}

async function loadProbesFromDb(): Promise<SourceProbe[]> {
  if (!process.env["DATABASE_URL"]) return [];
  try {
    const { db } = await import("@sports/db");
    const dbAny = db as unknown as {
      sourceSnapshot?: {
        findMany: (args: unknown) => Promise<SourceSnapshotRowShape[]>;
      };
    };
    if (!dbAny.sourceSnapshot) return [];
    const rows = await dbAny.sourceSnapshot.findMany({
      where: { fetchedAt: { gte: new Date(Date.now() - LOOKBACK_MS) } },
      orderBy: { fetchedAt: "desc" },
      take: 200,
      select: { provider: true, sourceKind: true, fetchedAt: true },
    });
    return rows.map((r) => ({
      provider: r.provider,
      sourceKind: r.sourceKind,
      fetchedAt: r.fetchedAt,
    }));
  } catch {
    // Stub DB or unreachable — return empty; assessSourceHealth handles it.
    return [];
  }
}

function jsonNoStore(body: unknown, status: number): NextResponse {
  const res = NextResponse.json(body, { status });
  res.headers.set("Cache-Control", "no-store");
  return res;
}

export async function GET(): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return jsonNoStore(
      { error: "Admin role required for cockpit endpoints" },
      403
    );
  }

  const userId = session.user.email ?? session.user.id ?? "anon-admin";
  const limit = await checkRateLimit(userId, {
    route: "cockpit-source-health",
    windowMs: 60_000,
    maxRequests: 10,
    failureMode: "fail-closed",
  });
  if (!limit.allowed) {
    return jsonNoStore(
      { error: "rate-limit-exceeded", resetAt: limit.resetAt, source: limit.source },
      429
    );
  }

  try {
    const probes = await loadProbesFromDb();
    const report = await assessSourceHealth({ probes });
    return jsonNoStore(report, 200);
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown agent error";
    return jsonNoStore(
      { error: "source-health-failed", detail: message },
      500
    );
  }
}
