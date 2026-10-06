import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@sports/db", () => ({
  isStubMode: () => true,
  db: {
    pick: {
      findMany: vi.fn(),
    },
  },
}));

import { GET } from "@/app/api/cron/feature-recipe-backtest/route";
import {
  defineFeatureSpace,
  chronologicalSplit,
  fitAndReport,
  type FeatureSpec,
  type Sample,
} from "@sports/prediction-engine";

function req(auth?: string): Request {
  return new Request(
    "http://x/api/cron/feature-recipe-backtest",
    auth ? { headers: { authorization: auth } } : undefined,
  );
}

const SPECS: readonly FeatureSpec[] = [
  { name: "edgeScore", type: "number", unit: "score", asOf: true },
  { name: "confidence", type: "number", unit: "score", asOf: true },
];

function sample(i: number, outcome: number): Sample {
  return {
    features: { edgeScore: i * 10, confidence: 50 + i },
    outcome,
    timestamp: new Date(Date.UTC(2026, 0, 1 + i)).toISOString(),
  };
}

describe("GET /api/cron/feature-recipe-backtest", () => {
  beforeEach(() => {
    vi.stubEnv("FEATURE_RECIPE_BACKTEST_ENABLED", "true");
    vi.stubEnv("CRON_SECRET", "secret");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("is a documented no-op when the flag is off", async () => {
    vi.stubEnv("FEATURE_RECIPE_BACKTEST_ENABLED", "false");
    const res = await GET(req("Bearer secret"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { status: string };
    expect(body.status).toBe("disabled");
  });

  it("401s without the bearer secret when enabled", async () => {
    const res = await GET(req());
    expect(res.status).toBe(401);
  });

  it("fail-closes in stub mode rather than inventing rows", async () => {
    const res = await GET(req("Bearer secret"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; reason: string };
    expect(body.ok).toBe(false);
    expect(body.reason).toContain("stub");
  });
});

describe("feature-recipe V7 live path (library)", () => {
  it("defines a space, chronological-splits, and fitAndReports", () => {
    const space = defineFeatureSpace(SPECS, "gse-feature-recipe-v1");
    expect(space.ok).toBe(true);
    if (!space.ok) return;

    const samples = [
      sample(0, 0),
      sample(1, 1),
      sample(2, 1),
      sample(3, 0),
      sample(4, 1),
      sample(5, 1),
    ];
    const split = chronologicalSplit(samples, 0.7);
    expect(split.train.length).toBeGreaterThan(0);
    expect(split.test.length).toBeGreaterThan(0);
    expect(split.trainEnd <= split.testStart).toBe(true);

    const report = fitAndReport(space.space, samples, (_f, train) => {
      if (train.length === 0) return 0.5;
      return train.reduce((s, x) => s + x.outcome, 0) / train.length;
    });
    expect(report.nTrain).toBeGreaterThan(0);
    expect(Number.isFinite(report.brier)).toBe(true);
    expect(Number.isFinite(report.logLoss)).toBe(true);
  });
});
