/**
 * V5 model-submission contract — live validation path.
 *
 * Wires `validateSubmission` / `writeSubmissionCsv` from
 * `@sports/prediction-engine` (reasoning-surface already exposes
 * `reasonSubmission` / `reasonSubmissionCsv`; this route is the callable
 * surface the handoff asked for).
 *
 * Fail-closed: any contract violation returns the full failure list.
 * Missing fields are never imputed. No database writes. No invented rows.
 *
 * Auth: ops bearer (internal model-contract surface).
 * GET is a documented schema snapshot. POST validates a package.
 */

import { NextResponse } from "next/server";
import {
  REQUIRED_SUBMISSION_COLUMNS,
  validateSubmission,
  writeSubmissionCsv,
  parseSubmissionCsv,
  type SubmissionPackage,
  type SubmissionValidationFailure,
} from "@sports/prediction-engine";
import { hasOpsAuth } from "@/lib/ops/ops-auth";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const runtime = "nodejs";

function unauthorized(): NextResponse {
  return NextResponse.json(
    { ok: false, reason: "ops auth required — not imputed" },
    { status: 401 },
  );
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    ok: true,
    contract: "v5-model-submission",
    requiredColumns: REQUIRED_SUBMISSION_COLUMNS,
    thesisFields: ["thesis", "features_used", "training_window", "known_limitations"],
    failureCodes: [
      "MISSING_COLUMN",
      "EMPTY_REQUIRED_FIELD",
      "PROBABILITY_OUT_OF_RANGE",
      "FAIR_PRICE_NOT_FINITE",
      "DUPLICATE_EVENT_ID",
      "GENERATED_AT_AFTER_EVENT_START",
      "INVALID_TIMESTAMP",
      "EMPTY_THESIS_FIELD",
      "NO_ROWS",
    ],
  });
}

export async function POST(request: Request): Promise<NextResponse> {
  if (!hasOpsAuth(request)) return unauthorized();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        ok: false,
        failures: [
          {
            code: "NO_ROWS",
            message: "request body must be JSON — not imputed",
          } satisfies SubmissionValidationFailure,
        ],
      },
      { status: 400 },
    );
  }

  const url = new URL(request.url);
  const format = url.searchParams.get("format");
  const source = url.searchParams.get("source");

  let pkg: SubmissionPackage;
  if (source === "csv") {
    const raw = (body as { csv?: unknown } | null)?.csv;
    if (typeof raw !== "string" || raw.trim().length === 0) {
      return NextResponse.json(
        {
          ok: false,
          failures: [
            {
              code: "NO_ROWS",
              message: "source=csv requires a non-empty csv string — not imputed",
            } satisfies SubmissionValidationFailure,
          ],
        },
        { status: 400 },
      );
    }
    const parsed = parseSubmissionCsv(raw);
    if (parsed.missingColumns.length > 0) {
      return NextResponse.json(
        {
          ok: false,
          failures: parsed.missingColumns.map((column) => ({
            code: "MISSING_COLUMN" as const,
            message: `CSV header missing required column: ${column}`,
            column,
          })),
        },
        { status: 400 },
      );
    }
    pkg = {
      rows: parsed.rows,
      thesis: (body as { thesis?: SubmissionPackage["thesis"] }).thesis ?? {
        thesis: "",
        features_used: [],
        training_window: "",
        known_limitations: "",
      },
      eventStarts: (body as { eventStarts?: Record<string, string> }).eventStarts ?? {},
    };
  } else {
    pkg = body as SubmissionPackage;
  }

  const result = validateSubmission(pkg);
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, failures: result.failures },
      { status: 422 },
    );
  }

  if (format === "csv") {
    try {
      const csv = writeSubmissionCsv(pkg);
      return new NextResponse(csv, {
        status: 200,
        headers: {
          "content-type": "text/csv; charset=utf-8",
          "x-submission-row-count": String(result.rowCount),
        },
      });
    } catch (err) {
      return NextResponse.json(
        {
          ok: false,
          failures: [
            {
              code: "NO_ROWS",
              message: err instanceof Error ? err.message : String(err),
            } satisfies SubmissionValidationFailure,
          ],
        },
        { status: 422 },
      );
    }
  }

  return NextResponse.json({
    ok: true,
    rowCount: result.rowCount,
    contract: "v5-model-submission",
  });
}
