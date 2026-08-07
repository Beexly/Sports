/**
 * Internal calibration metrics job — writes ops artifact only.
 *
 * LAWS:
 * - CRON_SECRET auth only
 * - Settled graded picks only when available
 * - ZERO public routes / ZERO env gate flips
 * - CALIBRATION_ADJUSTMENTS_ENABLED stays off
 * - Fail closed if no durable settled sample (empty → collecting)
 *
 * Not scheduled in vercel.json until founder enables.
 */
import { NextResponse } from "next/server";
import { cronAuthError } from "@/lib/cron/authorize";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  brierDecomposition,
  expectedCalibrationError,
  reliabilityCurve,
  type CalibrationSample,
} from "@sports/prediction-engine";
import { captureError } from "@/lib/observability/sentry";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

function mceFromCurve(
  bins: Array<{ count: number; meanForecast: number; observedRate: number }>,
): number {
  let mce = 0;
  for (const b of bins) {
    if (b.count === 0) continue;
    mce = Math.max(mce, Math.abs(b.meanForecast - b.observedRate));
  }
  return mce;
}

function meanLogLoss(samples: readonly CalibrationSample[]): number {
  const eps = 1e-15;
  if (samples.length === 0) return NaN;
  let sum = 0;
  for (const s of samples) {
    const p = Math.min(1 - eps, Math.max(eps, s.p));
    sum += s.y === 1 ? -Math.log(p) : -Math.log(1 - p);
  }
  return sum / samples.length;
}

function bss(
  bsModel: number,
  baseline: "half" | "climatology",
  baseRate: number,
): number | null {
  const bsBase =
    baseline === "half" ? 0.25 : Math.max(1e-12, baseRate * (1 - baseRate));
  if (!Number.isFinite(bsModel) || bsBase <= 0) return null;
  return (bsBase - bsModel) / bsBase;
}

/**
 * Load settled (p,y) samples. Empty until durable graded-picks reader is wired.
 * Never invents probabilities.
 */
async function loadSettledCalibrationSamples(): Promise<CalibrationSample[]> {
  return [];
}

export async function GET(request: Request): Promise<NextResponse> {
  const denied = cronAuthError(request);
  if (denied) return denied;

  try {
    const samples = await loadSettledCalibrationSamples();
    const generatedAt = new Date().toISOString();
    const gitSha =
      process.env["VERCEL_GIT_COMMIT_SHA"] ?? process.env["GIT_SHA"] ?? null;

    const dir = path.join(process.cwd(), ".gse-local", "calibration");
    await mkdir(dir, { recursive: true });

    if (samples.length === 0) {
      const empty = {
        generatedAt,
        gitSha,
        n: 0,
        status: "collecting" as const,
        notes: [
          "No settled graded picks available for metrics yet.",
          "Gates unchanged: no PERFORMANCE_STATS / LIVE_BOARD / CALIBRATION_ADJUSTMENTS.",
        ],
        overall: null,
      };
      await writeFile(
        path.join(dir, "metrics.json"),
        JSON.stringify(empty, null, 2),
        "utf8",
      );
      return NextResponse.json({
        ok: true,
        status: "collecting",
        n: 0,
        artifact: "internal:metrics.json",
      });
    }

    const decomp = brierDecomposition(samples);
    const ece = expectedCalibrationError(samples);
    const curve = reliabilityCurve(samples);
    const mce = mceFromCurve(curve);
    const logLoss = meanLogLoss(samples);

    const payload = {
      generatedAt,
      gitSha,
      n: samples.length,
      status: "ok" as const,
      overall: {
        brier: decomp.brier,
        brierDecomp: decomp,
        logLoss,
        ece,
        mce,
        bssHalf: bss(decomp.brier, "half", decomp.baseRate),
        bssClim: bss(decomp.brier, "climatology", decomp.baseRate),
        bssClose: null as number | null,
        reliabilityBins: curve,
      },
      notes: [
        "Internal only — not a public Proven claim.",
        "bssClose null until closing implied probabilities are joined.",
      ],
      temperatureT: null,
    };

    await writeFile(
      path.join(dir, "metrics.json"),
      JSON.stringify(payload, null, 2),
      "utf8",
    );

    return NextResponse.json({
      ok: true,
      status: "ok",
      n: samples.length,
      ece,
      mce,
      artifact: "internal:metrics.json",
    });
  } catch (err) {
    captureError(err, { route: "cron/calibration-metrics" });
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "calibration metrics failed",
      },
      { status: 500 },
    );
  }
}
