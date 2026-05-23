import { NextResponse } from "next/server";
import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { auth } from "@/lib/auth";
import {
  parseTelemetryLog,
  summarizeTelemetry,
} from "@/lib/cockpit/telemetry-summary";

/**
 * Cockpit telemetry summary API — admin-gated, force-dynamic, no-store.
 *
 * Reads `_logs/claude-usage.log` (Cycle 18 writes it) and returns a
 * per-call-site summary the cockpit page renders. Honors a ?sinceMs
 * query param to clip the window.
 *
 * Source-level invariants enforced by tests:
 *   - dynamic = "force-dynamic"
 *   - imports auth() and rejects non-admins with 403
 *   - no DB writes; no publishedAt
 *   - Cache-Control: no-store (each refresh re-parses the log)
 *   - File read is best-effort; missing log returns an empty summary
 *     rather than throwing
 *   - No write path of any kind (the log is owned by withTelemetry)
 */
export const dynamic = "force-dynamic";

const LOG_PATH = resolve(process.cwd(), "_logs", "claude-usage.log");
const DEFAULT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const MAX_LOG_BYTES = 5 * 1024 * 1024; // 5 MB cap so the dashboard can't OOM

function jsonNoStore(body: unknown, status: number): NextResponse {
  const res = NextResponse.json(body, { status });
  res.headers.set("Cache-Control", "no-store");
  return res;
}

export async function GET(req: Request): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return jsonNoStore(
      { error: "Admin role required for cockpit endpoints" },
      403
    );
  }

  const { searchParams } = new URL(req.url);
  const sinceMs = Number(searchParams.get("sinceMs") ?? DEFAULT_WINDOW_MS);
  const safeSince =
    Number.isFinite(sinceMs) && sinceMs > 0 ? sinceMs : DEFAULT_WINDOW_MS;

  let logText = "";
  let logBytes = 0;
  try {
    const s = await stat(LOG_PATH);
    if (s.size > MAX_LOG_BYTES) {
      // Read only the tail to stay within the cap.
      const { open } = await import("node:fs/promises");
      const fh = await open(LOG_PATH, "r");
      try {
        const buf = Buffer.alloc(MAX_LOG_BYTES);
        await fh.read(buf, 0, MAX_LOG_BYTES, s.size - MAX_LOG_BYTES);
        logText = buf.toString("utf8");
      } finally {
        await fh.close();
      }
      logBytes = MAX_LOG_BYTES;
    } else {
      logText = await readFile(LOG_PATH, "utf8");
      logBytes = s.size;
    }
  } catch {
    // No log file yet (telemetry has never run, or VERCEL=1 elsewhere).
    return jsonNoStore(
      {
        windowStart: null,
        windowEnd: null,
        totalCalls: 0,
        totalErrors: 0,
        bySite: [],
        modelsSeen: [],
        errorClasses: [],
        meta: { logPath: LOG_PATH, logBytes: 0, sinceMs: safeSince },
      },
      200
    );
  }

  const rows = parseTelemetryLog(logText);
  const summary = summarizeTelemetry(rows, { sinceMs: safeSince });

  return jsonNoStore(
    {
      ...summary,
      meta: { logPath: LOG_PATH, logBytes, sinceMs: safeSince },
    },
    200
  );
}
