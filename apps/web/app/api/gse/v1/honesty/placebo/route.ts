/**
 * POST /api/gse/v1/honesty/placebo — Phase 0 shuffled-time placebo harness.
 * If placebo shows edge → leakage → stop modeling. Not a public ROI surface.
 */
import { NextRequest, NextResponse } from "next/server";
import {
  mulberry32,
  runShuffledTimePlacebo,
} from "@sports/prediction-engine";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: { clvSeries?: number[]; threshold?: number; seed?: number };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid JSON", code: "bad_json" }, { status: 400 });
  }
  const series = Array.isArray(body.clvSeries)
    ? body.clvSeries.filter((x) => typeof x === "number" && Number.isFinite(x))
    : [];
  const rng =
    typeof body.seed === "number" ? mulberry32(body.seed >>> 0) : undefined;
  const report = runShuffledTimePlacebo(series, {
    threshold: typeof body.threshold === "number" ? body.threshold : undefined,
    rng,
  });
  return NextResponse.json(
    {
      surface: "honesty.placebo.v1",
      ...report,
      law: [
        "Phase 0 acceptance — leakage probe, not performance",
        "Fail means stop modeling until join is clean",
        "Never publish placebo as a skill claim",
      ],
    },
    {
      status: report.pass || report.n < 20 ? 200 : 422,
      headers: { "X-GSE-API": "stats.v1.honesty" },
    },
  );
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    {
      surface: "honesty.placebo.v1",
      usage: {
        method: "POST",
        body: { clvSeries: "number[] ≥20", threshold: "optional default 0.005", seed: "optional" },
      },
      law: ["Shuffled-time placebo before Phase 1 modeling"],
    },
    { headers: { "X-GSE-API": "stats.v1.honesty" } },
  );
}
