/**
 * GET /api/ops/devig — READ-ONLY de-vig oracle endpoint.
 *
 * WHY. The seven-method devig oracle (`devig/oracle.ts`, penaltyblog-ported
 * and golden-fixture-pinned) and `devigOracleAdapter` had no production
 * caller: scoring.ts still computes fair value with its own inline
 * `removeVig` ("proportional") plus a separate Shin helper, and nothing else
 * invoked the oracle. This route is the oracle's first production caller —
 * operators (and future scoring work, behind its own MODEL_VERSION bump) can
 * de-vig any market through the reference implementation instead of a
 * one-off copy.
 *
 * QUERY PARAMS (one odds form required):
 * - `odds=-500,350` — American odds, comma-separated, 2+ outcomes.
 * - `decimal=1.20,4.50` — decimal odds, comma-separated, 2+ outcomes.
 * - `method=shin` — optional; one of the seven DevigMethod values. Defaults
 *   to returning ALL seven methods so operators can compare them on the same
 *   book (on lopsided books the methods genuinely diverge — see
 *   `devig-asymmetric.test.ts`).
 *
 * LAWS OBSERVED:
 * - READS NOTHING, WRITES NOTHING. Pure math over the query string.
 * - CRON_SECRET Bearer <redacted>, same as the other ops routes.
 * - Invalid input → 400 with the reason. Never a fabricated vector.
 * - This route does NOT change scoring.ts: swapping the published fair-value
 *   method is a scoring change and needs its own MODEL_VERSION bump.
 */

import { NextResponse } from "next/server";
import { cronAuthError } from "@/lib/cron/authorize";
import { devig, type DevigMethod } from "@sports/prediction-engine";
import { captureError } from "@/lib/observability/sentry";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const METHODS: readonly DevigMethod[] = [
  "multiplicative",
  "additive",
  "power",
  "shin",
  "differential_margin_weighting",
  "odds_ratio",
  "logarithmic",
];

function parseOddsList(raw: string | null): number[] | null {
  if (!raw) return null;
  const parts = raw.split(",").map((s) => s.trim()).filter(Boolean);
  if (parts.length < 2) return null;
  const nums = parts.map(Number);
  if (nums.some((n) => !Number.isFinite(n))) return null;
  return nums;
}

function americanToDecimal(american: number): number | null {
  if (!Number.isFinite(american) || american === 0) return null;
  return american > 0 ? 1 + american / 100 : 1 + 100 / -american;
}

export async function GET(req: Request): Promise<NextResponse> {
  const denied = await cronAuthError(req);
  if (denied) return denied;

  try {
    const url = new URL(req.url);
    const american = parseOddsList(url.searchParams.get("odds"));
    const decimalInput = parseOddsList(url.searchParams.get("decimal"));

    let decimal: number[] | null = null;
    let inputKind: string | null = null;
    if (american) {
      const converted = american.map(americanToDecimal);
      if (converted.some((o) => o === null)) {
        return NextResponse.json(
          { success: false, error: "odds must be finite non-zero American values (e.g. -110, +150)" },
          { status: 400 },
        );
      }
      decimal = converted as number[];
      inputKind = "american";
    } else if (decimalInput) {
      decimal = decimalInput;
      inputKind = "decimal";
    } else {
      return NextResponse.json(
        { success: false, error: "supply ?odds=-110,-110 (American) or ?decimal=1.91,1.91, 2+ outcomes" },
        { status: 400 },
      );
    }

    const requested = url.searchParams.get("method");
    const methods: readonly DevigMethod[] =
      requested && (METHODS as readonly string[]).includes(requested)
        ? [requested as DevigMethod]
        : METHODS;

    const results = methods.map((method) => {
      const r = devig(decimal as number[], method);
      return {
        method: r.method,
        fairProbabilities: r.probabilities.map((p) => Number(p.toFixed(6))),
        overround: Number(r.margin.toFixed(6)),
        methodParams: r.methodParams ?? null,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        input: { kind: inputKind, decimalOdds: (decimal as number[]).map((o) => Number(o.toFixed(4))) },
        methods: results,
      },
      note:
        "READ-ONLY: the reference devig oracle over your book. scoring.ts still " +
        "uses its own inline proportional + Shin fair value; swapping the " +
        "published fair-value method is a scoring change needing a MODEL_VERSION bump.",
    });
  } catch (error) {
    captureError(error, { route: "ops/devig" });
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "devig failed" },
      { status: 400 },
    );
  }
}
