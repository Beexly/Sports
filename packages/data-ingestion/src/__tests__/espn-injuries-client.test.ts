import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  fetchEspnInjuries,
  getTeamInjuries,
  computeTeamContinuity,
  buildPlayerAvailabilityEvidence,
  calculateContinuityDelta,
  clearInjuryCacheForTests,
  isOlPosition,
  isDlPosition,
  isDbPosition,
  isSkillPosition,
  type NormalizedInjuryRecord,
} from "../espn-injuries-client.js";

describe("ESPN Injuries Client and Continuity Deltas", () => {
  beforeEach(() => {
    clearInjuryCacheForTests();
  });

  it("identifies football positions correctly", () => {
    expect(isOlPosition("OT")).toBe(true);
    expect(isOlPosition("OG")).toBe(true);
    expect(isOlPosition("C")).toBe(true);
    expect(isOlPosition("OL")).toBe(true);
    expect(isOlPosition("WR")).toBe(false);

    expect(isDlPosition("DE")).toBe(true);
    expect(isDlPosition("DT")).toBe(true);
    expect(isDlPosition("EDGE")).toBe(true);
    expect(isDlPosition("NT")).toBe(true);
    expect(isDlPosition("CB")).toBe(false);

    expect(isDbPosition("CB")).toBe(true);
    expect(isDbPosition("S")).toBe(true);
    expect(isDbPosition("FS")).toBe(true);
    expect(isDbPosition("SS")).toBe(true);

    expect(isSkillPosition("RB")).toBe(true);
    expect(isSkillPosition("WR")).toBe(true);
    expect(isSkillPosition("QB")).toBe(true);
    expect(isSkillPosition("TE")).toBe(true);
    expect(isSkillPosition("OT")).toBe(false);
  });

  it("computes continuity delta matching the exact verified formula", () => {
    // Formula: clamp(-(outCount * 0.15 + qCount * 0.08), -1, 0)
    expect(calculateContinuityDelta(0, 0)).toBe(0);
    expect(calculateContinuityDelta(1, 0)).toBe(-0.15);
    expect(calculateContinuityDelta(0, 1)).toBe(-0.08);

    // Live verified NFL cases (2026-10-17):
    // Green Bay Packers: 4 DL Out, 1 DL Q -> -(4 * 0.15 + 1 * 0.08) = -0.68
    expect(calculateContinuityDelta(4, 1)).toBe(-0.68);
    // San Francisco 49ers: 0 DL Out, 5 DL Q -> -(5 * 0.08) = -0.40
    expect(calculateContinuityDelta(0, 5)).toBe(-0.40);
    // Cleveland Browns: 1 DL Out, 2 DL Q -> -(0.15 + 0.16) = -0.31
    expect(calculateContinuityDelta(1, 2)).toBe(-0.31);
    // Denver Broncos: 2 DL Out, 0 DL Q -> -(2 * 0.15) = -0.30
    expect(calculateContinuityDelta(2, 0)).toBe(-0.30);
  });

  it("clamps continuity delta to [-1, 0]", () => {
    // Severe line wipeout: 8 Out, 5 Q -> raw -1.60, clamped to -1.0
    expect(calculateContinuityDelta(8, 5)).toBe(-1.0);
  });

  it("derives team continuity metrics from normalized injury records", () => {
    const records: NormalizedInjuryRecord[] = [
      {
        id: "inj-1",
        athleteName: "Zach Tom",
        position: "OT",
        status: "Out",
        shortComment: "Tom (knee) ruled out for Sunday",
        teamName: "Green Bay Packers",
      },
      {
        id: "inj-2",
        athleteName: "Elgton Jenkins",
        position: "OG",
        status: "Questionable",
        shortComment: "Jenkins (ankle) limited at practice",
        teamName: "Green Bay Packers",
      },
      {
        id: "inj-3",
        athleteName: "Rashan Gary",
        position: "EDGE",
        status: "Out",
        shortComment: "Gary (shoulder) ruled out",
        teamName: "Green Bay Packers",
      },
      {
        id: "inj-4",
        athleteName: "Jaire Alexander",
        position: "CB",
        status: "Questionable",
        shortComment: "Alexander (groin) questionable",
        teamName: "Green Bay Packers",
      },
      {
        id: "inj-5",
        athleteName: "Christian Watson",
        position: "WR",
        status: "Out",
        shortComment: "Watson (hamstring) ruled out",
        teamName: "Green Bay Packers",
      },
    ];

    const metrics = computeTeamContinuity(records);
    // OL: 1 Out, 1 Q -> -(0.15 + 0.08) = -0.23
    expect(metrics.olContinuityDelta).toBe(-0.23);
    expect(metrics.outOlCount).toBe(1);
    expect(metrics.qOlCount).toBe(1);

    // DL: 1 Out, 0 Q -> -0.15
    expect(metrics.dlContinuityDelta).toBe(-0.15);
    expect(metrics.outDlCount).toBe(1);
    expect(metrics.qDlCount).toBe(0);

    // DB: 0 Out, 1 Q -> -0.08
    expect(metrics.dbContinuityDelta).toBe(-0.08);
    expect(metrics.outDbCount).toBe(0);
    expect(metrics.qDbCount).toBe(1);

    // Skill: 1 Out (Watson WR)
    expect(metrics.skillOutCount).toBe(1);
    expect(metrics.totalOutOrQuestionable).toBe(5);
  });

  it("builds PLAYER_AVAILABILITY EvidenceRecord with real citation when records exist", () => {
    const records: NormalizedInjuryRecord[] = [
      {
        id: "inj-1",
        athleteName: "Graham Mertz",
        position: "QB",
        status: "Out",
        shortComment: "Mertz (knee) tore ACL, out for season",
        teamName: "Florida Gators",
      },
    ];

    const ev = buildPlayerAvailabilityEvidence("Florida Gators", records, new Date("2026-10-17T12:00:00Z"));
    expect(ev.sourceCategory).toBe("PLAYER_AVAILABILITY");
    expect(ev.sourceName).toBe("espn-injuries");
    expect(ev.trustLevel).toBe(0.85);
    expect(ev.sampleSize).toBe(1);
    expect(ev.activationStatus).toBe("SHADOW_ONLY");
    expect(ev.freshnessStatus).toBe("FRESH");
    expect(ev.whyUsedOrBlocked).toContain("Florida Gators ESPN injury report");
    expect(ev.whyUsedOrBlocked).toContain("Mertz (QB, Out)");
  });

  it("falls back to neutral placeholder EvidenceRecord when no records exist", () => {
    const ev = buildPlayerAvailabilityEvidence("Unknown Team", [], new Date("2026-10-17T12:00:00Z"));
    expect(ev.sourceCategory).toBe("PLAYER_AVAILABILITY");
    expect(ev.sourceName).toBe("not-configured");
    expect(ev.trustLevel).toBe(0);
    expect(ev.sampleSize).toBeNull();
    expect(ev.activationStatus).toBe("BLOCKED_MISSING_SOURCE");
    expect(ev.freshnessStatus).toBe("MISSING");
  });

  it("parses ESPN API payload and populates team map", async () => {
    const mockJson = {
      injuries: [
        {
          id: "57",
          displayName: "Florida Gators",
          injuries: [
            {
              id: "1001",
              status: "Out",
              shortComment: "Tre Wilson (hip) ruled out",
              athlete: {
                displayName: "Tre Wilson",
                position: { abbreviation: "WR", name: "Wide Receiver" },
              },
            },
          ],
        },
      ],
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockJson,
    });

    const teamMap = await fetchEspnInjuries("americanfootball_ncaaf", mockFetch as any);
    expect(teamMap.size).toBe(1);

    const gatorsInjuries = getTeamInjuries("Florida Gators", teamMap);
    expect(gatorsInjuries).toHaveLength(1);
    expect(gatorsInjuries[0]?.athleteName).toBe("Tre Wilson");
    expect(gatorsInjuries[0]?.position).toBe("WR");
    expect(gatorsInjuries[0]?.status).toBe("Out");
  });
});
