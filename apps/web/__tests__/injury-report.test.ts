import { afterEach, describe, expect, it, vi } from "vitest";
import {
  loadNflverseInjuryReport,
  resetInjuryReportCacheForTests,
} from "@/lib/nflverse/injury-report";

const HEADER =
  "season,game_type,team,week,gsis_id,position,full_name,first_name,last_name,report_primary_injury,report_secondary_injury,report_status,practice_primary_injury,practice_secondary_injury,practice_status,date_modified";

const INJURIES = [
  HEADER,
  // Week 18 (latest)
  "2024,REG,KC,18,00-1,WR,Patrick Player,Patrick,Player,Knee,,Out,Knee,,Did Not Participate,2024",
  "2024,REG,BUF,18,00-2,RB,Doubt Doug,Doubt,Doug,Ankle,,Doubtful,Ankle,,Limited,2024",
  "2024,REG,CIN,18,00-3,TE,Quest Quincy,Quest,Quincy,Hamstring,,Questionable,Hamstring,,Limited,2024",
  // practice-only note, no report designation -> kept
  "2024,REG,DEN,18,00-4,WR,Practice Pat,Practice,Pat,,,,Rest,,Limited,2024",
  // no designation, no practice -> excluded
  "2024,REG,SEA,18,00-5,QB,Healthy Henry,Healthy,Henry,,,,,,,2024",
  // earlier week -> excluded by latest-week filter
  "2024,REG,KC,17,00-6,WR,Old Otto,Old,Otto,Knee,,Out,Knee,,Did Not Participate,2024",
].join("\n");

function csv(body: string): Response {
  return new Response(body, { status: 200, headers: { "content-length": String(Buffer.byteLength(body)) } });
}

function mockFetch(): ReturnType<typeof vi.fn> {
  return vi.fn(async (input: string | URL | Request) => {
    const url = String(input);
    if (url.includes("injuries_2024.csv")) return csv(INJURIES);
    return new Response("missing", { status: 404 });
  });
}

describe("nflverse injury report", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    resetInjuryReportCacheForTests();
  });

  it("returns the latest week sorted by severity, dropping non-designations without practice notes", async () => {
    const report = await loadNflverseInjuryReport({ season: 2024, fetcher: mockFetch(), cacheTtlMs: 0 });

    expect(report.status).toBe("live");
    expect(report.season).toBe(2024);
    expect(report.week).toBe(18);
    expect(report.sourceRows).toBe(6);

    // Healthy Henry (no designation, no practice) and the week-17 row are excluded.
    expect(report.rows.map((r) => r.playerName)).toEqual([
      "Patrick Player",
      "Doubt Doug",
      "Quest Quincy",
      "Practice Pat",
    ]);
    expect(report.rows[0]?.reportStatus).toBe("Out");
    expect(report.counts).toEqual({ out: 1, doubtful: 1, questionable: 1 });
  });

  it("returns an empty boundary state when sources fail", async () => {
    const fetcher = vi.fn(async () => new Response("missing", { status: 404 }));
    const report = await loadNflverseInjuryReport({ season: 2024, fetcher, cacheTtlMs: 0 });
    expect(report.status).toBe("source-error");
    expect(report.rows).toHaveLength(0);
  });

  it("serves the injuries API", async () => {
    vi.stubGlobal("fetch", mockFetch());
    vi.resetModules();
    const mod = await import("@/app/api/nflverse/injuries/route");
    const response = (await mod.GET()) as Response;
    const body = (await response.json()) as Record<string, unknown>;
    expect(response.status).toBe(200);
    expect(body["success"]).toBe(true);
  });
});
