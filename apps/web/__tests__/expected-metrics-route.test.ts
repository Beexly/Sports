import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { NextResponse } from "next/server";

vi.mock("@/lib/api-entitlement", () => ({ requirePremiumApi: vi.fn() }));
vi.mock("@/lib/nflverse/expected-metrics", () => ({ loadNflverseExpectedMetrics: vi.fn() }));

import { GET } from "@/app/api/nflverse/expected-metrics/route";
import { requirePremiumApi } from "@/lib/api-entitlement";
import {
  loadNflverseExpectedMetrics,
  type ExpectedMetricBlock,
  type NflverseExpectedMetrics,
} from "@/lib/nflverse/expected-metrics";

const ATTRIBUTION = "Data from nflverse (nflverse-data), CC-BY-4.0. NGS values used as ground truth only.";

function block(metric: "cpoe" | "ryoe" | "xyac"): ExpectedMetricBlock {
  return {
    provenance: null,
    qualifiedPlayers: 1,
    leaders: [
      {
        playerId: "00-qb1",
        playerName: "Sharp Shooter",
        plays: 300,
        overExpected: 4.5,
        actualMean: 0.7,
        expectedMean: 0.65,
      },
    ],
    validation: {
      metric,
      verdict: "graduated",
      reason: "pearson above graduated threshold",
      report: { n: 14, pearson: 0.7, spearman: 0.65, rmse: 0.5, mae: 0.4, bias: 0.01, ourMean: 0.05, truthMean: 0.04 },
      groundTruthSource: "NGS (nflverse, CC-BY-4.0)",
    },
  };
}

function cannedMetrics(status: "live" | "source-error"): NflverseExpectedMetrics {
  return {
    generatedAt: "2026-01-01T00:00:00.000Z",
    status,
    season: 2024,
    seasonType: "REG",
    sourcePlays: { dropbacks: 400, rushes: 300, catches: 250 },
    cpoe: block("cpoe"),
    ryoe: block("ryoe"),
    xyac: block("xyac"),
    canPublishProjections: false,
    blockReason: "Measurement only; nothing here is a projection or pick.",
    sourceUrls: {
      pbp: "https://example/play_by_play_2024.csv",
      ngsPassing: "https://example/nextgen_stats/ngs_passing.csv.gz",
      ngsRushing: "https://example/nextgen_stats/ngs_rushing.csv.gz",
      ngsReceiving: "https://example/nextgen_stats/ngs_receiving.csv.gz",
    },
    attribution: ATTRIBUTION,
    error: status === "source-error" ? "play-by-play unavailable" : null,
  };
}

beforeEach(() => {
  (requirePremiumApi as Mock).mockReset().mockResolvedValue(null);
  (loadNflverseExpectedMetrics as Mock).mockReset().mockResolvedValue(cannedMetrics("live"));
});

describe("GET /api/nflverse/expected-metrics", () => {
  it("returns the gate's denial and never touches the loader when not entitled", async () => {
    (requirePremiumApi as Mock).mockResolvedValue(NextResponse.json({ error: "premium required" }, { status: 403 }));

    const res = await GET();

    expect(res.status).toBe(403);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body["error"]).toBe("premium required");
    expect(loadNflverseExpectedMetrics).not.toHaveBeenCalled();
  });

  it("serves live expected metrics as 200 success with the season present", async () => {
    const res = await GET();

    expect(res.status).toBe(200);
    const body = (await res.json()) as { success: boolean; data: Record<string, unknown> };
    expect(body.success).toBe(true);
    expect(body.data["season"]).toBe(2024);
    expect(body.data["status"]).toBe("live");
    expect(body.data["canPublishProjections"]).toBe(false);
    expect(loadNflverseExpectedMetrics).toHaveBeenCalledTimes(1);
  });

  it("reports success:false when the loader falls back to a source-error state", async () => {
    (loadNflverseExpectedMetrics as Mock).mockResolvedValue(cannedMetrics("source-error"));

    const res = await GET();

    expect(res.status).toBe(200);
    const body = (await res.json()) as { success: boolean; data: Record<string, unknown> };
    expect(body.success).toBe(false);
    expect(body.data["status"]).toBe("source-error");
    expect(body.data["season"]).toBe(2024);
  });
});
