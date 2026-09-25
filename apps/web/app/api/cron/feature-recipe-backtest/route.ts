/**
 * Vercel cron — feature-construction-recipe live path (V7).
 *
 * Wires `defineFeatureSpace` / `chronologicalSplit` / `fitAndReport` from
 * `@sports/prediction-engine` over settled canonical picks, so the V7
 * feature recipe is exercised on real rows instead of only its unit tests.
 *
 * ============================================================================
 * GATED OFF BY DEFAULT. NOT REGISTERED IN vercel.json.
 * ============================================================================
 * Unless `FEATURE_RECIPE_BACKTEST_ENABLED === "true"`, GET is a documented
 * no-op (`{ status: "disabled" }`) before touching auth, DB, or disk.
 * Activation needs BOTH the env flag and a vercel.json crons entry.
 *
 * Auth: Bearer CRON_SECRET only (side-effecting write of an ops artifact).
 *
 * Honesty:
 * - Settled graded picks only. Missing features are null, never imputed.
 * - The predictor is a train-mean baseline. It is a harness, not a claim
 *   that this baseline is the product model.
 * - Chronological split only — never random shuffle.
 */

import { NextResponse } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { cronAuthError } from "@/lib/cron/authorize";
import {
  defineFeatureSpace,
  chronologicalSplit,
  fitAndReport,
  type FeatureSpec,
  type Sample,
  type FitReport,
} from "@sports/prediction-engine";
import { db, isStubMode } from "@sports/db";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const runtime = "nodejs";
export const maxDuration = 60;

const FEATURE_SPECS: readonly FeatureSpec[] = [
  {
    name: "edgeScore",
    type: "number",
    unit: "score_0_100",
    asOf: true,
    description: "Net bookmaker edge at mint time (0-100)",
  },
  {
    name: "consensusPct",
    type: "number",
    unit: "probability",
    asOf: true,
    description: "Bookmaker consensus share 0.0-1.0 at mint time",
  },
  {
    name: "confidence",
    type: "number",
    unit: "score_0_100",
    asOf: true,
    description: "Published confidence score (not a win probability)",
  },
  {
    name: "bookmakerCount",
    type: "number",
    unit: "count",
    asOf: true,
    description: "Number of books priced at mint time",
  },
];

function finiteOrNull(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/** Train-mean baseline: honest, named, and never presented as the product model. */
function trainMeanPredictor(
  _features: Record<string, number | null>,
  train: readonly Sample[],
): number {
  if (train.length === 0) return 0.5;
  let sum = 0;
  for (const s of train) sum += s.outcome;
  return sum / train.length;
}

function enabled(): boolean {
  return process.env["FEATURE_RECIPE_BACKTEST_ENABLED"] === "true";
}

export async function GET(request: Request): Promise<NextResponse> {
  if (!enabled()) {
    return NextResponse.json({
      status: "disabled",
      reason:
        'FEATURE_RECIPE_BACKTEST_ENABLED is not "true" — route is a documented no-op (fail-closed)',
    });
  }

  const auth = cronAuthError(request);
  if (auth) return auth;

  const spaceResult = defineFeatureSpace(FEATURE_SPECS, "gse-feature-recipe-v1");
  if (!spaceResult.ok) {
    return NextResponse.json(
      {
        ok: false,
        reason: "feature space invalid",
        errors: spaceResult.errors,
      },
      { status: 500 },
    );
  }

  if (isStubMode()) {
    return NextResponse.json({
      ok: false,
      reason: "stub database — no settled rows to fit (fail-closed)",
    });
  }

  const rows = await db.pick.findMany({
    where: {
      isPublished: true,
      result: { in: ["WIN", "LOSS"] },
    },
    orderBy: { generatedAt: "asc" },
    take: 2000,
    select: {
      id: true,
      generatedAt: true,
      result: true,
      confidence: true,
      edgeScore: true,
      consensusPct: true,
      bookmakerCount: true,
      factorBreakdown: true,
    },
  });

  const samples: Sample[] = [];
  for (const row of rows) {
    const outcome = row.result === "WIN" ? 1 : 0;
    samples.push({
      features: {
        edgeScore: finiteOrNull(row.edgeScore),
        consensusPct: finiteOrNull(row.consensusPct),
        confidence: finiteOrNull(row.confidence),
        bookmakerCount: finiteOrNull(row.bookmakerCount),
      },
      outcome,
      timestamp:
        row.generatedAt instanceof Date
          ? row.generatedAt.toISOString()
          : new Date(row.generatedAt).toISOString(),
    });
  }

  if (samples.length < 40) {
    return NextResponse.json({
      ok: false,
      reason: `only ${samples.length} settled samples — need at least 40 for a chronological split (fail-closed)`,
    });
  }

  let split: ReturnType<typeof chronologicalSplit>;
  let report: FitReport;
  try {
    split = chronologicalSplit(samples, 0.7);
    report = fitAndReport(
      spaceResult.space,
      samples,
      trainMeanPredictor,
    );
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        reason: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }

  const payload = {
    ok: true,
    contract: "v7-feature-construction-recipe",
    featureSpace: {
      version: spaceResult.space.version,
      featureCount: spaceResult.space.features.length,
      features: spaceResult.space.features.map((f) => f.name),
    },
    split: {
      nTrain: split.train.length,
      nTest: split.test.length,
      trainEnd: split.trainEnd,
      testStart: split.testStart,
    },
    predictor: "train-mean-baseline",
    report,
    sampleSource: "published settled WIN/LOSS picks",
    generatedAt: new Date().toISOString(),
  };

  try {
    const dir = path.join(process.cwd(), "reports", "feature-recipe");
    await mkdir(dir, { recursive: true });
    const file = path.join(dir, `feature-recipe-${Date.now()}.json`);
    await writeFile(file, JSON.stringify(payload, null, 2), "utf8");
    return NextResponse.json({ ...payload, artifact: file });
  } catch {
    return NextResponse.json(payload);
  }
}
