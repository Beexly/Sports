import { NextResponse } from "next/server";
import { consumeRateLimit } from "@/lib/api/rate-limit";

/**
 * /api/vitals — first-party Core Web Vitals sink.
 *
 * The client beacon (components/web-vitals-reporter.tsx) POSTs one metric per
 * call via navigator.sendBeacon. We emit one structured log line per metric so
 * field CWV (LCP / CLS / INP / FCP / TTFB) is observable in the platform's own
 * server logs — no third-party analytics, no cookie, no PII. Always returns 204
 * so a dropped or malformed beacon never surfaces to the user.
 *
 * Public and unauthenticated, so every field is treated as attacker-controlled
 * input, not just the beacon's own shape: `rating` is checked against the
 * `web-vitals` library's real 3-value enum (not just typeof string), and both
 * `rating` and `path` strip control characters before being interpolated into
 * a log line — otherwise a direct POST (bypassing the beacon entirely) could
 * forge multi-line or ANSI-laden log entries. Rate-limited per IP like the
 * repo's other public unauthenticated POST endpoint (`/api/waitlist`), at a
 * generous threshold since this fires once per real metric per real page view.
 */
export const dynamic = "force-dynamic";

interface VitalsBeacon {
  name?: unknown;
  value?: unknown;
  rating?: unknown;
  path?: unknown;
}

const ALLOWED_METRICS = new Set(["LCP", "CLS", "INP", "FCP", "TTFB"]);
const ALLOWED_RATINGS = new Set(["good", "needs-improvement", "poor"]);

// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\x00-\x1f\x7f]/g;

function sanitize(s: string): string {
  return s.replace(CONTROL_CHARS, "");
}

export async function POST(request: Request): Promise<NextResponse> {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "anon";
  const rl = consumeRateLimit("vitals", ip, 120, 60_000);
  if (!rl.ok) {
    return new NextResponse(null, { status: 204 });
  }

  let body: VitalsBeacon;
  try {
    body = (await request.json()) as VitalsBeacon;
  } catch {
    return new NextResponse(null, { status: 204 });
  }

  const name = typeof body.name === "string" ? body.name : "";
  const value = typeof body.value === "number" ? body.value : null;
  if (!ALLOWED_METRICS.has(name) || value === null) {
    return new NextResponse(null, { status: 204 });
  }

  const rawRating = typeof body.rating === "string" ? body.rating : "";
  const rating = ALLOWED_RATINGS.has(rawRating) ? rawRating : "unknown";
  const path =
    typeof body.path === "string"
      ? sanitize(body.path).slice(0, 256)
      : "unknown";

  // CLS is unitless; the rest are milliseconds. One line per metric so a host
  // log drain (Vercel) can chart field CWV without any third-party script.
  console.info(
    `[web-vitals] ${name} value=${value.toFixed(name === "CLS" ? 4 : 0)} rating=${rating} path=${path}`
  );

  return new NextResponse(null, { status: 204 });
}
