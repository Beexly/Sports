import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock @sports/db before importing route
vi.mock("@sports/db", () => {
  return {
    db: {
      pick: {
        findMany: vi.fn(),
      },
    },
  };
});

// Mock ops-auth
vi.mock("@/lib/ops/ops-auth", () => {
  return {
    hasOpsAuth: vi.fn((req: Request) => {
      const auth = req.headers.get("authorization");
      return auth === "Bearer test-cron-secret";
    }),
  };
});

import { GET } from "./route";
import { db } from "@sports/db";

describe("GET /api/ops/ranked-picks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 Unauthorized when Bearer token is missing or invalid", async () => {
    const req = new Request("http://localhost/api/ops/ranked-picks");
    const res = await GET(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe("Unauthorized");
  });

  it("filters adverse edge and contradicted model signals, and flags saturated Edge Index", async () => {
    const mockPicks = [
      // 1. Saturated Edge Index (edgeScore = 100) -> should NOT be rewritten to 54, marked SATURATED_UNUSABLE
      {
        id: "pick-1",
        gameId: "game-1",
        bookmakerCount: 8,
        pickType: "SPREAD",
        selection: "Ohio State -3.5",
        line: -3.5,
        confidence: 82,
        edgeScore: 100,
        tier: "FREE",
        pickGrade: "A",
        riskLevel: "LOW",
        reasoningShort: "Strong edge on Ohio State",
        factorBreakdown: {
          rankingP: 0.68,
          independentEdge: { decision: "LEAN", expectedClv: 0.045 },
          situationalReading: {
            reasoningTrace: "Ohio State at Indiana. Weather Sunny 48F. OL continuity 0.0, DL continuity -0.15",
            corpusSituationalShift: 0.012,
            mindEvaluation: {
              applicablePrinciples: ["P-001", "P-042"],
            },
            olContinuityDelta: 0.0,
            dlContinuityDelta: -0.15,
            dbContinuityDelta: 0.0,
            injuryEvidence: { sourceName: "espn-injuries", sampleSize: 3 },
          },
        },
        modelVersion: "v5.3.0",
        generatedAt: new Date(),
        game: {
          homeTeamName: "Indiana",
          awayTeamName: "Ohio State",
          commenceTime: new Date("2026-10-17T16:00:00Z"),
          sport: { key: "americanfootball_ncaaf", name: "NCAAF" },
        },
      },
      // 2. Unpriced model signal on same game where priced line exists -> should be dropped by dropContradictedModelSignals
      {
        id: "pick-2",
        gameId: "game-1",
        bookmakerCount: 0,
        pickType: "MONEYLINE",
        selection: "Indiana ML (model signal)",
        line: 145,
        confidence: 58,
        edgeScore: 40,
        tier: "FREE",
        pickGrade: "C",
        riskLevel: "HIGH",
        reasoningShort: "Signal lean on Indiana",
        factorBreakdown: {},
        modelVersion: "v5.3.0",
        generatedAt: new Date(),
        game: {
          homeTeamName: "Indiana",
          awayTeamName: "Ohio State",
          commenceTime: new Date("2026-10-17T16:00:00Z"),
          sport: { key: "americanfootball_ncaaf", name: "NCAAF" },
        },
      },
      // 3. Adverse edge pick: decision === "PASS" with negative expected CLV -> should be dropped by dropAdverseEdgePicks
      {
        id: "pick-3",
        gameId: "game-2",
        bookmakerCount: 6,
        pickType: "SPREAD",
        selection: "Michigan -7.0",
        line: -7.0,
        confidence: 60,
        edgeScore: 45,
        tier: "FREE",
        pickGrade: "B",
        riskLevel: "MODERATE",
        reasoningShort: "Model says pass",
        factorBreakdown: {
          rankingP: 0.51,
          independentEdge: { decision: "PASS", expectedClv: -0.035 },
        },
        modelVersion: "v5.3.0",
        generatedAt: new Date(),
        game: {
          homeTeamName: "Michigan",
          awayTeamName: "Michigan State",
          commenceTime: new Date("2026-10-17T19:30:00Z"),
          sport: { key: "americanfootball_ncaaf", name: "NCAAF" },
        },
      },
    ];

    vi.mocked(db.pick.findMany).mockResolvedValueOnce(mockPicks as any);

    const req = new Request("http://localhost/api/ops/ranked-picks", {
      headers: { authorization: "Bearer test-cron-secret" },
    });

    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.ok).toBe(true);
    expect(body.queried).toBe(3);
    expect(body.droppedContradictedModelSignals).toBe(1);
    expect(body.droppedAdverseEdge).toBe(1);
    expect(body.total).toBe(1);
    expect(body.returned).toBe(1);

    const pick = body.picks[0];
    expect(pick.id).toBe("pick-1");
    expect(pick.edgeScore).toBe(100);
    expect(pick.edgeIndexStatus).toBe("SATURATED_UNUSABLE");
    expect(pick.reasoningTrace).toContain("Ohio State at Indiana");
    expect(pick.applicablePrinciples).toEqual(["P-001", "P-042"]);
    expect(pick.corpusSituationalShift).toBe(0.012);
    expect(pick.dlContinuityDelta).toBe(-0.15);
    expect(pick.injuryEvidence?.sourceName).toBe("espn-injuries");
  });
});
