/**
 * Shared zod query-param validation for PUBLIC API GETs (R-12).
 *
 * Contract: malformed input is a caller error and gets a clean 400 —
 * never a mislabeled 503. Before this module, junk like `?date=banana`
 * flowed into `new Date()` → Invalid Date → a DB error that surfaced as
 * the same degraded 503 we use for real outages, polluting monitoring
 * and lying to the caller about whose fault it was.
 *
 * Rules:
 *  - Only params a route actually consumes are validated. Unknown query
 *    params (utm tags, cache busters) are ignored, never rejected.
 *  - Schemas are intentionally conservative: short length caps and safe
 *    character classes, because several params are echoed back in the
 *    response payload.
 *  - The 400 body follows the house error shape:
 *    `{ success: false, error: "invalid-query", message, issues }`.
 */

import { NextResponse } from "next/server";
import { z } from "zod";

/** Safe, short identifier-ish text (sport names/keys, period labels). */
const safeToken = (max: number) =>
  z
    .string()
    .trim()
    .min(1)
    .max(max)
    .regex(/^[A-Za-z0-9 _-]+$/, "contains unsupported characters");

/** Strict calendar date — must be YYYY-MM-DD and actually parseable. */
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "must be formatted YYYY-MM-DD")
  .refine((s) => !Number.isNaN(Date.parse(s)), "is not a real calendar date");

/** /api/picks — ?sport=&date=&grade= */
export const picksQuerySchema = z.object({
  sport: safeToken(50).optional(),
  date: isoDate.optional(),
  grade: z.enum(["ELITE_PLAY", "STRONG_PLAY", "SOLID_PLAY", "LEAN"]).optional(),
});

/** /api/performance — ?period=&sport= (period is echoed back, keep it tame) */
export const performanceQuerySchema = z.object({
  period: safeToken(32).optional(),
  sport: safeToken(50).optional(),
});

/** /api/promotions — ?state=XX (two-letter US state/territory code) */
export const promotionsQuerySchema = z.object({
  state: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{2}$/, "must be a two-letter state code")
    .transform((s) => s.toUpperCase())
    .optional(),
});

export type ParsedQuery<T extends z.ZodTypeAny> =
  | { readonly ok: true; readonly data: z.infer<T> }
  | { readonly ok: false; readonly response: NextResponse };

/**
 * Validate the request's query string against `schema`. Absent params
 * stay `undefined` (every schema field is optional); present-but-invalid
 * params produce a 400 with a per-param issue list.
 *
 * Tolerates an absent request (some routes are invoked argless in tests)
 * and an unparseable URL — both validate as "no params".
 */
export function parsePublicQuery<T extends z.ZodObject<z.ZodRawShape>>(
  req: Request | undefined,
  schema: T
): ParsedQuery<T> {
  let searchParams: URLSearchParams;
  try {
    searchParams = req?.url ? new URL(req.url).searchParams : new URLSearchParams();
  } catch {
    searchParams = new URLSearchParams();
  }

  const raw: Record<string, string> = {};
  for (const key of Object.keys(schema.shape)) {
    const value = searchParams.get(key);
    if (value !== null) raw[key] = value;
  }

  const parsed = schema.safeParse(raw);
  if (parsed.success) {
    return { ok: true, data: parsed.data };
  }

  const issues = parsed.error.issues.map((issue) => ({
    param: issue.path.join(".") || "query",
    message: issue.message,
  }));

  return {
    ok: false,
    response: NextResponse.json(
      {
        success: false,
        error: "invalid-query",
        message: `Invalid query parameter${issues.length > 1 ? "s" : ""}: ${issues
          .map((i) => i.param)
          .join(", ")}.`,
        issues,
      },
      { status: 400, headers: { "cache-control": "no-store" } }
    ),
  };
}
