import { NextResponse } from "next/server";

/**
 * /api/vitals — first-party Core Web Vitals sink.
 *
 * The client beacon (components/web-vitals-reporter.tsx) POSTs one metric per
 * call via navigator.sendBeacon. We emit one structured log line per metric so
 * field CWV (LCP / CLS / INP / FCP / TTFB) is observable in the platform's own
 * server logs — no third-party analytics, no cookie, no PII. Always returns 204
 * so a dropped or malformed beacon never surfaces to the user.
 */
export const dynamic = "force-dynamic";

interface VitalsBeacon {
  name?: unknown;
  value?: unknown;
  rating?: unknown;
  path?: unknown;
}

const ALLOWED_METRICS = new Set(["LCP", "CLS", "INP", "FCP", "TTFB"]);

export async function POST(request: Request): Promise<NextResponse> {
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

  const rating = typeof body.rating === "string" ? body.rating : "unknown";
  const path =
    typeof body.path === "string" ? body.path.slice(0, 256) : "unknown";

  // CLS is unitless; the rest are milliseconds. One line per metric so a host
  // log drain (Vercel) can chart field CWV without any third-party script.
  console.info(
    `[web-vitals] ${name} value=${value.toFixed(name === "CLS" ? 4 : 0)} rating=${rating} path=${path}`
  );

  return new NextResponse(null, { status: 204 });
}
